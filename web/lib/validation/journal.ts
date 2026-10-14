import { z } from 'zod';
import { MOOD_TRIGGERS, MOOD_TYPES } from '@/lib/domain/journal/mood';

/**
 * Skema Zod jurnal. Dipakai Server Action (sumber kebenaran) dan boleh dipakai klien untuk umpan
 * balik cepat. Nilai enum SAMA dengan aplikasi Flutter karena tabelnya dipakai bersama.
 */

export const MOOD_NOTE_MAX = 500;
export const SLEEP_NOTE_MAX = 500;

const noteField = (max: number) =>
  z
    .string({ error: 'Catatan tidak valid.' })
    .trim()
    .max(max, {
      error: `Catatan maksimal ${max} karakter.`,
    });

export const moodInputSchema = z
  .object({
    moodType: z.enum(MOOD_TYPES, { error: 'Pilih salah satu perasaan.' }),
    energyLevel: z
      .number({ error: 'Pilih tingkat energi dari 1 sampai 5.' })
      .int({ error: 'Pilih tingkat energi dari 1 sampai 5.' })
      .min(1, { error: 'Pilih tingkat energi dari 1 sampai 5.' })
      .max(5, { error: 'Pilih tingkat energi dari 1 sampai 5.' }),
    triggers: z
      .array(z.enum(MOOD_TRIGGERS, { error: 'Pemicu tidak dikenal.' }))
      .max(MOOD_TRIGGERS.length, { error: 'Terlalu banyak pemicu.' }),
    note: noteField(MOOD_NOTE_MAX),
  })
  .strict();

export type MoodInput = z.infer<typeof moodInputSchema>;

/** Energi bawaan bila tidak dipilih (check-in cepat), sama dengan aplikasi Flutter. */
export const DEFAULT_ENERGY = 3;

/** Mengubah FormData menjadi bentuk mentah untuk {@link moodInputSchema}. */
export function moodFieldsFromForm(formData: FormData): Record<string, unknown> {
  const energy = formData.get('energyLevel');
  return {
    moodType: formData.get('moodType') ?? undefined,
    energyLevel: energy === null || energy === '' ? DEFAULT_ENERGY : Number(energy),
    triggers: [...new Set(formData.getAll('triggers').map(String))],
    note: formData.get('note') ?? '',
  };
}

export const sleepInputSchema = z
  .object({
    wakeDate: z
      .string({ error: 'Pilih tanggal bangun.' })
      .min(1, { error: 'Pilih tanggal bangun.' }),
    bedtime: z.string({ error: 'Isi jam tidur.' }).min(1, { error: 'Isi jam tidur.' }),
    wakeTime: z.string({ error: 'Isi jam bangun.' }).min(1, { error: 'Isi jam bangun.' }),
    quality: z
      .number({ error: 'Pilih kualitas tidurmu dari 1 sampai 5.' })
      .int({ error: 'Pilih kualitas tidurmu dari 1 sampai 5.' })
      .min(1, { error: 'Pilih kualitas tidurmu dari 1 sampai 5.' })
      .max(5, { error: 'Pilih kualitas tidurmu dari 1 sampai 5.' }),
    notes: noteField(SLEEP_NOTE_MAX),
  })
  .strict();

export type SleepInput = z.infer<typeof sleepInputSchema>;

export function sleepFieldsFromForm(formData: FormData): Record<string, unknown> {
  const quality = formData.get('quality');
  return {
    wakeDate: formData.get('wakeDate') ?? '',
    bedtime: formData.get('bedtime') ?? '',
    wakeTime: formData.get('wakeTime') ?? '',
    quality: quality === null || quality === '' ? undefined : Number(quality),
    notes: formData.get('notes') ?? '',
  };
}

export const entryIdSchema = z.uuid({ error: 'Catatan tidak ditemukan.' });

/** Satu pesan galat pertama per kolom (bentuk yang dipakai FormState.fieldErrors). */
export function firstFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}
