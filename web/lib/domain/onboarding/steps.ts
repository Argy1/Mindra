/**
 * Panduan awal di Beranda untuk pengguna baru. Tiga langkah, semuanya ke halaman yang sudah ada, dalam urutan yang
 * memberi nilai paling cepat: mengenali perasaan, memegang kendali atas data, lalu tahu ke mana mencari bantuan.
 * Konten saja (tanpa I/O); apakah panduan sudah ditutup disimpan di metadata akun (`onboarding_done_at`).
 */

export interface OnboardingStep {
  id: 'cek' | 'privasi' | 'bantuan';
  title: string;
  description: string;
  href: string;
  /** Teks tautan. */
  cta: string;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: 'cek',
    title: 'Kenali perasaanmu',
    description:
      'Mulai dari check-in mood hari ini di atas, atau skrining singkat (PHQ-9, GAD-7, PSS-10, SRQ-20). Hasilnya gambaran, bukan diagnosis.',
    href: '/asesmen',
    cta: 'Mulai skrining',
  },
  {
    id: 'privasi',
    title: 'Pegang kendali atas datamu',
    description:
      'Tidak ada yang melihat catatanmu kecuali kamu mengizinkannya. Kamu bisa memilih siapa yang boleh melihat apa, dan mencabutnya kapan saja.',
    href: '/privasi',
    cta: 'Atur izin',
  },
  {
    id: 'bantuan',
    title: 'Tahu ke mana mencari bantuan',
    description:
      'Kontak krisis, latihan napas, dan layanan kesehatan terdekat selalu bisa dibuka, bahkan tanpa masuk akun.',
    href: '/bantuan',
    cta: 'Lihat bantuan',
  },
];

/** Kunci metadata akun yang menandai panduan sudah ditutup (nilai: waktu ISO). */
export const ONBOARDING_METADATA_KEY = 'onboarding_done_at';

/** Apakah metadata akun menyatakan panduan sudah ditutup. Nilai yang bukan teks tidak dianggap selesai. */
export function isOnboardingDone(metadata: unknown): boolean {
  if (typeof metadata !== 'object' || metadata === null) return false;
  const value = (metadata as Record<string, unknown>)[ONBOARDING_METADATA_KEY];
  return typeof value === 'string' && value.trim() !== '';
}
