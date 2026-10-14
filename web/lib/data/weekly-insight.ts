import type { SupabaseClient } from '@supabase/supabase-js';
import { buildWeeklyInsight, type WeeklyInsight } from '@/lib/domain/insight/weekly';
import type { Database } from '@/lib/supabase/database.types';
import { addDaysToKey, dateKeyWib } from '@/lib/utils/date';

/**
 * Insight 7 hari terakhir milik `userId`. Dipakai beranda web dan `GET /api/v1/insights/weekly`.
 *
 * Semua kueri DIBATASI `user_id = userId` secara eksplisit, bukan hanya mengandalkan RLS: policy
 * "linked viewers" membuat token psikolog/pendamping bisa membaca data klien yang mengizinkan, dan
 * jalur API tidak mencatat akses itu. Dengan penyaring eksplisit, token apa pun hanya pernah
 * mendapat insight akunnya sendiri.
 *
 * Bila salah satu kueri gagal, fungsi MELEMPAR: "belum ada data" yang palsu menyesatkan untuk
 * aplikasi kesehatan.
 */
export async function loadWeeklyInsight(
  supabase: SupabaseClient<Database>,
  userId: string,
  now: Date = new Date(),
): Promise<WeeklyInsight> {
  const today = dateKeyWib(now);
  // Mulai jendela 7 hari = awal hari (WIB) 6 hari lalu; ditambah 1 hari cadangan untuk batas zona.
  const windowStart = `${addDaysToKey(today, -7)}T00:00:00+07:00`;
  const weekStartKey = addDaysToKey(today, -6);
  const weekStartIso = `${weekStartKey}T00:00:00+07:00`;

  const [moods, sleeps, recent, assessments, exercises, reflections] = await Promise.all([
    supabase
      .from('mood_entries')
      .select('mood_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: true }),
    supabase
      .from('sleep_entries')
      .select('bedtime, wake_time, quality')
      .eq('user_id', userId)
      .gte('wake_time', windowStart)
      .order('bedtime', { ascending: true }),
    supabase
      .from('mood_entries')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('assessments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('completed_at', weekStartIso),
    // Latihan dari aplikasi mobile ikut terhitung: satu backend, satu cerita.
    supabase
      .from('exercise_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('completed_at', weekStartIso),
    supabase
      .from('night_reflections')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('date', weekStartKey),
  ]);

  for (const result of [moods, sleeps, recent, assessments, exercises, reflections]) {
    if (result.error) throw new Error('Gagal memuat insight mingguan.');
  }

  return buildWeeklyInsight({
    today,
    moods: moods.data ?? [],
    sleeps: sleeps.data ?? [],
    assessmentsDone: assessments.count ?? 0,
    recentMoodTimestamps: (recent.data ?? []).map((row) => row.created_at),
    cbtSessions: exercises.count ?? 0,
    reflections: reflections.count ?? 0,
  });
}
