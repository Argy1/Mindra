import { describe, expect, it } from 'vitest';
import { groupTotpSecret, totpCodeSchema } from './mfa';

describe('totpCodeSchema', () => {
  it.each([
    ['123456', '123456'],
    ['123 456', '123456'],
    [' 000000 ', '000000'],
  ])('menerima %j', (input, expected) => {
    expect(totpCodeSchema.parse(input)).toBe(expected);
  });

  it.each(['', '12345', '1234567', 'abcdef', '12 34 5a', '١٢٣٤٥٦', '123-456'])(
    'menolak %j',
    (input) => {
      expect(totpCodeSchema.safeParse(input).success).toBe(false);
    },
  );

  it('menolak bukan string', () => {
    for (const value of [null, undefined, 123456, {}]) {
      expect(totpCodeSchema.safeParse(value).success).toBe(false);
    }
  });
});

describe('groupTotpSecret', () => {
  it('memotong per 4 karakter tanpa spasi di ujung', () => {
    expect(groupTotpSecret('ABCDEFGH')).toBe('ABCD EFGH');
    expect(groupTotpSecret('ABCDEFGHIJ')).toBe('ABCD EFGH IJ');
    expect(groupTotpSecret('ABCD')).toBe('ABCD');
    expect(groupTotpSecret('')).toBe('');
  });
});
