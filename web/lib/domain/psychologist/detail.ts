import { isMoodType, MOOD_TYPES, type MoodType } from '@/lib/domain/journal/mood';
import { dateKeyWib, lastDaysKeys } from '@/lib/utils/date';

/**
 * Ringkasan data satu klien untuk halaman /psikolog/klien/[id]. Fungsi murni atas baris yang SUDAH
 * disaring RLS dan izin: ringkasan hanya merangkum, tidak menambah data baru.
 */

export const DETAIL_WINDOW_DAYS = 14;

/** Kurang dari ini dihitung "malam pendek" (di bawah anjuran tidur dewasa 7 jam, dengan ruang 1 jam). */
export const SHORT_NIGHT_HOURS = 6;

export interface MoodOverview {
  /** Satu entri per hari (lama → baru); `mood` null = belum check-in. */
  days: { key: string; mood: MoodType | null }[];
  checkInDays: number;
  /** Perasaan yang paling sering dicatat dalam jendela; seri dimenangkan urutan MOOD_TYPES. */
  top: { mood: MoodType; count: number } | null;
}

export function summarizeMoods(
  moods: readonly { mood_type: string; created_at: string }[],
  today: string,
  windowDays: number = DETAIL_WINDOW_DAYS,
): MoodOverview {
  const keys = lastDaysKeys(today, windowDays);
  const inWindow = new Set(keys);
  const firstOfDay = new Map<string, MoodType>();
  const counts = new Map<MoodType, number>();

  for (const row of [...moods].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const key = dateKeyWib(row.created_at);
    if (!inWindow.has(key) || !isMoodType(row.mood_type)) continue;
    if (!firstOfDay.has(key)) firstOfDay.set(key, row.mood_type);
    counts.set(row.mood_type, (counts.get(row.mood_type) ?? 0) + 1);
  }

  let top: MoodOverview['top'] = null;
  for (const mood of MOOD_TYPES) {
    const count = counts.get(mood) ?? 0;
    if (count > 0 && (top === null || count > top.count)) top = { mood, count };
  }

  return {
    days: keys.map((key) => ({ key, mood: firstOfDay.get(key) ?? null })),
    checkInDays: firstOfDay.size,
    top,
  };
}

export interface SleepOverview {
  /** Jam tidur per hari bangun (lama → baru); null = tidak ada catatan. */
  days: { key: string; hours: number | null }[];
  nights: number;
  avgHours: number | null;
  /** Rata-rata kualitas 1–5. */
  avgQuality: number | null;
  shortNights: number;
}

export function summarizeSleep(
  sleeps: readonly { bedtime: string; wake_time: string; quality: number }[],
  today: string,
  windowDays: number = DETAIL_WINDOW_DAYS,
): SleepOverview {
  const keys = lastDaysKeys(today, windowDays);
  const inWindow = new Set(keys);
  const hoursByDay = new Map<string, number>();
  const qualities: number[] = [];

  for (const row of sleeps) {
    const key = dateKeyWib(row.wake_time);
    if (!inWindow.has(key)) continue;
    const hours = (new Date(row.wake_time).getTime() - new Date(row.bedtime).getTime()) / 3_600_000;
    if (!Number.isFinite(hours) || hours <= 0) continue;
    // Beberapa catatan di hari yang sama (mis. tidur siang) dijumlahkan menjadi total tidur hari itu.
    hoursByDay.set(key, (hoursByDay.get(key) ?? 0) + hours);
    qualities.push(row.quality);
  }

  const values = [...hoursByDay.values()];
  const average = (list: readonly number[]) =>
    list.length === 0 ? null : list.reduce((sum, value) => sum + value, 0) / list.length;

  return {
    days: keys.map((key) => ({ key, hours: hoursByDay.get(key) ?? null })),
    nights: values.length,
    avgHours: average(values),
    avgQuality: average(qualities),
    shortNights: values.filter((hours) => hours < SHORT_NIGHT_HOURS).length,
  };
}
