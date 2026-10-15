import { describe, expect, it } from 'vitest';
import {
  OPTIONAL_COLUMN_PREFIXES,
  RESPONSE_COLUMNS,
  SUS_BENCHMARK,
  SUS_ITEMS,
  SUS_SCALE_LABELS,
  itemMeans,
  itemPenalty,
  parseResponses,
  scoreSus,
  summarizeSus,
  susBand,
  taskCompletion,
} from './sus';

/**
 * Semua jawaban di bawah ini DIHITUNG TANGAN dari aturan Brooke (butir ganjil jawaban - 1, butir genap
 * 5 - jawaban, jumlah x 2,5), bukan dari keluaran fungsi. Data di sini sintetis untuk menguji hitungan;
 * bukan hasil responden.
 */

const score = (answers: number[]) => {
  const result = scoreSus(answers);
  if (!result.ok) throw new Error(result.reason);
  return result.score;
};

describe('scoreSus', () => {
  it('skor terbaik 100: butir ganjil 5, butir genap 1', () => {
    expect(score([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100);
  });

  it('skor terburuk 0: butir ganjil 1, butir genap 5', () => {
    expect(score([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0);
  });

  it('semua netral (3) = 50; semua 4 = 50; semua 2 = 50 (butir terbalik saling meniadakan)', () => {
    expect(score(Array(10).fill(3))).toBe(50);
    expect(score(Array(10).fill(4))).toBe(50);
    expect(score(Array(10).fill(2))).toBe(50);
  });

  it('contoh campuran: ganjil 3+3+4+3+4 = 17, genap 3+4+3+3+4 = 17, (17+17) x 2,5 = 85', () => {
    expect(score([4, 2, 4, 1, 5, 2, 4, 2, 5, 1])).toBe(85);
  });

  it('hasil bisa pecahan kelipatan 2,5', () => {
    // ganjil: 3+3+3+3+3 = 15; genap: 2+3+2+3+2 = 12 -> 27 x 2,5 = 67,5
    expect(score([4, 3, 4, 2, 4, 3, 4, 2, 4, 3])).toBe(67.5);
  });

  it('menolak jumlah jawaban salah', () => {
    expect(scoreSus([1, 2, 3])).toEqual({ ok: false, reason: 'harus 10 jawaban, ada 3' });
    expect(scoreSus(Array(11).fill(3))).toMatchObject({ ok: false });
  });

  it.each([0, 6, 3.5, Number.NaN, -1])(
    'menolak jawaban di luar 1 sampai 5 bilangan bulat: %s',
    (bad) => {
      const answers = Array(10).fill(3);
      answers[4] = bad;
      expect(scoreSus(answers)).toEqual({
        ok: false,
        reason: 'setiap jawaban harus bilangan bulat 1 sampai 5',
      });
    },
  );

  it('punya tepat 10 butir dan tidak memuat kata klinis terlarang', () => {
    expect(SUS_ITEMS).toHaveLength(10);
    expect(SUS_ITEMS.join(' ')).not.toMatch(/gangguan|diagnosa|pasien|!/i);
  });

  it('butir sama dengan adaptasi bahasa Indonesia (Sharfina dan Santoso, 2016), bukan terjemahan sendiri', () => {
    expect([...SUS_ITEMS]).toEqual([
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
    ]);
    expect([...SUS_SCALE_LABELS]).toEqual([
      'Sangat tidak setuju',
      'Tidak setuju',
      'Ragu-ragu',
      'Setuju',
      'Sangat setuju',
    ]);
  });
});

describe('susBand', () => {
  it('batas: di bawah 50 tidak dapat diterima, 50 sampai 70 marginal, di atas 70 dapat diterima', () => {
    expect(susBand(49.9)).toBe('tidak_dapat_diterima');
    expect(susBand(50)).toBe('marginal');
    expect(susBand(70)).toBe('marginal');
    expect(susBand(70.1)).toBe('dapat_diterima');
  });
});

describe('summarizeSus', () => {
  it('daftar kosong menghasilkan null', () => {
    expect(summarizeSus([])).toBeNull();
  });

  it('[50, 70, 90]: rata-rata, median, simpangan baku sampel, selang t 95% (dipotong pada 100)', () => {
    // sd sampel = sqrt((400 + 0 + 400) / 2) = 20; t(df=2) = 4,303; margin = 4,303 x 20 / sqrt(3) = 49,69.
    expect(summarizeSus([50, 70, 90])).toEqual({
      n: 3,
      mean: 70,
      median: 70,
      sd: 20,
      min: 50,
      max: 90,
      ci95: { low: 20.3, high: 100 },
      aboveBenchmark: { count: 2, percent: 66.7 },
      bands: { tidak_dapat_diterima: 0, marginal: 2, dapat_diterima: 1 },
    });
  });

  it('selang kepercayaan dipotong di 0 dan 100 (skor SUS tidak bisa di luar rentang itu)', () => {
    // sd = 70,7; t(df=1) = 12,706 -> margin 635, jauh melewati kedua ujung.
    expect(summarizeSus([0, 100])?.ci95).toEqual({ low: 0, high: 100 });
  });

  it.each([
    // [jumlah responden, nilai t yang berlaku]: batas tabel tepat di df 30/31, 40, 60, dan 120.
    [31, 2.042], // df 30 (nilai tabel langsung)
    [32, 2.042], // df 31 memakai df 30
    [40, 2.042], // df 39 masih memakai df 30
    [41, 2.021], // df 40
    [42, 2.021], // df 41 memakai df 40
    [60, 2.021], // df 59 masih memakai df 40
    [61, 2.0], // df 60
    [120, 2.0], // df 119 masih memakai df 60
    [121, 1.98], // df 120
  ])('n = %i memakai nilai t %f (df di atas 30 dari tabel terdekat di bawahnya)', (n, t) => {
    const scores = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 40 : 60));
    // Rata-rata dan simpangan baku sampel dihitung terpisah dari fungsi yang diuji.
    const mean = scores.reduce((sum, s) => sum + s, 0) / n;
    const sd = Math.sqrt(scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (n - 1));
    const margin = (t * sd) / Math.sqrt(n);
    expect(summarizeSus(scores)!.ci95).toEqual({
      low: Math.round((mean - margin) * 10) / 10,
      high: Math.round((mean + margin) * 10) / 10,
    });
  });

  it('median untuk jumlah genap adalah rata-rata dua nilai tengah', () => {
    expect(summarizeSus([40, 60])?.median).toBe(50);
    expect(summarizeSus([40, 55, 60, 90])?.median).toBe(57.5);
  });

  it('satu responden: simpangan baku 0 dan selang kepercayaan tidak dihitung', () => {
    expect(summarizeSus([72.5])).toMatchObject({ n: 1, mean: 72.5, sd: 0, ci95: null });
  });

  it('nilai persis 68 tidak dihitung di atas patokan', () => {
    expect(SUS_BENCHMARK).toBe(68);
    expect(summarizeSus([68, 68.5])?.aboveBenchmark).toEqual({ count: 1, percent: 50 });
  });

  it('urutan masukan tidak mengubah hasil', () => {
    expect(summarizeSus([90, 50, 70])).toEqual(summarizeSus([50, 70, 90]));
  });
});

describe('itemMeans dan itemPenalty', () => {
  it('rata-rata per butir', () => {
    const means = itemMeans([
      [5, 1, 5, 1, 5, 1, 5, 1, 5, 1],
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    ]);
    expect(means).toEqual([4, 2, 4, 2, 4, 2, 4, 2, 4, 2]);
  });

  it('kehilangan skor: butir ganjil 5 - rata-rata, butir genap rata-rata - 1', () => {
    expect(itemPenalty(4.5, 0)).toBe(0.5);
    expect(itemPenalty(2, 1)).toBe(1);
    expect(itemPenalty(5, 0)).toBe(0);
    expect(itemPenalty(5, 1)).toBe(4);
  });
});

const row = (overrides: Record<string, string> = {}): Record<string, string> => ({
  id: 'R01',
  peran: 'pengguna',
  t1: '1',
  t2: '1',
  t3: '0',
  t4: '',
  t5: '',
  t6: '',
  ...Object.fromEntries(
    [5, 1, 5, 1, 5, 1, 5, 1, 5, 1].map((value, i) => [`q${i + 1}`, String(value)]),
  ),
  buka1: 'mudah',
  buka2: '',
  buka3: '',
  ...overrides,
});

describe('parseResponses', () => {
  it('membaca responden valid: skor, peran, tugas (kosong = tidak dikerjakan), jawaban terbuka', () => {
    const { respondents, rejected } = parseResponses([row()]);
    expect(rejected).toEqual([]);
    expect(respondents).toEqual([
      {
        id: 'R01',
        role: 'pengguna',
        score: 100,
        answers: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1],
        ueq: null,
        tasks: [true, true, false, null, null, null],
        open: ['mudah', '', ''],
      },
    ]);
  });

  it('kolom berkas: UEQ-S di antara SUS dan jawaban terbuka; ueq dan buka boleh tidak ada', () => {
    expect(RESPONSE_COLUMNS).toHaveLength(2 + 6 + 10 + 8 + 3);
    expect(RESPONSE_COLUMNS.indexOf('ueq1')).toBe(RESPONSE_COLUMNS.indexOf('q10') + 1);
    expect(RESPONSE_COLUMNS.indexOf('ueq8')).toBe(RESPONSE_COLUMNS.indexOf('buka1') - 1);
    expect([...OPTIONAL_COLUMN_PREFIXES]).toEqual(['ueq', 'buka']);
  });

  describe('UEQ-S pada berkas respons', () => {
    const ueqCells = (values: string[]) =>
      Object.fromEntries(values.map((value, i) => [`ueq${i + 1}`, value]));
    const sevens = Array(8).fill('7') as string[];

    it('terisi lengkap: skor dihitung dari jawaban formulir 1-7 (7 = kutub positif = +3)', () => {
      const { respondents, rejected } = parseResponses([row(ueqCells(sevens))]);
      expect(rejected).toEqual([]);
      expect(respondents[0]?.ueq).toEqual({
        raw: [7, 7, 7, 7, 7, 7, 7, 7],
        values: [3, 3, 3, 3, 3, 3, 3, 3],
        pragmatic: 3,
        hedonic: 3,
        overall: 3,
      });
    });

    it('dikosongkan seluruhnya atau kolomnya tidak ada: responden tetap sah, UEQ-S null', () => {
      expect(parseResponses([row(ueqCells(Array(8).fill('')))]).respondents[0]?.ueq).toBeNull();
      expect(parseResponses([row()]).respondents[0]?.ueq).toBeNull();
    });

    it('terisi sebagian ditolak dengan alasan, tidak ditebak', () => {
      const partial = [...sevens];
      partial[2] = '';
      expect(parseResponses([row({ id: 'R02', ...ueqCells(partial) })])).toEqual({
        respondents: [],
        rejected: [
          {
            line: 2,
            reason: 'ueq3 kosong (UEQ-S harus terisi lengkap atau dikosongkan seluruhnya)',
          },
        ],
      });
    });

    it.each(['0', '8', '-3', '3,5', 'tujuh'])(
      'jawaban %s ditolak: skala formulir 1 sampai 7 (bukan -3 sampai +3)',
      (bad) => {
        const values = [...sevens];
        values[5] = bad;
        expect(parseResponses([row({ id: 'R09', ...ueqCells(values) })]).rejected).toEqual([
          { line: 2, reason: 'R09: setiap jawaban UEQ-S harus bilangan bulat 1 sampai 7' },
        ]);
      },
    );
  });

  it('peran kosong dianggap pengguna', () => {
    expect(parseResponses([row({ peran: '' })]).respondents[0]?.role).toBe('pengguna');
  });

  it('baris cacat ditolak dengan nomor baris dan alasan, tidak diperbaiki diam-diam', () => {
    const { respondents, rejected } = parseResponses([
      row({ id: 'R01' }),
      row({ id: '' }),
      row({ id: 'R03', q4: '' }),
      row({ id: 'R04', q2: '7' }),
      row({ id: 'R05', t2: 'ya' }),
      row({ id: 'R01' }),
      row({ id: 'R07', q1: '4,5' }),
    ]);
    expect(respondents.map((r) => r.id)).toEqual(['R01']);
    expect(rejected).toEqual([
      { line: 3, reason: 'kolom id kosong' },
      { line: 4, reason: 'q4 kosong' },
      { line: 5, reason: 'R04: setiap jawaban harus bilangan bulat 1 sampai 5' },
      { line: 6, reason: 'R05: t2 harus 1, 0, atau kosong' },
      { line: 7, reason: 'id R01 dobel' },
      { line: 8, reason: 'R07: setiap jawaban harus bilangan bulat 1 sampai 5' },
    ]);
  });
});

describe('taskCompletion', () => {
  it('menghitung persen selesai hanya dari yang mengerjakan', () => {
    const { respondents } = parseResponses([
      row({ id: 'R01', t1: '1', t2: '0', t3: '' }),
      row({ id: 'R02', t1: '1', t2: '1', t3: '' }),
      row({ id: 'R03', t1: '0', t2: '', t3: '' }),
    ]);
    const completion = taskCompletion(respondents);
    expect(completion[0]).toEqual({ task: 1, attempted: 3, completed: 2, percent: 66.7 });
    expect(completion[1]).toEqual({ task: 2, attempted: 2, completed: 1, percent: 50 });
    expect(completion[2]).toEqual({ task: 3, attempted: 0, completed: 0, percent: null });
    expect(completion).toHaveLength(6);
  });
});
