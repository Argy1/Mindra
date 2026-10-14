import { MOOD_LABEL, isMoodType } from '@/lib/domain/journal/mood';
import { formatDecimalId } from '@/lib/utils/date';
import type { DayPoint } from './weekly';

/**
 * Teks alternatif untuk grafik mood + tidur 7 hari (role="img"). Menyebut SETIAP hari, supaya
 * pembaca layar mendapat informasi yang sama dengan yang terlihat di grafik.
 *
 *   "Rabu tenang, tidur 7,5 jam. Kamis lelah, tidur 5,0 jam. … Selasa belum check-in, tidur belum dicatat."
 */
export function describeWeek(days: readonly DayPoint[]): string {
  const parts = days.map((day) => {
    const mood =
      day.moodType && isMoodType(day.moodType)
        ? MOOD_LABEL[day.moodType].toLowerCase()
        : 'belum check-in';
    const sleep =
      day.sleepHours === null
        ? 'tidur belum dicatat'
        : `tidur ${formatDecimalId(day.sleepHours)} jam`;
    return `${day.dayName} ${mood}, ${sleep}.`;
  });
  return `Mood dan jam tidur 7 hari terakhir. ${parts.join(' ')}`;
}

/** Tinggi batang tidur (0–100) untuk jam tidur tertentu; 9,6 jam = penuh, sama dengan skala desain. */
export function sleepBarPercent(hours: number): number {
  return Math.round(Math.min(100, Math.max(0, (hours / 9.6) * 100)));
}

/** Tidur dianggap cukup bila 7 jam atau lebih (warna sage di grafik). */
export const GOOD_SLEEP_HOURS = 7;
