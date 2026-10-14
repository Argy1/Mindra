import { addDaysToKey, dateKeyWib, isRealDateKey } from '@/lib/utils/date';
import { SLEEP_MAX_MINUTES, SLEEP_MIN_MINUTES } from './mood';

/**
 * Menyusun jendela tidur dari isian formulir: tanggal bangun + jam tidur + jam bangun.
 *
 * Semua jam dimengerti sebagai WIB (UTC+7), sama dengan pengelompokan harian di seluruh aplikasi.
 * Jam tidur yang lebih LATE dari jam bangun berarti malam sebelumnya (22.30 → 06.00 = 7,5 jam);
 * jam tidur yang lebih awal berarti hari yang sama (tidur siang 13.00 → 14.00).
 */

export const WIB_OFFSET = '+07:00';

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type SleepWindowProblem =
  | 'invalid-date'
  | 'invalid-time'
  | 'same-time'
  | 'too-short'
  | 'too-long'
  | 'in-future'
  | 'too-old';

export type SleepWindowResult =
  | { ok: true; bedtime: string; wakeTime: string; minutes: number }
  | { ok: false; problem: SleepWindowProblem };

/** Catatan tidur boleh sampai sekian hari ke belakang (lebih lama dianggap salah isi). */
export const SLEEP_MAX_AGE_DAYS = 60;

/** Toleransi jam bangun di masa depan (selisih jam perangkat), menit. */
const FUTURE_TOLERANCE_MINUTES = 10;

export function composeSleepWindow(
  input: { wakeDate: string; bedtime: string; wakeTime: string },
  now: Date = new Date(),
): SleepWindowResult {
  if (!isRealDateKey(input.wakeDate)) return { ok: false, problem: 'invalid-date' };
  if (!TIME.test(input.bedtime) || !TIME.test(input.wakeTime)) {
    return { ok: false, problem: 'invalid-time' };
  }
  if (input.bedtime === input.wakeTime) return { ok: false, problem: 'same-time' };

  const bedDate =
    input.bedtime > input.wakeTime ? addDaysToKey(input.wakeDate, -1) : input.wakeDate;
  const bed = new Date(`${bedDate}T${input.bedtime}:00${WIB_OFFSET}`);
  const wake = new Date(`${input.wakeDate}T${input.wakeTime}:00${WIB_OFFSET}`);
  const minutes = Math.round((wake.getTime() - bed.getTime()) / 60_000);

  if (minutes < SLEEP_MIN_MINUTES) return { ok: false, problem: 'too-short' };
  if (minutes > SLEEP_MAX_MINUTES) return { ok: false, problem: 'too-long' };
  if (wake.getTime() > now.getTime() + FUTURE_TOLERANCE_MINUTES * 60_000) {
    return { ok: false, problem: 'in-future' };
  }
  if (input.wakeDate < addDaysToKey(dateKeyWib(now), -SLEEP_MAX_AGE_DAYS)) {
    return { ok: false, problem: 'too-old' };
  }

  return { ok: true, bedtime: bed.toISOString(), wakeTime: wake.toISOString(), minutes };
}

/** Pesan galat ramah per masalah (untuk kolom tanggal/jam di formulir). */
export const SLEEP_PROBLEM_MESSAGE: Readonly<Record<SleepWindowProblem, string>> = {
  'invalid-date': 'Tanggal bangun belum valid. Pilih tanggal dari kalender.',
  'invalid-time': 'Isi jam tidur dan jam bangun dengan format jam:menit, mis. 22:30.',
  'same-time': 'Jam tidur dan jam bangun tidak boleh sama.',
  'too-short': 'Durasi tidurnya kurang dari 30 menit. Periksa lagi jam tidur dan jam bangunmu.',
  'too-long': 'Durasi tidurnya lebih dari 16 jam. Periksa lagi jam tidur dan jam bangunmu.',
  'in-future': 'Jam bangunmu ada di masa depan. Pilih waktu yang sudah lewat.',
  'too-old':
    'Tanggalnya terlalu lama. Catatan tidur hanya bisa ditambahkan untuk 60 hari terakhir.',
};

/** 450 → "7 jam 30 menit"; 60 → "1 jam"; 45 → "45 menit". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} menit`;
  return rest === 0 ? `${hours} jam` : `${hours} jam ${rest} menit`;
}
