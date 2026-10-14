import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Pembatas laju. Dua implementasi di balik satu antarmuka:
 *   - Upstash (jendela geser, terdistribusi) bila UPSTASH_REDIS_REST_URL dan _TOKEN diisi;
 *   - memori proses (jendela geser) sebagai cadangan, untuk pengembangan, tes, dan saat Upstash gagal.
 *
 * Memori proses TIDAK dibagi antar instans serverless, jadi di produksi hanya batas kasar. Itu sebabnya
 * produksi wajib mengisi Upstash. Bila Upstash gagal (jaringan), kita BUKA-SEMENTARA ke memori proses
 * (bukan menolak semua permintaan, yang akan mematikan API karena gangguan pihak ketiga).
 * Kunci batas memuat IP atau id pengguna; tidak pernah ditulis ke log.
 */

export interface RateRule {
  /** Nama aturan, bagian dari kunci (mis. `ip`, `user`, `key`). */
  name: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Epoch detik saat jendela cukup longgar lagi. */
  resetAt: number;
}

export interface RateLimiter {
  check(key: string, rule: RateRule): Promise<RateLimitResult>;
}

/** Jendela geser berbasis log waktu. `now` bisa diganti untuk pengujian. */
export function createMemoryLimiter(now: () => number = Date.now): RateLimiter {
  const hits = new Map<string, number[]>();
  let lastSweep = now();

  return {
    async check(key, rule) {
      const current = now();
      const windowMs = rule.windowSeconds * 1000;
      const bucketKey = `${rule.name}:${key}`;

      // Bersihkan kunci yang sudah lama tidak dipakai supaya Map tidak tumbuh tanpa batas.
      if (current - lastSweep > windowMs) {
        for (const [candidate, stamps] of hits) {
          if (stamps.length === 0 || current - stamps[stamps.length - 1]! > windowMs) {
            hits.delete(candidate);
          }
        }
        lastSweep = current;
      }

      const stamps = (hits.get(bucketKey) ?? []).filter((stamp) => current - stamp < windowMs);
      const allowed = stamps.length < rule.limit;
      if (allowed) stamps.push(current);
      hits.set(bucketKey, stamps);

      const oldest = stamps[0] ?? current;
      return {
        allowed,
        limit: rule.limit,
        remaining: Math.max(0, rule.limit - stamps.length),
        resetAt: Math.ceil((oldest + windowMs) / 1000),
      };
    },
  };
}

/** Pembungkus Upstash dengan cadangan ke `fallback` saat panggilan jaringan gagal. */
export function createUpstashLimiter(redis: Redis, fallback: RateLimiter): RateLimiter {
  const cache = new Map<string, Ratelimit>();

  const limiterFor = (rule: RateRule) => {
    const id = `${rule.name}:${rule.limit}:${rule.windowSeconds}`;
    let limiter = cache.get(id);
    if (!limiter) {
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSeconds} s`),
        prefix: `mindra:rl:${rule.name}`,
        analytics: false,
      });
      cache.set(id, limiter);
    }
    return limiter;
  };

  return {
    async check(key, rule) {
      try {
        const result = await limiterFor(rule).limit(key);
        return {
          allowed: result.success,
          limit: result.limit,
          remaining: result.remaining,
          resetAt: Math.ceil(result.reset / 1000),
        };
      } catch {
        return fallback.check(key, rule);
      }
    },
  };
}

let shared: RateLimiter | undefined;

/** Pembatas bersama proses ini. Dipilih sekali dari lingkungan. */
export function getRateLimiter(env: NodeJS.ProcessEnv = process.env): RateLimiter {
  if (shared) return shared;
  const memory = createMemoryLimiter();
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  shared = url && token ? createUpstashLimiter(new Redis({ url, token }), memory) : memory;
  return shared;
}

/** Hanya untuk tes: lepaskan pembatas bersama. */
export function resetRateLimiterForTests(): void {
  shared = undefined;
}

/**
 * Alamat klien untuk kunci batas. Di Vercel, `x-forwarded-for` diisi ulang oleh platform (nilai dari klien
 * ditimpa), jadi entri pertamanya dapat dipercaya. DI BELAKANG PROXY LAIN, pastikan proxy itu juga menimpanya,
 * atau penyerang bisa berganti "IP" di setiap permintaan.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const candidate = headers.get('x-real-ip')?.trim() || forwarded || 'unknown';
  // Batasi panjang agar header palsu yang sangat panjang tidak menggembungkan memori.
  return candidate.slice(0, 64);
}
