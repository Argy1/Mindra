import type { AssessmentCategory } from '@/lib/domain/assessment/category';
import { getInstrument, type InstrumentId } from '@/lib/domain/assessment/instruments';
import {
  categoryFor,
  computeClinicalScore,
  validateAnswers,
  type AnswerProblem,
} from '@/lib/domain/assessment/scoring';
import { submitAssessmentSchema } from '@/lib/validation/assessment';

/**
 * Batas pengiriman per jam per akun. Pencegah penyalahgunaan sederhana sampai rate limit Upstash
 * (Fase 3); satu orang mengisi keempat instrumen beberapa kali dalam sejam sudah sangat berlebih.
 * (Berkas Server Action tidak boleh mengekspor konstanta, jadi dinyatakan di sini.)
 */
export const MAX_SUBMISSIONS_PER_HOUR = 12;

/** Baris `assessments` yang siap disimpan. Skor dan kategori dihitung DI SINI, bukan dari klien. */
export interface AssessmentRow {
  type: InstrumentId;
  /** Jawaban MENTAH (belum dibalik), urut sesuai butir: format yang sama dengan aplikasi Flutter. */
  answers: { question_id: string; score: number }[];
  total_score: number;
  category: AssessmentCategory;
}

export type PrepareResult = { ok: true; row: AssessmentRow } | { ok: false; message: string };

const PROBLEM_MESSAGE: Readonly<Record<AnswerProblem, string>> = {
  missing: 'Masih ada pertanyaan yang belum dijawab. Kembali dan lengkapi dulu.',
  unknown: 'Ada jawaban yang tidak dikenal. Muat ulang halaman lalu coba lagi.',
  'invalid-value': 'Ada jawaban yang tidak valid. Muat ulang halaman lalu coba lagi.',
};

const MALFORMED = 'Skrining tidak bisa disimpan. Muat ulang halaman lalu coba lagi.';

/**
 * Memvalidasi permintaan menyimpan asesmen dari klien lalu menyusun baris yang akan disimpan.
 * Fungsi murni (tanpa I/O) supaya aturannya bisa diuji tanpa Supabase.
 */
export function prepareAssessment(input: unknown): PrepareResult {
  const parsed = submitAssessmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: MALFORMED };

  const { type, answers } = parsed.data;
  const validation = validateAnswers(type, answers);
  if (!validation.ok) return { ok: false, message: PROBLEM_MESSAGE[validation.problem] };

  const total = computeClinicalScore(type, validation.answers);
  return {
    ok: true,
    row: {
      type,
      answers: getInstrument(type).questions.map((question) => ({
        question_id: question.id,
        score: validation.answers[question.id]!,
      })),
      total_score: total,
      category: categoryFor(type, total),
    },
  };
}
