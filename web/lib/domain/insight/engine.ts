/**
 * Mesin aturan untuk insight mingguan. Port dari `WeeklyInsightEngine`
 * (lib/features/home/domain/weekly_insight_engine.dart): fungsi murni tanpa I/O, jadi narasi, pola,
 * rekomendasi, dan lencana bisa diuji terpisah.
 *
 * Logika dan ambang SAMA dengan Flutter (kasus ujinya diport di engine.test.ts). Bedanya hanya teks:
 *   * tanda seru dihapus (aturan copy: tanpa tanda seru), dan
 *   * angka desimal ditulis gaya Indonesia ("7,5 jam").
 */
import { formatDecimalId } from '@/lib/utils/date';

export type MoodTrend = 'rising' | 'falling' | 'stable' | 'insufficient';
export type SleepTrend = 'rising' | 'falling' | 'stable' | 'insufficient';

/** Skor mood satu hari. `score` null = tidak ada catatan. */
export interface DayScore {
  score: number | null;
}

const average = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

// ── Tren ────────────────────────────────────────────────────────────────────────

/**
 * Membandingkan rata-rata paruh pertama dan paruh kedua hari yang punya skor. Selisih lebih dari
 * 0,5 poin dianggap naik/turun. Butuh minimal 3 hari berskor, jika tidak: `insufficient`.
 * Untuk jumlah ganjil, hari tengah masuk paruh kedua (sama dengan `take(n ~/ 2)` / `skip(n ~/ 2)`).
 */
export function computeMoodTrend(points: readonly DayScore[]): MoodTrend {
  const scored = points.flatMap((point) => (point.score === null ? [] : [point.score]));
  if (scored.length < 3) return 'insufficient';

  const half = Math.floor(scored.length / 2);
  const avgFirst = average(scored.slice(0, half));
  const avgLast = average(scored.slice(half));

  if (avgLast - avgFirst > 0.5) return 'rising';
  if (avgFirst - avgLast > 0.5) return 'falling';
  return 'stable';
}

/** Tren kualitas tidur (skala 1–5): rata-rata paruh pertama vs kedua, ambang 0,5. */
export function computeSleepTrend(qualities: readonly number[]): SleepTrend {
  if (qualities.length < 3) return 'insufficient';
  const half = Math.floor(qualities.length / 2);
  const first = average(qualities.slice(0, half));
  const last = average(qualities.slice(half));

  if (last - first > 0.5) return 'rising';
  if (first - last > 0.5) return 'falling';
  return 'stable';
}

// ── Narasi ──────────────────────────────────────────────────────────────────────

export interface NarrativeInput {
  avgMood: number | null;
  moodTrend: MoodTrend;
  /** Rata-rata jam tidur. */
  avgSleep: number | null;
  /** Jumlah hari yang punya catatan mood. */
  moodCount: number;
  cbt: number;
  assessments: number;
  reflections: number;
}

/** Ringkasan mingguan yang bisa dibaca manusia: pembuka mood → tidur → tren → aktivitas. */
export function buildNarrative(input: NarrativeInput): string {
  const { avgMood, moodTrend, avgSleep, moodCount, cbt, assessments, reflections } = input;

  if (moodCount === 0) {
    return 'Belum ada data perasaan minggu ini. Mulai check-in harian untuk melihat laporanmu.';
  }

  const parts: string[] = [];

  if (avgMood !== null && avgMood >= 4.0) {
    parts.push('Minggu yang cukup menyenangkan untukmu.');
  } else if (avgMood !== null && avgMood >= 3.0) {
    parts.push('Ada naik-turun perasaan minggu ini — itu wajar.');
  } else if (avgMood !== null) {
    parts.push('Sepertinya minggu ini cukup berat. Kamu sudah bertahan — itu kekuatan.');
  }

  if (avgSleep !== null && avgSleep >= 7) {
    parts.push(`Tidurmu cukup baik (${formatDecimalId(avgSleep)} jam).`);
  } else if (avgSleep !== null && avgSleep < 6) {
    parts.push(`Tidurmu kurang dari ideal minggu ini (${formatDecimalId(avgSleep)} jam).`);
  }

  if (moodTrend === 'rising') {
    parts.push('Kondisimu tampak membaik menjelang akhir minggu.');
  } else if (moodTrend === 'falling') {
    parts.push('Perasaanmu menurun di akhir minggu — perhatikan apa yang perlu kamu rawat.');
  }

  if (cbt >= 3) {
    parts.push('Kamu aktif berlatih teknik kesehatan mental. Luar biasa.');
  } else if (reflections >= 5) {
    parts.push('Refleksi harianmu konsisten — itu bentuk perawatan diri.');
  } else if (assessments >= 1) {
    parts.push('Langkah baik dengan menyelesaikan asesmen minggu ini.');
  }

  const result = parts.join(' ').trim();
  return result === ''
    ? 'Kamu hadir dan mencatat perasaanmu minggu ini. Itu sudah berarti.'
    : result;
}

// ── Pola ────────────────────────────────────────────────────────────────────────

export interface PatternInput {
  avgMood: number | null;
  moodTrend: MoodTrend;
  avgSleep: number | null;
  goodSleepNights: number;
  cbt: number;
  streak: number;
}

/**
 * Maksimal 3 pola yang bisa ditindaklanjuti. Aturan pertama adalah korelasi mood↔tidur: cukup
 * banyak malam bertidur baik bersama mood rata-rata yang sehat ditampilkan sebagai penguat positif.
 */
export function buildPatterns(input: PatternInput): string[] {
  const { avgMood, moodTrend, avgSleep, goodSleepNights, cbt, streak } = input;
  const insights: string[] = [];

  if (goodSleepNights >= 4 && avgMood !== null && avgMood >= 3.5) {
    insights.push(
      'Tidur yang cukup tampak berkaitan dengan suasana hatimu yang lebih baik minggu ini.',
    );
  }

  if (streak >= 5) {
    insights.push(`Kamu check-in ${streak} hari berturut-turut. Konsistensi ini sangat bermakna.`);
  } else if (streak >= 3) {
    insights.push(`Kamu sudah ${streak} hari berturut-turut mencatat perasaanmu. Jaga terus.`);
  }

  if (cbt >= 3) {
    insights.push(`Dengan ${cbt} sesi latihan minggu ini, kamu melatih pikiran secara konsisten.`);
  }

  if (moodTrend === 'falling' && avgMood !== null && avgMood < 3.0) {
    insights.push(
      'Mood kamu cenderung menurun. Cobalah bicara dengan seseorang atau lakukan aktivitas ringan.',
    );
  }

  if (avgSleep !== null && avgSleep < 5.5) {
    insights.push(
      'Kurang tidur bisa memengaruhi suasana hati. Coba atur jadwal tidur lebih konsisten.',
    );
  }

  return insights.slice(0, 3);
}

// ── Rekomendasi ─────────────────────────────────────────────────────────────────

export interface RecommendationInput {
  avgMood: number | null;
  avgSleep: number | null;
  assessments: number;
  cbt: number;
  reflections: number;
  /**
   * Apakah latihan CBT dan refleksi malam tersedia bagi pengguna ini. Bawaan true (sama dengan
   * Flutter). Web mengisi false sampai fitur itu ada di web, supaya tidak menyarankan sesuatu
   * yang tidak bisa dilakukan di sini.
   */
  practicesAvailable?: boolean;
}

/** Satu rekomendasi untuk area terlemah, atau null bila tidak ada yang menonjol. */
export function buildRecommendation(input: RecommendationInput): string | null {
  const { avgMood, avgSleep, assessments, cbt, reflections, practicesAvailable = true } = input;

  if (avgMood !== null && avgMood < 2.5) {
    return 'Mood kamu rendah minggu ini. Pertimbangkan sesi konsultasi dengan psikolog untuk dukungan lebih.';
  }

  if (avgSleep !== null && avgSleep < 6) {
    return 'Prioritaskan tidur minggu depan — tidur 7–8 jam secara konsisten berdampak besar pada kesehatan mental.';
  }

  if (assessments === 0) {
    return 'Kamu belum melakukan asesmen minggu ini. Asesmen rutin membantu memantau kondisi mentalmu secara objektif.';
  }

  if (!practicesAvailable) return null;

  if (cbt === 0 && reflections < 3) {
    return 'Coba satu latihan CBT atau refleksi malam minggu depan — bahkan 5 menit bisa membuat perbedaan.';
  }

  if (reflections < 3) {
    return 'Refleksi malam hanya butuh 3 menit. Coba jadikan kebiasaan sebelum tidur minggu ini.';
  }

  return null;
}

// ── Lencana ─────────────────────────────────────────────────────────────────────

export const BADGE_IDS = [
  'streak3',
  'goodSleep',
  'exercise3',
  'assessmentDone',
  'reflectionComplete',
] as const;
export type BadgeId = (typeof BADGE_IDS)[number];

/** Label sama dengan `WeeklyBadge.label` di Flutter. Tanpa emoji (aturan UI); ikon dipilih di komponen. */
export const BADGE_LABEL: Readonly<Record<BadgeId, string>> = {
  streak3: 'Konsisten 3+ hari',
  goodSleep: 'Tidur berkualitas',
  exercise3: 'Aktif latihan',
  assessmentDone: 'Asesmen selesai',
  reflectionComplete: 'Refleksi rutin',
};

export interface BadgeInput {
  streak: number;
  goodSleep: number;
  cbt: number;
  assessments: number;
  reflections: number;
}

/** Lencana pencapaian mingguan. Ambang inklusif di batasnya. */
export function buildBadges(input: BadgeInput): BadgeId[] {
  const badges: BadgeId[] = [];
  if (input.streak >= 3) badges.push('streak3');
  if (input.goodSleep >= 5) badges.push('goodSleep');
  if (input.cbt >= 3) badges.push('exercise3');
  if (input.assessments >= 1) badges.push('assessmentDone');
  if (input.reflections >= 5) badges.push('reflectionComplete');
  return badges;
}
