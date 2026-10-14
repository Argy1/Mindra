/**
 * Direktori psikolog: tipe kartu, penyaringan, dan pengurutan. Fungsi murni; pembacaan dari database ada di
 * lib/server/consultation.ts. Hanya data publik psikolog yang dipakai (nama, gelar, spesialisasi, bahasa, bio,
 * tarif, penilaian); nomor lisensi dan STR tidak pernah dibaca ke tampilan.
 */

export interface PsychologistCard {
  id: string;
  name: string;
  title: string;
  specializations: string[];
  languages: string[];
  bio: string | null;
  photoUrl: string | null;
  rating: number;
  reviews: number;
  /** Tarif per sesi, rupiah. 0 = belum ditetapkan. */
  fee: number;
  verified: boolean;
  availableNow: boolean;
}

export const SORT_OPTIONS = ['rating', 'tarif', 'nama'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABEL: Readonly<Record<SortOption, string>> = {
  rating: 'Penilaian tertinggi',
  tarif: 'Tarif terendah',
  nama: 'Nama (A–Z)',
};

export interface DirectoryFilters {
  q: string;
  specialization: string;
  language: string;
  sort: SortOption;
  /** Hanya psikolog yang menandai dirinya tersedia sekarang. */
  availableNow: boolean;
}

export const DEFAULT_FILTERS: DirectoryFilters = {
  q: '',
  specialization: '',
  language: '',
  sort: 'rating',
  availableNow: false,
};

const MAX_QUERY = 60;
const MAX_FACET = 60;

const first = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? '';

/** Membersihkan nilai bebas: dipangkas, spasi dipadatkan, karakter kontrol dibuang, panjang dibatasi. */
function clean(value: string, max: number): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Nilai URL yang tidak dikenal jatuh ke bawaan, bukan galat: tautan lama atau salah ketik tetap membuka halaman. */
export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): DirectoryFilters {
  const sort = first(params.urut);
  return {
    q: clean(first(params.q), MAX_QUERY),
    specialization: clean(first(params.spesialisasi), MAX_FACET),
    language: clean(first(params.bahasa), 8).toLowerCase(),
    sort: (SORT_OPTIONS as readonly string[]).includes(sort) ? (sort as SortOption) : 'rating',
    availableNow: first(params.sekarang) === '1',
  };
}

/** Query string dari filter, hanya nilai yang bukan bawaan (tautan yang bersih). */
export function filtersToQuery(filters: DirectoryFilters): string {
  const search = new URLSearchParams();
  if (filters.q) search.set('q', filters.q);
  if (filters.specialization) search.set('spesialisasi', filters.specialization);
  if (filters.language) search.set('bahasa', filters.language);
  if (filters.sort !== DEFAULT_FILTERS.sort) search.set('urut', filters.sort);
  if (filters.availableNow) search.set('sekarang', '1');
  const text = search.toString();
  return text ? `?${text}` : '';
}

const fold = (value: string) => value.toLocaleLowerCase('id-ID');

export function filterPsychologists(
  list: readonly PsychologistCard[],
  filters: DirectoryFilters,
): PsychologistCard[] {
  const needle = fold(filters.q);
  const matches = list.filter((item) => {
    if (filters.availableNow && !item.availableNow) return false;
    if (
      filters.specialization &&
      !item.specializations.some((entry) => fold(entry) === fold(filters.specialization))
    ) {
      return false;
    }
    if (filters.language && !item.languages.includes(filters.language)) return false;
    if (needle) {
      const haystack = fold(
        [item.name, item.title, item.bio ?? '', ...item.specializations].join(' '),
      );
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const byName = (a: PsychologistCard, b: PsychologistCard) => a.name.localeCompare(b.name, 'id');
  return [...matches].sort((a, b) => {
    if (filters.sort === 'nama') return byName(a, b);
    if (filters.sort === 'tarif') {
      // Tarif yang belum ditetapkan (0) diurutkan terakhir, bukan "paling murah".
      const fa = a.fee === 0 ? Number.POSITIVE_INFINITY : a.fee;
      const fb = b.fee === 0 ? Number.POSITIVE_INFINITY : b.fee;
      return fa - fb || byName(a, b);
    }
    return b.rating - a.rating || b.reviews - a.reviews || byName(a, b);
  });
}

export function collectFacets(list: readonly PsychologistCard[]): {
  specializations: string[];
  languages: string[];
} {
  const specializations = new Map<string, string>();
  const languages = new Set<string>();
  for (const item of list) {
    for (const entry of item.specializations) specializations.set(fold(entry), entry);
    for (const language of item.languages) languages.add(language);
  }
  return {
    specializations: [...specializations.values()].sort((a, b) => a.localeCompare(b, 'id')),
    languages: [...languages].sort(),
  };
}

const LANGUAGE_LABEL: Readonly<Record<string, string>> = {
  id: 'Indonesia',
  en: 'Inggris',
  jv: 'Jawa',
  su: 'Sunda',
  ar: 'Arab',
  zh: 'Mandarin',
};

export const languageLabel = (code: string): string => LANGUAGE_LABEL[code] ?? code.toUpperCase();

/** "Rp 150.000"; 0 berarti belum ditetapkan. */
export function formatRupiah(amount: number): string {
  if (amount <= 0) return 'Belum ditetapkan';
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
}

/** Dua huruf awal nama (mengabaikan gelar "Dr." dan sejenisnya) untuk avatar tanpa foto. */
export function initialsOf(name: string): string {
  const words = name
    .replace(/\b(?:dr|drs|prof|ir)\.?\s/gi, '')
    .split(/[\s,]+/)
    .filter((word) => /^\p{L}/u.test(word));
  return words
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}
