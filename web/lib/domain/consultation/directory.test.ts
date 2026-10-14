import { describe, expect, it } from 'vitest';
import {
  collectFacets,
  DEFAULT_FILTERS,
  filterPsychologists,
  filtersToQuery,
  formatRupiah,
  initialsOf,
  languageLabel,
  parseFilters,
  type PsychologistCard,
} from './directory';

const card = (
  overrides: Partial<PsychologistCard> & { id: string; name: string },
): PsychologistCard => ({
  title: 'M.Psi., Psikolog',
  specializations: ['Kecemasan'],
  languages: ['id'],
  bio: null,
  photoUrl: null,
  rating: 4.5,
  reviews: 10,
  fee: 150000,
  verified: true,
  availableNow: false,
  ...overrides,
});

const LIST: PsychologistCard[] = [
  card({
    id: '1',
    name: 'Rina Sari',
    specializations: ['Depresi', 'Kecemasan'],
    rating: 4.9,
    reviews: 80,
    fee: 200000,
    availableNow: true,
  }),
  card({
    id: '2',
    name: 'Budi Hartono',
    specializations: ['Stres kerja'],
    languages: ['id', 'en'],
    rating: 4.5,
    reviews: 30,
    fee: 120000,
  }),
  card({
    id: '3',
    name: 'Ayu Lestari',
    specializations: ['Remaja'],
    rating: 4.9,
    reviews: 120,
    fee: 0,
    bio: 'Mendampingi remaja dan mahasiswa.',
  }),
  card({
    id: '4',
    name: 'Citra Dewi',
    specializations: ['Kecemasan'],
    languages: ['en'],
    rating: 3.8,
    fee: 100000,
    availableNow: true,
  }),
];
const ids = (list: PsychologistCard[]) => list.map((item) => item.id);

describe('parseFilters', () => {
  it('nilai valid dipakai; kosong menjadi bawaan', () => {
    expect(parseFilters({})).toEqual(DEFAULT_FILTERS);
    expect(
      parseFilters({
        q: 'rina',
        spesialisasi: 'Depresi',
        bahasa: 'EN',
        urut: 'tarif',
        sekarang: '1',
      }),
    ).toEqual({
      q: 'rina',
      specialization: 'Depresi',
      language: 'en',
      sort: 'tarif',
      availableNow: true,
    });
  });

  it('nilai asing tidak melempar: urutan tak dikenal ke rating, sekarang selain "1" mati', () => {
    const parsed = parseFilters({ urut: 'acak; drop table', sekarang: 'true' });
    expect(parsed.sort).toBe('rating');
    expect(parsed.availableNow).toBe(false);
  });

  it('array memakai nilai pertama; karakter kontrol dibuang dan panjang dibatasi', () => {
    expect(parseFilters({ q: ['satu', 'dua'] }).q).toBe('satu');
    expect(parseFilters({ q: 'a\u0000b\nc' }).q).toBe('a b c');
    expect(parseFilters({ q: 'x'.repeat(500) }).q).toHaveLength(60);
    expect(parseFilters({ bahasa: 'indonesia-panjang' }).language).toHaveLength(8);
  });
});

describe('filtersToQuery', () => {
  it('hanya nilai non-bawaan; bolak-balik dengan parseFilters', () => {
    expect(filtersToQuery(DEFAULT_FILTERS)).toBe('');
    const filters = {
      q: 'stres kerja',
      specialization: 'Depresi',
      language: 'en',
      sort: 'nama' as const,
      availableNow: true,
    };
    const query = filtersToQuery(filters);
    expect(query.startsWith('?')).toBe(true);
    const params = Object.fromEntries(new URLSearchParams(query.slice(1)));
    expect(parseFilters(params)).toEqual(filters);
  });
});

describe('filterPsychologists', () => {
  it('tanpa filter: semua, urut rating lalu ulasan', () => {
    expect(ids(filterPsychologists(LIST, DEFAULT_FILTERS))).toEqual(['3', '1', '2', '4']);
  });

  it('spesialisasi tidak peka huruf; bahasa persis; tersedia sekarang', () => {
    expect(
      ids(filterPsychologists(LIST, { ...DEFAULT_FILTERS, specialization: 'kecemasan' })),
    ).toEqual(['1', '4']);
    expect(ids(filterPsychologists(LIST, { ...DEFAULT_FILTERS, language: 'en' }))).toEqual([
      '2',
      '4',
    ]);
    expect(ids(filterPsychologists(LIST, { ...DEFAULT_FILTERS, availableNow: true }))).toEqual([
      '1',
      '4',
    ]);
  });

  it('pencarian bebas: nama, spesialisasi, dan bio; huruf besar-kecil diabaikan', () => {
    expect(ids(filterPsychologists(LIST, { ...DEFAULT_FILTERS, q: 'RINA' }))).toEqual(['1']);
    expect(ids(filterPsychologists(LIST, { ...DEFAULT_FILTERS, q: 'stres' }))).toEqual(['2']);
    expect(ids(filterPsychologists(LIST, { ...DEFAULT_FILTERS, q: 'mahasiswa' }))).toEqual(['3']);
    expect(filterPsychologists(LIST, { ...DEFAULT_FILTERS, q: 'tidak-ada' })).toEqual([]);
  });

  it('filter digabung (dan)', () => {
    expect(
      ids(
        filterPsychologists(LIST, {
          ...DEFAULT_FILTERS,
          specialization: 'Kecemasan',
          language: 'en',
          availableNow: true,
        }),
      ),
    ).toEqual(['4']);
  });

  it('urut tarif: termurah dulu, tarif 0 (belum ditetapkan) terakhir; urut nama A–Z', () => {
    expect(ids(filterPsychologists(LIST, { ...DEFAULT_FILTERS, sort: 'tarif' }))).toEqual([
      '4',
      '2',
      '1',
      '3',
    ]);
    expect(ids(filterPsychologists(LIST, { ...DEFAULT_FILTERS, sort: 'nama' }))).toEqual([
      '3',
      '2',
      '4',
      '1',
    ]);
  });

  it('tidak mengubah daftar asli', () => {
    const snapshot = JSON.stringify(LIST);
    filterPsychologists(LIST, { ...DEFAULT_FILTERS, sort: 'nama' });
    expect(JSON.stringify(LIST)).toBe(snapshot);
  });
});

describe('collectFacets, bahasa, rupiah, inisial', () => {
  it('spesialisasi unik (tanpa duplikat beda huruf) dan bahasa urut', () => {
    const facets = collectFacets([
      ...LIST,
      card({ id: '5', name: 'X', specializations: ['kecemasan', 'Trauma'], languages: ['su'] }),
    ]);
    expect(facets.specializations).toEqual([
      'Depresi',
      'kecemasan',
      'Remaja',
      'Stres kerja',
      'Trauma',
    ]);
    expect(facets.languages).toEqual(['en', 'id', 'su']);
  });

  it('label bahasa dan kode asing', () => {
    expect(languageLabel('id')).toBe('Indonesia');
    expect(languageLabel('en')).toBe('Inggris');
    expect(languageLabel('xx')).toBe('XX');
  });

  it('rupiah gaya Indonesia; nol berarti belum ditetapkan', () => {
    expect(formatRupiah(150000)).toBe('Rp 150.000');
    expect(formatRupiah(1250000)).toBe('Rp 1.250.000');
    expect(formatRupiah(0)).toBe('Belum ditetapkan');
    expect(formatRupiah(-5)).toBe('Belum ditetapkan');
  });

  it('inisial mengabaikan gelar di depan', () => {
    expect(initialsOf('Rina Sari')).toBe('RS');
    expect(initialsOf('dr. Budi Hartono')).toBe('BH');
    expect(initialsOf('Prof. Citra')).toBe('C');
    expect(initialsOf('')).toBe('');
  });
});
