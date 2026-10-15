import { describe, expect, it } from 'vitest';
import {
  UEQ_MIN_RESPONDENTS,
  UEQ_S_BENCHMARK,
  UEQ_S_ITEMS,
  UEQ_S_ITEM_COUNT,
  UEQ_S_POINTS,
  scoreUeqS,
  summarizeUeqS,
  ueqBand,
  type UeqBand,
  type UeqScale,
  type UeqScore,
} from './ueq';

/**
 * Semua angka di bawah DIHITUNG TANGAN (nilai butir = jawaban - 4; pragmatic = rata-rata butir 1-4; hedonic =
 * rata-rata butir 5-8; overall = rata-rata semua), bukan disalin dari keluaran fungsi. Data sintetis, bukan responden.
 */

const score = (answers: number[]): UeqScore => {
  const result = scoreUeqS(answers);
  if (!result.ok) throw new Error(result.reason);
  return result.score;
};

describe('butir UEQ-S bahasa Indonesia', () => {
  it('sama persis dengan berkas resmi ueq-online.org (UEQS_Items.pdf, Indonesian version), bukan terjemahan sendiri', () => {
    expect(UEQ_S_ITEMS.map((item) => [item.negative, item.positive])).toEqual([
      ['menghalangi', 'mendukung'],
      ['rumit', 'sederhana'],
      ['tidak efisien', 'efisien'],
      ['membingungkan', 'jelas'],
      ['membosankan', 'mengasyikkan'],
      ['tidak menarik', 'menarik'],
      ['konvensional', 'berdaya cipta'],
      ['lazim', 'terdepan'],
    ]);
  });

  it('8 butir pada skala 7 titik', () => {
    expect(UEQ_S_ITEM_COUNT).toBe(8);
    expect(UEQ_S_POINTS).toBe(7);
  });
});

describe('scoreUeqS', () => {
  it('semua 7 (kutub kanan) = +3 di semua skala; semua 1 = -3; semua 4 = 0', () => {
    expect(score(Array(8).fill(7))).toMatchObject({ pragmatic: 3, hedonic: 3, overall: 3 });
    expect(score(Array(8).fill(1))).toMatchObject({ pragmatic: -3, hedonic: -3, overall: -3 });
    expect(score(Array(8).fill(4))).toMatchObject({ pragmatic: 0, hedonic: 0, overall: 0 });
  });

  it('contoh campuran: nilai [3,2,1,0,-1,-2,-3,0] → pragmatic 1,5; hedonic -1,5; overall 0', () => {
    expect(score([7, 6, 5, 4, 3, 2, 1, 4])).toEqual({
      raw: [7, 6, 5, 4, 3, 2, 1, 4],
      values: [3, 2, 1, 0, -1, -2, -3, 0],
      pragmatic: 1.5,
      hedonic: -1.5,
      overall: 0,
    });
  });

  it('butir 1-4 hanya masuk pragmatic dan butir 5-8 hanya masuk hedonic', () => {
    // Hanya butir 1 yang +3, sisanya netral: pragmatic 0,75; hedonic 0; overall 0,375.
    expect(score([7, 4, 4, 4, 4, 4, 4, 4])).toMatchObject({
      pragmatic: 0.75,
      hedonic: 0,
      overall: 0.375,
    });
    // Hanya butir 8 yang +3: pragmatic 0; hedonic 0,75; overall 0,375.
    expect(score([4, 4, 4, 4, 4, 4, 4, 7])).toMatchObject({
      pragmatic: 0,
      hedonic: 0.75,
      overall: 0.375,
    });
  });

  it('contoh lain: [6,6,6,6,5,5,5,5] → pragmatic 2; hedonic 1; overall 1,5', () => {
    expect(score([6, 6, 6, 6, 5, 5, 5, 5])).toMatchObject({
      pragmatic: 2,
      hedonic: 1,
      overall: 1.5,
    });
  });

  it('menolak jumlah jawaban yang salah', () => {
    expect(scoreUeqS(Array(7).fill(4))).toEqual({
      ok: false,
      reason: 'UEQ-S harus 8 jawaban, ada 7',
    });
    expect(scoreUeqS(Array(9).fill(4))).toMatchObject({ ok: false });
  });

  it.each([0, 8, -3, 3.5, Number.NaN])(
    'menolak jawaban di luar 1 sampai 7 bilangan bulat: %s (skala formulir, bukan -3 sampai +3)',
    (bad) => {
      const answers = Array(8).fill(4);
      answers[3] = bad;
      expect(scoreUeqS(answers)).toEqual({
        ok: false,
        reason: 'setiap jawaban UEQ-S harus bilangan bulat 1 sampai 7',
      });
    },
  );
});

describe('ueqBand (benchmark Hinderks, Schrepp, dan Thomaschewski, 2018)', () => {
  it('batas di kode sama dengan tabel di makalah', () => {
    expect(UEQ_S_BENCHMARK).toEqual({
      pragmatic: {
        excellentAbove: 1.73,
        goodFrom: 1.55,
        aboveAverageFrom: 1.15,
        belowAverageFrom: 0.73,
      },
      hedonic: {
        excellentAbove: 1.55,
        goodFrom: 1.25,
        aboveAverageFrom: 0.88,
        belowAverageFrom: 0.57,
      },
      overall: {
        excellentAbove: 1.58,
        goodFrom: 1.4,
        aboveAverageFrom: 1.02,
        belowAverageFrom: 0.68,
      },
    });
  });

  // [skala, rata-rata, kategori]: tepat di batas, satu langkah di atas, dan satu langkah di bawah untuk tiap batas.
  it.each<[UeqScale, number, UeqBand]>([
    // Pragmatic: Excellent > 1,73; Good 1,55-1,73; Above 1,15-1,54; Below 0,73-1,14; Bad < 0,73
    ['pragmatic', 3, 'excellent'],
    ['pragmatic', 1.74, 'excellent'],
    ['pragmatic', 1.73, 'good'],
    ['pragmatic', 1.55, 'good'],
    ['pragmatic', 1.54, 'above_average'],
    ['pragmatic', 1.15, 'above_average'],
    ['pragmatic', 1.14, 'below_average'],
    ['pragmatic', 0.73, 'below_average'],
    ['pragmatic', 0.72, 'bad'],
    ['pragmatic', -3, 'bad'],
    // Hedonic: Excellent > 1,55; Good 1,25-1,55; Above 0,88-1,24; Below 0,57-0,87; Bad < 0,57
    ['hedonic', 1.56, 'excellent'],
    ['hedonic', 1.55, 'good'],
    ['hedonic', 1.25, 'good'],
    ['hedonic', 1.24, 'above_average'],
    ['hedonic', 0.88, 'above_average'],
    ['hedonic', 0.87, 'below_average'],
    ['hedonic', 0.57, 'below_average'],
    ['hedonic', 0.56, 'bad'],
    // Overall: Excellent > 1,58; Good 1,40-1,58; Above 1,02-1,39; Below 0,68-1,01; Bad < 0,68
    ['overall', 1.59, 'excellent'],
    ['overall', 1.58, 'good'],
    ['overall', 1.4, 'good'],
    ['overall', 1.39, 'above_average'],
    ['overall', 1.02, 'above_average'],
    ['overall', 1.01, 'below_average'],
    ['overall', 0.68, 'below_average'],
    ['overall', 0.67, 'bad'],
  ])('%s: rata-rata %f → %s', (scale, mean, band) => {
    expect(ueqBand(scale, mean)).toBe(band);
  });

  it('rata-rata dibulatkan ke dua desimal dulu seperti tabel di makalah (tidak ada celah 1,54-1,55)', () => {
    expect(ueqBand('pragmatic', 1.7349)).toBe('good'); // 1,73
    expect(ueqBand('pragmatic', 1.7351)).toBe('excellent'); // 1,74
    expect(ueqBand('pragmatic', 1.5449)).toBe('above_average'); // 1,54
    expect(ueqBand('pragmatic', 1.5451)).toBe('good'); // 1,55
    expect(ueqBand('pragmatic', 1.1449)).toBe('below_average'); // 1,14
    expect(ueqBand('pragmatic', 1.1451)).toBe('above_average'); // 1,15
  });

  it('skala yang berbeda punya batas berbeda untuk angka yang sama', () => {
    expect(ueqBand('pragmatic', 1.3)).toBe('above_average');
    expect(ueqBand('hedonic', 1.3)).toBe('good');
    expect(ueqBand('overall', 1.3)).toBe('above_average');
  });
});

describe('summarizeUeqS', () => {
  it('daftar kosong menghasilkan null', () => {
    expect(summarizeUeqS([])).toBeNull();
  });

  // R1 semua 7 (pragmatic 3, hedonic 3, overall 3); R2 semua 4 (0, 0, 0);
  // R3 [6,6,6,6,2,2,2,2] → nilai [2,2,2,2,-2,-2,-2,-2] (pragmatic 2, hedonic -2, overall 0).
  const three = [score(Array(8).fill(7)), score(Array(8).fill(4)), score([6, 6, 6, 6, 2, 2, 2, 2])];

  it('rata-rata, simpangan baku sampel, selang t 95% (dipotong -3 dan +3), dan kategori per skala', () => {
    const summary = summarizeUeqS(three)!;
    expect(summary.n).toBe(3);

    // Pragmatic [3, 0, 2]: rata-rata 5/3 = 1,6667; sd sampel = sqrt(14/6) = 1,5275; t(df 2) = 4,303;
    // margin = 4,303 x 1,5275 / sqrt(3) = 3,7949 → batas bawah 1,6667 - 3,7949 = -2,1282; atas 5,46 dipotong 3.
    expect(summary.pragmatic).toEqual({
      mean: 1.67,
      sd: 1.53,
      ci95: { low: -2.13, high: 3 },
      band: 'good', // 1,67 ada di 1,55-1,73
    });
    // Hedonic [3, 0, -2]: rata-rata 1/3 = 0,3333; sd sampel = sqrt(38/6) = 2,5166; kedua ujung selang dipotong.
    expect(summary.hedonic).toEqual({
      mean: 0.33,
      sd: 2.52,
      ci95: { low: -3, high: 3 },
      band: 'bad', // 0,33 < 0,57
    });
    // Overall [3, 0, 0]: rata-rata 1; sd sampel = sqrt(18/6) = 1,7321.
    expect(summary.overall).toEqual({
      mean: 1,
      sd: 1.73,
      ci95: { low: -3, high: 3 },
      band: 'below_average', // 1,00 ada di 0,68-1,01
    });
  });

  it('rata-rata per butir (-3 sampai +3): butir 1-4 = (3+0+2)/3, butir 5-8 = (3+0-2)/3', () => {
    expect(summarizeUeqS(three)!.itemMeans).toEqual([
      1.67, 1.67, 1.67, 1.67, 0.33, 0.33, 0.33, 0.33,
    ]);
  });

  it('selang kepercayaan memakai nilai t yang sama dengan SUS (df 19 → 2,093)', () => {
    // 20 responden bergantian pragmatic +1 dan -1 → rata-rata 0; sd sampel = sqrt(20/19).
    const twenty = Array.from({ length: 20 }, (_, i) =>
      score(i % 2 === 0 ? [5, 5, 5, 5, 4, 4, 4, 4] : [3, 3, 3, 3, 4, 4, 4, 4]),
    );
    const sd = Math.sqrt(20 / 19);
    const margin = (2.093 * sd) / Math.sqrt(20);
    const summary = summarizeUeqS(twenty)!;
    expect(summary.pragmatic.mean).toBe(0);
    expect(summary.pragmatic.sd).toBe(Math.round(sd * 100) / 100);
    expect(summary.pragmatic.ci95).toEqual({
      low: Math.round(-margin * 100) / 100,
      high: Math.round(margin * 100) / 100,
    });
  });

  it('satu responden: simpangan baku 0 dan selang kepercayaan tidak dihitung', () => {
    expect(summarizeUeqS([score(Array(8).fill(6))])!.pragmatic).toEqual({
      mean: 2,
      sd: 0,
      ci95: null,
      band: 'excellent',
    });
  });

  it('di bawah 20 responden ditandai indikatif; 20 ke atas tidak', () => {
    expect(UEQ_MIN_RESPONDENTS).toBe(20);
    expect(summarizeUeqS(three)!.belowRecommendedSample).toBe(true);
    const nineteen = Array.from({ length: 19 }, () => score(Array(8).fill(6)));
    expect(summarizeUeqS(nineteen)!.belowRecommendedSample).toBe(true);
    expect(summarizeUeqS([...nineteen, score(Array(8).fill(6))])!.belowRecommendedSample).toBe(
      false,
    );
  });

  it('urutan masukan tidak mengubah hasil', () => {
    expect(summarizeUeqS([...three].reverse())).toEqual(summarizeUeqS(three));
  });
});
