'use server';

import { revalidatePath } from 'next/cache';
import { GENERIC_ERROR, NETWORK_ERROR, NOT_CONFIGURED_ERROR } from '@/lib/auth/errors';
import type { FormState } from '@/lib/auth/form-state';
import { getSessionState } from '@/lib/auth/session';
import {
  composeSleepWindow,
  SLEEP_PROBLEM_MESSAGE,
  type SleepWindowProblem,
} from '@/lib/domain/journal/sleep';
import { readPublicEnv } from '@/lib/env/public';
import { insertMoodEntry, insertSleepEntry } from '@/lib/journal/entries';
import { createClient } from '@/lib/supabase/server';
import {
  entryIdSchema,
  firstFieldErrors,
  moodFieldsFromForm,
  moodInputSchema,
  sleepFieldsFromForm,
  sleepInputSchema,
} from '@/lib/validation/journal';

/**
 * Server Action jurnal mood dan tidur. Urutan: validasi Zod → sesi → simpan lewat klien sesi
 * pengguna (RLS memastikan hanya data sendiri). Catatan perasaan dan tidur adalah data kesehatan:
 * tidak ada isinya yang dicatat ke log.
 */

const SESSION_ENDED = 'Sesimu sudah berakhir. Masuk lagi untuk menyimpan catatan.';

const failure = (message: string, values?: Record<string, string>): FormState => ({
  status: 'error',
  message,
  ...(values ? { values } : {}),
});

/** Kolom formulir yang menampung tiap masalah jendela tidur (untuk pesan di bawah kolom yang tepat). */
const SLEEP_PROBLEM_FIELD: Readonly<Record<SleepWindowProblem, string>> = {
  'invalid-date': 'wakeDate',
  'invalid-time': 'bedtime',
  'same-time': 'bedtime',
  'too-short': 'bedtime',
  'too-long': 'bedtime',
  'in-future': 'wakeTime',
  'too-old': 'wakeDate',
};

function revalidateJournal() {
  revalidatePath('/jurnal');
  revalidatePath('/beranda');
}

// ─── Mood ─────────────────────────────────────────────────────────────────────
export async function saveMoodAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = moodFieldsFromForm(formData);
  const values = {
    moodType: typeof raw.moodType === 'string' ? raw.moodType : '',
    energyLevel: String(raw.energyLevel ?? ''),
    triggers: Array.isArray(raw.triggers) ? raw.triggers.join(',') : '',
    note: typeof raw.note === 'string' ? raw.note : '',
  };

  const parsed = moodInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', fieldErrors: firstFieldErrors(parsed.error), values };
  }
  if (!readPublicEnv().ok) return failure(NOT_CONFIGURED_ERROR, values);

  const session = await getSessionState();
  if (session.status !== 'ok') return failure(SESSION_ENDED, values);

  try {
    const supabase = await createClient();
    const saved = await insertMoodEntry(supabase, session.profile.id, parsed.data);
    if (!saved.ok) return failure(GENERIC_ERROR, values);
  } catch {
    return failure(NETWORK_ERROR, values);
  }

  revalidateJournal();
  return { status: 'success', message: 'Tersimpan. Terima kasih sudah mencatat perasaanmu.' };
}

// ─── Tidur ────────────────────────────────────────────────────────────────────
export async function saveSleepAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = sleepFieldsFromForm(formData);
  const values = {
    wakeDate: String(raw.wakeDate ?? ''),
    bedtime: String(raw.bedtime ?? ''),
    wakeTime: String(raw.wakeTime ?? ''),
    quality: raw.quality === undefined ? '' : String(raw.quality),
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  };

  const parsed = sleepInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', fieldErrors: firstFieldErrors(parsed.error), values };
  }

  const window = composeSleepWindow(parsed.data);
  if (!window.ok) {
    return {
      status: 'error',
      fieldErrors: { [SLEEP_PROBLEM_FIELD[window.problem]]: SLEEP_PROBLEM_MESSAGE[window.problem] },
      values,
    };
  }
  if (!readPublicEnv().ok) return failure(NOT_CONFIGURED_ERROR, values);

  const session = await getSessionState();
  if (session.status !== 'ok') return failure(SESSION_ENDED, values);

  try {
    const supabase = await createClient();
    const saved = await insertSleepEntry(supabase, session.profile.id, window, parsed.data);
    if (!saved.ok) return failure(GENERIC_ERROR, values);
  } catch {
    return failure(NETWORK_ERROR, values);
  }

  revalidateJournal();
  return { status: 'success', message: 'Tersimpan. Catatan tidurmu sudah masuk.' };
}

// ─── Hapus ────────────────────────────────────────────────────────────────────
async function deleteOwnEntry(
  table: 'mood_entries' | 'sleep_entries',
  formData: FormData,
): Promise<FormState> {
  const id = entryIdSchema.safeParse(formData.get('id'));
  if (!id.success) return failure(id.error.issues[0]?.message ?? GENERIC_ERROR);
  if (!readPublicEnv().ok) return failure(NOT_CONFIGURED_ERROR);

  const session = await getSessionState();
  if (session.status !== 'ok') return failure(SESSION_ENDED);

  try {
    const supabase = await createClient();
    // `user_id` ikut disaring selain RLS (pertahanan berlapis, dan menghindari menghapus baris orang lain).
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id.data)
      .eq('user_id', session.profile.id);
    if (error) return failure(GENERIC_ERROR);
  } catch {
    return failure(NETWORK_ERROR);
  }

  revalidateJournal();
  return { status: 'success', message: 'Catatan dihapus.' };
}

export async function deleteMoodEntryAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  return deleteOwnEntry('mood_entries', formData);
}

export async function deleteSleepEntryAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  return deleteOwnEntry('sleep_entries', formData);
}
