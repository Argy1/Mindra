import { PRIMARY_CRISIS_RESOURCE, crisisCallLabel } from '@/lib/domain/crisis/resources';
import type { InstrumentId } from './instruments';
import { tierFor, type Tier } from './scoring';

/**
 * Rekomendasi per tingkat keparahan. Port dari `AssessmentClinical.recommendationsFor` (Flutter):
 * tiga rekomendasi per tingkat, dan tingkat 2–3 menandai saran bantuan profesional sebagai `highlight`.
 *
 * Perbedaan yang disengaja dari Flutter:
 *   * Tombol ajakan (`cta`) hanya ada bila rutenya SUDAH ada di web. Fitur yang belum ada (teman
 *     cerita, konsultasi, latihan CBT) tampil sebagai saran tanpa tombol, bukan tautan mati.
 *   * Nomor layanan krisis diambil dari lib/domain/crisis/resources.ts. Flutter menuliskannya
 *     langsung sebagai "119 ext. 8 (Into The Light)", yang keliru: itu layanan SEJIWA (Kemenkes).
 */

export type RecommendationIcon =
  | 'journal'
  | 'moon'
  | 'repeat'
  | 'breath'
  | 'chat'
  | 'thought'
  | 'professional'
  | 'practice'
  | 'support'
  | 'lifebuoy'
  | 'grounding';

export interface RecommendationAction {
  label: string;
  /** Rute internal, atau `tel:` untuk layanan krisis. */
  href: string;
}

export interface Recommendation {
  id: string;
  icon: RecommendationIcon;
  title: string;
  description: string;
  /** Saran yang sebaiknya tidak terlewat (bantuan profesional / krisis). */
  highlight?: boolean;
  cta?: RecommendationAction;
}

const TIER_0: readonly Recommendation[] = [
  {
    id: 'track-mood',
    icon: 'journal',
    title: 'Catat mood harian',
    description: 'Pantau perasaanmu setiap hari untuk mengenali pola.',
    cta: { label: 'Buka jurnal', href: '/jurnal' },
  },
  {
    id: 'night-reflection',
    icon: 'moon',
    title: 'Refleksi malam',
    description: 'Tiga kalimat singkat sebelum tidur, ringan tapi bermakna.',
  },
  {
    id: 'retake-in-two-weeks',
    icon: 'repeat',
    title: 'Ulangi dalam 2 minggu',
    description: 'Pemeriksaan rutin membantu memantau perkembangan.',
    cta: { label: 'Lihat skrining', href: '/asesmen' },
  },
];

const TIER_1: readonly Recommendation[] = [
  {
    id: 'breathing-478',
    icon: 'breath',
    title: 'Latihan pernapasan 4-7-8',
    description:
      'Tarik napas empat hitungan, tahan tujuh, hembuskan delapan. Lima menit bisa menenangkan pikiran dan tubuh.',
  },
  {
    id: 'talk-to-mindra',
    icon: 'chat',
    title: 'Bicara dengan Mindra',
    description: 'Teman cerita yang siap mendengar kapan saja.',
  },
  {
    id: 'thought-record',
    icon: 'thought',
    title: 'Tuliskan pikiran yang mengganggu',
    description: 'Latihan CBT untuk menata ulang pikiran yang mengganggu.',
    cta: { label: 'Catat di jurnal', href: '/jurnal' },
  },
];

const TIER_2: readonly Recommendation[] = [
  {
    id: 'consult-psychologist',
    icon: 'professional',
    title: 'Konsultasi dengan psikolog',
    description: 'Berbicara dengan profesional dapat memberi strategi yang tepat untuk kondisimu.',
    highlight: true,
  },
  {
    id: 'guided-practice',
    icon: 'practice',
    title: 'Latihan terpandu',
    description: 'Catat pikiran, aktivitas yang menyenangkan, dan relaksasi.',
  },
  {
    id: 'support-network',
    icon: 'support',
    title: 'Bangun jaringan dukungan',
    description:
      'Ceritakan pada orang yang kamu percaya, dan tambahkan kontak darurat dan pendamping.',
  },
];

const TIER_3: readonly Recommendation[] = [
  {
    id: 'consult-now',
    icon: 'professional',
    title: 'Bicara dengan profesional segera',
    description:
      'Hasilmu menunjukkan kondisi yang perlu perhatian profesional. Jangan tunda mencari bantuan.',
    highlight: true,
  },
  {
    id: 'crisis-line',
    icon: 'lifebuoy',
    title: 'Hubungi layanan krisis',
    description: `Layanan ${PRIMARY_CRISIS_RESOURCE.name} (${PRIMARY_CRISIS_RESOURCE.operator}) di ${PRIMARY_CRISIS_RESOURCE.displayNumber}, ${PRIMARY_CRISIS_RESOURCE.availability}.`,
    highlight: true,
    cta: { label: crisisCallLabel(), href: PRIMARY_CRISIS_RESOURCE.telHref },
  },
  {
    id: 'grounding-54321',
    icon: 'grounding',
    title: 'Teknik grounding 5-4-3-2-1',
    description:
      'Sebutkan 5 hal yang kamu lihat, 4 yang kamu rasakan, 3 yang kamu dengar, 2 yang kamu cium, dan 1 yang kamu kecap. Ini membantu menenangkan saat perasaan terasa berat.',
  },
];

const BY_TIER: Readonly<Record<Tier, readonly Recommendation[]>> = {
  0: TIER_0,
  1: TIER_1,
  2: TIER_2,
  3: TIER_3,
};

/** Tiga rekomendasi sesuai tingkat keparahan hasil. */
export function recommendationsFor(id: InstrumentId, score: number): readonly Recommendation[] {
  return BY_TIER[tierFor(id, score)];
}
