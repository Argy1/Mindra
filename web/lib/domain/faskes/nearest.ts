/**
 * Daftar layanan kesehatan terdekat untuk pengunjung dan pengguna. Fungsi murni: semua penyaringan, pengurutan, dan hitung
 * jarak terjadi di peramban dengan koordinat yang TIDAK pernah dikirim ke server.
 */

export const FACILITY_TYPE_LABEL: Readonly<Record<string, string>> = {
  puskesmas: 'Puskesmas',
  rumah_sakit: 'Rumah sakit',
  klinik: 'Klinik',
  biro_psikologi: 'Biro psikologi',
};

/**
 * Apakah isi direktori sudah dikurasi dari sumber resmi. Selama `false`, halaman menampilkan catatan bahwa daftar ini contoh
 * dan menyarankan SEJIWA atau IGD. Ubah ke `true` hanya setelah data layanan sungguhan dimuat dan diperiksa manusia.
 */
export const FACILITY_DIRECTORY_VERIFIED = false;

export interface DirectoryFacility {
  id: string;
  name: string;
  type: string;
  city: string;
  province: string;
  address: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface FacilityWithDistance extends DirectoryFacility {
  /** Jarak lurus dari titik asal dalam km; null bila titik asal atau koordinat faskes tidak ada. */
  distanceKm: number | null;
}

const EARTH_RADIUS_KM = 6371.0088;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Koordinat sah: garis lintang -90..90, bujur -180..180. */
export function isValidCoordinates(lat: number | null, lng: number | null): boolean {
  return (
    lat !== null &&
    lng !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Jarak lurus (haversine) dalam km. */
export function haversineKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** "850 m", "3,2 km", "120 km": di bawah 1 km dalam meter (kelipatan 10), sampai 10 km satu desimal, selebihnya bulat. */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';
  const meters = Math.max(10, Math.round(km * 100) * 10);
  if (meters < 1000) return `${meters} m`;
  const tenths = Math.round(km * 10);
  if (tenths < 100) return `${(tenths / 10).toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km).toLocaleString('id-ID')} km`;
}

export interface DirectoryFilter {
  /** Kosong = semua provinsi. */
  province?: string;
  /** Cari di nama, kota, dan alamat; tidak peka huruf besar-kecil dan spasi ganda. */
  query?: string;
}

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

export function filterFacilities(
  facilities: readonly DirectoryFacility[],
  filter: DirectoryFilter = {},
): DirectoryFacility[] {
  const province = filter.province ? normalize(filter.province) : '';
  const query = filter.query ? normalize(filter.query) : '';
  return facilities.filter((facility) => {
    if (province && normalize(facility.province) !== province) return false;
    if (!query) return true;
    return [facility.name, facility.city, facility.address ?? '']
      .map(normalize)
      .some((text) => text.includes(query));
  });
}

/**
 * Menambah jarak dan, bila ada titik asal, mengurutkan dari yang terdekat (tanpa koordinat di akhir). Tanpa titik asal
 * urutannya provinsi, kota, lalu nama. Urutan yang sama untuk masukan yang sama (stabil).
 */
export function arrangeFacilities(
  facilities: readonly DirectoryFacility[],
  origin: Coordinates | null,
): FacilityWithDistance[] {
  const withDistance = facilities.map((facility): FacilityWithDistance => {
    const { lat, lng } = facility;
    const located = origin !== null && lat !== null && lng !== null && isValidCoordinates(lat, lng);
    return { ...facility, distanceKm: located ? haversineKm(origin, { lat, lng }) : null };
  });
  const byName = (a: FacilityWithDistance, b: FacilityWithDistance) =>
    a.province.localeCompare(b.province, 'id') ||
    a.city.localeCompare(b.city, 'id') ||
    a.name.localeCompare(b.name, 'id');

  if (!origin) return withDistance.sort(byName);
  return withDistance.sort((a, b) => {
    if (a.distanceKm === null && b.distanceKm === null) return byName(a, b);
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm || byName(a, b);
  });
}

/** Provinsi yang punya faskes, urut abjad, tanpa ganda dan tanpa kosong. */
export function provincesOf(facilities: readonly DirectoryFacility[]): string[] {
  return [...new Set(facilities.map((facility) => facility.province.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, 'id'),
  );
}

/** Tautan peta OpenStreetMap ke satu faskes. Hanya koordinat FASKES yang ada di tautan, tidak pernah lokasi pengguna. */
export function openStreetMapLink(lat: number, lng: number): string {
  const fixed = (value: number) => value.toFixed(5);
  return `https://www.openstreetmap.org/?mlat=${fixed(lat)}&mlon=${fixed(lng)}#map=16/${fixed(lat)}/${fixed(lng)}`;
}

/** Nomor telepon aman untuk `tel:` (angka, plus, dan jeda); kosong bila tidak ada angka. */
export function telHrefOf(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  const digits = cleaned.replace(/\D/g, '');
  return digits.length >= 5 ? `tel:${cleaned}` : null;
}
