import { describe, expect, it } from 'vitest';
import { describeWeek, sleepBarPercent } from './summary';
import type { DayPoint } from './weekly';

const day = (overrides: Partial<DayPoint>): DayPoint => ({
  date: '2026-10-13',
  dayLabel: 'Sel',
  dayName: 'Selasa',
  isToday: false,
  moodScore: null,
  moodType: null,
  sleepHours: null,
  ...overrides,
});

describe('describeWeek', () => {
  it('menyebut mood dan tidur setiap hari, termasuk yang kosong', () => {
    const text = describeWeek([
      day({ dayName: 'Rabu', moodType: 'tenang', moodScore: 4, sleepHours: 7.5 }),
      day({ dayName: 'Kamis', moodType: 'lelah', moodScore: 3, sleepHours: 5 }),
      day({ dayName: 'Selasa' }),
    ]);
    expect(text).toBe(
      'Mood dan jam tidur 7 hari terakhir. Rabu tenang, tidur 7,5 jam. Kamis lelah, tidur 5,0 jam. Selasa belum check-in, tidur belum dicatat.',
    );
  });

  it('jenis perasaan yang tak dikenal dianggap belum check-in (tidak menampilkan nilai mentah)', () => {
    expect(describeWeek([day({ moodType: '???' })])).toContain('belum check-in');
  });
});

describe('sleepBarPercent', () => {
  it('sama dengan skala desain: 7,5 jam ≈ 78%, 5 jam ≈ 52%', () => {
    expect(sleepBarPercent(7.5)).toBe(78);
    expect(sleepBarPercent(5)).toBe(52);
    expect(sleepBarPercent(4.5)).toBe(47);
  });

  it('dibatasi 0–100', () => {
    expect(sleepBarPercent(0)).toBe(0);
    expect(sleepBarPercent(12)).toBe(100);
    expect(sleepBarPercent(-3)).toBe(0);
  });
});
