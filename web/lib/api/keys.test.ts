// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  API_KEY_MARKER,
  apiKeyPrefix,
  displayApiKeyPrefix,
  generateApiKey,
  hashApiKey,
  isApiKeyFormat,
  isApiScope,
} from './keys';

describe('generateApiKey', () => {
  it('bentuk mk_live_ + 32 karakter base64url; prefiks 8 karakter acak, bukan penanda', () => {
    const { key, prefix, hash } = generateApiKey();
    expect(key).toMatch(/^mk_live_[A-Za-z0-9_-]{32}$/);
    expect(prefix).toHaveLength(8);
    expect(prefix).toBe(key.slice(API_KEY_MARKER.length, API_KEY_MARKER.length + 8));
    expect(prefix).not.toBe('mk_live_'.slice(0, 8));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hash adalah SHA-256 dari kunci utuh dan kunci utuh tidak muncul di hash atau prefiks', () => {
    const { key, prefix, hash } = generateApiKey();
    expect(hash).toBe(hashApiKey(key));
    expect(hash).not.toContain(key.slice(-8));
    expect(prefix.length).toBeLessThan(key.length);
  });

  it('1000 kunci semuanya berbeda dan memakai banyak simbol (acak, bukan berpola)', () => {
    const keys = Array.from({ length: 1000 }, () => generateApiKey().key);
    expect(new Set(keys).size).toBe(1000);
    expect(new Set(keys.join('')).size).toBeGreaterThanOrEqual(50);
  });
});

describe('hashApiKey', () => {
  it('deterministik dan peka pada satu karakter pun', () => {
    const { key } = generateApiKey();
    expect(hashApiKey(key)).toBe(hashApiKey(key));
    const altered = `${key.slice(0, -1)}${key.endsWith('A') ? 'B' : 'A'}`;
    expect(hashApiKey(altered)).not.toBe(hashApiKey(key));
  });

  it('vektor uji SHA-256 yang diketahui', () => {
    expect(hashApiKey('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('isApiKeyFormat', () => {
  it('menerima kunci yang dihasilkan', () => {
    expect(isApiKeyFormat(generateApiKey().key)).toBe(true);
  });

  it.each([
    '',
    'mk_live_',
    'mk_live_short',
    `mk_live_${'a'.repeat(31)}`,
    `mk_live_${'a'.repeat(33)}`,
    `mk_test_${'a'.repeat(32)}`,
    `MK_LIVE_${'a'.repeat(32)}`,
    `mk_live_${'a'.repeat(31)}!`,
    `mk_live_${'a'.repeat(31)} `,
    ` mk_live_${'a'.repeat(32)}`,
    `mk_live_${'a'.repeat(32)}\n`,
    "mk_live_' or 1=1 --",
  ])('menolak %j', (value) => {
    expect(isApiKeyFormat(value)).toBe(false);
  });

  it('menolak bukan string', () => {
    for (const value of [null, undefined, 123, {}, []]) expect(isApiKeyFormat(value)).toBe(false);
  });
});

describe('lain-lain', () => {
  it('tampilan prefiks tidak memuat kunci utuh', () => {
    const { key, prefix } = generateApiKey();
    expect(displayApiKeyPrefix(prefix)).toBe(`mk_live_${prefix}…`);
    expect(displayApiKeyPrefix(prefix)).not.toContain(key);
    expect(apiKeyPrefix(key)).toBe(prefix);
  });

  it('cakupan yang dikenal sama dengan constraint database', () => {
    expect(isApiScope('aggregates:read')).toBe(true);
    for (const value of ['aggregates:write', 'admin', '', null, 1]) {
      expect(isApiScope(value)).toBe(false);
    }
  });
});
