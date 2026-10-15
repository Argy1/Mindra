/**
 * Statistik kecil yang dipakai bersama oleh SUS dan UEQ-S. Fungsi murni tanpa I/O.
 */

/** Nilai kritis t dua sisi 95% untuk df 1..30. */
const T_CRITICAL_95 = [
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145,
  2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048,
  2.045, 2.042,
] as const;

/** Di atas df 30 dipakai nilai df tabel terdekat di bawahnya (sedikit lebih lebar, jadi konservatif). */
const T_CRITICAL_95_LARGE: ReadonlyArray<readonly [number, number]> = [
  [120, 1.98],
  [60, 2.0],
  [40, 2.021],
];

export function tCritical95(degreesOfFreedom: number): number {
  if (degreesOfFreedom < 1) return Number.NaN;
  const tabulated = T_CRITICAL_95[degreesOfFreedom - 1];
  if (tabulated !== undefined) return tabulated;
  return T_CRITICAL_95_LARGE.find(([df]) => degreesOfFreedom >= df)?.[1] ?? T_CRITICAL_95[29]!;
}

export const round1 = (value: number) => Math.round(value * 10) / 10;

/** Pembulatan dua desimal (konvensi laporan UEQ), tahan terhadap galat kecil bilangan pecahan. */
export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Simpangan baku sampel (n - 1); untuk n = 1 tidak terdefinisi, dilaporkan 0. */
export function sampleSd(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const center = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (n - 1));
}
