import type { SupabaseClient } from '@supabase/supabase-js';
import { type z } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { decodeCursor, olderThanCursor, toPage } from '@/lib/api/cursor';
import type {
  assessmentResultSchema,
  assessmentsQuery,
  createAssessmentBody,
} from '@/lib/api/schemas';
import { prepareAssessment } from '@/lib/assessment/prepare';
import { insertAssessment } from '@/lib/assessment/submit';
import { isAssessmentCategory, type CATEGORY_LABEL } from '@/lib/domain/assessment/category';
import { isInstrumentId, type InstrumentId } from '@/lib/domain/assessment/instruments';
import { recommendationsFor } from '@/lib/domain/assessment/recommendations';
import { maxScoreFor } from '@/lib/domain/assessment/scoring';
import { detectAssessmentCrisis } from '@/lib/domain/crisis/detector';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Layanan asesmen untuk API v1. Semua kueri DIBATASI `user_id = userId` secara eksplisit (bukan hanya RLS):
 * policy "linked viewers" membuat token psikolog/pendamping dapat membaca data klien yang mengizinkan,
 * dan jalur API tidak mencatat akses itu. Dengan penyaring eksplisit, token apa pun hanya mendapat data
 * miliknya sendiri.
 */

export const DISCLAIMER =
  'Ini hasil skrining, bukan diagnosis. Bicarakan dengan psikolog atau tenaga kesehatan bila kamu khawatir.';

export type AssessmentResult = z.infer<typeof assessmentResultSchema>;
type CreateBody = z.infer<typeof createAssessmentBody>;
type ListQuery = z.infer<typeof assessmentsQuery>;

export async function createAssessmentResult(
  supabase: SupabaseClient<Database>,
  userId: string,
  body: CreateBody,
  now: number = Date.now(),
): Promise<AssessmentResult> {
  const prepared = prepareAssessment(body);
  if (!prepared.ok) {
    throw new ApiError('validation_failed', undefined, {
      issues: [{ path: 'answers', message: prepared.message }],
    });
  }

  const outcome = await insertAssessment(supabase, userId, prepared.row, now);
  if (!outcome.ok) {
    if (outcome.reason === 'too_many') {
      throw new ApiError(
        'rate_limited',
        'Terlalu banyak skrining dalam satu jam terakhir. Coba lagi nanti.',
        { retryAfter: 3600, headers: { 'Retry-After': '3600' } },
      );
    }
    throw new ApiError('internal_error');
  }

  const { row } = prepared;
  // Butir krisis dinilai dari jawaban MENTAH yang tersimpan, sama dengan detektor di web dan trigger database.
  const answers = Object.fromEntries(row.answers.map((item) => [item.question_id, item.score]));
  const crisisDetected = detectAssessmentCrisis(row.type, answers);

  return {
    id: outcome.id,
    type: row.type,
    totalScore: row.total_score,
    maxScore: maxScoreFor(row.type),
    category: row.category,
    completedAt: outcome.completedAt,
    crisis: {
      detected: crisisDetected,
      resource: crisisDetected
        ? {
            name: PRIMARY_CRISIS_RESOURCE.name,
            operator: PRIMARY_CRISIS_RESOURCE.operator,
            displayNumber: PRIMARY_CRISIS_RESOURCE.displayNumber,
            telHref: PRIMARY_CRISIS_RESOURCE.telHref,
            availability: PRIMARY_CRISIS_RESOURCE.availability,
          }
        : null,
    },
    recommendations: recommendationsFor(row.type, row.total_score).map((recommendation) => ({
      id: recommendation.id,
      title: recommendation.title,
      description: recommendation.description,
      highlight: Boolean(recommendation.highlight),
    })),
    disclaimer: DISCLAIMER,
  };
}

export interface AssessmentItem {
  id: string;
  type: InstrumentId;
  totalScore: number;
  category: keyof typeof CATEGORY_LABEL;
  completedAt: string;
}

/** Baris mentah yang dibutuhkan penyusun halaman dan pemeta FHIR; tidak memuat jawaban per butir. */
export interface AssessmentRowLite {
  id: string;
  type: string;
  total_score: number;
  category: string | null;
  completed_at: string;
}

export function toAssessmentItem(row: AssessmentRowLite): AssessmentItem | null {
  if (!isInstrumentId(row.type)) return null;
  return {
    id: row.id,
    type: row.type,
    totalScore: row.total_score,
    // Baris lama tanpa kategori valid dianggap minimal supaya tidak salah menakut-nakuti (sama dengan web).
    category: isAssessmentCategory(row.category) ? row.category : 'minimal',
    completedAt: row.completed_at,
  };
}

/** Satu halaman hasil skrining milik `userId`, terbaru dulu, dengan kursor keyset. */
export async function listAssessmentRows(
  supabase: SupabaseClient<Database>,
  userId: string,
  query: Pick<ListQuery, 'limit' | 'cursor'> & { type?: InstrumentId | undefined },
): Promise<{ rows: AssessmentRowLite[]; nextCursor: string | null }> {
  const cursor = decodeCursor(query.cursor);

  let request = supabase
    .from('assessments')
    .select('id, type, total_score, category, completed_at')
    .eq('user_id', userId);
  if (query.type) request = request.eq('type', query.type);
  if (cursor) request = request.or(olderThanCursor('completed_at', cursor));

  const { data, error } = await request
    .order('completed_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(query.limit + 1);
  if (error) throw new ApiError('internal_error');

  const page = toPage(data ?? [], query.limit, (row) => ({ t: row.completed_at, id: row.id }));
  return { rows: page.items, nextCursor: page.nextCursor };
}

export async function listAssessments(
  supabase: SupabaseClient<Database>,
  userId: string,
  query: ListQuery,
): Promise<{ items: AssessmentItem[]; nextCursor: string | null }> {
  const page = await listAssessmentRows(supabase, userId, query);
  return {
    items: page.rows.flatMap((row) => {
      const item = toAssessmentItem(row);
      return item ? [item] : [];
    }),
    nextCursor: page.nextCursor,
  };
}
