/**
 * Katalog instrumen skrining. Port dari `lib/features/assessment/data/assessment_model.dart`
 * (aplikasi Flutter). Teks pertanyaan, opsi, urutan, dan item terbalik SAMA persis, karena hasil
 * skoring web dan mobile harus identik (CLAUDE.md). Yang berbeda hanya teks sampul dan deskripsi
 * yang ditulis ulang agar tidak memakai kata "gangguan" (aturan copy web); lihat DECISIONS.md.
 *
 * Instrumen:
 *   PHQ-9  — skrining gejala depresi (Kroenke, Spitzer & Williams, 2001)
 *   GAD-7  — skrining kecemasan umum (Spitzer, Kroenke & Williams, 2006)
 *   PSS-10 — stres yang dirasakan (Cohen dkk., 1983), item 4, 5, 7, 8 dibalik
 *   SRQ-20 — Self-Reporting Questionnaire WHO (Ya/Tidak), terjemahan Kemenkes RI
 */

export const INSTRUMENT_IDS = ['phq9', 'gad7', 'pss10', 'srq20'] as const;
export type InstrumentId = (typeof INSTRUMENT_IDS)[number];

export function isInstrumentId(value: unknown): value is InstrumentId {
  return typeof value === 'string' && (INSTRUMENT_IDS as readonly string[]).includes(value);
}

export interface QuestionOption {
  label: string;
  value: number;
}

export interface Question {
  /** Mis. "phq9_9". Dipakai sebagai kunci jawaban dan oleh trigger krisis di database. */
  id: string;
  instrumentId: InstrumentId;
  /** Mulai dari 1. */
  order: number;
  text: string;
  options: readonly QuestionOption[];
  /** True untuk PSS-10 item 4, 5, 7, 8: skor yang dihitung = (nilai maksimum opsi − jawaban). */
  reverseScored: boolean;
}

export interface Instrument {
  id: InstrumentId;
  /** Nama pendek, mis. "PHQ-9". */
  name: string;
  title: string;
  description: string;
  /** Perkiraan waktu mengisi, mis. "5–10 menit". */
  duration: string;
  /** Kalimat pengantar periode (ditampilkan di atas setiap pertanyaan). */
  lead: string;
  questions: readonly Question[];
}

// ── Opsi jawaban ──────────────────────────────────────────────────────────────

/** PHQ-9 dan GAD-7: frekuensi 4 tingkat (0–3). */
const FREQUENCY_OPTIONS: readonly QuestionOption[] = [
  { label: 'Sama sekali tidak', value: 0 },
  { label: 'Beberapa hari', value: 1 },
  { label: 'Lebih dari separuh hari', value: 2 },
  { label: 'Hampir setiap hari', value: 3 },
];

/** PSS-10: frekuensi 5 tingkat (0–4). */
const STRESS_OPTIONS: readonly QuestionOption[] = [
  { label: 'Tidak pernah', value: 0 },
  { label: 'Hampir tidak pernah', value: 1 },
  { label: 'Kadang-kadang', value: 2 },
  { label: 'Cukup sering', value: 3 },
  { label: 'Sangat sering', value: 4 },
];

/** SRQ-20: Ya/Tidak (0/1). */
const YES_NO_OPTIONS: readonly QuestionOption[] = [
  { label: 'Tidak', value: 0 },
  { label: 'Ya', value: 1 },
];

function build(
  instrumentId: InstrumentId,
  options: readonly QuestionOption[],
  items: ReadonlyArray<string | { text: string; reverse: true }>,
): Question[] {
  return items.map((item, index) => {
    const text = typeof item === 'string' ? item : item.text;
    return {
      id: `${instrumentId}_${index + 1}`,
      instrumentId,
      order: index + 1,
      text,
      options,
      reverseScored: typeof item !== 'string',
    };
  });
}

const PHQ9_QUESTIONS = build('phq9', FREQUENCY_OPTIONS, [
  'Kurang tertarik atau tidak ada kesenangan dalam melakukan sesuatu',
  'Merasa sedih, murung, atau tidak ada harapan',
  'Sulit tidur atau terlalu banyak tidur',
  'Merasa lelah atau kurang energi',
  'Nafsu makan berkurang atau makan berlebihan',
  'Merasa buruk tentang diri sendiri — atau merasa gagal atau mengecewakan diri sendiri maupun keluarga',
  'Sulit berkonsentrasi pada sesuatu, seperti membaca koran atau menonton televisi',
  'Bergerak atau berbicara terlalu lambat sehingga orang lain memperhatikannya — atau sebaliknya, sangat gelisah sehingga kamu bergerak lebih banyak dari biasanya',
  'Pikiran bahwa lebih baik mati, atau pikiran untuk menyakiti diri sendiri',
]);

const GAD7_QUESTIONS = build('gad7', FREQUENCY_OPTIONS, [
  'Merasa gugup, cemas, atau tegang',
  'Tidak bisa berhenti atau mengendalikan kekhawatiran',
  'Terlalu banyak khawatir tentang berbagai hal',
  'Sulit untuk rileks',
  'Sangat gelisah sehingga sulit untuk duduk diam',
  'Mudah tersinggung atau mudah marah',
  'Merasa seolah-olah akan terjadi sesuatu yang buruk',
]);

const PSS10_QUESTIONS = build('pss10', STRESS_OPTIONS, [
  'Dalam sebulan terakhir, seberapa sering kamu merasa kesal karena sesuatu yang terjadi secara tak terduga?',
  'Dalam sebulan terakhir, seberapa sering kamu merasa tidak mampu mengendalikan hal-hal penting dalam hidupmu?',
  'Dalam sebulan terakhir, seberapa sering kamu merasa gugup atau tertekan?',
  {
    text: 'Dalam sebulan terakhir, seberapa sering kamu merasa yakin dengan kemampuanmu menangani masalah pribadi?',
    reverse: true,
  },
  {
    text: 'Dalam sebulan terakhir, seberapa sering kamu merasa segala sesuatu berjalan sesuai keinginanmu?',
    reverse: true,
  },
  'Dalam sebulan terakhir, seberapa sering kamu merasa tidak mampu mengatasi semua hal yang harus dikerjakan?',
  {
    text: 'Dalam sebulan terakhir, seberapa sering kamu mampu mengendalikan rasa kesal dalam hidupmu?',
    reverse: true,
  },
  {
    text: 'Dalam sebulan terakhir, seberapa sering kamu merasa mampu mengelola hal-hal dengan baik?',
    reverse: true,
  },
  'Dalam sebulan terakhir, seberapa sering kamu marah karena hal-hal yang berada di luar kendalimu?',
  'Dalam sebulan terakhir, seberapa sering kamu merasa kesulitan menumpuk begitu tinggi sehingga sulit diatasi?',
]);

const SRQ20_QUESTIONS = build('srq20', YES_NO_OPTIONS, [
  'Apakah kamu sering merasa sakit kepala?',
  'Apakah kamu kehilangan nafsu makan?',
  'Apakah tidurmu tidak nyenyak?',
  'Apakah kamu mudah merasa takut?',
  'Apakah kamu merasa cemas, tegang, atau khawatir?',
  'Apakah tanganmu gemetar?',
  'Apakah kamu mengalami gangguan pencernaan?',
  'Apakah kamu kesulitan untuk berpikir jernih?',
  'Apakah kamu merasa tidak bahagia?',
  'Apakah kamu menangis lebih sering dari biasanya?',
  'Apakah kamu merasa sulit untuk menikmati kegiatan sehari-hari?',
  'Apakah kamu kesulitan untuk mengambil keputusan?',
  'Apakah pekerjaan atau aktivitas sehari-harimu terganggu?',
  'Apakah kamu merasa tidak mampu memainkan peran yang berguna dalam hidup?',
  'Apakah kamu kehilangan minat pada banyak hal?',
  'Apakah kamu merasa tidak berharga?',
  'Apakah kamu pernah mempunyai pikiran untuk mengakhiri hidup?',
  'Apakah kamu merasa lelah sepanjang waktu?',
  'Apakah kamu mengalami rasa tidak enak di perut?',
  'Apakah kamu mudah merasa lelah?',
]);

export const INSTRUMENTS: Readonly<Record<InstrumentId, Instrument>> = {
  phq9: {
    id: 'phq9',
    name: 'PHQ-9',
    title: 'Skala Depresi PHQ-9',
    description:
      'Mengukur gejala depresi selama dua minggu terakhir. Digunakan luas oleh profesional kesehatan jiwa dan tervalidasi di Indonesia.',
    duration: '5–10 menit',
    lead: 'Dalam 2 minggu terakhir, seberapa sering kamu terganggu oleh hal berikut?',
    questions: PHQ9_QUESTIONS,
  },
  gad7: {
    id: 'gad7',
    name: 'GAD-7',
    title: 'Skala Kecemasan GAD-7',
    description:
      'Mengidentifikasi tingkat kecemasan umum. Digunakan di fasilitas kesehatan primer.',
    duration: '5 menit',
    lead: 'Dalam 2 minggu terakhir, seberapa sering kamu terganggu oleh hal berikut?',
    questions: GAD7_QUESTIONS,
  },
  pss10: {
    id: 'pss10',
    name: 'PSS-10',
    title: 'Skala Stres PSS-10',
    description:
      'Mengukur tingkat stres yang dirasakan dalam sebulan terakhir (Perceived Stress Scale, Cohen).',
    duration: '5 menit',
    lead: 'Jawab sesuai yang kamu rasakan dalam sebulan terakhir.',
    questions: PSS10_QUESTIONS,
  },
  srq20: {
    id: 'srq20',
    name: 'SRQ-20',
    title: 'Skrining SRQ-20 (WHO)',
    // Teks Flutter: "Skrining gangguan jiwa umum oleh WHO…". Kata "gangguan" tidak dipakai di web.
    description:
      'Skrining kesehatan jiwa umum dari WHO, direkomendasikan Kementerian Kesehatan RI untuk layanan primer.',
    duration: '5–7 menit',
    lead: 'Jawab Ya atau Tidak untuk 30 hari terakhir.',
    questions: SRQ20_QUESTIONS,
  },
};

/** Urutan tampil di halaman /asesmen. */
export const INSTRUMENT_LIST: readonly Instrument[] = INSTRUMENT_IDS.map((id) => INSTRUMENTS[id]);

export function getInstrument(id: InstrumentId): Instrument {
  return INSTRUMENTS[id];
}

/** Nilai opsi tertinggi sebuah pertanyaan (dipakai untuk membalik skor). */
export function maxOptionValue(question: Question): number {
  return Math.max(...question.options.map((option) => option.value));
}
