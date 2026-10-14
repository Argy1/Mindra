import { describe, expect, it } from 'vitest';
import {
  groupByDay,
  relativeDayLabel,
  scheduleStatusLabel,
  scheduleWindow,
  splitSchedule,
  type ScheduleItem,
} from './schedule';

const NOW = new Date('2026-10-14T10:00:00+07:00');

const item = (overrides: Partial<ScheduleItem> & { id: string }): ScheduleItem => ({
  scheduledAt: '2026-10-15T10:00:00+07:00',
  durationMinutes: 50,
  status: 'confirmed',
  clientName: null,
  ...overrides,
});

describe('groupByDay', () => {
  it('per hari WIB, hari urut naik, sesi dalam hari urut waktu', () => {
    const days = groupByDay([
      item({ id: 'c', scheduledAt: '2026-10-15T13:00:00+07:00' }),
      item({ id: 'a', scheduledAt: '2026-10-14T13:00:00+07:00' }),
      item({ id: 'b', scheduledAt: '2026-10-15T09:00:00+07:00' }),
    ]);
    expect(days.map((day) => day.date)).toEqual(['2026-10-14', '2026-10-15']);
    expect(days[1]!.items.map((entry) => entry.id)).toEqual(['b', 'c']);
  });

  it('memakai tanggal WIB, bukan UTC: 00.30 WIB tanggal 15 masih tanggal 14 di UTC', () => {
    const [day] = groupByDay([item({ id: 'a', scheduledAt: '2026-10-14T17:30:00Z' })]);
    expect(day!.date).toBe('2026-10-15');
    expect(groupByDay([])).toEqual([]);
  });
});

describe('splitSchedule', () => {
  it('belum berakhir dan belum selesai = akan datang; sisanya baru lewat', () => {
    const { upcoming, recent } = splitSchedule(
      [
        item({ id: 'now', scheduledAt: '2026-10-14T09:30:00+07:00' }), // berakhir 10.20, masih berjalan
        item({ id: 'later' }),
        item({ id: 'ended', scheduledAt: '2026-10-13T10:00:00+07:00' }),
        item({ id: 'done', status: 'completed', scheduledAt: '2026-10-15T08:00:00+07:00' }),
      ],
      NOW,
    );
    expect(upcoming.map((entry) => entry.id)).toEqual(['now', 'later']);
    expect(recent.map((entry) => entry.id)).toEqual(['ended', 'done']);
  });
});

describe('scheduleWindow dan label', () => {
  it('7 hari ke belakang sampai 60 hari ke depan (dalam batas 93 hari RPC)', () => {
    const window = scheduleWindow(NOW);
    expect(window).toEqual({ from: '2026-10-07T00:00:00+07:00', to: '2026-12-13T00:00:00+07:00' });
    const days = (Date.parse(window.to) - Date.parse(window.from)) / 86_400_000;
    expect(days).toBeLessThanOrEqual(93);
  });

  it('hari relatif dan status', () => {
    expect(relativeDayLabel('2026-10-14', '2026-10-14')).toBe('Hari ini');
    expect(relativeDayLabel('2026-10-15', '2026-10-14')).toBe('Besok');
    expect(relativeDayLabel('2026-10-13', '2026-10-14')).toBe('Kemarin');
    expect(relativeDayLabel('2026-10-20', '2026-10-14')).toBeNull();
    expect(scheduleStatusLabel('confirmed')).toBe('Terjadwal');
    expect(scheduleStatusLabel('aneh')).toBe('aneh');
  });
});
