const TIME_ZONE = 'Asia/Jakarta';

/**
 * Tanggal dalam Bahasa Indonesia, selalu zona WIB (bukan zona server/browser) supaya
 * hasil render server dan klien sama dan tidak memicu hydration mismatch.
 *   formatDateId(new Date('2026-10-13')) → "Selasa, 13 Oktober"
 */
export function formatDateId(
  date: Date,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' },
): string {
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: TIME_ZONE }).format(date);
}

// ─── Kunci tanggal WIB ("YYYY-MM-DD") ──────────────────────────────────────────
// Semua pengelompokan per hari (check-in, tidur, streak) memakai kunci ini, bukan zona server,
// supaya "hari ini" sama di server Vercel (UTC) dan di HP pengguna di Indonesia.

const KEY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const HOUR_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  hourCycle: 'h23',
});

/** Tanggal (zona WIB) dari sebuah waktu, mis. `2026-10-13T20:30:00Z` → "2026-10-14". */
export function dateKeyWib(input: Date | string | number): string {
  return KEY_FORMAT.format(new Date(input));
}

/** Geser kunci tanggal sejumlah hari (boleh negatif). */
export function addDaysToKey(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Kunci untuk `count` hari berurutan berakhir di `endKey` (urut lama → baru). */
export function lastDaysKeys(endKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDaysToKey(endKey, index - (count - 1)));
}

const WEEKDAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const;
const WEEKDAY_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

function weekdayIndex(key: string): number {
  return new Date(`${key}T00:00:00Z`).getUTCDay();
}

/** "Rab" untuk kunci tanggal hari Rabu. */
export function weekdayShortId(key: string): string {
  return WEEKDAY_SHORT[weekdayIndex(key)]!;
}

/** "Rabu" untuk kunci tanggal hari Rabu. */
export function weekdayLongId(key: string): string {
  return WEEKDAY_LONG[weekdayIndex(key)]!;
}

/** Jam (0–23) dalam zona WIB. */
export function hourWib(date: Date): number {
  return Number(HOUR_FORMAT.format(date));
}

/** Sapaan menurut jam WIB: pagi (4–10), siang (11–14), sore (15–17), malam (selebihnya). */
export function greetingForHour(hour: number): 'pagi' | 'siang' | 'sore' | 'malam' {
  if (hour >= 4 && hour < 11) return 'pagi';
  if (hour >= 11 && hour < 15) return 'siang';
  if (hour >= 15 && hour < 18) return 'sore';
  return 'malam';
}

/** Angka desimal gaya Indonesia: 6.6 → "6,6". */
export function formatDecimalId(value: number, fractionDigits = 1): string {
  return value.toFixed(fractionDigits).replace('.', ',');
}

const TIME_FORMAT = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Jam WIB gaya Indonesia: `2026-10-13T02:00:00Z` → "09.00". */
export function formatTimeId(input: Date | string | number): string {
  return TIME_FORMAT.format(new Date(input));
}

/** Hari dan tanggal singkat (WIB): `2026-10-15T02:00:00Z` → "Kam, 15 Okt". */
export function formatShortDayId(input: Date | string | number): string {
  const date = new Date(input);
  const day = formatDateId(date, { day: 'numeric', month: 'short' });
  return `${weekdayShortId(dateKeyWib(date))}, ${day}`;
}

/** True hanya untuk kunci "YYYY-MM-DD" yang ADA di kalender (2026-02-31 bukan; `Date.parse` menerimanya). */
export function isRealDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const date = new Date(`${key}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key;
}
