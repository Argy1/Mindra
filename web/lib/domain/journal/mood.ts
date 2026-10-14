/**
 * Jenis perasaan dan pemicu untuk jurnal. Nilai `mood_type`, `triggers`, dan skalanya SAMA dengan
 * aplikasi Flutter (mood_entries): satu tabel dipakai web dan mobile, jadi data harus saling terbaca.
 */

/** Urutan tampil mengikuti design/app-beranda.html. */
export const MOOD_TYPES = [
  'tenang',
  'syukur',
  'bahagia',
  'hangat',
  'lelah',
  'sedih',
  'cemas',
] as const;
export type MoodType = (typeof MOOD_TYPES)[number];

export function isMoodType(value: unknown): value is MoodType {
  return typeof value === 'string' && (MOOD_TYPES as readonly string[]).includes(value);
}

export const MOOD_LABEL: Readonly<Record<MoodType, string>> = {
  tenang: 'Tenang',
  syukur: 'Syukur',
  bahagia: 'Bahagia',
  hangat: 'Hangat',
  lelah: 'Lelah',
  sedih: 'Sedih',
  cemas: 'Cemas',
};

/**
 * Skor 1–5 (5 = terbaik) untuk grafik dan insight. Sama dengan `WeeklyInsightEngine.moodTypeToScore`
 * dan `CaregiverRepositoryImpl._moodScore` di Flutter.
 */
export const MOOD_SCORE: Readonly<Record<MoodType, number>> = {
  bahagia: 5,
  syukur: 5,
  tenang: 4,
  hangat: 4,
  lelah: 3,
  cemas: 2,
  sedih: 1,
};

/** Skor untuk jenis perasaan apa pun; yang tak dikenal dianggap netral (3), seperti di Flutter. */
export function moodTypeToScore(moodType: string): number {
  return isMoodType(moodType) ? MOOD_SCORE[moodType] : 3;
}

/** Ilustrasi kerikil perasaan (public/assets/mood). Dekoratif: label teks selalu menyertainya. */
export function moodGlyphSrc(moodType: MoodType): string {
  return `/assets/mood/${moodType}.svg`;
}

/** Pemicu yang bisa dipilih, sama dengan daftar di aplikasi Flutter (termasuk huruf besarnya). */
export const MOOD_TRIGGERS = [
  'Pekerjaan',
  'Keluarga',
  'Hubungan',
  'Kesehatan',
  'Keuangan',
  'Tidur',
  'Sosial',
  'Aktivitas Fisik',
  'Cuaca',
  'Lainnya',
] as const;
export type MoodTrigger = (typeof MOOD_TRIGGERS)[number];

export const ENERGY_LABELS: Readonly<Record<number, string>> = {
  1: 'Sangat rendah',
  2: 'Rendah',
  3: 'Sedang',
  4: 'Cukup bertenaga',
  5: 'Bertenaga',
};

/** Kualitas tidur 1–5, sama dengan label di aplikasi Flutter (tanpa tanda seru). */
export const SLEEP_QUALITY_LABELS: Readonly<Record<number, string>> = {
  1: 'Sangat buruk: tidur tidak nyenyak sama sekali',
  2: 'Buruk: banyak terbangun atau gelisah',
  3: 'Cukup: tidur tapi kurang segar',
  4: 'Baik: tidur cukup nyenyak',
  5: 'Sangat nyenyak: tidur sempurna',
};

/** Durasi tidur yang masuk akal untuk satu catatan (menit). Di luar itu dianggap salah ketik. */
export const SLEEP_MIN_MINUTES = 30;
export const SLEEP_MAX_MINUTES = 16 * 60;
