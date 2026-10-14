/**
 * Daftar provinsi Indonesia (38) dengan penulisan SAMA dengan `facilities.province` dan `profiles.domicile_province`
 * pada data demo ("DKI Jakarta", "DI Yogyakarta"). `facility_aggregate()` membandingkan provinsi tanpa
 * membedakan huruf besar-kecil, jadi penulisan kanonik di sini menjaga agar pengguna dan faskes bertemu di
 * provinsi yang sama.
 */
export const PROVINCES = [
  'Aceh',
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Kepulauan Riau',
  'Jambi',
  'Sumatera Selatan',
  'Kepulauan Bangka Belitung',
  'Bengkulu',
  'Lampung',
  'DKI Jakarta',
  'Banten',
  'Jawa Barat',
  'Jawa Tengah',
  'DI Yogyakarta',
  'Jawa Timur',
  'Bali',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Kalimantan Barat',
  'Kalimantan Tengah',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Sulawesi Utara',
  'Gorontalo',
  'Sulawesi Tengah',
  'Sulawesi Barat',
  'Sulawesi Selatan',
  'Sulawesi Tenggara',
  'Maluku',
  'Maluku Utara',
  'Papua',
  'Papua Barat',
  'Papua Barat Daya',
  'Papua Selatan',
  'Papua Tengah',
  'Papua Pegunungan',
] as const;

export type Province = (typeof PROVINCES)[number];

/** Penulisan kanonik dari masukan apa pun (abaikan huruf besar-kecil dan spasi ganda), atau null bila tidak dikenal. */
export function canonicalProvince(value: string | null | undefined): Province | null {
  if (!value) return null;
  const key = value.trim().replace(/\s+/g, ' ').toLowerCase();
  return PROVINCES.find((province) => province.toLowerCase() === key) ?? null;
}
