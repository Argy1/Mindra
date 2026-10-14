import 'server-only';
import { z } from 'zod';
import {
  buildDashboard,
  parsePeriod,
  periodRange,
  type AggregateRow,
  type DashboardView,
  type PeriodKey,
  type PeriodRange,
} from '@/lib/domain/faskes/dashboard';
import {
  monthlyReport,
  MONTH_PATTERN,
  monthOptions,
  type ReportRow,
} from '@/lib/domain/faskes/report';
import { dateKeyWib } from '@/lib/utils/date';
import { createClient } from '@/lib/supabase/server';

/**
 * Pembacaan untuk portal faskes (tren, peta, laporan). ATURAN BESI: data kesehatan hanya dibaca lewat
 * `public.facility_aggregate()`, fungsi database yang menegakkan k-anonymity ≥ 10 dan hanya menjawab admin
 * faskes tersebut (sesi aal2) atau service_role. Berkas ini TIDAK membaca tabel profiles, assessments,
 * mood_entries, sleep_entries, crisis_alerts, atau tabel data pengguna mana pun; tabel yang disentuh hanya
 * `facility_admins` (keanggotaan) dan `facilities` (direktori publik). tests/faskes/aggregate-only.test.ts
 * menjaga ini, baik lewat pemindaian kode maupun lewat klien Supabase tiruan.
 *
 * Tidak memakai klien service role: semuanya lewat sesi admin, sehingga RLS dan pemeriksaan di dalam
 * fungsi tetap berlaku. Pembacaan agregat anonim tidak dicatat di data_access_logs (tidak ada subjek
 * individu yang bisa dicatat).
 */

export class FaskesDataError extends Error {
  constructor(message = 'Data faskes belum bisa dimuat.') {
    super(message);
    this.name = 'FaskesDataError';
  }
}

export interface ManagedFacility {
  id: string;
  name: string;
  type: string;
  city: string;
  province: string;
}

// ─── Faskes yang dikelola ─────────────────────────────────────────────────────────
export async function getManagedFacilities(userId: string): Promise<ManagedFacility[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('facility_admins')
    .select('facility_id, facilities(id, name, type, city, province)')
    .eq('profile_id', userId);
  if (error) throw new FaskesDataError();

  return (data ?? [])
    .flatMap((row) =>
      row.facilities
        ? [
            {
              id: row.facilities.id,
              name: row.facilities.name,
              type: row.facilities.type,
              city: row.facilities.city,
              province: row.facilities.province,
            },
          ]
        : [],
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

const UUID = z.uuid();

/**
 * Faskes yang dipilih dari `?faskes=`. Nilai hanya dipakai bila PERSIS salah satu faskes yang dikelola
 * pemanggil; id asing atau rusak jatuh ke faskes pertama (bukan galat, bukan akses).
 */
export function pickFacility(
  facilities: readonly ManagedFacility[],
  requested: string | string[] | undefined,
): ManagedFacility | null {
  const value = Array.isArray(requested) ? requested[0] : requested;
  const parsed = UUID.safeParse(value);
  if (parsed.success) {
    const match = facilities.find((facility) => facility.id === parsed.data);
    if (match) return match;
  }
  return facilities[0] ?? null;
}

// ─── Agregat ──────────────────────────────────────────────────────────────────────
const nullableNumber = z.union([
  z.null(),
  z.number(),
  z
    .string()
    .regex(/^-?\d+(\.\d+)?$/)
    .transform(Number),
]);

const rowSchema = z.object({
  city: z.string(),
  province: z.string(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  suppressed: z.boolean(),
  active_users: nullableNumber,
  avg_phq9: nullableNumber,
  avg_gad7: nullableNumber,
  avg_pss10: nullableNumber,
  minimal_count: nullableNumber,
  mild_count: nullableNumber,
  moderate_count: nullableNumber,
  severe_count: nullableNumber,
  crisis_alert_count: nullableNumber,
});

/** Memetakan jawaban RPC ke baris domain. Baris yang bentuknya salah menggagalkan seluruhnya (gagal tertutup). */
export function parseAggregateRows(data: unknown): AggregateRow[] {
  const parsed = z.array(rowSchema).safeParse(data ?? []);
  if (!parsed.success) throw new FaskesDataError();
  return parsed.data.map((row) => ({
    city: row.city,
    province: row.province,
    weekStart: row.week_start,
    suppressed: row.suppressed,
    activeUsers: row.active_users,
    avgPhq9: row.avg_phq9,
    avgGad7: row.avg_gad7,
    avgPss10: row.avg_pss10,
    minimal: row.minimal_count,
    mild: row.mild_count,
    moderate: row.moderate_count,
    severe: row.severe_count,
    crisisAlerts: row.crisis_alert_count,
  }));
}

async function fetchAggregates(facilityId: string, range: PeriodRange): Promise<AggregateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('facility_aggregate', {
    p_facility: facilityId,
    p_from: range.from,
    p_to: range.to,
  });
  if (error) throw new FaskesDataError();
  return parseAggregateRows(data);
}

// ─── Halaman ──────────────────────────────────────────────────────────────────────
export interface FacilityScope {
  facilities: ManagedFacility[];
  facility: ManagedFacility;
}

/** null = akun ini belum mengelola faskes mana pun. */
export async function resolveFacility(
  userId: string,
  requested: string | string[] | undefined,
): Promise<FacilityScope | null> {
  const facilities = await getManagedFacilities(userId);
  const facility = pickFacility(facilities, requested);
  return facility ? { facilities, facility } : null;
}

export interface TrendPageData extends FacilityScope {
  period: PeriodKey;
  range: PeriodRange;
  view: DashboardView;
}

export async function getTrendPage(
  userId: string,
  params: { periode?: string | string[]; faskes?: string | string[] },
  now: Date = new Date(),
): Promise<TrendPageData | null> {
  const scope = await resolveFacility(userId, params.faskes);
  if (!scope) return null;

  const period = parsePeriod(params.periode);
  const range = periodRange(period, now);
  const rows = await fetchAggregates(scope.facility.id, range);
  const view = buildDashboard({
    rows,
    facilityCity: scope.facility.city,
    province: scope.facility.province,
    weekStarts: range.weekStarts,
    today: dateKeyWib(now),
  });
  return { ...scope, period, range, view };
}

export interface MapPin {
  id: string;
  name: string;
  type: string;
  city: string;
  lat: number;
  lng: number;
}

export interface MapPageData extends FacilityScope {
  period: PeriodKey;
  range: PeriodRange;
  rows: AggregateRow[];
  /** Direktori faskes publik di provinsi yang sama (titik pelayanan). */
  pins: MapPin[];
}

export async function getMapPage(
  userId: string,
  params: { periode?: string | string[]; faskes?: string | string[] },
  now: Date = new Date(),
): Promise<MapPageData | null> {
  const scope = await resolveFacility(userId, params.faskes);
  if (!scope) return null;

  const period = parsePeriod(params.periode);
  const range = periodRange(period, now);
  const rows = await fetchAggregates(scope.facility.id, range);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('facilities')
    .select('id, name, type, city, lat, lng')
    .eq('province', scope.facility.province)
    .limit(500);
  if (error) throw new FaskesDataError();

  const pins = (data ?? []).flatMap((facility) =>
    typeof facility.lat === 'number' && typeof facility.lng === 'number'
      ? [{ ...facility, lat: facility.lat, lng: facility.lng }]
      : [],
  );
  return { ...scope, period, range, rows, pins };
}

export interface ReportPageData extends FacilityScope {
  months: string[];
  month: string;
  rows: ReportRow[];
}

/** `bulan` harus berbentuk YYYY-MM dan salah satu bulan yang tersedia; selain itu bulan terbaru. */
export async function getReportPage(
  userId: string,
  params: { bulan?: string | string[]; faskes?: string | string[] },
  now: Date = new Date(),
): Promise<ReportPageData | null> {
  const scope = await resolveFacility(userId, params.faskes);
  if (!scope) return null;

  const range = periodRange('52', now);
  const rows = await fetchAggregates(scope.facility.id, range);
  const months = monthOptions(range.weekStarts);
  const requested = Array.isArray(params.bulan) ? params.bulan[0] : params.bulan;
  const month =
    requested && MONTH_PATTERN.test(requested) && months.includes(requested)
      ? requested
      : months[0]!;
  return { ...scope, months, month, rows: monthlyReport(rows, month) };
}
