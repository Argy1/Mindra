import 'server-only';
import { isMoodType, type MoodType } from '@/lib/domain/journal/mood';
import { createClient } from '@/lib/supabase/server';

/** Pembacaan jurnal mood dan tidur milik pengguna yang sedang masuk (klien sesi, RLS). */

export interface MoodEntry {
  id: string;
  moodType: MoodType;
  energyLevel: number | null;
  triggers: string[];
  note: string;
  /** ISO. */
  createdAt: string;
}

export interface SleepEntry {
  id: string;
  bedtime: string;
  wakeTime: string;
  quality: number;
  notes: string;
}

/** Catatan perasaan terbaru (baru → lama). Jenis yang tak dikenal (data dari versi lain) dilewati. */
export async function getRecentMoodEntries(limit = 20): Promise<MoodEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mood_entries')
    .select('id, mood_type, energy_level, triggers, note, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error('Gagal memuat catatan perasaan.');
  return (data ?? []).flatMap((row) =>
    isMoodType(row.mood_type)
      ? [
          {
            id: row.id,
            moodType: row.mood_type,
            energyLevel: row.energy_level,
            triggers: row.triggers,
            note: row.note,
            createdAt: row.created_at,
          },
        ]
      : [],
  );
}

/** Catatan tidur terbaru (baru → lama). */
export async function getRecentSleepEntries(limit = 20): Promise<SleepEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sleep_entries')
    .select('id, bedtime, wake_time, quality, notes')
    .order('wake_time', { ascending: false })
    .limit(limit);
  if (error) throw new Error('Gagal memuat catatan tidur.');
  return (data ?? []).map((row) => ({
    id: row.id,
    bedtime: row.bedtime,
    wakeTime: row.wake_time,
    quality: row.quality,
    notes: row.notes,
  }));
}
