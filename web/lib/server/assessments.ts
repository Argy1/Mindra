import 'server-only';
import { assessmentIdSchema } from '@/lib/validation/assessment';
import { isAssessmentCategory, type AssessmentCategory } from '@/lib/domain/assessment/category';
import { isInstrumentId, type InstrumentId } from '@/lib/domain/assessment/instruments';
import type { Answers } from '@/lib/domain/assessment/scoring';
import { createClient } from '@/lib/supabase/server';

/**
 * Pembacaan hasil asesmen untuk pengguna yang sedang masuk. Memakai klien sesi (RLS), jadi baris
 * milik orang lain tidak pernah terbaca walau id-nya ditebak.
 */

export interface AssessmentSummary {
  id: string;
  type: InstrumentId;
  score: number;
  category: AssessmentCategory;
  /** ISO. */
  completedAt: string;
}

export interface StoredAssessment extends AssessmentSummary {
  /** Jawaban mentah per butir, untuk mendeteksi ulang krisis dari data yang tersimpan. */
  answers: Answers;
}

interface Row {
  id: string;
  type: string;
  total_score: number;
  category: string | null;
  completed_at: string;
  answers?: unknown;
}

function toSummary(row: Row): AssessmentSummary | null {
  if (!isInstrumentId(row.type)) return null;
  return {
    id: row.id,
    type: row.type,
    score: row.total_score,
    // Baris lama tanpa kategori valid: dianggap minimal supaya tidak salah menakut-nakuti.
    category: isAssessmentCategory(row.category) ? row.category : 'minimal',
    completedAt: row.completed_at,
  };
}

/** [{question_id, score}] → { question_id: score }; elemen yang rusak dilewati. */
export function parseStoredAnswers(raw: unknown): Answers {
  const result: Record<string, number> = {};
  if (!Array.isArray(raw)) return result;
  for (const item of raw) {
    if (
      item !== null &&
      typeof item === 'object' &&
      typeof (item as { question_id?: unknown }).question_id === 'string' &&
      typeof (item as { score?: unknown }).score === 'number'
    ) {
      const { question_id, score } = item as { question_id: string; score: number };
      result[question_id] = score;
    }
  }
  return result;
}

/** Satu hasil lengkap, atau null bila id tidak valid / bukan milik pengguna / jenisnya tidak dikenal. */
export async function getAssessmentById(id: string): Promise<StoredAssessment | null> {
  if (!assessmentIdSchema.safeParse(id).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assessments')
    .select('id, type, total_score, category, completed_at, answers')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Gagal memuat hasil skrining.');
  if (!data) return null;
  const summary = toSummary(data);
  return summary ? { ...summary, answers: parseStoredAnswers(data.answers) } : null;
}

/** Riwayat satu instrumen, urut LAMA → BARU (siap digambar sebagai tren). */
export async function getAssessmentHistory(
  type: InstrumentId,
  limit = 10,
): Promise<AssessmentSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assessments')
    .select('id, type, total_score, category, completed_at')
    .eq('type', type)
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error('Gagal memuat riwayat skrining.');
  return (data ?? [])
    .flatMap((row) => {
      const summary = toSummary(row);
      return summary ? [summary] : [];
    })
    .reverse();
}

/** Hasil terbaru tiap instrumen (untuk daftar /asesmen dan beranda). */
export async function getLatestPerInstrument(): Promise<
  Partial<Record<InstrumentId, AssessmentSummary>>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assessments')
    .select('id, type, total_score, category, completed_at')
    .order('completed_at', { ascending: false })
    .limit(60);
  if (error) throw new Error('Gagal memuat skrining terakhir.');

  const latest: Partial<Record<InstrumentId, AssessmentSummary>> = {};
  for (const row of data ?? []) {
    const summary = toSummary(row);
    if (summary && !latest[summary.type]) latest[summary.type] = summary;
  }
  return latest;
}

/** Jumlah asesmen sejak waktu tertentu (ISO). */
export async function countAssessmentsSince(sinceIso: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('assessments')
    .select('id', { count: 'exact', head: true })
    .gte('completed_at', sinceIso);
  if (error) throw new Error('Gagal memuat jumlah skrining.');
  return count ?? 0;
}
