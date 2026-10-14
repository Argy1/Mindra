/**
 * Napas terpandu untuk halaman Bantuan. Fungsi murni: komponen hanya memanggil `breathPosition(waktuBerlalu)` dan
 * menggambar hasilnya, jadi seluruh aturan waktu bisa diuji tanpa pewaktu atau DOM.
 *
 * Pola 4-4-6 (tarik 4 detik, tahan 4 detik, hembus 6 detik): hembusan yang lebih panjang dari tarikan membantu menurunkan
 * ketegangan, dan polanya cukup pendek untuk orang yang sedang panik. Ini latihan menenangkan diri, bukan terapi.
 */

export type BreathPhaseId = 'in' | 'hold' | 'out';

export interface BreathPhase {
  id: BreathPhaseId;
  /** Teks yang tampil dan dibacakan pembaca layar. */
  label: string;
  seconds: number;
}

export const BREATHING_PATTERN: readonly BreathPhase[] = [
  { id: 'in', label: 'Tarik napas', seconds: 4 },
  { id: 'hold', label: 'Tahan sebentar', seconds: 4 },
  { id: 'out', label: 'Hembuskan pelan', seconds: 6 },
];

export const BREATHING_CYCLES = 5;

export interface BreathingOptions {
  pattern?: readonly BreathPhase[];
  cycles?: number;
}

export interface BreathPosition {
  /** Semua siklus sudah selesai. */
  done: boolean;
  /** Siklus berjalan, mulai dari 1 (saat selesai: jumlah siklus). */
  cycle: number;
  cycles: number;
  phase: BreathPhase;
  /** Detik tersisa pada fase ini, dibulatkan ke atas (selalu 1 atau lebih selama berjalan; 0 saat selesai). */
  secondsLeft: number;
}

/** Lama satu siklus penuh, dalam detik. */
export function cycleSeconds(pattern: readonly BreathPhase[] = BREATHING_PATTERN): number {
  return pattern.reduce((total, phase) => total + phase.seconds, 0);
}

/** Lama seluruh latihan, dalam milidetik. */
export function totalMs(options: BreathingOptions = {}): number {
  const { pattern = BREATHING_PATTERN, cycles = BREATHING_CYCLES } = options;
  return cycleSeconds(pattern) * cycles * 1000;
}

/** Posisi dalam latihan setelah `elapsedMs` milidetik sejak mulai. Nilai negatif dianggap 0. */
export function breathPosition(elapsedMs: number, options: BreathingOptions = {}): BreathPosition {
  const { pattern = BREATHING_PATTERN, cycles = BREATHING_CYCLES } = options;
  const last = pattern[pattern.length - 1];
  const first = pattern[0];
  if (!first || !last) throw new Error('Pola napas tidak boleh kosong.');

  const elapsed = Number.isNaN(elapsedMs) ? 0 : Math.max(0, elapsedMs);
  if (elapsed >= totalMs({ pattern, cycles })) {
    return { done: true, cycle: cycles, cycles, phase: last, secondsLeft: 0 };
  }

  const cycleMs = cycleSeconds(pattern) * 1000;
  const cycle = Math.floor(elapsed / cycleMs) + 1;
  let within = elapsed % cycleMs;
  for (const phase of pattern) {
    const phaseMs = phase.seconds * 1000;
    if (within < phaseMs) {
      return {
        done: false,
        cycle,
        cycles,
        phase,
        secondsLeft: Math.ceil((phaseMs - within) / 1000),
      };
    }
    within -= phaseMs;
  }
  // Tidak terjangkau: `within` selalu lebih kecil dari lama siklus.
  return { done: false, cycle, cycles, phase: last, secondsLeft: 1 };
}
