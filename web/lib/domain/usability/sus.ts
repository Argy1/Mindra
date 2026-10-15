import { z } from 'zod';
import { mean as average, round1, sampleSd, tCritical95 } from './stats';
import { scoreUeqS, UEQ_S_ITEM_COUNT, type UeqScore } from './ueq';

/**
 * System Usability Scale (SUS; Brooke, 1996) untuk uji pengguna Fase 5, memakai adaptasi bahasa Indonesia
 * (Sharfina dan Santoso, 2016). Fungsi murni tanpa I/O.
 *
 * Skor satu responden: butir ganjil (positif) = jawaban - 1, butir genap (negatif) = 5 - jawaban,
 * dijumlahkan lalu dikali 2,5, sehingga 0 sampai 100. Skor BUKAN persentase.
 *
 * Patokan tafsir (verifikasi sumbernya sebelum dikutip di proposal):
 *   - 68 = rata-rata dari banyak studi SUS (Sauro, 2011).
 *   - < 50 tidak dapat diterima, 50 sampai 70 marginal, > 70 dapat diterima (Bangor, Kortum, Miller, 2008).
 *
 * Asal butir: Z. Sharfina dan H. B. Santoso, "An Indonesian adaptation of the System Usability Scale (SUS)",
 * ICACSIS 2016. Teks di bawah disalin dari kutipan sekunder yang menyebut makalah itu; butir tidak boleh
 * diubah tanpa membandingkannya dengan makalah aslinya.
 */

export const SUS_ITEMS = [
  'Saya berpikir akan menggunakan sistem ini lagi',
  'Saya merasa sistem ini rumit untuk digunakan',
  'Saya merasa sistem ini mudah digunakan',
  'Saya membutuhkan bantuan dari orang lain atau teknisi dalam menggunakan sistem ini',
  'Saya merasa fitur-fitur sistem ini berjalan dengan semestinya',
  'Saya merasa ada banyak hal yang tidak konsisten (tidak serasi pada sistem ini)',
  'Saya merasa orang lain akan memahami cara menggunakan sistem ini dengan cepat',
  'Saya merasa sistem ini membingungkan',
  'Saya merasa tidak ada hambatan dalam menggunakan sistem ini',
  'Saya perlu membiasakan diri terlebih dahulu sebelum menggunakan sistem ini',
] as const;

export const SUS_SCALE_LABELS = [
  'Sangat tidak setuju',
  'Tidak setuju',
  'Ragu-ragu',
  'Setuju',
  'Sangat setuju',
] as const;

export const SUS_ITEM_COUNT = SUS_ITEMS.length;

/** Batas bawah skor yang dianggap "rata-rata industri" (Sauro, 2011). */
export const SUS_BENCHMARK = 68;

const answerSchema = z.number().int().min(1).max(5);
const answersSchema = z.array(answerSchema).length(SUS_ITEM_COUNT);

export type SusBand = 'tidak_dapat_diterima' | 'marginal' | 'dapat_diterima';

export const SUS_BAND_LABEL: Readonly<Record<SusBand, string>> = {
  tidak_dapat_diterima: 'Tidak dapat diterima (di bawah 50)',
  marginal: 'Marginal (50 sampai 70)',
  dapat_diterima: 'Dapat diterima (di atas 70)',
};

export function susBand(score: number): SusBand {
  if (score < 50) return 'tidak_dapat_diterima';
  if (score <= 70) return 'marginal';
  return 'dapat_diterima';
}

export type SusScoreResult = { ok: true; score: number } | { ok: false; reason: string };

/** Skor SUS satu responden dari 10 jawaban (1 sampai 5). Jawaban di luar aturan ditolak, bukan dibulatkan. */
export function scoreSus(answers: readonly number[]): SusScoreResult {
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) {
    return {
      ok: false,
      reason:
        answers.length !== SUS_ITEM_COUNT
          ? `harus ${SUS_ITEM_COUNT} jawaban, ada ${answers.length}`
          : 'setiap jawaban harus bilangan bulat 1 sampai 5',
    };
  }
  const total = parsed.data.reduce((sum, answer, index) => {
    // index 0 = butir 1 (ganjil, positif).
    return sum + (index % 2 === 0 ? answer - 1 : 5 - answer);
  }, 0);
  return { ok: true, score: total * 2.5 };
}

// ────────────────────────────────────────────────────────────────────────────
// Ringkasan beberapa responden
// ────────────────────────────────────────────────────────────────────────────

export interface SusSummary {
  n: number;
  mean: number;
  median: number;
  sd: number;
  min: number;
  max: number;
  /** Selang kepercayaan 95% untuk rata-rata (distribusi t). Null bila n < 2. */
  ci95: { low: number; high: number } | null;
  /** Jumlah dan persentase responden dengan skor di atas patokan 68. */
  aboveBenchmark: { count: number; percent: number };
  bands: Record<SusBand, number>;
}

export function summarizeSus(scores: readonly number[]): SusSummary | null {
  const n = scores.length;
  if (n === 0) return null;
  const sorted = [...scores].sort((a, b) => a - b);
  const mean = average(scores);
  const middle = Math.floor(n / 2);
  const median = n % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
  // Simpangan baku sampel (n - 1); untuk n = 1 tidak terdefinisi, dilaporkan 0.
  const sd = sampleSd(scores);
  const margin = n > 1 ? tCritical95(n - 1) * (sd / Math.sqrt(n)) : null;
  const bands: Record<SusBand, number> = {
    tidak_dapat_diterima: 0,
    marginal: 0,
    dapat_diterima: 0,
  };
  for (const score of scores) bands[susBand(score)] += 1;
  const above = scores.filter((score) => score > SUS_BENCHMARK).length;

  return {
    n,
    mean: round1(mean),
    median: round1(median),
    sd: round1(sd),
    min: sorted[0]!,
    max: sorted[n - 1]!,
    ci95:
      margin === null
        ? null
        : { low: round1(Math.max(0, mean - margin)), high: round1(Math.min(100, mean + margin)) },
    aboveBenchmark: { count: above, percent: round1((above / n) * 100) },
    bands,
  };
}

/** Rata-rata jawaban per butir (1 sampai 5); membantu menemukan butir yang paling menarik skor turun. */
export function itemMeans(allAnswers: readonly (readonly number[])[]): number[] {
  return SUS_ITEMS.map((_, index) => {
    const values = allAnswers.map((answers) => answers[index]!).filter((v) => Number.isFinite(v));
    return values.length
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
      : 0;
  });
}

/**
 * Sumbangan tiap butir terhadap kehilangan skor: untuk butir ganjil 5 - rata-rata, untuk butir genap
 * rata-rata - 1, dibuat 0 sampai 4. Makin besar, makin banyak skor yang hilang karena butir itu.
 */
export function itemPenalty(mean: number, index: number): number {
  return Math.round((index % 2 === 0 ? 5 - mean : mean - 1) * 100) / 100;
}

// ────────────────────────────────────────────────────────────────────────────
// Berkas respons (CSV)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Kolom berkas respons. `id` anonim (mis. R01); JANGAN menulis nama atau kontak responden.
 * `peran`: pengguna atau profesional. `t1..t6`: 1 = tugas selesai tanpa bantuan, 0 = tidak/dibantu,
 * kosong = tidak dikerjakan. `q1..q10`: jawaban SUS 1 sampai 5. `ueq1..ueq8`: jawaban UEQ-S 1 sampai 7
 * apa adanya dari Google Form (1 = kutub kiri/negatif, 7 = kutub kanan/positif); boleh dikosongkan seluruhnya
 * untuk responden yang tidak mengisi UEQ-S. `buka1..buka3`: jawaban terbuka.
 */
export const RESPONSE_COLUMNS = [
  'id',
  'peran',
  ...Array.from({ length: 6 }, (_, i) => `t${i + 1}`),
  ...Array.from({ length: SUS_ITEM_COUNT }, (_, i) => `q${i + 1}`),
  ...Array.from({ length: UEQ_S_ITEM_COUNT }, (_, i) => `ueq${i + 1}`),
  'buka1',
  'buka2',
  'buka3',
] as const;

/** Kolom yang boleh tidak ada di berkas (berkas lama hanya SUS tetap terbaca). */
export const OPTIONAL_COLUMN_PREFIXES = ['ueq', 'buka'] as const;

export interface SusRespondent {
  id: string;
  role: string;
  score: number;
  answers: number[];
  /** Hasil UEQ-S, atau null bila responden tidak mengisinya. */
  ueq: UeqScore | null;
  /** Hasil per tugas: true/false, null bila tidak dikerjakan. Panjang 6. */
  tasks: (boolean | null)[];
  open: [string, string, string];
}

export interface RejectedRow {
  /** Nomor baris di berkas (1 = baris judul). */
  line: number;
  reason: string;
}

export interface ParsedResponses {
  respondents: SusRespondent[];
  rejected: RejectedRow[];
}

/** Bacaan baris CSV ke responden. Baris cacat DITOLAK dengan alasan, tidak diperbaiki diam-diam. */
export function parseResponses(rows: readonly Record<string, string>[]): ParsedResponses {
  const respondents: SusRespondent[] = [];
  const rejected: RejectedRow[] = [];
  const seenIds = new Set<string>();

  rows.forEach((row, index) => {
    const line = index + 2;
    const id = (row.id ?? '').trim();
    if (!id) return void rejected.push({ line, reason: 'kolom id kosong' });
    if (seenIds.has(id)) return void rejected.push({ line, reason: `id ${id} dobel` });

    const answers: number[] = [];
    for (let i = 1; i <= SUS_ITEM_COUNT; i += 1) {
      const raw = (row[`q${i}`] ?? '').trim();
      if (raw === '') return void rejected.push({ line, reason: `q${i} kosong` });
      answers.push(Number(raw));
    }
    const scored = scoreSus(answers);
    if (!scored.ok) return void rejected.push({ line, reason: `${id}: ${scored.reason}` });

    const tasks: (boolean | null)[] = [];
    for (let i = 1; i <= 6; i += 1) {
      const raw = (row[`t${i}`] ?? '').trim();
      if (raw === '') tasks.push(null);
      else if (raw === '1' || raw === '0') tasks.push(raw === '1');
      else return void rejected.push({ line, reason: `${id}: t${i} harus 1, 0, atau kosong` });
    }

    // UEQ-S: terisi lengkap atau dikosongkan seluruhnya. Terisi sebagian ditolak, bukan ditebak.
    const ueqRaw = Array.from({ length: UEQ_S_ITEM_COUNT }, (_, i) =>
      (row[`ueq${i + 1}`] ?? '').trim(),
    );
    let ueq: UeqScore | null = null;
    if (ueqRaw.some((value) => value !== '')) {
      const emptyAt = ueqRaw.findIndex((value) => value === '');
      if (emptyAt !== -1) {
        return void rejected.push({
          line,
          reason: `ueq${emptyAt + 1} kosong (UEQ-S harus terisi lengkap atau dikosongkan seluruhnya)`,
        });
      }
      const ueqScored = scoreUeqS(ueqRaw.map(Number));
      if (!ueqScored.ok) return void rejected.push({ line, reason: `${id}: ${ueqScored.reason}` });
      ueq = ueqScored.score;
    }

    seenIds.add(id);
    respondents.push({
      id,
      role: (row.peran ?? '').trim() || 'pengguna',
      score: scored.score,
      answers,
      ueq,
      tasks,
      open: [(row.buka1 ?? '').trim(), (row.buka2 ?? '').trim(), (row.buka3 ?? '').trim()],
    });
  });

  return { respondents, rejected };
}

export interface TaskCompletion {
  task: number;
  attempted: number;
  completed: number;
  /** Persen selesai tanpa bantuan dari yang mengerjakan; null bila belum ada yang mengerjakan. */
  percent: number | null;
}

export function taskCompletion(respondents: readonly SusRespondent[]): TaskCompletion[] {
  return Array.from({ length: 6 }, (_, index) => {
    const results = respondents.map((r) => r.tasks[index] ?? null).filter((r) => r !== null);
    const completed = results.filter(Boolean).length;
    return {
      task: index + 1,
      attempted: results.length,
      completed,
      percent: results.length ? round1((completed / results.length) * 100) : null,
    };
  });
}
