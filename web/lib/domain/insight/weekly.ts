/**
 * Agregasi insight 7 hari. Port dari `WeeklyInsightRepositoryImpl.getWeeklyInsight`
 * (lib/features/home/data/repositories/weekly_insight_repository_impl.dart) tanpa bagian I/O:
 * fungsi ini menerima baris mentah dari Supabase lalu menyusun hasilnya, sehingga bisa diuji tanpa database.
 *
 * Perbedaan yang disengaja dari Flutter:
 *   * Jendela = 7 hari TERAKHIR berakhir hari ini (WIB), bukan "minggu kalender" (sesuai
 *     design/app-beranda.html: hari ini selalu kolom terakhir).
 *   * Catatan tidur dikelompokkan menurut HARI BANGUN (malam yang berakhir pagi ini = hari ini),
 *     bukan menurut jam tidur.
 *   * Streak tidak langsung nol di pagi hari sebelum check-in: dihitung mundur dari hari ini bila
 *     sudah check-in, dan dari kemarin bila belum.
 */
import {
  addDaysToKey,
  dateKeyWib,
  lastDaysKeys,
  weekdayLongId,
  weekdayShortId,
} from '@/lib/utils/date';
import { moodTypeToScore } from '@/lib/domain/journal/mood';
import {
  buildBadges,
  buildNarrative,
  buildPatterns,
  buildRecommendation,
  computeMoodTrend,
  computeSleepTrend,
  type BadgeId,
  type MoodTrend,
  type SleepTrend,
} from './engine';

export interface MoodRow {
  mood_type: string;
  created_at: string;
}

export interface SleepRow {
  bedtime: string;
  wake_time: string;
  quality: number;
}

export interface WeeklyInsightInput {
  /** Hari ini, kunci tanggal WIB "YYYY-MM-DD". */
  today: string;
  /** Catatan mood; baris di luar jendela 7 hari diabaikan. */
  moods: readonly MoodRow[];
  /** Catatan tidur; baris dengan hari bangun di luar jendela diabaikan. */
  sleeps: readonly SleepRow[];
  assessmentsDone: number;
  /** Waktu catatan mood terbaru (sekitar 30 terakhir), untuk menghitung streak. */
  recentMoodTimestamps: readonly string[];
  cbtSessions?: number;
  reflections?: number;
}

export interface DayPoint {
  /** "YYYY-MM-DD" (WIB). */
  date: string;
  /** "Rab". */
  dayLabel: string;
  /** "Rabu" (untuk teks alternatif). */
  dayName: string;
  isToday: boolean;
  /** 1–5, null = belum check-in. */
  moodScore: number | null;
  moodType: string | null;
  /** Total jam tidur yang berakhir pada hari ini, null = tidak ada catatan. */
  sleepHours: number | null;
}

export interface WeeklyInsight {
  days: DayPoint[];
  avgMood: number | null;
  moodTrend: MoodTrend;
  avgSleepHours: number | null;
  sleepTrend: SleepTrend;
  goodSleepNights: number;
  /** Jumlah hari (dari 7) yang punya check-in. */
  checkInDays: number;
  assessmentsDone: number;
  streakDays: number;
  /** Hari paling berat (skor terendah ≤ 3, seri → yang terbaru), atau null. */
  hardestDay: { dayName: string; moodType: string } | null;
  narrative: string;
  patterns: string[];
  recommendation: string | null;
  badges: BadgeId[];
}

export const WEEK_LENGTH = 7;

const MS_PER_HOUR = 3_600_000;

const hoursBetween = (from: string, to: string): number =>
  (new Date(to).getTime() - new Date(from).getTime()) / MS_PER_HOUR;

/** Hari berurutan yang punya check-in, mundur dari hari ini (atau kemarin bila hari ini belum). */
export function computeStreak(timestamps: readonly string[], today: string): number {
  const days = new Set(timestamps.map((timestamp) => dateKeyWib(timestamp)));
  let cursor = days.has(today) ? today : addDaysToKey(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDaysToKey(cursor, -1);
  }
  return streak;
}

export function buildWeeklyInsight(input: WeeklyInsightInput): WeeklyInsight {
  const { today, moods, sleeps, assessmentsDone, recentMoodTimestamps } = input;
  const cbt = input.cbtSessions ?? 0;
  const reflections = input.reflections ?? 0;
  const keys = lastDaysKeys(today, WEEK_LENGTH);
  const inWindow = new Set(keys);

  // Mood: catatan PERTAMA tiap hari (urut waktu), seperti Flutter.
  const firstMoodByDay = new Map<string, MoodRow>();
  for (const row of [...moods].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const key = dateKeyWib(row.created_at);
    if (inWindow.has(key) && !firstMoodByDay.has(key)) firstMoodByDay.set(key, row);
  }

  // Tidur: dikelompokkan menurut hari bangun.
  const weekSleeps = [...sleeps]
    .filter((row) => inWindow.has(dateKeyWib(row.wake_time)))
    .sort((a, b) => a.bedtime.localeCompare(b.bedtime));
  const sleepHoursByDay = new Map<string, number>();
  for (const row of weekSleeps) {
    const key = dateKeyWib(row.wake_time);
    sleepHoursByDay.set(
      key,
      (sleepHoursByDay.get(key) ?? 0) + hoursBetween(row.bedtime, row.wake_time),
    );
  }

  const days: DayPoint[] = keys.map((key) => {
    const mood = firstMoodByDay.get(key);
    return {
      date: key,
      dayLabel: weekdayShortId(key),
      dayName: weekdayLongId(key),
      isToday: key === today,
      moodScore: mood ? moodTypeToScore(mood.mood_type) : null,
      moodType: mood ? mood.mood_type : null,
      sleepHours: sleepHoursByDay.get(key) ?? null,
    };
  });

  const scored = days.flatMap((day) => (day.moodScore === null ? [] : [day.moodScore]));
  const avgMood = scored.length === 0 ? null : scored.reduce((a, b) => a + b, 0) / scored.length;
  const moodTrend = computeMoodTrend(days.map((day) => ({ score: day.moodScore })));

  const durations = weekSleeps.map((row) => hoursBetween(row.bedtime, row.wake_time));
  const avgSleepHours =
    durations.length === 0 ? null : durations.reduce((a, b) => a + b, 0) / durations.length;
  const qualities = weekSleeps.map((row) => row.quality);
  const goodSleepNights = qualities.filter((quality) => quality >= 4).length;
  const sleepTrend = computeSleepTrend(qualities);

  const streakDays = computeStreak(recentMoodTimestamps, today);

  let hardestDay: WeeklyInsight['hardestDay'] = null;
  if (scored.length >= 2) {
    const lowest = Math.min(...scored);
    if (lowest <= 3) {
      const day = [...days].reverse().find((candidate) => candidate.moodScore === lowest);
      if (day?.moodType) hardestDay = { dayName: day.dayName, moodType: day.moodType };
    }
  }

  return {
    days,
    avgMood,
    moodTrend,
    avgSleepHours,
    sleepTrend,
    goodSleepNights,
    checkInDays: scored.length,
    assessmentsDone,
    streakDays,
    hardestDay,
    narrative: buildNarrative({
      avgMood,
      moodTrend,
      avgSleep: avgSleepHours,
      moodCount: scored.length,
      cbt,
      assessments: assessmentsDone,
      reflections,
    }),
    patterns: buildPatterns({
      avgMood,
      moodTrend,
      avgSleep: avgSleepHours,
      goodSleepNights,
      cbt,
      streak: streakDays,
    }),
    // Latihan CBT dan refleksi malam belum ada di web; jangan menyarankannya di sini.
    recommendation: buildRecommendation({
      avgMood,
      avgSleep: avgSleepHours,
      assessments: assessmentsDone,
      cbt,
      reflections,
      practicesAvailable: false,
    }),
    badges: buildBadges({
      streak: streakDays,
      goodSleep: goodSleepNights,
      cbt,
      assessments: assessmentsDone,
      reflections,
    }),
  };
}
