import type { SupabaseClient } from '@supabase/supabase-js';
import { MAX_SUBMISSIONS_PER_HOUR, type AssessmentRow } from '@/lib/assessment/prepare';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Menyimpan satu hasil skrining untuk `userId` lewat klien yang membawa sesi/token PENGGUNA itu (RLS
 * berlaku). Dipakai bersama oleh Server Action web dan `POST /api/v1/assessments`, supaya batas per jam
 * dan kolom yang disimpan tidak bisa menyimpang antara dua jalur masuk.
 *
 * `row` HARUS hasil `prepareAssessment` (skor dan kategori dihitung server). Alert krisis dibuat trigger
 * database dari jawaban yang tersimpan, bukan dari kode ini. Tidak ada isi jawaban yang dicatat ke log.
 */
export type SubmitOutcome =
  { ok: true; id: string; completedAt: string } | { ok: false; reason: 'too_many' | 'database' };

export async function insertAssessment(
  supabase: SupabaseClient<Database>,
  userId: string,
  row: AssessmentRow,
  now: number = Date.now(),
): Promise<SubmitOutcome> {
  const since = new Date(now - 3_600_000).toISOString();
  const { count, error: countError } = await supabase
    .from('assessments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('completed_at', since);
  if (countError) return { ok: false, reason: 'database' };
  if ((count ?? 0) >= MAX_SUBMISSIONS_PER_HOUR) return { ok: false, reason: 'too_many' };

  const completedAt = new Date(now).toISOString();
  const { data, error } = await supabase
    .from('assessments')
    .insert({
      user_id: userId,
      type: row.type,
      answers: row.answers,
      total_score: row.total_score,
      category: row.category,
      completed_at: completedAt,
      sent_to_satusehat: false,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, reason: 'database' };
  return { ok: true, id: data.id, completedAt };
}
