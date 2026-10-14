/**
 * Kategori hasil skrining. Nilainya HARUS sama dengan keluaran SQL `public.classify_assessment`
 * (supabase/migrations/20240101000000_initial_schema.sql), supaya web dan mobile sepakat.
 * Aturan skoring lengkap (batas per instrumen) menyusul di lib/domain/assessment pada Fase 1.
 */
export const ASSESSMENT_CATEGORIES = ['minimal', 'mild', 'moderate', 'severe'] as const;

export type AssessmentCategory = (typeof ASSESSMENT_CATEGORIES)[number];

/** Label yang dilihat pengguna — tanpa istilah klinis ("gangguan", "diagnosis"). */
export const CATEGORY_LABEL: Record<AssessmentCategory, string> = {
  minimal: 'Minimal',
  mild: 'Ringan',
  moderate: 'Sedang',
  severe: 'Berat',
};

export function isAssessmentCategory(value: unknown): value is AssessmentCategory {
  return typeof value === 'string' && (ASSESSMENT_CATEGORIES as readonly string[]).includes(value);
}
