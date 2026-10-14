import type { SupabaseClient } from '@supabase/supabase-js';
import type { SleepWindowResult } from '@/lib/domain/journal/sleep';
import type { Database } from '@/lib/supabase/database.types';
import type { MoodInput, SleepInput } from '@/lib/validation/journal';

/**
 * Penyimpanan catatan mood dan tidur lewat klien milik PENGGUNA (RLS berlaku). Dipakai bersama oleh
 * Server Action web dan endpoint `/api/v1/mood-entries` dan `/api/v1/sleep-entries`, supaya kolom yang
 * ditulis sama. Isi catatan adalah data kesehatan: tidak pernah dicatat ke log.
 */
export type EntryOutcome<T> = { ok: true; value: T } | { ok: false };

export async function insertMoodEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: MoodInput,
): Promise<EntryOutcome<{ id: string; createdAt: string }>> {
  const { data, error } = await supabase
    .from('mood_entries')
    .insert({
      user_id: userId,
      mood_type: input.moodType,
      energy_level: input.energyLevel,
      triggers: input.triggers,
      note: input.note,
    })
    .select('id, created_at')
    .single();
  if (error || !data) return { ok: false };
  return { ok: true, value: { id: data.id, createdAt: data.created_at } };
}

export async function insertSleepEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  window: Extract<SleepWindowResult, { ok: true }>,
  input: Pick<SleepInput, 'quality' | 'notes'>,
): Promise<EntryOutcome<{ id: string }>> {
  const { data, error } = await supabase
    .from('sleep_entries')
    .insert({
      user_id: userId,
      bedtime: window.bedtime,
      wake_time: window.wakeTime,
      quality: input.quality,
      notes: input.notes,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false };
  return { ok: true, value: { id: data.id } };
}
