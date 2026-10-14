import { describe, expect, it } from 'vitest';
import { moodTypeToScore } from '@/lib/domain/journal/mood';
import {
  BADGE_IDS,
  BADGE_LABEL,
  buildBadges,
  buildNarrative,
  buildPatterns,
  buildRecommendation,
  computeMoodTrend,
  computeSleepTrend,
} from './engine';

/**
 * Port kasus uji Flutter test/features/home/weekly_insight_engine_test.dart. Asersi teks dipertahankan
 * (kata kunci yang sama) supaya terbukti perilakunya sama; hanya tanda seru yang dihapus dari copy.
 */
const weekOf = (scores: ReadonlyArray<number | null>) => scores.map((score) => ({ score }));

describe('moodTypeToScore', () => {
  it('memetakan 7 jenis perasaan ke skala 1–5', () => {
    expect(moodTypeToScore('bahagia')).toBe(5);
    expect(moodTypeToScore('syukur')).toBe(5);
    expect(moodTypeToScore('tenang')).toBe(4);
    expect(moodTypeToScore('hangat')).toBe(4);
    expect(moodTypeToScore('lelah')).toBe(3);
    expect(moodTypeToScore('cemas')).toBe(2);
    expect(moodTypeToScore('sedih')).toBe(1);
  });

  it('jenis yang tak dikenal jatuh ke netral (3)', () => {
    expect(moodTypeToScore('???')).toBe(3);
    expect(moodTypeToScore('')).toBe(3);
  });
});

describe('computeMoodTrend (data mood 7 hari)', () => {
  it('rising: paruh kedua jelas lebih tinggi', () => {
    expect(computeMoodTrend(weekOf([1, 1, 2, 4, 5, 5, 5]))).toBe('rising');
  });
  it('falling: paruh kedua jelas lebih rendah', () => {
    expect(computeMoodTrend(weekOf([5, 5, 5, 4, 2, 1, 1]))).toBe('falling');
  });
  it('stable: minggu datar', () => {
    expect(computeMoodTrend(weekOf([3, 3, 3, 3, 3, 3, 3]))).toBe('stable');
  });
  it('insufficient: kurang dari 3 hari tercatat', () => {
    expect(computeMoodTrend(weekOf([4, null, null, 4, null, null, null]))).toBe('insufficient');
  });
  it('mengabaikan hari tanpa catatan: [2,2] lalu [5,5] → rising', () => {
    expect(computeMoodTrend(weekOf([2, null, 2, null, 5, null, 5]))).toBe('rising');
  });
  it('ambang 0,5 bersifat eksklusif: selisih persis 0,5 masih stable', () => {
    // paruh pertama [3,3] = 3, paruh kedua [3,4,3] → (10/3 = 3,33) selisih 0,33 → stable
    expect(computeMoodTrend(weekOf([3, 3, 3, 4, 3]))).toBe('stable');
    // [3,3] vs [3.5] tidak mungkin dengan bilangan bulat; uji batas dengan dua nilai: [3] vs [3,4]
    expect(computeMoodTrend(weekOf([3, 3, 4]))).toBe('stable'); // [3] vs [3,4] → 3 vs 3,5 = 0,5
  });
});

describe('computeSleepTrend (kualitas tidur)', () => {
  it('rising', () => {
    expect(computeSleepTrend([2, 2, 2, 4, 4, 5, 5])).toBe('rising');
  });
  it('falling', () => {
    expect(computeSleepTrend([5, 5, 4, 4, 2, 2, 2])).toBe('falling');
  });
  it('stable', () => {
    expect(computeSleepTrend([3, 3, 3, 3, 3, 3, 3])).toBe('stable');
  });
  it('insufficient dengan kurang dari 3 malam', () => {
    expect(computeSleepTrend([4, 5])).toBe('insufficient');
    expect(computeSleepTrend([])).toBe('insufficient');
  });
});

describe('buildPatterns: korelasi mood dan tidur', () => {
  const correlation =
    'Tidur yang cukup tampak berkaitan dengan suasana hatimu yang lebih baik minggu ini.';
  const base = {
    avgMood: 4.2,
    moodTrend: 'stable',
    avgSleep: 7.5,
    goodSleepNights: 6,
    cbt: 0,
    streak: 0,
  } as const;

  it('tidur baik + mood sehat memunculkan insight korelasi', () => {
    expect(buildPatterns({ ...base, streak: 2 })).toContain(correlation);
  });

  it('terlalu sedikit malam tidur baik → tanpa insight korelasi (ambang 4 malam)', () => {
    expect(buildPatterns({ ...base, goodSleepNights: 3 })).not.toContain(correlation);
    expect(buildPatterns({ ...base, goodSleepNights: 4 })).toContain(correlation);
  });

  it('mood rata-rata rendah → tanpa insight korelasi positif (ambang 3,5)', () => {
    expect(buildPatterns({ ...base, avgMood: 3.0 })).not.toContain(correlation);
    expect(buildPatterns({ ...base, avgMood: 3.5 })).toContain(correlation);
  });

  it('mood menurun + rata-rata rendah memunculkan peringatan lembut', () => {
    const patterns = buildPatterns({
      avgMood: 2.4,
      moodTrend: 'falling',
      avgSleep: 6.5,
      goodSleepNights: 1,
      cbt: 0,
      streak: 0,
    });
    expect(patterns.some((p) => p.includes('cenderung menurun'))).toBe(true);
  });

  it('tidur singkat memunculkan insight kebersihan tidur (ambang 5,5 jam)', () => {
    const short = buildPatterns({ ...base, avgMood: 3.2, avgSleep: 5.0, goodSleepNights: 0 });
    expect(short.some((p) => p.includes('Kurang tidur'))).toBe(true);
    const ok = buildPatterns({ ...base, avgMood: 3.2, avgSleep: 5.5, goodSleepNights: 0 });
    expect(ok.some((p) => p.includes('Kurang tidur'))).toBe(false);
  });

  it('tidak pernah mengembalikan lebih dari 3 insight', () => {
    const patterns = buildPatterns({
      avgMood: 4.5,
      moodTrend: 'falling',
      avgSleep: 5.0,
      goodSleepNights: 6,
      cbt: 5,
      streak: 7,
    });
    expect(patterns.length).toBeLessThanOrEqual(3);
  });

  it('streak ≥ 5 memberi pesan konsistensi yang lebih kuat daripada streak 3', () => {
    const strong = buildPatterns({
      ...base,
      avgMood: 3.0,
      avgSleep: 6.5,
      goodSleepNights: 0,
      streak: 6,
    });
    expect(strong.some((p) => p.includes('6 hari berturut-turut'))).toBe(true);
    const mild = buildPatterns({
      ...base,
      avgMood: 3.0,
      avgSleep: 6.5,
      goodSleepNights: 0,
      streak: 3,
    });
    expect(mild.some((p) => p.includes('3 hari berturut-turut'))).toBe(true);
    expect(mild.some((p) => p.includes('Konsistensi ini sangat bermakna'))).toBe(false);
  });
});

describe('buildNarrative', () => {
  it('tanpa data mood: mengajak mulai check-in', () => {
    const narrative = buildNarrative({
      avgMood: null,
      moodTrend: 'insufficient',
      avgSleep: null,
      moodCount: 0,
      cbt: 0,
      assessments: 0,
      reflections: 0,
    });
    expect(narrative).toContain('Belum ada data perasaan');
  });

  it('minggu baik: menumpuk mood + tidur + tren + aktivitas', () => {
    const narrative = buildNarrative({
      avgMood: 4.5,
      moodTrend: 'rising',
      avgSleep: 7.5,
      moodCount: 7,
      cbt: 3,
      assessments: 1,
      reflections: 6,
    });
    expect(narrative).toContain('menyenangkan');
    expect(narrative).toContain('Tidurmu cukup baik');
    expect(narrative).toContain('membaik');
    expect(narrative).toContain('aktif berlatih');
  });

  it('minggu berat: dibuka dengan kalimat yang penuh pengertian', () => {
    const narrative = buildNarrative({
      avgMood: 1.8,
      moodTrend: 'falling',
      avgSleep: 5.0,
      moodCount: 7,
      cbt: 0,
      assessments: 0,
      reflections: 0,
    });
    expect(narrative).toContain('cukup berat');
    expect(narrative).toContain('kekuatan');
  });

  it('jam tidur ditulis gaya Indonesia (koma desimal)', () => {
    const narrative = buildNarrative({
      avgMood: 3.5,
      moodTrend: 'stable',
      avgSleep: 7.5,
      moodCount: 5,
      cbt: 0,
      assessments: 0,
      reflections: 0,
    });
    expect(narrative).toContain('7,5 jam');
  });

  it('minggu tanpa kalimat khusus tetap memberi penutup yang hangat', () => {
    const narrative = buildNarrative({
      avgMood: null,
      moodTrend: 'insufficient',
      avgSleep: 6.5,
      moodCount: 1,
      cbt: 0,
      assessments: 0,
      reflections: 0,
    });
    expect(narrative).toBe('Kamu hadir dan mencatat perasaanmu minggu ini. Itu sudah berarti.');
  });

  it('tidak memakai tanda seru di kombinasi mana pun (aturan copy)', () => {
    for (const avgMood of [1.5, 3.2, 4.8]) {
      for (const cbt of [0, 3]) {
        const text = buildNarrative({
          avgMood,
          moodTrend: 'rising',
          avgSleep: 7.2,
          moodCount: 7,
          cbt,
          assessments: 1,
          reflections: 6,
        });
        expect(text).not.toContain('!');
      }
    }
  });
});

describe('buildRecommendation: menargetkan area terlemah', () => {
  const healthy = { avgMood: 4.2, avgSleep: 7.5, assessments: 1, cbt: 3, reflections: 6 };

  it('mood sangat rendah → menyarankan konsultasi psikolog', () => {
    expect(buildRecommendation({ ...healthy, avgMood: 2.0 })).toContain('psikolog');
  });
  it('tidur singkat → menyarankan memprioritaskan tidur', () => {
    expect(buildRecommendation({ ...healthy, avgMood: 4.0, avgSleep: 5.0 })).toContain('tidur');
  });
  it('belum ada asesmen minggu ini → menyarankan melakukannya', () => {
    expect(buildRecommendation({ ...healthy, assessments: 0 })).toContain('asesmen');
  });
  it('minggu seimbang → tidak ada rekomendasi yang mengomel', () => {
    expect(buildRecommendation(healthy)).toBeNull();
  });
  it('urutan prioritas: mood rendah mengalahkan tidur singkat dan asesmen kosong', () => {
    expect(
      buildRecommendation({ avgMood: 2.0, avgSleep: 5.0, assessments: 0, cbt: 0, reflections: 0 }),
    ).toContain('psikolog');
  });

  it('latihan CBT/refleksi disarankan hanya bila tersedia (bawaan Flutter) dan tidak di web', () => {
    const quiet = { avgMood: 4.0, avgSleep: 7.5, assessments: 1, cbt: 0, reflections: 0 };
    expect(buildRecommendation(quiet)).toContain('latihan CBT');
    expect(buildRecommendation({ ...quiet, practicesAvailable: true })).toContain('latihan CBT');
    expect(buildRecommendation({ ...quiet, practicesAvailable: false })).toBeNull();
    expect(
      buildRecommendation({ ...quiet, cbt: 1, reflections: 1, practicesAvailable: true }),
    ).toContain('Refleksi malam');
  });
});

describe('buildBadges', () => {
  it('minggu kuat mendapat semua lencana', () => {
    expect(
      buildBadges({ streak: 7, goodSleep: 6, cbt: 4, assessments: 2, reflections: 6 }),
    ).toEqual([...BADGE_IDS]);
  });

  it('minggu tenang tidak mendapat lencana', () => {
    expect(
      buildBadges({ streak: 2, goodSleep: 4, cbt: 2, assessments: 0, reflections: 4 }),
    ).toEqual([]);
  });

  it('ambang inklusif di batasnya', () => {
    expect(
      buildBadges({ streak: 3, goodSleep: 5, cbt: 3, assessments: 1, reflections: 5 }),
    ).toHaveLength(5);
  });

  it('setiap lencana punya label tanpa emoji', () => {
    for (const id of BADGE_IDS) {
      expect(BADGE_LABEL[id].length).toBeGreaterThan(3);
      expect(BADGE_LABEL[id]).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});
