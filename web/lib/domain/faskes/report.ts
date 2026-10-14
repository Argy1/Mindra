import { cityKey, combineCells, type AggregateRow } from '@/lib/domain/faskes/dashboard';
import { toCsv } from '@/lib/utils/csv';

/**
 * Laporan bulanan faskes: gabungan anonim per kota. Satu pekan dihitung pada bulan tempat pekan itu DIMULAI
 * (Senin), supaya tiap pekan tepat satu kali. Sel yang disembunyikan database tetap disembunyikan: kota
 * dengan seluruh pekannya tertekan hanya muncul sebagai baris "disembunyikan", tanpa angka.
 */

export interface ReportRow {
  month: string;
  city: string;
  province: string;
  hidden: boolean;
  weeksShown: number;
  avgActiveUsers: number | null;
  avgPhq9: number | null;
  avgGad7: number | null;
  avgPss10: number | null;
  minimal: number | null;
  mild: number | null;
  moderate: number | null;
  severe: number | null;
  crisisAlerts: number | null;
}

export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Bulan ("YYYY-MM") dari Senin pekan, terbaru lebih dulu. */
export function monthOptions(weekStarts: readonly string[]): string[] {
  return [...new Set(weekStarts.map((weekStart) => weekStart.slice(0, 7)))].sort().reverse();
}

const MONTH_NAME = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

/** "2026-10" menjadi "Oktober 2026"; nilai yang bukan bulan valid dikembalikan apa adanya. */
export function monthLabel(month: string): string {
  if (!MONTH_PATTERN.test(month)) return month;
  const [year, number] = month.split('-');
  return `${MONTH_NAME[Number(number) - 1]} ${year}`;
}

/** Bagian aman untuk nama berkas (huruf kecil, angka, tanda hubung). */
export function fileSlug(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[^ -~]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'faskes'
  );
}

const round = (value: number | null, digits: number) =>
  value === null ? null : Math.round(value * 10 ** digits) / 10 ** digits;

export function monthlyReport(rows: readonly AggregateRow[], month: string): ReportRow[] {
  if (!MONTH_PATTERN.test(month)) return [];
  const groups = new Map<string, { label: string; province: string; rows: AggregateRow[] }>();
  for (const row of rows) {
    if (row.weekStart.slice(0, 7) !== month) continue;
    const key = cityKey(row.city);
    const group = groups.get(key) ?? { label: row.city, province: row.province, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group): ReportRow => {
      const visible = group.rows.filter((row) => !row.suppressed && (row.activeUsers ?? 0) > 0);
      const cells = combineCells(group.rows);
      const hidden = visible.length === 0;
      return {
        month,
        city: group.label,
        province: group.province,
        hidden,
        weeksShown: visible.length,
        avgActiveUsers: hidden ? null : round((cells.activeUsers ?? 0) / visible.length, 0),
        avgPhq9: round(cells.phq9, 1),
        avgGad7: round(cells.gad7, 1),
        avgPss10: round(cells.pss10, 1),
        minimal: cells.minimal,
        mild: cells.mild,
        moderate: cells.moderate,
        severe: cells.severe,
        crisisAlerts: cells.crisisAlerts,
      };
    })
    .sort((a, b) => Number(a.hidden) - Number(b.hidden) || a.city.localeCompare(b.city, 'id'));
}

export const REPORT_CSV_HEADER = [
  'bulan',
  'kota',
  'provinsi',
  'status',
  'pekan_tampil',
  'rata2_pengguna_aktif_per_pekan',
  'rata2_phq9',
  'rata2_gad7',
  'rata2_pss10',
  'skrining_minimal',
  'skrining_ringan',
  'skrining_sedang',
  'skrining_berat',
  'peringatan_krisis',
] as const;

const cell = (value: number | null) => (value === null ? '' : String(value));

/** CSV anonim; nama kota berasal dari isian pengguna sehingga lewat `csvCell` (anti injeksi rumus). */
export function reportToCsv(rows: readonly ReportRow[]): string {
  return toCsv(
    REPORT_CSV_HEADER,
    rows.map((row) => [
      row.month,
      row.city,
      row.province,
      row.hidden ? 'disembunyikan (kurang dari 10 pengguna)' : 'tampil',
      String(row.weeksShown),
      cell(row.avgActiveUsers),
      cell(row.avgPhq9),
      cell(row.avgGad7),
      cell(row.avgPss10),
      cell(row.minimal),
      cell(row.mild),
      cell(row.moderate),
      cell(row.severe),
      cell(row.crisisAlerts),
    ]),
  );
}
