// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  clientIp,
  createMemoryLimiter,
  createUpstashLimiter,
  type RateLimiter,
  type RateRule,
} from './ratelimit';

const RULE: RateRule = { name: 'uji', limit: 3, windowSeconds: 60 };

describe('createMemoryLimiter', () => {
  it('mengizinkan sampai batas lalu menolak, dengan sisa dan waktu reset yang benar', async () => {
    let now = 1_000_000;
    const limiter = createMemoryLimiter(() => now);

    const results = [];
    for (let i = 0; i < 4; i += 1) results.push(await limiter.check('k', RULE));

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0]);
    expect(results[3]!.resetAt).toBe(Math.ceil((1_000_000 + 60_000) / 1000));
    now += 1;
  });

  it('jendela bergeser: permintaan lama gugur satu per satu, bukan sekaligus', async () => {
    let now = 0;
    const limiter = createMemoryLimiter(() => now);
    await limiter.check('k', RULE); // t=0
    now = 20_000;
    await limiter.check('k', RULE); // t=20s
    now = 40_000;
    await limiter.check('k', RULE); // t=40s → penuh
    expect((await limiter.check('k', RULE)).allowed).toBe(false);

    now = 61_000; // hanya t=0 yang gugur
    expect((await limiter.check('k', RULE)).allowed).toBe(true);
    expect((await limiter.check('k', RULE)).allowed).toBe(false);
  });

  it('kunci dan aturan saling terpisah', async () => {
    const limiter = createMemoryLimiter(() => 0);
    for (let i = 0; i < 3; i += 1) await limiter.check('a', RULE);
    expect((await limiter.check('a', RULE)).allowed).toBe(false);
    expect((await limiter.check('b', RULE)).allowed).toBe(true);
    expect((await limiter.check('a', { ...RULE, name: 'lain' })).allowed).toBe(true);
  });

  it('permintaan yang ditolak tidak memperpanjang hukuman', async () => {
    let now = 0;
    const limiter = createMemoryLimiter(() => now);
    for (let i = 0; i < 3; i += 1) await limiter.check('k', RULE);
    for (let i = 0; i < 50; i += 1) await limiter.check('k', RULE); // dibombardir saat penuh
    now = 61_000;
    expect((await limiter.check('k', RULE)).allowed).toBe(true);
  });

  it('membersihkan kunci lama supaya memori tidak tumbuh tanpa batas', async () => {
    let now = 0;
    const limiter = createMemoryLimiter(() => now);
    for (let i = 0; i < 500; i += 1) await limiter.check(`k${i}`, RULE);
    now = 200_000;
    await limiter.check('baru', RULE);
    // Tidak ada API untuk melihat ukuran Map; pastikan perilaku tetap benar setelah penyapuan.
    expect((await limiter.check('k0', RULE)).remaining).toBe(2);
  });
});

describe('createUpstashLimiter', () => {
  it('jatuh ke cadangan (bukan menolak semua) saat Upstash gagal', async () => {
    const fallback: RateLimiter = {
      check: vi.fn(async () => ({ allowed: true, limit: 3, remaining: 2, resetAt: 99 })),
    };
    // Redis palsu yang selalu melempar pada setiap perintah.
    const broken = new Proxy(
      {},
      {
        get: () => () => {
          throw new Error('jaringan putus');
        },
      },
    ) as never;
    const limiter = createUpstashLimiter(broken, fallback);
    const result = await limiter.check('k', RULE);
    expect(result).toEqual({ allowed: true, limit: 3, remaining: 2, resetAt: 99 });
    expect(fallback.check).toHaveBeenCalledWith('k', RULE);
  });
});

describe('clientIp', () => {
  it('memakai x-real-ip, lalu entri pertama x-forwarded-for, lalu unknown', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' }))).toBe(
      '1.2.3.4',
    );
    expect(clientIp(new Headers({ 'x-forwarded-for': '5.6.7.8, 10.0.0.1' }))).toBe('5.6.7.8');
    expect(clientIp(new Headers())).toBe('unknown');
  });

  it('memotong header yang sangat panjang', () => {
    expect(clientIp(new Headers({ 'x-real-ip': 'a'.repeat(500) }))).toHaveLength(64);
  });
});
