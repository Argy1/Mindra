import type { AssessmentCategory } from './category';
import { getInstrument, maxOptionValue, type InstrumentId } from './instruments';

/**
 * Skoring asesmen. Port dari `AssessmentSession._computeClinicalScore` dan `AssessmentClinical`
 * (lib/features/assessment/presentation/providers/assessment_provider.dart). Batas kategori HARUS
 * sama dengan Dart dan dengan SQL `public.classify_assessment`; tests/db/assessment-parity.test.ts
 * membandingkan ketiganya untuk setiap skor yang mungkin.
 *
 * Acuan: PHQ-9 Kroenke dkk. (2001), GAD-7 Spitzer dkk. (2006), PSS-10 Cohen dkk. (1983),
 * SRQ-20 WHO / Beusenberg & Orley (1994), batas kasus ≥ 6.
 */

/** Jawaban mentah: id pertanyaan → nilai opsi yang dipilih (BELUM dibalik untuk item terbalik). */
export type Answers = Readonly<Record<string, number>>;

export const MAX_SCORE: Readonly<Record<InstrumentId, number>> = {
  phq9: 27, // 9 item × 3
  gad7: 21, // 7 item × 3
  pss10: 40, // 10 item × 4
  srq20: 20, // 20 item × 1
};

export function maxScoreFor(id: InstrumentId): number {
  return MAX_SCORE[id];
}

/**
 * Total skor klinis. Item terbalik dihitung (nilai maksimum opsi − jawaban). Jawaban yang hilang
 * dianggap 0 sebelum dibalik, sama persis dengan Dart; untuk data masuk dari pengguna, validasi
 * dulu dengan {@link validateAnswers} sehingga kasus itu tidak pernah terjadi.
 */
export function computeClinicalScore(id: InstrumentId, answers: Answers): number {
  return getInstrument(id).questions.reduce((sum, question) => {
    const raw = answers[question.id] ?? 0;
    return sum + (question.reverseScored ? maxOptionValue(question) - raw : raw);
  }, 0);
}

export type AnswerProblem = 'missing' | 'unknown' | 'invalid-value';

export type AnswerValidation =
  | { ok: true; answers: Record<string, number> }
  | { ok: false; problem: AnswerProblem; questionId: string };

/**
 * Pemeriksaan ketat untuk jawaban dari klien: SETIAP pertanyaan instrumen harus terjawab tepat
 * sekali dengan nilai yang merupakan salah satu opsinya, dan tidak boleh ada kunci lain. Skor tidak
 * pernah diterima dari klien; server menghitungnya sendiri dari jawaban yang lolos pemeriksaan ini.
 */
export function validateAnswers(
  id: InstrumentId,
  raw: Readonly<Record<string, unknown>>,
): AnswerValidation {
  const { questions } = getInstrument(id);
  const known = new Set(questions.map((question) => question.id));

  for (const key of Object.keys(raw)) {
    if (!known.has(key)) return { ok: false, problem: 'unknown', questionId: key };
  }

  const answers: Record<string, number> = {};
  for (const question of questions) {
    const value = raw[question.id];
    if (value === undefined) return { ok: false, problem: 'missing', questionId: question.id };
    const allowed = question.options.some((option) => option.value === value);
    if (typeof value !== 'number' || !Number.isInteger(value) || !allowed) {
      return { ok: false, problem: 'invalid-value', questionId: question.id };
    }
    answers[question.id] = value;
  }
  return { ok: true, answers };
}

// ── Kategori, tingkat, label ───────────────────────────────────────────────────

interface Band {
  /** Skor tertinggi yang masih masuk pita ini. Pita terakhir menampung semua skor di atasnya. */
  upTo: number;
  category: AssessmentCategory;
  /** Label yang dilihat pengguna. */
  label: string;
}

/**
 * Pita per instrumen. Setiap instrumen punya batas klinisnya sendiri, sengaja TIDAK seragam:
 * GAD-7 empat tingkat (tanpa "Sedang–Berat"), PSS-10 tiga tingkat, SRQ-20 memakai batas kasus WHO ≥ 6.
 */
const BANDS: Readonly<Record<InstrumentId, readonly Band[]>> = {
  phq9: [
    { upTo: 4, category: 'minimal', label: 'Minimal' },
    { upTo: 9, category: 'mild', label: 'Ringan' },
    { upTo: 14, category: 'moderate', label: 'Sedang' },
    { upTo: 19, category: 'severe', label: 'Sedang–Berat' },
    { upTo: Infinity, category: 'severe', label: 'Berat' },
  ],
  gad7: [
    { upTo: 4, category: 'minimal', label: 'Minimal' },
    { upTo: 9, category: 'mild', label: 'Ringan' },
    { upTo: 14, category: 'moderate', label: 'Sedang' },
    { upTo: Infinity, category: 'severe', label: 'Berat' },
  ],
  pss10: [
    { upTo: 13, category: 'minimal', label: 'Stres Rendah' },
    { upTo: 26, category: 'moderate', label: 'Stres Sedang' },
    { upTo: Infinity, category: 'severe', label: 'Stres Tinggi' },
  ],
  srq20: [
    // Teks Flutter: "Tidak ada gangguan" / "Kemungkinan gangguan ringan|sedang|berat". Kata
    // "gangguan" tidak dipakai di copy web; batas skornya tidak berubah.
    { upTo: 5, category: 'minimal', label: 'Tidak ada indikasi' },
    { upTo: 10, category: 'mild', label: 'Indikasi ringan' },
    { upTo: 15, category: 'moderate', label: 'Indikasi sedang' },
    { upTo: Infinity, category: 'severe', label: 'Indikasi berat' },
  ],
};

function bandFor(id: InstrumentId, score: number): Band {
  const bands = BANDS[id];
  return bands.find((band) => score <= band.upTo) ?? bands[bands.length - 1]!;
}

/** Kategori yang disimpan di `assessments.category`: minimal | mild | moderate | severe. */
export function categoryFor(id: InstrumentId, score: number): AssessmentCategory {
  return bandFor(id, score).category;
}

/** Label tingkat keparahan yang dilihat pengguna. */
export function labelFor(id: InstrumentId, score: number): string {
  return bandFor(id, score).label;
}

export type Tier = 0 | 1 | 2 | 3;

const TIER_OF: Readonly<Record<AssessmentCategory, Tier>> = {
  minimal: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
};

/** Tingkat 0–3 (0 = minimal … 3 = berat), untuk pewarnaan dan pemilihan rekomendasi. */
export function tierFor(id: InstrumentId, score: number): Tier {
  return TIER_OF[categoryFor(id, score)];
}

export interface ScaleSegment {
  category: AssessmentCategory;
  /** Label pendek di bawah bilah skala. */
  label: string;
  tier: Tier;
}

/**
 * Segmen bilah skala di halaman hasil (design/app-asesmen.html `.scale`). Satu segmen per KATEGORI
 * yang bisa dicapai instrumen: PSS-10 hanya tiga (tidak punya kategori "ringan").
 */
export function scaleSegments(id: InstrumentId): readonly ScaleSegment[] {
  const labels: Record<InstrumentId, Partial<Record<AssessmentCategory, string>>> = {
    phq9: { minimal: 'Minimal', mild: 'Ringan', moderate: 'Sedang', severe: 'Berat' },
    gad7: { minimal: 'Minimal', mild: 'Ringan', moderate: 'Sedang', severe: 'Berat' },
    pss10: { minimal: 'Rendah', moderate: 'Sedang', severe: 'Tinggi' },
    srq20: { minimal: 'Tidak ada', mild: 'Ringan', moderate: 'Sedang', severe: 'Berat' },
  };
  const seen = new Set<AssessmentCategory>();
  const segments: ScaleSegment[] = [];
  for (const band of BANDS[id]) {
    if (seen.has(band.category)) continue;
    seen.add(band.category);
    segments.push({
      category: band.category,
      label: labels[id][band.category] ?? band.label,
      tier: TIER_OF[band.category],
    });
  }
  return segments;
}

/**
 * Judul halaman hasil, mis. "Gejala depresi tingkat sedang" (design/app-asesmen.html state 2).
 * Dirangkai dari label tingkat supaya batas dan istilahnya tetap satu sumber (BANDS).
 */
export function headlineFor(id: InstrumentId, score: number): string {
  const label = labelFor(id, score).toLowerCase();
  switch (id) {
    case 'phq9':
      return `Gejala depresi tingkat ${label}`;
    case 'gad7':
      return `Kecemasan tingkat ${label}`;
    case 'pss10':
      return `Tingkat ${label}`;
    case 'srq20':
      return `Skrining kesehatan jiwa: ${label}`;
  }
}

// ── Penjelasan ────────────────────────────────────────────────────────────────

/**
 * Penjelasan singkat, hangat, bukan klinis. Teks sama dengan `AssessmentClinical.explanation`
 * kecuali SRQ-20 tingkat 0–2 (menghindari kata "gangguan"). PSS-10 tidak punya tingkat 1
 * (kategorinya tidak pernah "ringan"), jadi teks Dart untuk kombinasi itu yang tak terjangkau tidak diport.
 */
const EXPLANATIONS: Readonly<Record<string, string>> = {
  'phq9:0':
    'Hasilmu menunjukkan gejala depresi yang minimal. Kondisi emosionalmu cenderung stabil dalam dua minggu terakhir.',
  'phq9:1':
    'Ada beberapa gejala ringan yang muncul. Ini hal yang umum dialami — penting untuk merawat diri dan memperhatikan tanda-tandanya.',
  'phq9:2':
    'Gejala depresi tingkat sedang terdeteksi. Berbicara dengan psikolog atau tenaga kesehatan jiwa bisa sangat membantu.',
  'phq9:3':
    'Hasilmu menunjukkan gejala yang signifikan. Kami sangat menyarankan untuk segera berbicara dengan profesional kesehatan jiwa.',
  'gad7:0':
    'Tingkat kecemasanmu rendah. Kamu cenderung mampu mengelola perasaan cemas dalam dua minggu terakhir.',
  'gad7:1':
    'Ada gejala kecemasan ringan. Latihan pernapasan dan jurnal harian bisa membantu menjaga keseimbangan.',
  'gad7:2':
    'Kecemasan terasa cukup mengganggu. Pertimbangkan untuk berbicara dengan psikolog untuk strategi pengelolaan yang tepat.',
  'gad7:3':
    'Kecemasan yang kamu rasakan signifikan. Bantuan profesional sangat dianjurkan untuk membantu menanganinya.',
  'pss10:0':
    'Tingkat stresmu rendah. Kamu cenderung mampu mengelola tekanan dengan baik dalam sebulan terakhir.',
  'pss10:2':
    'Tingkat stresmu sedang. Pertimbangkan untuk berbicara dengan psikolog atau mencoba latihan CBT untuk mengelolanya.',
  'pss10:3':
    'Tingkat stresmu tinggi. Sangat dianjurkan untuk mencari dukungan profesional dan memberi ruang istirahat bagi diri sendiri.',
  'srq20:0':
    'Skrining tidak menunjukkan tanda masalah kesehatan jiwa yang umum. Tetap perhatikan kesejahteraanmu secara berkala.',
  'srq20:1':
    'Ada beberapa indikasi yang perlu diperhatikan. Merawat diri dan memantau mood harian dapat membantu.',
  'srq20:2':
    'Ada indikasi tingkat sedang. Berkonsultasi dengan tenaga kesehatan jiwa di Puskesmas atau psikolog dianjurkan.',
  'srq20:3':
    'Indikasi yang signifikan terdeteksi. Segera cari bantuan profesional — kamu tidak harus menghadapinya sendiri.',
};

const FALLBACK_EXPLANATION =
  'Hasil asesmen telah tersimpan. Konsultasikan dengan tenaga kesehatan jiwa jika ada hal yang ingin kamu diskusikan.';

export function explanationFor(id: InstrumentId, score: number): string {
  return EXPLANATIONS[`${id}:${tierFor(id, score)}`] ?? FALLBACK_EXPLANATION;
}
