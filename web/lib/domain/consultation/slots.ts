import { addDaysToKey, dateKeyWib } from '@/lib/utils/date';

/**
 * Slot konsultasi. Aturan SAMA PERSIS dengan fungsi database `book_consultation` (migrasi 20261014000500):
 *   - jadwal psikolog adalah jam lokal WIB (Asia/Jakarta, tanpa DST) per hari dalam seminggu (0 = Minggu);
 *   - satu sesi 50 menit, awal sesi pada kisi 60 menit dari jam mulai jadwal;
 *   - sesi harus selesai sebelum jadwal berakhir;
 *   - paling cepat 1 jam dari sekarang, paling lama 30 hari ke depan;
 *   - slot yang beririsan dengan sesi aktif psikolog itu terisi.
 * Ini hanya tampilan. PENEGAKAN ada di database (constraint EXCLUDE + fungsi), jadi dua orang yang menekan slot
 * yang sama bersamaan tetap hanya satu yang berhasil. tests/db/consultation-parity.test.ts menjaga agar kode ini
 * dan fungsi database tidak bergeser.
 */

export const SESSION_MINUTES = 50;
export const STEP_MINUTES = 60;
export const MIN_LEAD_MINUTES = 60;
export const MAX_DAYS_AHEAD = 30;
/** Zona waktu jadwal: WIB = UTC+7 sepanjang tahun. */
export const WIB_OFFSET = '+07:00';

export interface ScheduleRow {
  /** 0 = Minggu … 6 = Sabtu (sama dengan kolom `day_of_week`). */
  dayOfWeek: number;
  /** "HH:MM" atau "HH:MM:SS". */
  start: string;
  end: string;
}

export interface BookedRange {
  /** ISO. */
  scheduledAt: string;
  durationMinutes: number;
}

export type SlotState = 'available' | 'taken' | 'too_soon' | 'too_far';

export interface Slot {
  /** ISO dengan offset +07:00, mis. `2026-10-15T09:00:00+07:00`. */
  startsAt: string;
  /** "09.00". */
  label: string;
  state: SlotState;
}

export interface SlotDay {
  /** Kunci tanggal WIB "YYYY-MM-DD". */
  date: string;
  slots: Slot[];
}

function minutesOf(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

const pad = (value: number) => String(value).padStart(2, '0');

export function startsAtFor(date: string, minutes: number): string {
  return `${date}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00${WIB_OFFSET}`;
}

function dayOfWeekOf(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

/** Satu hari: slot dari semua jadwal hari itu, urut waktu, tanpa duplikat bila jadwal saling tumpang. */
export function slotsForDay(
  date: string,
  schedules: readonly ScheduleRow[],
  booked: readonly BookedRange[],
  now: Date,
): Slot[] {
  const dow = dayOfWeekOf(date);
  const starts = new Set<number>();
  for (const row of schedules) {
    if (row.dayOfWeek !== dow) continue;
    const first = minutesOf(row.start);
    const last = minutesOf(row.end);
    for (let start = first; start + SESSION_MINUTES <= last; start += STEP_MINUTES)
      starts.add(start);
  }

  const earliest = now.getTime() + MIN_LEAD_MINUTES * 60_000;
  const latest = now.getTime() + MAX_DAYS_AHEAD * 86_400_000;
  const busy = booked.map((range) => {
    const from = new Date(range.scheduledAt).getTime();
    return { from, to: from + range.durationMinutes * 60_000 };
  });

  return [...starts]
    .sort((a, b) => a - b)
    .map((minutes): Slot => {
      const startsAt = startsAtFor(date, minutes);
      const from = new Date(startsAt).getTime();
      const to = from + SESSION_MINUTES * 60_000;
      const state: SlotState =
        from < earliest
          ? 'too_soon'
          : from > latest
            ? 'too_far'
            : busy.some((range) => range.from < to && from < range.to)
              ? 'taken'
              : 'available';
      return { startsAt, label: `${pad(Math.floor(minutes / 60))}.${pad(minutes % 60)}`, state };
    });
}

/** Slot untuk `days` hari ke depan mulai hari ini (WIB). Hari tanpa jadwal tetap ada, dengan daftar kosong. */
export function generateSlots(
  schedules: readonly ScheduleRow[],
  booked: readonly BookedRange[],
  now: Date,
  days: number,
): SlotDay[] {
  const today = dateKeyWib(now);
  return Array.from({ length: days }, (_, index) => {
    const date = addDaysToKey(today, index);
    return { date, slots: slotsForDay(date, schedules, booked, now) };
  });
}

export const countAvailable = (days: readonly SlotDay[]): number =>
  days.reduce(
    (total, day) => total + day.slots.filter((slot) => slot.state === 'available').length,
    0,
  );

/**
 * Keterangan satu hari di pemilih hari. Tiga keadaan yang berbeda artinya bagi pemesan:
 *   * tidak ada jadwal praktik hari itu → "libur" (tidak ada yang bisa dilakukan, bukan salah siapa pun);
 *   * ada jadwal tetapi semua jam sudah dipesan → "penuh";
 *   * ada jadwal tetapi tidak ada yang bisa dipesan karena waktunya (terlalu dekat atau terlalu jauh) → "tidak tersedia".
 */
export function dayAvailabilityLabel(day: SlotDay): string {
  if (day.slots.length === 0) return 'libur';
  const open = day.slots.filter((slot) => slot.state === 'available').length;
  if (open > 0) return `${open} jam`;
  return day.slots.some((slot) => slot.state === 'taken') ? 'penuh' : 'tidak tersedia';
}

/** Hari pertama yang masih punya slot tersedia, atau null. */
export function nextAvailable(days: readonly SlotDay[]): { date: string; slot: Slot } | null {
  for (const day of days) {
    const slot = day.slots.find((candidate) => candidate.state === 'available');
    if (slot) return { date: day.date, slot };
  }
  return null;
}
