import { describe, expect, it } from 'vitest';
import {
  addDaysToKey,
  dateKeyWib,
  formatDecimalId,
  formatShortDayId,
  formatTimeId,
  greetingForHour,
  hourWib,
  isRealDateKey,
  lastDaysKeys,
  weekdayLongId,
  weekdayShortId,
} from './date';

describe('kunci tanggal WIB', () => {
  it('menggeser tanggal menurut WIB, bukan UTC', () => {
    // 20.30 UTC tanggal 13 = 03.30 WIB tanggal 14.
    expect(dateKeyWib('2026-10-13T20:30:00Z')).toBe('2026-10-14');
    expect(dateKeyWib('2026-10-13T16:59:59Z')).toBe('2026-10-13');
    expect(dateKeyWib('2026-10-13T17:00:00Z')).toBe('2026-10-14');
  });

  it('menerima Date, string ISO dengan offset, dan epoch', () => {
    const instant = new Date('2026-10-13T00:30:00+07:00');
    expect(dateKeyWib(instant)).toBe('2026-10-13');
    expect(dateKeyWib('2026-10-13T00:30:00+07:00')).toBe('2026-10-13');
    expect(dateKeyWib(instant.getTime())).toBe('2026-10-13');
  });

  it('addDaysToKey melewati batas bulan dan tahun', () => {
    expect(addDaysToKey('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysToKey('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDaysToKey('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('lastDaysKeys berurut lama → baru dan berakhir di hari yang diminta', () => {
    expect(lastDaysKeys('2026-10-13', 3)).toEqual(['2026-10-11', '2026-10-12', '2026-10-13']);
    expect(lastDaysKeys('2026-10-13', 1)).toEqual(['2026-10-13']);
  });
});

describe('nama hari dan sapaan', () => {
  it('13 Oktober 2026 adalah hari Selasa', () => {
    expect(weekdayLongId('2026-10-13')).toBe('Selasa');
    expect(weekdayShortId('2026-10-13')).toBe('Sel');
    expect(weekdayShortId('2026-10-11')).toBe('Min');
  });

  it('sapaan menurut jam WIB', () => {
    expect(hourWib(new Date('2026-10-13T00:00:00Z'))).toBe(7);
    expect(hourWib(new Date('2026-10-13T17:30:00Z'))).toBe(0);
    expect(greetingForHour(3)).toBe('malam');
    expect(greetingForHour(4)).toBe('pagi');
    expect(greetingForHour(10)).toBe('pagi');
    expect(greetingForHour(11)).toBe('siang');
    expect(greetingForHour(14)).toBe('siang');
    expect(greetingForHour(15)).toBe('sore');
    expect(greetingForHour(17)).toBe('sore');
    expect(greetingForHour(18)).toBe('malam');
    expect(greetingForHour(23)).toBe('malam');
  });

  it('desimal gaya Indonesia', () => {
    expect(formatDecimalId(6.6)).toBe('6,6');
    expect(formatDecimalId(7)).toBe('7,0');
    expect(formatDecimalId(7.55, 2)).toBe('7,55');
  });
});

describe('formatTimeId', () => {
  it('jam WIB dengan titik, bukan zona server', () => {
    expect(formatTimeId('2026-10-13T02:00:00Z')).toBe('09.00');
    expect(formatTimeId('2026-10-13T16:30:00Z')).toBe('23.30');
  });

  it('tengah malam WIB ditulis 00.xx, bukan 24.xx', () => {
    expect(formatTimeId('2026-10-13T17:05:00Z')).toBe('00.05');
  });
});

describe('formatShortDayId', () => {
  it('hari singkat dan tanggal menurut WIB', () => {
    expect(formatShortDayId('2026-10-15T02:00:00Z')).toBe('Kam, 15 Okt');
    // 23.30 UTC tanggal 14 sudah tanggal 15 di WIB.
    expect(formatShortDayId('2026-10-14T23:30:00Z')).toBe('Kam, 15 Okt');
  });
});

describe('isRealDateKey', () => {
  it('menerima tanggal yang ada di kalender, termasuk 29 Februari tahun kabisat', () => {
    for (const key of ['2026-10-13', '2024-02-29', '2026-12-31', '2026-01-01']) {
      expect(isRealDateKey(key), key).toBe(true);
    }
  });

  it('menolak tanggal yang tidak ada walau Date.parse menerimanya', () => {
    for (const key of [
      '2026-02-31',
      '2026-02-29',
      '2026-04-31',
      '2026-13-01',
      '2026-00-10',
      '2026-10-00',
      '2026-10-32',
    ]) {
      expect(isRealDateKey(key), key).toBe(false);
    }
  });

  it('menolak format yang bukan YYYY-MM-DD', () => {
    for (const key of [
      '',
      '13-10-2026',
      '2026-10-13T00:00:00Z',
      '2026-1-1',
      ' 2026-10-13',
      '2026/10/13',
      'besok',
    ]) {
      expect(isRealDateKey(key), key).toBe(false);
    }
  });
});
