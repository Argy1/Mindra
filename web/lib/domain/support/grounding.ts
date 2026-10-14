/**
 * Latihan grounding 5-4-3-2-1 untuk halaman Bantuan: mengalihkan perhatian dari pikiran yang berputar ke panca indra
 * yang ada di sini dan sekarang. Teks saja, tidak ada yang dicatat atau dikirim ke mana pun.
 */

export interface GroundingStep {
  /** Jumlah hal yang dicari pada langkah ini (5, 4, 3, 2, 1). */
  count: number;
  /** Indra yang dipakai, untuk judul langkah. */
  sense: string;
  /** Kalimat ajakan. */
  prompt: string;
}

export const GROUNDING_STEPS: readonly GroundingStep[] = [
  {
    count: 5,
    sense: 'melihat',
    prompt:
      'Sebutkan 5 hal yang bisa kamu lihat. Pelan saja, boleh dalam hati. Perhatikan warna dan bentuknya.',
  },
  {
    count: 4,
    sense: 'menyentuh',
    prompt:
      'Temukan 4 hal yang bisa kamu sentuh. Rasakan permukaannya: halus, kasar, hangat, atau dingin.',
  },
  {
    count: 3,
    sense: 'mendengar',
    prompt:
      'Dengarkan 3 suara yang bisa kamu tangkap. Boleh yang jauh, boleh yang dekat, termasuk napasmu sendiri.',
  },
  {
    count: 2,
    sense: 'mencium',
    prompt: 'Cari 2 aroma yang bisa kamu cium. Kalau tidak ada, ingat 2 aroma yang kamu suka.',
  },
  {
    count: 1,
    sense: 'merasakan',
    prompt:
      'Sebutkan 1 hal yang bisa kamu rasakan di mulut, atau tarik satu napas dalam lalu hembuskan perlahan.',
  },
];

export interface GroundingProgress {
  /** Indeks langkah berjalan (mulai 0). */
  index: number;
  step: GroundingStep;
  /** "Langkah 2 dari 5". */
  label: string;
  isFirst: boolean;
  isLast: boolean;
}

/** Posisi langkah; indeks di luar rentang dipotong ke ujung terdekat. */
export function groundingProgress(
  index: number,
  steps: readonly GroundingStep[] = GROUNDING_STEPS,
): GroundingProgress {
  if (steps.length === 0) throw new Error('Langkah grounding tidak boleh kosong.');
  const clamped = Math.min(
    Math.max(Number.isFinite(index) ? Math.trunc(index) : 0, 0),
    steps.length - 1,
  );
  return {
    index: clamped,
    step: steps[clamped] as GroundingStep,
    label: `Langkah ${clamped + 1} dari ${steps.length}`,
    isFirst: clamped === 0,
    isLast: clamped === steps.length - 1,
  };
}
