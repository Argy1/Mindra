import { describe, expect, it } from 'vitest';
import { INSTRUMENT_IDS, INSTRUMENTS, getInstrument, type InstrumentId } from './instruments';
import {
  MAX_SCORE,
  categoryFor,
  computeClinicalScore,
  explanationFor,
  headlineFor,
  labelFor,
  maxScoreFor,
  scaleSegments,
  tierFor,
  validateAnswers,
} from './scoring';
import type { AssessmentCategory } from './category';

/**
 * Kasus uji ini DIPORT dari aplikasi Flutter (test/features/assessment/assessment_scoring_test.dart
 * dan pss_reverse_scoring_test.dart) supaya terbukti hasil web = hasil mobile.
 */

type Case = readonly [score: number, label: string, category: AssessmentCategory];

function checkCases(id: InstrumentId, cases: readonly Case[]) {
  it.each(cases)(`${id}: skor %i → %s / %s`, (score, label, category) => {
    expect(labelFor(id, score)).toBe(label);
    expect(categoryFor(id, score)).toBe(category);
  });
}

describe('PHQ-9', () => {
  checkCases('phq9', [
    [0, 'Minimal', 'minimal'],
    [4, 'Minimal', 'minimal'],
    [5, 'Ringan', 'mild'],
    [9, 'Ringan', 'mild'],
    [10, 'Sedang', 'moderate'],
    [14, 'Sedang', 'moderate'],
    [15, 'Sedang–Berat', 'severe'],
    [19, 'Sedang–Berat', 'severe'],
    [20, 'Berat', 'severe'],
    [27, 'Berat', 'severe'],
  ]);

  it('skor maksimum 27 (9 butir × 3)', () => {
    expect(maxScoreFor('phq9')).toBe(27);
  });

  it('tingkat keparahan memetakan 0 → 3', () => {
    expect(tierFor('phq9', 0)).toBe(0);
    expect(tierFor('phq9', 7)).toBe(1);
    expect(tierFor('phq9', 12)).toBe(2);
    expect(tierFor('phq9', 25)).toBe(3);
  });
});

describe('GAD-7', () => {
  checkCases('gad7', [
    [0, 'Minimal', 'minimal'],
    [4, 'Minimal', 'minimal'],
    [5, 'Ringan', 'mild'],
    [9, 'Ringan', 'mild'],
    [10, 'Sedang', 'moderate'],
    [14, 'Sedang', 'moderate'],
    [15, 'Berat', 'severe'],
    [21, 'Berat', 'severe'],
  ]);

  it('tidak punya tingkat "Sedang–Berat" (berbeda dari PHQ-9): skor 15 sudah pita teratas', () => {
    expect(labelFor('gad7', 15)).toBe('Berat');
    expect(labelFor('gad7', 15)).not.toContain('Sedang');
  });

  it('skor maksimum 21 (7 butir × 3)', () => {
    expect(maxScoreFor('gad7')).toBe(21);
  });
});

describe('PSS-10', () => {
  checkCases('pss10', [
    [0, 'Stres Rendah', 'minimal'],
    [13, 'Stres Rendah', 'minimal'],
    [14, 'Stres Sedang', 'moderate'],
    [26, 'Stres Sedang', 'moderate'],
    [27, 'Stres Tinggi', 'severe'],
    [40, 'Stres Tinggi', 'severe'],
  ]);

  it('skor maksimum 40 (10 butir × 4)', () => {
    expect(maxScoreFor('pss10')).toBe(40);
  });

  it('tidak pernah menghasilkan kategori "ringan" (tiga tingkat saja)', () => {
    for (let score = 0; score <= 40; score += 1) {
      expect(categoryFor('pss10', score)).not.toBe('mild');
    }
    expect(scaleSegments('pss10').map((segment) => segment.category)).toEqual([
      'minimal',
      'moderate',
      'severe',
    ]);
  });
});

describe('SRQ-20', () => {
  // Batas kasus WHO ≥ 6. Label Flutter memakai kata "gangguan"; web memakai "indikasi" (copy),
  // tetapi batas skor dan kategorinya sama persis.
  checkCases('srq20', [
    [0, 'Tidak ada indikasi', 'minimal'],
    [5, 'Tidak ada indikasi', 'minimal'],
    [6, 'Indikasi ringan', 'mild'],
    [10, 'Indikasi ringan', 'mild'],
    [11, 'Indikasi sedang', 'moderate'],
    [15, 'Indikasi sedang', 'moderate'],
    [16, 'Indikasi berat', 'severe'],
    [20, 'Indikasi berat', 'severe'],
  ]);

  it('skor 5 di bawah batas kasus WHO 6', () => {
    expect(tierFor('srq20', 5)).toBe(0);
    expect(tierFor('srq20', 6)).toBeGreaterThan(0);
  });

  it('skor maksimum 20 (20 butir ya/tidak)', () => {
    expect(maxScoreFor('srq20')).toBe(20);
  });
});

describe('skor maksimum konsisten dengan katalog', () => {
  it.each(INSTRUMENT_IDS)('%s: maksimum = jumlah nilai opsi tertinggi seluruh butir', (id) => {
    const total = getInstrument(id).questions.reduce(
      (sum, question) => sum + Math.max(...question.options.map((option) => option.value)),
      0,
    );
    expect(MAX_SCORE[id]).toBe(total);
  });
});

describe('PSS-10: pembalikan skor (port pss_reverse_scoring_test.dart)', () => {
  const questions = INSTRUMENTS.pss10.questions;
  const answerAll = (valueFor: (reverse: boolean) => number) =>
    Object.fromEntries(questions.map((q) => [q.id, valueFor(q.reverseScored)]));

  it('tepat 10 butir; hanya butir 4, 5, 7, 8 yang dibalik', () => {
    expect(questions).toHaveLength(10);
    const reversed = questions.filter((q) => q.reverseScored).map((q) => q.id);
    expect(new Set(reversed)).toEqual(new Set(['pss10_4', 'pss10_5', 'pss10_7', 'pss10_8']));
  });

  it('setiap butir memakai skala 0–4', () => {
    for (const q of questions) expect(q.options.map((o) => o.value)).toEqual([0, 1, 2, 3, 4]);
  });

  it('butir positif dijawab maksimum (4) → 0, bukan 16, bila butir lain 0', () => {
    expect(
      computeClinicalScore(
        'pss10',
        answerAll((reverse) => (reverse ? 4 : 0)),
      ),
    ).toBe(0);
  });

  it('butir positif dijawab minimum (0) → 16 (bukti pembalikan diterapkan)', () => {
    expect(
      computeClinicalScore(
        'pss10',
        answerAll(() => 0),
      ),
    ).toBe(16);
  });

  it('semua butir 0 → 16 (hanya 4 butir terbalik yang menyumbang)', () => {
    expect(
      computeClinicalScore(
        'pss10',
        answerAll(() => 0),
      ),
    ).toBe(16);
  });

  it('semua butir 4 → 24 (6 butir langsung × 4)', () => {
    expect(
      computeClinicalScore(
        'pss10',
        answerAll(() => 4),
      ),
    ).toBe(24);
  });

  it('semua butir 2 → 20 (titik tengah skala)', () => {
    expect(
      computeClinicalScore(
        'pss10',
        answerAll(() => 2),
      ),
    ).toBe(20);
  });
});

describe('instrumen lain: total = jumlah jawaban', () => {
  it('PHQ-9 semua 3 → 27, semua 0 → 0', () => {
    const all = (value: number) =>
      Object.fromEntries(INSTRUMENTS.phq9.questions.map((q) => [q.id, value]));
    expect(computeClinicalScore('phq9', all(3))).toBe(27);
    expect(computeClinicalScore('phq9', all(0))).toBe(0);
  });

  it('SRQ-20 menghitung jumlah jawaban "Ya"', () => {
    const answers = Object.fromEntries(
      INSTRUMENTS.srq20.questions.map((q, index) => [q.id, index < 7 ? 1 : 0]),
    );
    expect(computeClinicalScore('srq20', answers)).toBe(7);
  });

  it('jawaban yang hilang dianggap 0 (perilaku Dart), lalu dibalik untuk butir terbalik', () => {
    expect(computeClinicalScore('phq9', {})).toBe(0);
    expect(computeClinicalScore('pss10', {})).toBe(16);
  });
});

/**
 * Implementasi acuan ditulis ulang apa adanya dari `AssessmentClinical.categoryEnglish` (Dart).
 * Sengaja berupa kode terpisah dari scoring.ts: bila keduanya menyimpang, tes ini gagal.
 */
function dartCategoryEnglish(id: InstrumentId, score: number): AssessmentCategory {
  switch (id) {
    case 'phq9':
    case 'gad7':
      if (score <= 4) return 'minimal';
      if (score <= 9) return 'mild';
      if (score <= 14) return 'moderate';
      return 'severe';
    case 'pss10':
      if (score <= 13) return 'minimal';
      if (score <= 26) return 'moderate';
      return 'severe';
    case 'srq20':
      if (score <= 5) return 'minimal';
      if (score <= 10) return 'mild';
      if (score <= 15) return 'moderate';
      return 'severe';
  }
}

describe('paritas kategori dengan Dart untuk SETIAP skor yang mungkin', () => {
  it.each(INSTRUMENT_IDS)('%s', (id) => {
    for (let score = 0; score <= maxScoreFor(id); score += 1) {
      expect(categoryFor(id, score), `${id} skor ${score}`).toBe(dartCategoryEnglish(id, score));
    }
  });
});

describe('segmen skala hasil', () => {
  it('PHQ-9, GAD-7, SRQ-20: empat segmen urut minimal → berat', () => {
    for (const id of ['phq9', 'gad7', 'srq20'] as const) {
      expect(scaleSegments(id).map((segment) => segment.category)).toEqual([
        'minimal',
        'mild',
        'moderate',
        'severe',
      ]);
    }
  });
});

describe('penjelasan', () => {
  it.each([2, 7, 12, 24])('PHQ-9 skor %i punya penjelasan Indonesia tidak kosong', (score) => {
    expect(explanationFor('phq9', score).length).toBeGreaterThan(20);
  });

  it('setiap kombinasi instrumen × tingkat yang bisa dicapai punya penjelasan khusus (bukan cadangan)', () => {
    const fallback = 'Hasil asesmen telah tersimpan';
    for (const id of INSTRUMENT_IDS) {
      for (let score = 0; score <= maxScoreFor(id); score += 1) {
        expect(explanationFor(id, score), `${id} ${score}`).not.toContain(fallback);
      }
    }
  });

  it('semua teks yang dilihat pengguna bebas dari kata "gangguan", tanda seru, dan emoji', () => {
    const texts: string[] = [];
    for (const id of INSTRUMENT_IDS) {
      const instrument = getInstrument(id);
      texts.push(instrument.title, instrument.description, instrument.lead);
      for (let score = 0; score <= maxScoreFor(id); score += 1) {
        texts.push(labelFor(id, score), explanationFor(id, score));
      }
    }
    for (const text of texts) {
      expect(text, text).not.toMatch(/gangguan/i);
      expect(text, text).not.toContain('!');
      expect(text, text).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe('validateAnswers (jawaban dari klien dianggap tidak tepercaya)', () => {
  const full = (id: InstrumentId, value: number) =>
    Object.fromEntries(getInstrument(id).questions.map((q) => [q.id, value]));

  it('menerima jawaban lengkap dan valid', () => {
    const result = validateAnswers('phq9', full('phq9', 2));
    expect(result.ok).toBe(true);
  });

  it('menolak butir yang belum dijawab', () => {
    const raw = full('phq9', 1);
    delete raw.phq9_5;
    expect(validateAnswers('phq9', raw)).toEqual({
      ok: false,
      problem: 'missing',
      questionId: 'phq9_5',
    });
  });

  it('menolak kunci yang bukan butir instrumen (termasuk butir instrumen lain dan kunci aneh)', () => {
    for (const key of ['phq9_10', 'gad7_1', 'score', 'total_score', '__proto__x']) {
      const result = validateAnswers('phq9', { ...full('phq9', 1), [key]: 1 });
      expect(result, key).toEqual({ ok: false, problem: 'unknown', questionId: key });
    }
  });

  it('menolak nilai di luar opsi, bukan bilangan bulat, atau bukan angka', () => {
    for (const bad of [4, -1, 1.5, '2', null, true, Number.NaN, Infinity]) {
      const result = validateAnswers('phq9', { ...full('phq9', 1), phq9_3: bad });
      expect(result, String(bad)).toEqual({
        ok: false,
        problem: 'invalid-value',
        questionId: 'phq9_3',
      });
    }
  });

  it('nilai valid untuk satu instrumen belum tentu valid untuk instrumen lain (SRQ-20 hanya 0/1)', () => {
    expect(validateAnswers('srq20', { ...full('srq20', 0), srq20_4: 2 }).ok).toBe(false);
    expect(validateAnswers('pss10', { ...full('pss10', 0), pss10_4: 4 }).ok).toBe(true);
    expect(validateAnswers('pss10', { ...full('pss10', 0), pss10_4: 5 }).ok).toBe(false);
  });

  it('mengembalikan salinan jawaban bersih (hanya butir instrumen)', () => {
    const result = validateAnswers('gad7', full('gad7', 3));
    if (!result.ok) throw new Error('seharusnya valid');
    expect(Object.keys(result.answers)).toHaveLength(7);
    expect(computeClinicalScore('gad7', result.answers)).toBe(21);
  });
});

describe('judul halaman hasil', () => {
  it('menyusun judul dari label tingkat (sesuai contoh di desain)', () => {
    expect(headlineFor('phq9', 11)).toBe('Gejala depresi tingkat sedang');
    expect(headlineFor('phq9', 17)).toBe('Gejala depresi tingkat sedang–berat');
    expect(headlineFor('gad7', 3)).toBe('Kecemasan tingkat minimal');
    expect(headlineFor('pss10', 30)).toBe('Tingkat stres tinggi');
    expect(headlineFor('srq20', 2)).toBe('Skrining kesehatan jiwa: tidak ada indikasi');
  });

  it('setiap skor yang mungkin punya judul tanpa tanda seru, "gangguan", atau emoji', () => {
    for (const id of INSTRUMENT_IDS) {
      for (let score = 0; score <= maxScoreFor(id); score += 1) {
        const headline = headlineFor(id, score);
        expect(headline.length).toBeGreaterThan(8);
        expect(headline).not.toMatch(/gangguan|!/i);
      }
    }
  });
});
