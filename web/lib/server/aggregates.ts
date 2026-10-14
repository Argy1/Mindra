import 'server-only';
import { ApiError } from '@/lib/api/errors';
import { createServiceClient } from '@/lib/server/supabase-service';

/**
 * Agregat anonim wilayah untuk sistem mitra (klien API ber-cakupan `aggregates:read`). Memakai service role
 * karena pemanggilnya tidak punya sesi pengguna; satu-satunya yang dipanggil adalah fungsi database
 * `facility_aggregate`, yang menerapkan k-anonymity ≥ 10 DI DATABASE (grup kota-minggu kecil disembunyikan
 * seluruhnya, dan tiap metrik hanya tampil bila ≥ 10 pengguna berbeda mengerjakannya).
 *
 * Lapisan kedua di sini: baris yang ditandai `suppressed` dipaksa tanpa angka sama sekali, walau database
 * (karena bug di masa depan) mengirim sesuatu. Tidak ada data individu yang pernah melewati modul ini.
 */

export interface AggregateRow {
  city: string | null;
  province: string | null;
  weekStart: string;
  suppressed: boolean;
  activeUsers: number | null;
  avgPhq9: number | null;
  avgGad7: number | null;
  avgPss10: number | null;
  minimalCount: number | null;
  mildCount: number | null;
  moderateCount: number | null;
  severeCount: number | null;
  crisisAlertCount: number | null;
}

interface DbRow {
  city: string | null;
  province: string | null;
  week_start: string;
  suppressed: boolean;
  active_users: number | null;
  avg_phq9: number | null;
  avg_gad7: number | null;
  avg_pss10: number | null;
  minimal_count: number | null;
  mild_count: number | null;
  moderate_count: number | null;
  severe_count: number | null;
  crisis_alert_count: number | null;
}

const num = (value: number | string | null): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

export function toAggregateRow(row: DbRow): AggregateRow {
  if (row.suppressed) {
    // Sama sekali tanpa angka, termasuk jumlah pengguna aktif: angka kecil pun bisa mengidentifikasi.
    return {
      city: row.city,
      province: row.province,
      weekStart: row.week_start,
      suppressed: true,
      activeUsers: null,
      avgPhq9: null,
      avgGad7: null,
      avgPss10: null,
      minimalCount: null,
      mildCount: null,
      moderateCount: null,
      severeCount: null,
      crisisAlertCount: null,
    };
  }
  return {
    city: row.city,
    province: row.province,
    weekStart: row.week_start,
    suppressed: false,
    activeUsers: num(row.active_users),
    avgPhq9: num(row.avg_phq9),
    avgGad7: num(row.avg_gad7),
    avgPss10: num(row.avg_pss10),
    minimalCount: num(row.minimal_count),
    mildCount: num(row.mild_count),
    moderateCount: num(row.moderate_count),
    severeCount: num(row.severe_count),
    crisisAlertCount: num(row.crisis_alert_count),
  };
}

export async function getFacilityAggregates(
  facilityId: string,
  from: string,
  to: string,
): Promise<AggregateRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('facility_aggregate', {
    p_facility: facilityId,
    p_from: from,
    p_to: to,
  });
  if (error) throw new ApiError('internal_error');
  return (data ?? []).map((row) => toAggregateRow(row as unknown as DbRow));
}
