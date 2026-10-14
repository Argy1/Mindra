import { describe, expect, it } from 'vitest';
import { buildWeeklyInsight, computeStreak, type WeeklyInsightInput } from './weekly';

/**
 * Hari ini = Selasa 13 Oktober 2026 (WIB). Jendela 7 hari: Rab 7 → Sel 13.
 * Tiap catatan memakai jam WIB yang eksplisit (+07:00) supaya hasilnya tidak bergantung zona mesin uji.
 */
const TODAY = '2026-10-13';
const wib = (date: string, time = '09:00') => `${date}T${time}:00+07:00`;

const base = (overrides: Partial<WeeklyInsightInput> = {}): WeeklyInsightInput => ({
  today: TODAY,
  moods: [],
  sleeps: [],
  assessmentsDone: 0,
  recentMoodTimestamps: [],
  ...overrides,
});

describe('jendela 7 hari', () => {
  it('berisi 7 hari berurutan berakhir hari ini, dengan label Indonesia', () => {
    const { days } = buildWeeklyInsight(base());
    expect(days.map((d) => d.date)).toEqual([
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
    ]);
    expect(days.map((d) => d.dayLabel)).toEqual(['Rab', 'Kam', 'Jum', 'Sab', 'Min', 'Sen', 'Sel']);
    expect(days.at(-1)).toMatchObject({ isToday: true, dayName: 'Selasa' });
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
  });

  it('tanpa data: semua kosong, narasi mengajak check-in, tidak ada lencana', () => {
    const insight = buildWeeklyInsight(base());
    expect(insight.avgMood).toBeNull();
    expect(insight.avgSleepHours).toBeNull();
    expect(insight.checkInDays).toBe(0);
    expect(insight.hardestDay).toBeNull();
    expect(insight.narrative).toContain('Belum ada data perasaan');
    expect(insight.badges).toEqual([]);
    expect(insight.moodTrend).toBe('insufficient');
  });
});

describe('mood', () => {
  it('memakai catatan PERTAMA tiap hari dan mengabaikan catatan di luar jendela', () => {
    const insight = buildWeeklyInsight(
      base({
        moods: [
          { mood_type: 'sedih', created_at: wib('2026-10-13', '07:00') },
          { mood_type: 'bahagia', created_at: wib('2026-10-13', '20:00') }, // hari sama, belakangan
          { mood_type: 'bahagia', created_at: wib('2026-10-06', '12:00') }, // di luar jendela
        ],
      }),
    );
    expect(insight.days.at(-1)).toMatchObject({ moodType: 'sedih', moodScore: 1 });
    expect(insight.days[0]).toMatchObject({ moodType: null, moodScore: null });
    expect(insight.checkInDays).toBe(1);
  });

  it('mengelompokkan hari menurut WIB, bukan UTC (23.30 WIB = 16.30 UTC hari yang sama)', () => {
    const insight = buildWeeklyInsight(
      base({
        moods: [
          // 00.30 WIB tanggal 13 = 17.30 UTC tanggal 12: tetap hari ke-13 menurut WIB.
          { mood_type: 'tenang', created_at: '2026-10-12T17:30:00Z' },
        ],
      }),
    );
    expect(insight.days.at(-1)).toMatchObject({ date: '2026-10-13', moodType: 'tenang' });
    expect(insight.days.at(-2)!.moodType).toBeNull();
  });

  it('rata-rata mood dari skor harian, dan tren dari paruh pertama vs kedua', () => {
    const scores = ['sedih', 'sedih', 'cemas', 'tenang', 'bahagia', 'bahagia', 'bahagia'];
    const insight = buildWeeklyInsight(
      base({
        moods: scores.map((mood_type, index) => ({
          mood_type,
          created_at: wib(`2026-10-${String(7 + index).padStart(2, '0')}`),
        })),
      }),
    );
    expect(insight.avgMood).toBeCloseTo((1 + 1 + 2 + 4 + 5 + 5 + 5) / 7, 5);
    expect(insight.moodTrend).toBe('rising');
    expect(insight.checkInDays).toBe(7);
  });

  it('hari paling berat: skor terendah (≤ 3), seri → yang terbaru; tidak ada bila semuanya baik', () => {
    const insight = buildWeeklyInsight(
      base({
        moods: [
          { mood_type: 'cemas', created_at: wib('2026-10-09') }, // Jumat, skor 2
          { mood_type: 'tenang', created_at: wib('2026-10-10') },
          { mood_type: 'cemas', created_at: wib('2026-10-12') }, // Senin, skor 2 (seri, lebih baru)
        ],
      }),
    );
    expect(insight.hardestDay).toEqual({ dayName: 'Senin', moodType: 'cemas' });

    const good = buildWeeklyInsight(
      base({
        moods: [
          { mood_type: 'tenang', created_at: wib('2026-10-12') },
          { mood_type: 'bahagia', created_at: wib('2026-10-13') },
        ],
      }),
    );
    expect(good.hardestDay).toBeNull();
  });

  it('hari paling berat tidak ditampilkan dari satu catatan saja', () => {
    const insight = buildWeeklyInsight(
      base({ moods: [{ mood_type: 'sedih', created_at: wib('2026-10-13') }] }),
    );
    expect(insight.hardestDay).toBeNull();
  });
});

describe('tidur', () => {
  const night = (wakeDate: string, hours: number, quality: number) => {
    const wake = new Date(`${wakeDate}T06:00:00+07:00`);
    const bed = new Date(wake.getTime() - hours * 3_600_000);
    return { bedtime: bed.toISOString(), wake_time: wake.toISOString(), quality };
  };

  it('dikelompokkan menurut hari BANGUN dan dihitung dalam jam', () => {
    const insight = buildWeeklyInsight(base({ sleeps: [night('2026-10-13', 7.5, 4)] }));
    expect(insight.days.at(-1)!.sleepHours).toBeCloseTo(7.5, 5);
    expect(insight.days.at(-2)!.sleepHours).toBeNull();
    expect(insight.avgSleepHours).toBeCloseTo(7.5, 5);
  });

  it('rata-rata per catatan, malam bagus = kualitas ≥ 4', () => {
    const insight = buildWeeklyInsight(
      base({
        sleeps: [night('2026-10-10', 8, 5), night('2026-10-11', 6, 3), night('2026-10-12', 7, 4)],
      }),
    );
    expect(insight.avgSleepHours).toBeCloseTo(7, 5);
    expect(insight.goodSleepNights).toBe(2);
    // Urut menurut jam tidur: kualitas [5, 3, 4] → paruh pertama [5], kedua [3, 4] = 3,5 → turun 1,5.
    expect(insight.sleepTrend).toBe('falling');
  });

  it('dua catatan di hari bangun yang sama dijumlahkan (tidur malam + tidur siang)', () => {
    const nap = {
      bedtime: new Date('2026-10-13T13:00:00+07:00').toISOString(),
      wake_time: new Date('2026-10-13T14:00:00+07:00').toISOString(),
      quality: 3,
    };
    const insight = buildWeeklyInsight(base({ sleeps: [night('2026-10-13', 6, 4), nap] }));
    expect(insight.days.at(-1)!.sleepHours).toBeCloseTo(7, 5);
  });

  it('catatan dengan hari bangun di luar jendela diabaikan', () => {
    const insight = buildWeeklyInsight(base({ sleeps: [night('2026-10-05', 8, 5)] }));
    expect(insight.avgSleepHours).toBeNull();
  });
});

describe('streak', () => {
  it('menghitung hari berurutan mundur dari hari ini', () => {
    const stamps = ['2026-10-13', '2026-10-12', '2026-10-11'].map((d) => wib(d));
    expect(computeStreak(stamps, TODAY)).toBe(3);
  });

  it('belum check-in hari ini: streak kemarin dipertahankan (tidak langsung nol)', () => {
    const stamps = ['2026-10-12', '2026-10-11'].map((d) => wib(d));
    expect(computeStreak(stamps, TODAY)).toBe(2);
  });

  it('terputus sehari: hanya hitung rangkaian terbaru', () => {
    const stamps = ['2026-10-13', '2026-10-11', '2026-10-10'].map((d) => wib(d));
    expect(computeStreak(stamps, TODAY)).toBe(1);
  });

  it('kemarin pun kosong: nol', () => {
    expect(computeStreak([wib('2026-10-10')], TODAY)).toBe(0);
    expect(computeStreak([], TODAY)).toBe(0);
  });

  it('beberapa catatan di hari yang sama dihitung satu hari', () => {
    const stamps = [wib('2026-10-13', '08:00'), wib('2026-10-13', '21:00'), wib('2026-10-12')];
    expect(computeStreak(stamps, TODAY)).toBe(2);
  });
});

describe('insight gabungan', () => {
  it('minggu kuat: narasi, pola, lencana, dan tanpa saran latihan yang belum ada di web', () => {
    const moods = [7, 8, 9, 10, 11, 12, 13].map((day) => ({
      mood_type: day < 9 ? 'lelah' : 'bahagia',
      created_at: wib(`2026-10-${String(day).padStart(2, '0')}`),
    }));
    const sleeps = [7, 8, 9, 10, 11, 12, 13].map((day) => {
      const wake = new Date(`2026-10-${String(day).padStart(2, '0')}T06:00:00+07:00`);
      return {
        bedtime: new Date(wake.getTime() - 8 * 3_600_000).toISOString(),
        wake_time: wake.toISOString(),
        quality: 5,
      };
    });
    const insight = buildWeeklyInsight(
      base({
        moods,
        sleeps,
        assessmentsDone: 1,
        recentMoodTimestamps: moods.map((m) => m.created_at),
      }),
    );
    expect(insight.streakDays).toBe(7);
    expect(insight.patterns).toContain(
      'Tidur yang cukup tampak berkaitan dengan suasana hatimu yang lebih baik minggu ini.',
    );
    expect(insight.badges).toEqual(
      expect.arrayContaining(['streak3', 'goodSleep', 'assessmentDone']),
    );
    expect(insight.recommendation).toBeNull();
    expect(insight.narrative).not.toContain('!');
  });

  it('latihan CBT dan refleksi dari aplikasi mobile ikut dihitung, tetapi tidak disarankan di web', () => {
    const insight = buildWeeklyInsight(
      base({
        moods: [{ mood_type: 'tenang', created_at: wib('2026-10-13') }],
        assessmentsDone: 1,
        cbtSessions: 3,
        reflections: 5,
      }),
    );
    expect(insight.badges).toEqual(expect.arrayContaining(['exercise3', 'reflectionComplete']));
    expect(insight.narrative).toContain('aktif berlatih');
    expect(insight.recommendation).toBeNull();
  });

  it('belum asesmen → rekomendasi mengajak asesmen', () => {
    const insight = buildWeeklyInsight(
      base({ moods: [{ mood_type: 'tenang', created_at: wib('2026-10-13') }] }),
    );
    expect(insight.recommendation).toContain('asesmen');
  });
});
