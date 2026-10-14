import { describe, expect, it } from 'vitest';
import { summarizeMoods, summarizeSleep } from './detail';

const TODAY = '2026-10-13';
const at = (date: string, time = '08:00') => `${date}T${time}:00+07:00`;

describe('summarizeMoods', () => {
  it('14 hari berakhir hari ini, satu perasaan per hari (yang pertama), hari kosong null', () => {
    const overview = summarizeMoods(
      [
        { mood_type: 'cemas', created_at: at('2026-10-13', '08:00') },
        { mood_type: 'tenang', created_at: at('2026-10-13', '20:00') },
        { mood_type: 'sedih', created_at: at('2026-10-11') },
      ],
      TODAY,
    );
    expect(overview.days).toHaveLength(14);
    expect(overview.days[13]).toEqual({ key: '2026-10-13', mood: 'cemas' });
    expect(overview.days[12]).toEqual({ key: '2026-10-12', mood: null });
    expect(overview.days[11]).toEqual({ key: '2026-10-11', mood: 'sedih' });
    expect(overview.checkInDays).toBe(2);
  });

  it('menghitung perasaan terbanyak dari semua catatan; seri dimenangkan urutan baku', () => {
    const overview = summarizeMoods(
      [
        { mood_type: 'sedih', created_at: at('2026-10-10') },
        { mood_type: 'sedih', created_at: at('2026-10-11') },
        { mood_type: 'tenang', created_at: at('2026-10-12') },
        { mood_type: 'tenang', created_at: at('2026-10-13') },
      ],
      TODAY,
    );
    expect(overview.top).toEqual({ mood: 'tenang', count: 2 });
  });

  it('mengabaikan catatan di luar jendela dan jenis perasaan yang tak dikenal', () => {
    const overview = summarizeMoods(
      [
        { mood_type: 'sedih', created_at: at('2026-09-01') },
        { mood_type: 'marah-besar', created_at: at('2026-10-12') },
      ],
      TODAY,
    );
    expect(overview.checkInDays).toBe(0);
    expect(overview.top).toBeNull();
  });

  it('batas hari memakai WIB, bukan UTC', () => {
    const overview = summarizeMoods(
      [
        // 23.30 WIB tanggal 12 (di UTC masih tanggal 12 juga).
        { mood_type: 'lelah', created_at: '2026-10-12T16:30:00Z' },
        // 00.30 WIB tanggal 13 (di UTC masih tanggal 12): harus masuk hari ke-13.
        { mood_type: 'syukur', created_at: '2026-10-12T17:30:00Z' },
      ],
      TODAY,
    );
    expect(overview.days[12]).toEqual({ key: '2026-10-12', mood: 'lelah' });
    expect(overview.days[13]).toEqual({ key: '2026-10-13', mood: 'syukur' });
  });

  it('tanpa data tidak menghasilkan apa pun selain kerangka hari', () => {
    const overview = summarizeMoods([], TODAY);
    expect(overview.days.every((day) => day.mood === null)).toBe(true);
    expect(overview.top).toBeNull();
  });
});

describe('summarizeSleep', () => {
  const night = (wakeDate: string, hours: number, quality = 3) => {
    const wake = new Date(at(wakeDate, '06:00'));
    return {
      bedtime: new Date(wake.getTime() - hours * 3_600_000).toISOString(),
      wake_time: wake.toISOString(),
      quality,
    };
  };

  it('rata-rata jam, kualitas, dan jumlah malam pendek', () => {
    const overview = summarizeSleep(
      [night('2026-10-13', 8, 5), night('2026-10-12', 5, 2), night('2026-10-11', 5.5, 2)],
      TODAY,
    );
    expect(overview.nights).toBe(3);
    expect(overview.avgHours).toBeCloseTo(6.1667, 3);
    expect(overview.avgQuality).toBeCloseTo(3, 5);
    expect(overview.shortNights).toBe(2);
    expect(overview.days[13]!.hours).toBeCloseTo(8, 5);
    expect(overview.days[11]!.hours).toBeCloseTo(5.5, 5);
  });

  it('catatan di hari yang sama dijumlahkan', () => {
    const overview = summarizeSleep([night('2026-10-13', 6), night('2026-10-13', 1)], TODAY);
    expect(overview.nights).toBe(1);
    expect(overview.days[13]!.hours).toBeCloseTo(7, 5);
  });

  it('mengabaikan catatan di luar jendela dan durasi tidak masuk akal', () => {
    const broken = {
      bedtime: at('2026-10-13', '07:00'),
      wake_time: at('2026-10-13', '06:00'),
      quality: 3,
    };
    const overview = summarizeSleep([night('2026-09-01', 7), broken], TODAY);
    expect(overview.nights).toBe(0);
    expect(overview.avgHours).toBeNull();
    expect(overview.avgQuality).toBeNull();
    expect(overview.shortNights).toBe(0);
  });
});
