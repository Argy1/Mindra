import { describe, expect, it } from 'vitest';
import { timeOptions } from './review';

describe('timeOptions: pilihan jam 24 jam', () => {
  it('00:00 sampai 23:30 per 30 menit (48 pilihan), tanpa AM/PM', () => {
    const options = timeOptions();
    expect(options).toHaveLength(48);
    expect(options[0]).toBe('00:00');
    expect(options[1]).toBe('00:30');
    expect(options[18]).toBe('09:00');
    expect(options[30]).toBe('15:00');
    expect(options.at(-1)).toBe('23:30');
    expect(options.every((value) => /^([01]\d|2[0-3]):[03]0$/.test(value))).toBe(true);
    expect(options.some((value) => /AM|PM/i.test(value))).toBe(false);
  });

  it('nilai yang dikembalikan server di luar kisi disisipkan berurutan, bukan hilang; nilai tak sah diabaikan', () => {
    const options = timeOptions('09:15');
    expect(options).toHaveLength(49);
    expect(options.slice(18, 21)).toEqual(['09:00', '09:15', '09:30']);
    expect(timeOptions('09:00')).toHaveLength(48);
    expect(timeOptions('25:00')).toHaveLength(48);
    expect(timeOptions('')).toHaveLength(48);
    expect(timeOptions(undefined)).toHaveLength(48);
  });
});
