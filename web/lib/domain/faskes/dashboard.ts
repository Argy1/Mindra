import { addDaysToKey, dateKeyWib, formatDecimalId } from '@/lib/utils/date';

/**
 * Model tampilan dasbor faskes. Fungsi murni: input hanya baris AGREGAT dari `facility_aggregate()`
 * (sudah menerapkan k-anonymity ≥ 10 di database), output untuk tabel dan grafik. Tidak ada data per orang
 * di sini, dan tidak ada langkah yang membuka kembali sel yang disembunyikan database: sel tertekan
 * (`suppressed`) hanya dihitung sebagai "disembunyikan", tidak pernah dijumlahkan atau dikurangkan.
 */

export interface AggregateRow {
  city: string;
  province: string;
  /** Senin (WIB) dari pekan, "YYYY-MM-DD". */
  weekStart: string;
  suppressed: boolean;
  activeUsers: number | null;
  avgPhq9: number | null;
  avgGad7: number | null;
  avgPss10: number | null;
  minimal: number | null;
  mild: number | null;
  moderate: number | null;
  severe: number | null;
  crisisAlerts: number | null;
}

// ─── Periode ─────────────────────────────────────────────────────────────────────
export const PERIODS = [
  { key: '4', weeks: 4, label: '4 minggu' },
  { key: '12', weeks: 12, label: '12 minggu' },
  { key: '52', weeks: 52, label: '1 tahun' },
] as const;
export type PeriodKey = (typeof PERIODS)[number]['key'];
export const DEFAULT_PERIOD: PeriodKey = '12';

/** Nilai `?periode=` yang tak dikenal jatuh ke bawaan (bukan galat): tautan lama tetap terbuka. */
export function parsePeriod(raw: string | string[] | undefined): PeriodKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return PERIODS.find((period) => period.key === value)?.key ?? DEFAULT_PERIOD;
}

/** Senin (kalender WIB) dari pekan yang memuat kunci tanggal. */
export function mondayOf(key: string): string {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay();
  return addDaysToKey(key, -((dow + 6) % 7));
}

export interface PeriodRange {
  /** Batas bawah dan atas untuk `facility_aggregate` (maks. 400 hari). */
  from: string;
  to: string;
  /** Senin tiap pekan, urut lama → baru; pekan terakhir adalah pekan berjalan. */
  weekStarts: string[];
}

export function periodRange(period: PeriodKey, now: Date): PeriodRange {
  const weeks = PERIODS.find((entry) => entry.key === period)!.weeks;
  const today = dateKeyWib(now);
  const thisMonday = mondayOf(today);
  const weekStarts = Array.from({ length: weeks }, (_, index) =>
    addDaysToKey(thisMonday, (index - (weeks - 1)) * 7),
  );
  return { from: weekStarts[0]!, to: today, weekStarts };
}

// ─── Kota ────────────────────────────────────────────────────────────────────────
/** Sama dengan `lower(btrim(city))` di database. */
export const cityKey = (city: string): string => city.trim().toLowerCase();

// ─── Agregasi ────────────────────────────────────────────────────────────────────
/** Rata-rata tertimbang (bobot = pengguna aktif sel itu); null bila tidak ada nilai. */
function weightedMean(items: readonly { value: number | null; weight: number }[]): number | null {
  let sum = 0;
  let weight = 0;
  for (const item of items) {
    if (item.value === null || item.weight <= 0) continue;
    sum += item.value * item.weight;
    weight += item.weight;
  }
  return weight > 0 ? sum / weight : null;
}

function sumNullable(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length > 0 ? present.reduce((a, b) => a + b, 0) : null;
}

export interface Cells {
  activeUsers: number | null;
  phq9: number | null;
  gad7: number | null;
  pss10: number | null;
  minimal: number | null;
  mild: number | null;
  moderate: number | null;
  severe: number | null;
  crisisAlerts: number | null;
}

/** Menggabungkan sel-sel YANG TAMPIL (tidak tertekan) menjadi satu angka per metrik. */
export function combineCells(rows: readonly AggregateRow[]): Cells {
  const visible = rows.filter((row) => !row.suppressed && (row.activeUsers ?? 0) > 0);
  const weighted = (pick: (row: AggregateRow) => number | null) =>
    weightedMean(visible.map((row) => ({ value: pick(row), weight: row.activeUsers ?? 0 })));
  return {
    activeUsers: sumNullable(visible.map((row) => row.activeUsers)),
    phq9: weighted((row) => row.avgPhq9),
    gad7: weighted((row) => row.avgGad7),
    pss10: weighted((row) => row.avgPss10),
    minimal: sumNullable(visible.map((row) => row.minimal)),
    mild: sumNullable(visible.map((row) => row.mild)),
    moderate: sumNullable(visible.map((row) => row.moderate)),
    severe: sumNullable(visible.map((row) => row.severe)),
    crisisAlerts: sumNullable(visible.map((row) => row.crisisAlerts)),
  };
}

/** Pembulatan terbesar-sisa: persentase bulat yang selalu berjumlah 100. */
export function percentages(counts: readonly number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total <= 0) return counts.map(() => 0);
  const exact = counts.map((count) => (count / total) * 100);
  const floors = exact.map(Math.floor);
  let remainder = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);
  for (const { index } of order) {
    if (remainder <= 0) break;
    floors[index]! += 1;
    remainder -= 1;
  }
  return floors;
}

// ─── Model tampilan ──────────────────────────────────────────────────────────────
export type WeekState = 'shown' | 'suppressed' | 'none';

export interface WeekPoint {
  weekStart: string;
  state: WeekState;
  activeUsers: number | null;
  phq9: number | null;
  gad7: number | null;
  pss10: number | null;
}

export interface Metric {
  value: number | null;
  /** Selisih dengan pekan lengkap sebelumnya; null bila pekan itu tidak tampil. */
  delta: number | null;
}

export interface CityComparison {
  city: string;
  isOwn: boolean;
  hidden: boolean;
  avgPhq9: number | null;
  /** Jumlah pekan yang tampil (bukan tertekan) dalam periode. */
  weeksShown: number;
}

export interface CategoryShare {
  city: string;
  isOwn: boolean;
  hidden: boolean;
  /** Persentase bulat (berjumlah 100) atau null bila disembunyikan. */
  percent: { minimal: number; mild: number; moderate: number; severe: number } | null;
}

export interface DashboardView {
  scope: { kind: 'city'; city: string } | { kind: 'province'; province: string };
  weeks: WeekPoint[];
  summary: {
    /** Senin pekan lengkap terakhir yang tampil, atau null. */
    weekStart: string | null;
    activeUsers: Metric;
    avgPhq9: Metric;
    /** Persen skrining kategori sedang atau berat. */
    severeShare: Metric;
    crisisAlerts: number | null;
  };
  cities: CityComparison[];
  distribution: CategoryShare[];
  hiddenCities: string[];
  note: string | null;
  /** Tidak ada satu pun sel yang tampil pada periode ini. */
  empty: boolean;
}

export interface BuildInput {
  rows: readonly AggregateRow[];
  facilityCity: string;
  province: string;
  weekStarts: readonly string[];
  /** Kunci tanggal WIB hari ini. */
  today: string;
}

function severeShareOf(cells: Cells): number | null {
  const parts = [cells.minimal, cells.mild, cells.moderate, cells.severe];
  if (parts.some((part) => part === null)) return null;
  const total = parts.reduce<number>((sum, part) => sum + (part ?? 0), 0);
  return total > 0 ? (((cells.moderate ?? 0) + (cells.severe ?? 0)) / total) * 100 : null;
}

function delta(current: number | null, previous: number | null, digits: number): number | null {
  if (current === null || previous === null) return null;
  const factor = 10 ** digits;
  return Math.round((current - previous) * factor) / factor;
}

export function buildDashboard(input: BuildInput): DashboardView {
  const { rows, facilityCity, province, weekStarts, today } = input;
  const ownKey = cityKey(facilityCity);

  // Lingkup: kota faskes bila ada sel yang tampil; bila tidak, seluruh provinsi (jumlah sel yang tampil).
  const ownRows = rows.filter((row) => cityKey(row.city) === ownKey);
  const ownHasData = ownRows.some((row) => !row.suppressed);
  const scopeRows = ownHasData ? ownRows : rows;
  const scope: DashboardView['scope'] = ownHasData
    ? { kind: 'city', city: facilityCity }
    : { kind: 'province', province };

  const byWeek = new Map<string, AggregateRow[]>();
  for (const row of scopeRows) {
    const list = byWeek.get(row.weekStart) ?? [];
    list.push(row);
    byWeek.set(row.weekStart, list);
  }

  const cellsByWeek = new Map<string, Cells>();
  const weeks: WeekPoint[] = weekStarts.map((weekStart) => {
    const list = byWeek.get(weekStart) ?? [];
    const cells = combineCells(list);
    cellsByWeek.set(weekStart, cells);
    const state: WeekState =
      cells.activeUsers !== null ? 'shown' : list.length > 0 ? 'suppressed' : 'none';
    return {
      weekStart,
      state,
      activeUsers: cells.activeUsers,
      phq9: cells.phq9,
      gad7: cells.gad7,
      pss10: cells.pss10,
    };
  });

  // Ringkasan: pekan LENGKAP terakhir yang tampil (pekan berjalan belum penuh, jadi tidak adil dibandingkan).
  const isComplete = (weekStart: string) => addDaysToKey(weekStart, 7) <= today;
  const latest = [...weeks]
    .reverse()
    .find((week) => week.state === 'shown' && isComplete(week.weekStart));
  const previousWeek = latest
    ? weeks.find((week) => week.weekStart === addDaysToKey(latest.weekStart, -7))
    : undefined;
  const latestCells = latest ? cellsByWeek.get(latest.weekStart)! : null;
  const previousCells =
    previousWeek && previousWeek.state === 'shown'
      ? cellsByWeek.get(previousWeek.weekStart)!
      : null;

  const latestShare = latestCells ? severeShareOf(latestCells) : null;
  const previousShare = previousCells ? severeShareOf(previousCells) : null;

  const summary: DashboardView['summary'] = {
    weekStart: latest?.weekStart ?? null,
    activeUsers: {
      value: latestCells?.activeUsers ?? null,
      delta: delta(latestCells?.activeUsers ?? null, previousCells?.activeUsers ?? null, 0),
    },
    avgPhq9: {
      value: latestCells?.phq9 ?? null,
      delta: delta(latestCells?.phq9 ?? null, previousCells?.phq9 ?? null, 1),
    },
    severeShare: {
      value: latestShare === null ? null : Math.round(latestShare),
      delta: delta(latestShare, previousShare, 0),
    },
    crisisAlerts: sumNullable(weeks.map((week) => cellsByWeek.get(week.weekStart)!.crisisAlerts)),
  };

  // Perbandingan antar kota dalam provinsi: rata-rata periode dari sel yang tampil.
  const cityGroups = new Map<string, { label: string; rows: AggregateRow[] }>();
  for (const row of rows) {
    const key = cityKey(row.city);
    const group = cityGroups.get(key) ?? { label: row.city, rows: [] };
    group.rows.push(row);
    cityGroups.set(key, group);
  }

  const groupCells = [...cityGroups.entries()].map(([key, group]) => {
    const cells = combineCells(group.rows);
    return {
      key,
      label: group.label,
      cells,
      weeksShown: group.rows.filter((row) => !row.suppressed && (row.activeUsers ?? 0) > 0).length,
    };
  });

  const ordered = [...groupCells].sort((a, b) => {
    const av = a.cells.phq9;
    const bv = b.cells.phq9;
    if (av === null && bv === null) return a.label.localeCompare(b.label, 'id');
    if (av === null) return 1;
    if (bv === null) return -1;
    return bv - av || a.label.localeCompare(b.label, 'id');
  });

  const cities: CityComparison[] = ordered.map((group) => ({
    city: group.label,
    isOwn: group.key === ownKey,
    hidden: group.cells.phq9 === null,
    avgPhq9: group.cells.phq9 === null ? null : Math.round(group.cells.phq9 * 10) / 10,
    weeksShown: group.weeksShown,
  }));

  const distribution: CategoryShare[] = ordered.map((group) => {
    const { minimal, mild, moderate, severe } = group.cells;
    const hidden = minimal === null || mild === null || moderate === null || severe === null;
    if (hidden)
      return { city: group.label, isOwn: group.key === ownKey, hidden: true, percent: null };
    const [pMin, pMild, pMod, pSev] = percentages([minimal, mild, moderate, severe]);
    return {
      city: group.label,
      isOwn: group.key === ownKey,
      hidden: false,
      percent: { minimal: pMin!, mild: pMild!, moderate: pMod!, severe: pSev! },
    };
  });

  return {
    scope,
    weeks,
    summary,
    cities,
    distribution,
    hiddenCities: cities.filter((city) => city.hidden).map((city) => city.city),
    note: trendNote(weeks),
    empty: weeks.every((week) => week.state !== 'shown'),
  };
}

// ─── Catatan otomatis ────────────────────────────────────────────────────────────
const NOTE_THRESHOLD = 1;

function mean(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** "12 minggu" / "1 tahun" untuk jumlah pekan satu periode; bentuk lain jatuh ke "N minggu". */
export function periodLabelOfWeeks(weekCount: number): string {
  return PERIODS.find((period) => period.weeks === weekCount)?.label ?? `${weekCount} minggu`;
}

/**
 * Satu kalimat dari tren PHQ-9: 2 pekan tampil pertama dibanding 2 pekan tampil terakhir dalam periode. Kedua
 * angka ikut ditulis (dan selisihnya dihitung dari angka yang tertulis itu) supaya tidak terbaca bertentangan
 * dengan kartu ringkasan, yang memakai satu pekan saja. Hanya menyebut arah dan besarnya, tidak menebak sebab.
 * Butuh minimal 4 pekan tampil.
 */
export function trendNote(weeks: readonly WeekPoint[]): string | null {
  const values = weeks.flatMap((week) => (week.phq9 === null ? [] : [week.phq9]));
  if (values.length < 4) return null;
  const start = round1(mean(values.slice(0, 2)));
  const end = round1(mean(values.slice(-2)));
  const change = round1(end - start);
  const span = `${periodLabelOfWeeks(weeks.length)} terakhir`;
  const range = `dari ${formatDecimalId(start)} di dua pekan pertama menjadi ${formatDecimalId(end)} di dua pekan terakhir`;
  const size = formatDecimalId(Math.abs(change));
  if (change >= NOTE_THRESHOLD) {
    return `Dalam ${span}, rata-rata PHQ-9 mingguan naik ${size} poin (${range}). Penyuluhan atau konseling kelompok di wilayahmu bisa dipertimbangkan.`;
  }
  if (change <= -NOTE_THRESHOLD) {
    return `Dalam ${span}, rata-rata PHQ-9 mingguan turun ${size} poin (${range}). Program yang sedang berjalan layak dipertahankan.`;
  }
  return `Dalam ${span}, rata-rata PHQ-9 mingguan relatif stabil (${formatDecimalId(start)} di dua pekan pertama, ${formatDecimalId(end)} di dua pekan terakhir).`;
}

// ─── Label pekan ─────────────────────────────────────────────────────────────────
const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

function dayAndMonth(key: string): { day: number; month: string } {
  const [, month, day] = key.split('-').map(Number);
  return { day: day!, month: MONTH_SHORT[month! - 1]! };
}

/** "5–11 Okt" atau "29 Sep – 5 Okt" untuk pekan yang dimulai pada `weekStart`. */
export function weekRangeLabel(weekStart: string): string {
  const start = dayAndMonth(weekStart);
  const end = dayAndMonth(addDaysToKey(weekStart, 6));
  return start.month === end.month
    ? `${start.day}–${end.day} ${end.month}`
    : `${start.day} ${start.month} – ${end.day} ${end.month}`;
}

/** "6 Okt" untuk label sumbu. */
export function weekShortLabel(weekStart: string): string {
  const { day, month } = dayAndMonth(weekStart);
  return `${day} ${month}`;
}
