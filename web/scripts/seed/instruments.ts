import { int, type Rng } from './rng';

/**
 * Bentuk instrumen untuk DATA SINTETIS (bukan logika skoring produksi; itu ada di
 * lib/domain/assessment pada Fase 1). Batas kategori disalin dari SQL `classify_assessment`,
 * dan tests/seed memeriksa kesamaannya langsung terhadap fungsi SQL itu.
 */
export type InstrumentType = 'phq9' | 'gad7' | 'pss10';
export type Category = 'minimal' | 'mild' | 'moderate' | 'severe';

interface InstrumentSpec {
  items: number;
  /** Skor maksimal per butir. */
  itemMax: number;
  /** Nomor butir (1-based) yang dihitung terbalik. */
  reversed: readonly number[];
}

export const INSTRUMENTS: Record<InstrumentType, InstrumentSpec> = {
  phq9: { items: 9, itemMax: 3, reversed: [] },
  gad7: { items: 7, itemMax: 3, reversed: [] },
  pss10: { items: 10, itemMax: 4, reversed: [4, 5, 7, 8] },
};

export const maxScore = (type: InstrumentType): number =>
  INSTRUMENTS[type].items * INSTRUMENTS[type].itemMax;

/** Salinan `public.classify_assessment` (supabase/migrations/20240101000000_initial_schema.sql). */
export function categoryFor(type: InstrumentType, score: number): Category {
  if (type === 'pss10') {
    if (score <= 13) return 'minimal';
    if (score <= 26) return 'moderate';
    return 'severe';
  }
  // phq9 dan gad7 memakai batas yang sama
  if (score <= 4) return 'minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  return 'severe';
}

export interface StoredAnswer {
  question_id: string;
  score: number;
}

/**
 * Bangun jawaban per butir yang jumlahnya (setelah butir terbalik dihitung) = `total`.
 * Untuk PSS-10 yang disimpan adalah jawaban mentah: butir terbalik = itemMax − skor terhitung,
 * sama seperti aplikasi Flutter.
 *
 * `ideation` memaksa butir ke-9 PHQ-9 bernilai 1–2 (pikiran menyakiti diri) agar memicu alert
 * krisis. Bila `total` lebih kecil dari itu, totalnya naik; karena itu pemanggil WAJIB memakai
 * `totalFromAnswers` untuk mengisi `total_score`, bukan angka yang diminta.
 */
export function buildAnswers(
  rng: Rng,
  type: InstrumentType,
  total: number,
  options: { ideation?: boolean } = {},
): StoredAnswer[] {
  const spec = INSTRUMENTS[type];
  const scored = new Array<number>(spec.items).fill(0);
  let remaining = Math.max(0, Math.min(total, maxScore(type)));

  if (type === 'phq9' && options.ideation === true) {
    const ideation = Math.min(spec.itemMax, int(rng, 1, 2));
    scored[8] = ideation;
    remaining = Math.max(0, remaining - ideation);
  }

  while (remaining > 0) {
    const open = scored.flatMap((value, index) => (value < spec.itemMax ? [index] : []));
    if (open.length === 0) break;
    const index = open[int(rng, 0, open.length - 1)] as number;
    scored[index] = (scored[index] as number) + 1;
    remaining -= 1;
  }

  return scored.map((value, index) => {
    const number = index + 1;
    const raw = spec.reversed.includes(number) ? spec.itemMax - value : value;
    return { question_id: `${type}_${number}`, score: raw };
  });
}

/** Total yang akan dihitung ulang dari jawaban mentah (menerapkan butir terbalik). */
export function totalFromAnswers(type: InstrumentType, answers: readonly StoredAnswer[]): number {
  const spec = INSTRUMENTS[type];
  return answers.reduce((sum, answer) => {
    const number = Number(answer.question_id.split('_')[1]);
    return sum + (spec.reversed.includes(number) ? spec.itemMax - answer.score : answer.score);
  }, 0);
}
