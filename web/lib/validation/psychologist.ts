import { z } from 'zod';

export const SESSION_SUMMARY_MAX = 5000;
export const NOTES_FOR_PATIENT_MAX = 2000;

/**
 * Catatan sesi psikolog. `summary` adalah catatan klinis untuk psikolog sendiri (kolom
 * `consultations.session_summary`); `notesForPatient` boleh dibaca klien di aplikasinya.
 */
export const sessionNoteSchema = z
  .object({
    consultationId: z.uuid({ error: 'Sesi tidak ditemukan.' }),
    summary: z
      .string({ error: 'Catatan tidak valid.' })
      .trim()
      .max(SESSION_SUMMARY_MAX, {
        error: `Catatan sesi maksimal ${SESSION_SUMMARY_MAX} karakter.`,
      }),
    notesForPatient: z
      .string({ error: 'Catatan tidak valid.' })
      .trim()
      .max(NOTES_FOR_PATIENT_MAX, {
        error: `Catatan untuk klien maksimal ${NOTES_FOR_PATIENT_MAX} karakter.`,
      }),
  })
  .strict();

export type SessionNoteInput = z.infer<typeof sessionNoteSchema>;

export function sessionNoteFieldsFromForm(formData: FormData): Record<string, unknown> {
  return {
    consultationId: formData.get('consultationId') ?? '',
    summary: formData.get('summary') ?? '',
    notesForPatient: formData.get('notesForPatient') ?? '',
  };
}
