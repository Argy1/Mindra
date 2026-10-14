import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import { ApiError, type ValidationIssue } from '@/lib/api/errors';
import { decodeCursor, olderThanCursor, toPage } from '@/lib/api/cursor';
import type { createMoodBody, createSleepBody, entriesQuery } from '@/lib/api/schemas';
import { isMoodType, type MoodType } from '@/lib/domain/journal/mood';
import {
  composeSleepWindow,
  SLEEP_PROBLEM_MESSAGE,
  type SleepWindowProblem,
} from '@/lib/domain/journal/sleep';
import { insertMoodEntry, insertSleepEntry } from '@/lib/journal/entries';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Layanan mood dan tidur untuk API v1. Seperti layanan asesmen: setiap kueri dibatasi `user_id` secara
 * eksplisit, dan isi catatan tidak pernah dicatat ke log.
 */

type MoodBody = z.infer<typeof createMoodBody>;
type SleepBody = z.infer<typeof createSleepBody>;
type EntriesQuery = z.infer<typeof entriesQuery>;

/** Kolom permintaan yang menampung tiap masalah jendela tidur (supaya `issues[].path` tepat sasaran). */
const SLEEP_PROBLEM_PATH: Readonly<Record<SleepWindowProblem, string>> = {
  'invalid-date': 'wakeDate',
  'invalid-time': 'bedtime',
  'same-time': 'bedtime',
  'too-short': 'bedtime',
  'too-long': 'bedtime',
  'in-future': 'wakeTime',
  'too-old': 'wakeDate',
};

export interface MoodItem {
  id: string;
  moodType: MoodType;
  energyLevel: number | null;
  triggers: string[];
  note: string;
  createdAt: string;
}

export interface SleepItem {
  id: string;
  bedtime: string;
  wakeTime: string;
  quality: number;
  notes: string;
}

export async function createMood(
  supabase: SupabaseClient<Database>,
  userId: string,
  body: MoodBody,
): Promise<{ id: string; createdAt: string }> {
  const saved = await insertMoodEntry(supabase, userId, {
    moodType: body.moodType,
    energyLevel: body.energyLevel,
    triggers: body.triggers,
    note: body.note,
  });
  if (!saved.ok) throw new ApiError('internal_error');
  return saved.value;
}

export async function listMood(
  supabase: SupabaseClient<Database>,
  userId: string,
  query: EntriesQuery,
): Promise<{ items: MoodItem[]; nextCursor: string | null }> {
  const cursor = decodeCursor(query.cursor);
  let request = supabase
    .from('mood_entries')
    .select('id, mood_type, energy_level, triggers, note, created_at')
    .eq('user_id', userId);
  if (cursor) request = request.or(olderThanCursor('created_at', cursor));

  const { data, error } = await request
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(query.limit + 1);
  if (error) throw new ApiError('internal_error');

  const page = toPage(data ?? [], query.limit, (row) => ({ t: row.created_at, id: row.id }));
  return {
    // Jenis perasaan yang tak dikenal (data dari versi aplikasi lain) dilewati, seperti di web.
    items: page.items.flatMap((row) =>
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
    ),
    nextCursor: page.nextCursor,
  };
}

export async function createSleep(
  supabase: SupabaseClient<Database>,
  userId: string,
  body: SleepBody,
  now: Date = new Date(),
): Promise<{ id: string }> {
  const window = composeSleepWindow(body, now);
  if (!window.ok) {
    const issue: ValidationIssue = {
      path: SLEEP_PROBLEM_PATH[window.problem],
      message: SLEEP_PROBLEM_MESSAGE[window.problem],
    };
    throw new ApiError('validation_failed', undefined, { issues: [issue] });
  }
  const saved = await insertSleepEntry(supabase, userId, window, body);
  if (!saved.ok) throw new ApiError('internal_error');
  return saved.value;
}

export async function listSleep(
  supabase: SupabaseClient<Database>,
  userId: string,
  query: EntriesQuery,
): Promise<{ items: SleepItem[]; nextCursor: string | null }> {
  const cursor = decodeCursor(query.cursor);
  let request = supabase
    .from('sleep_entries')
    .select('id, bedtime, wake_time, quality, notes')
    .eq('user_id', userId);
  if (cursor) request = request.or(olderThanCursor('wake_time', cursor));

  const { data, error } = await request
    .order('wake_time', { ascending: false })
    .order('id', { ascending: false })
    .limit(query.limit + 1);
  if (error) throw new ApiError('internal_error');

  const page = toPage(data ?? [], query.limit, (row) => ({ t: row.wake_time, id: row.id }));
  return {
    items: page.items.map((row) => ({
      id: row.id,
      bedtime: row.bedtime,
      wakeTime: row.wake_time,
      quality: row.quality,
      notes: row.notes,
    })),
    nextCursor: page.nextCursor,
  };
}
