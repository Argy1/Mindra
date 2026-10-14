/**
 * Pengacak DETERMINISTIK (mulberry32): `pnpm seed` selalu menghasilkan data yang sama, sehingga
 * tangkapan layar, angka di proposal, dan tes bisa direproduksi. Bukan untuk keperluan keamanan.
 */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const int = (rng: Rng, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1));

export const chance = (rng: Rng, probability: number): boolean => rng() < probability;

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick: daftar kosong');
  return items[Math.floor(rng() * items.length)] as T;
}

/** Pilih berdasarkan bobot, mis. pickWeighted(rng, [['a', 3], ['b', 1]]). */
export function pickWeighted<T>(rng: Rng, items: ReadonlyArray<readonly [T, number]>): T {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = rng() * total;
  for (const [item, weight] of items) {
    cursor -= weight;
    if (cursor < 0) return item;
  }
  return (items[items.length - 1] as readonly [T, number])[0];
}

/**
 * Hampir-normal (rata-rata 3 acak seragam), cukup untuk data sintetis yang terlihat wajar.
 * `spread` = SETENGAH RENTANG, bukan simpangan baku (simpangan baku ≈ spread / 3,5).
 */
export function approxNormal(rng: Rng, mean: number, spread: number): number {
  return mean + ((rng() + rng() + rng()) / 3 - 0.5) * 2 * spread;
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
