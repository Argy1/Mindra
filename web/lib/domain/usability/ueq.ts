import { z } from 'zod';
import { mean as average, round2, sampleSd, tCritical95 } from './stats';

/**
 * UEQ-S: versi pendek User Experience Questionnaire (Schrepp, Hinderks, dan Thomaschewski, 2017), 8 butir
 * pasangan kata sifat berlawanan pada skala 7 titik. Fungsi murni tanpa I/O.
 *
 * Butir bahasa Indonesia disalin PERSIS dari berkas resmi https://www.ueq-online.org/Material/UEQS_Items.pdf
 * (bagian "Indonesian version", halaman 3; diperiksa 15 Okt 2026). Jangan diterjemahkan atau diubah sendiri.
 * Pada berkas itu kutub kiri selalu yang negatif dan kutub kanan yang positif.
 *
 * Skala: titik 1 (paling kiri) sampai 7 (paling kanan) di formulir diubah menjadi -3 sampai +3 (nilai - 4).
 *   - Pragmatic quality = rata-rata butir 1 sampai 4, hedonic quality = rata-rata butir 5 sampai 8,
 *     overall = rata-rata kedelapan butir.
 *
 * Patokan (Hinderks, Schrepp, dan Thomaschewski, 2018, "A Benchmark for the Short Version of the User Experience
 * Questionnaire", WEBIST 2018, hlm. 373-377): turunan dari benchmark UEQ penuh (9905 responden, 246 produk), BUKAN
 * dihitung langsung dari data UEQ-S; penulisnya menyebutnya perkiraan yang masuk akal sampai tersedia data cukup.
 * Batas di tabel memakai dua desimal seperti di makalah, sehingga rata-rata dibulatkan ke dua desimal dulu.
 */

export interface UeqItem {
  /** Kutub kiri (skor -3). */
  negative: string;
  /** Kutub kanan (skor +3). */
  positive: string;
}

export const UEQ_S_ITEMS: readonly UeqItem[] = [
  { negative: 'menghalangi', positive: 'mendukung' },
  { negative: 'rumit', positive: 'sederhana' },
  { negative: 'tidak efisien', positive: 'efisien' },
  { negative: 'membingungkan', positive: 'jelas' },
  { negative: 'membosankan', positive: 'mengasyikkan' },
  { negative: 'tidak menarik', positive: 'menarik' },
  { negative: 'konvensional', positive: 'berdaya cipta' },
  { negative: 'lazim', positive: 'terdepan' },
];

export const UEQ_S_ITEM_COUNT = UEQ_S_ITEMS.length;
/** Titik skala di formulir: 1 sampai 7. */
export const UEQ_S_POINTS = 7;
const PRAGMATIC_COUNT = 4;

const answersSchema = z.array(z.number().int().min(1).max(UEQ_S_POINTS)).length(UEQ_S_ITEM_COUNT);

export interface UeqScore {
  /** Jawaban apa adanya dari formulir, 1 sampai 7. */
  raw: number[];
  /** Nilai butir -3 sampai +3. */
  values: number[];
  pragmatic: number;
  hedonic: number;
  overall: number;
}

export type UeqScoreResult = { ok: true; score: UeqScore } | { ok: false; reason: string };

/** Skor UEQ-S satu responden dari 8 jawaban (1 sampai 7). Jawaban di luar aturan ditolak, bukan dibulatkan. */
export function scoreUeqS(answers: readonly number[]): UeqScoreResult {
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) {
    return {
      ok: false,
      reason:
        answers.length !== UEQ_S_ITEM_COUNT
          ? `UEQ-S harus ${UEQ_S_ITEM_COUNT} jawaban, ada ${answers.length}`
          : `setiap jawaban UEQ-S harus bilangan bulat 1 sampai ${UEQ_S_POINTS}`,
    };
  }
  const values = parsed.data.map((answer) => answer - 4);
  return {
    ok: true,
    score: {
      raw: [...parsed.data],
      values,
      pragmatic: average(values.slice(0, PRAGMATIC_COUNT)),
      hedonic: average(values.slice(PRAGMATIC_COUNT)),
      overall: average(values),
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Benchmark UEQ-S (Hinderks, Schrepp, dan Thomaschewski, 2018)
// ────────────────────────────────────────────────────────────────────────────

export type UeqScale = 'pragmatic' | 'hedonic' | 'overall';
export type UeqBand = 'excellent' | 'good' | 'above_average' | 'below_average' | 'bad';

export const UEQ_SCALE_LABEL: Readonly<Record<UeqScale, string>> = {
  pragmatic: 'Pragmatic quality (butir 1-4)',
  hedonic: 'Hedonic quality (butir 5-8)',
  overall: 'Overall (butir 1-8)',
};

export const UEQ_BAND_LABEL: Readonly<Record<UeqBand, string>> = {
  excellent: 'Excellent (10% terbaik)',
  good: 'Good',
  above_average: 'Above average',
  below_average: 'Below average',
  bad: 'Bad (25% terburuk)',
};

/**
 * Batas bawah tiap kategori (dua desimal). Excellent: di ATAS batas; kategori lain: dari batas ke atas.
 * Tabel di makalah: Excellent > 1,73 / > 1,55 / > 1,58; Good 1,55-1,73 / 1,25-1,55 / 1,40-1,58;
 * Above average 1,15-1,54 / 0,88-1,24 / 1,02-1,39; Below average 0,73-1,14 / 0,57-0,87 / 0,68-1,01;
 * Bad < 0,73 / < 0,57 / < 0,68 (urutan: pragmatic / hedonic / overall).
 */
export const UEQ_S_BENCHMARK: Readonly<
  Record<
    UeqScale,
    {
      excellentAbove: number;
      goodFrom: number;
      aboveAverageFrom: number;
      belowAverageFrom: number;
    }
  >
> = {
  pragmatic: {
    excellentAbove: 1.73,
    goodFrom: 1.55,
    aboveAverageFrom: 1.15,
    belowAverageFrom: 0.73,
  },
  hedonic: { excellentAbove: 1.55, goodFrom: 1.25, aboveAverageFrom: 0.88, belowAverageFrom: 0.57 },
  overall: { excellentAbove: 1.58, goodFrom: 1.4, aboveAverageFrom: 1.02, belowAverageFrom: 0.68 },
};

/** Kategori benchmark untuk RATA-RATA sampel pada satu skala. Jangan dipakai untuk satu responden. */
export function ueqBand(scale: UeqScale, sampleMean: number): UeqBand {
  const limits = UEQ_S_BENCHMARK[scale];
  const value = round2(sampleMean);
  if (value > limits.excellentAbove) return 'excellent';
  if (value >= limits.goodFrom) return 'good';
  if (value >= limits.aboveAverageFrom) return 'above_average';
  if (value >= limits.belowAverageFrom) return 'below_average';
  return 'bad';
}

// ────────────────────────────────────────────────────────────────────────────
// Ringkasan beberapa responden
// ────────────────────────────────────────────────────────────────────────────

/** UEQ memerlukan sampel cukup besar (20 sampai 30 responden); di bawah ini angka hanya indikatif. */
export const UEQ_MIN_RESPONDENTS = 20;

export interface UeqScaleSummary {
  mean: number;
  sd: number;
  /** Selang kepercayaan 95% untuk rata-rata (distribusi t), dipotong pada -3 dan +3. Null bila n < 2. */
  ci95: { low: number; high: number } | null;
  band: UeqBand;
}

export interface UeqSummary {
  n: number;
  pragmatic: UeqScaleSummary;
  hedonic: UeqScaleSummary;
  overall: UeqScaleSummary;
  /** Rata-rata per butir (-3 sampai +3), urutan butir 1 sampai 8. */
  itemMeans: number[];
  /** Benar bila n di bawah UEQ_MIN_RESPONDENTS: kategori benchmark hanya indikatif. */
  belowRecommendedSample: boolean;
}

function summarizeScale(scale: UeqScale, values: readonly number[]): UeqScaleSummary {
  const n = values.length;
  const center = average(values);
  const sd = sampleSd(values);
  const margin = n > 1 ? tCritical95(n - 1) * (sd / Math.sqrt(n)) : null;
  return {
    mean: round2(center),
    sd: round2(sd),
    ci95:
      margin === null
        ? null
        : {
            low: round2(Math.max(-3, center - margin)),
            high: round2(Math.min(3, center + margin)),
          },
    band: ueqBand(scale, center),
  };
}

export function summarizeUeqS(scores: readonly UeqScore[]): UeqSummary | null {
  const n = scores.length;
  if (n === 0) return null;
  return {
    n,
    pragmatic: summarizeScale(
      'pragmatic',
      scores.map((s) => s.pragmatic),
    ),
    hedonic: summarizeScale(
      'hedonic',
      scores.map((s) => s.hedonic),
    ),
    overall: summarizeScale(
      'overall',
      scores.map((s) => s.overall),
    ),
    itemMeans: UEQ_S_ITEMS.map((_, index) => round2(average(scores.map((s) => s.values[index]!)))),
    belowRecommendedSample: n < UEQ_MIN_RESPONDENTS,
  };
}
