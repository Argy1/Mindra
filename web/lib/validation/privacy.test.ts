// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  generateInviteCode,
  INVITE_CODE_ALPHABET,
  inviteCodeInputSchema,
  phoneSchema,
} from './privacy';

describe('phoneSchema', () => {
  it.each([
    ['0812 3456 7890', '081234567890'],
    ['0812-3456-7890', '081234567890'],
    ['+62 812 3456 7890', '+6281234567890'],
    ['6281234567890', '6281234567890'],
    ['  081298765432  ', '081298765432'],
  ])('menerima dan merapikan %s', (input, expected) => {
    expect(phoneSchema.parse(input)).toBe(expected);
  });

  it.each([
    '',
    '0712345678',
    '08',
    '081234',
    '0812345678901234',
    'abc',
    '0812 345 678a',
    '+1 555 123 4567',
    "0812'; drop table",
  ])('menolak %j', (input) => {
    expect(phoneSchema.safeParse(input).success).toBe(false);
  });

  it('menolak bukan string', () => {
    for (const value of [null, undefined, 812345678, {}]) {
      expect(phoneSchema.safeParse(value).success).toBe(false);
    }
  });
});

describe('generateInviteCode', () => {
  it('8 karakter dari alfabet tanpa simbol yang mudah tertukar', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateInviteCode()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    }
    expect(INVITE_CODE_ALPHABET).toHaveLength(32);
    expect(INVITE_CODE_ALPHABET).not.toMatch(/[IO01]/);
  });

  it('tidak berulang dan tidak tetap: 500 kode semuanya berbeda dan memakai banyak simbol', () => {
    const codes = Array.from({ length: 500 }, () => generateInviteCode());
    expect(new Set(codes).size).toBe(500);
    expect(new Set(codes.join('')).size).toBeGreaterThanOrEqual(30);
    expect(codes).not.toContain('PENDING00');
  });

  it('panjang bisa diatur', () => {
    expect(generateInviteCode(12)).toHaveLength(12);
  });
});

describe('inviteCodeInputSchema', () => {
  it.each([
    ['abcd2345', 'ABCD2345'],
    ['  abcd 2345 ', 'ABCD2345'],
    ['ABCD-2345', 'ABCD2345'],
  ])('menormalkan %j', (input, expected) => {
    expect(inviteCodeInputSchema.parse(input)).toBe(expected);
  });

  it.each(['', 'abc', 'a'.repeat(33), 'AB CD!', "x' or 1=1", '../etc', 'ÀBCD1234'])(
    'menolak %j',
    (input) => {
      expect(inviteCodeInputSchema.safeParse(input).success).toBe(false);
    },
  );
});
