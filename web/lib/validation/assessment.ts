import { z } from 'zod';
import { INSTRUMENT_IDS } from '@/lib/domain/assessment/instruments';

/**
 * Bentuk permintaan menyimpan asesmen. Klien HANYA mengirim jenis instrumen dan jawaban mentah;
 * skor dan kategori tidak pernah diterima (dihitung server). Kelengkapan dan rentang tiap jawaban
 * diperiksa di `validateAnswers` (lib/domain/assessment/scoring.ts).
 */
export const submitAssessmentSchema = z
  .object({
    type: z.enum(INSTRUMENT_IDS, { error: 'Jenis skrining tidak dikenal.' }),
    answers: z.record(z.string(), z.unknown(), { error: 'Jawaban tidak valid.' }),
  })
  .strict();

export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;

export const assessmentIdSchema = z.uuid({ error: 'Hasil skrining tidak ditemukan.' });
