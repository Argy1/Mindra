/**
 * Katalog tetap untuk data demo: akun demo, faskes, psikolog, kota. SEMUA SINTETIS.
 * Faskes dan psikolog diberi UUID tetap supaya `pnpm seed --reset` bisa menghapusnya persis
 * (tabelnya tidak punya kolom is_demo). Email memakai domain khusus `.test` (dicadangkan untuk uji).
 */
export const DEMO_EMAIL_DOMAIN = 'demo.mindra.test';

/** Kata sandi akun demo (dicantumkan di README untuk juri). Akun sintetis memakai sandi acak. */
export const DEFAULT_DEMO_PASSWORD = 'Mindra-Demo-2026';

export interface DemoAccount {
  key: 'user' | 'psychologist' | 'caregiver' | 'facility' | 'admin' | 'applicant';
  email: string;
  name: string;
  role: 'user' | 'psychologist' | 'caregiver' | 'facility_admin' | 'admin';
  city: string;
  province: string;
  /** Permintaan peran yang menunggu tinjauan admin (hanya diatur sistem; lihat migrasi 000600). */
  requestedRole?: 'psychologist';
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    key: 'user',
    email: `pengguna@${DEMO_EMAIL_DOMAIN}`,
    name: 'Argy Demo',
    role: 'user',
    city: 'Kota Bogor',
    province: 'Jawa Barat',
  },
  {
    key: 'psychologist',
    email: `psikolog@${DEMO_EMAIL_DOMAIN}`,
    name: 'Rina Sari, M.Psi.',
    role: 'psychologist',
    city: 'Kota Bogor',
    province: 'Jawa Barat',
  },
  {
    key: 'caregiver',
    email: `pendamping@${DEMO_EMAIL_DOMAIN}`,
    name: 'Ibu Demo',
    role: 'caregiver',
    city: 'Kota Bogor',
    province: 'Jawa Barat',
  },
  {
    key: 'facility',
    email: `faskes@${DEMO_EMAIL_DOMAIN}`,
    name: 'Admin Puskesmas Bogor Tengah',
    role: 'facility_admin',
    city: 'Kota Bogor',
    province: 'Jawa Barat',
  },
  {
    key: 'admin',
    email: `admin@${DEMO_EMAIL_DOMAIN}`,
    name: 'Admin Mindra Demo',
    role: 'admin',
    city: 'Kota Bogor',
    province: 'Jawa Barat',
  },
  // Mendaftar sebagai psikolog dan menunggu tinjauan: untuk memperagakan antrean di portal admin.
  {
    key: 'applicant',
    email: `calon.psikolog@${DEMO_EMAIL_DOMAIN}`,
    name: 'Calon Psikolog Demo',
    role: 'user',
    city: 'Kota Bogor',
    province: 'Jawa Barat',
    requestedRole: 'psychologist',
  },
];

export interface City {
  city: string;
  province: string;
  lat: number;
  lng: number;
  /** Jumlah pengguna sintetis. Cianjur sengaja < 10 untuk memperagakan k-anonymity. */
  users: number;
}

export const CITIES: readonly City[] = [
  { city: 'Kota Bogor', province: 'Jawa Barat', lat: -6.5971, lng: 106.806, users: 64 },
  { city: 'Kota Depok', province: 'Jawa Barat', lat: -6.4025, lng: 106.7942, users: 52 },
  { city: 'Kota Bandung', province: 'Jawa Barat', lat: -6.9175, lng: 107.6191, users: 48 },
  { city: 'Kab. Cianjur', province: 'Jawa Barat', lat: -6.82, lng: 107.1425, users: 6 },
  { city: 'Kota Jakarta Selatan', province: 'DKI Jakarta', lat: -6.2615, lng: 106.8106, users: 40 },
  { city: 'Kota Semarang', province: 'Jawa Tengah', lat: -6.9667, lng: 110.4167, users: 30 },
  { city: 'Kota Yogyakarta', province: 'DI Yogyakarta', lat: -7.7956, lng: 110.3695, users: 34 },
  { city: 'Kota Surabaya', province: 'Jawa Timur', lat: -7.2575, lng: 112.7521, users: 26 },
];

export interface FacilitySeed {
  id: string;
  name: string;
  type: 'puskesmas' | 'rumah_sakit' | 'klinik' | 'biro_psikologi';
  city: string;
  province: string;
  lat: number;
  lng: number;
}

const FACILITY_KINDS: ReadonlyArray<Pick<FacilitySeed, 'type'> & { label: string }> = [
  { type: 'puskesmas', label: 'Puskesmas' },
  { type: 'klinik', label: 'Klinik Pratama' },
  { type: 'rumah_sakit', label: 'RS Umum' },
];

const AREAS = ['Tengah', 'Utara', 'Selatan', 'Barat', 'Timur'] as const;

const facilityId = (index: number) =>
  `00000000-0000-4000-8000-${(0xfac00000 + index).toString(16).padStart(12, '0')}`;

/** 20 faskes sintetis; faskes pertama ("Puskesmas Bogor Tengah") dikelola akun demo `faskes@…`. Tanpa alamat/telepon. */
export const FACILITIES: readonly FacilitySeed[] = Array.from({ length: 20 }, (_, index) => {
  const city = CITIES[index % CITIES.length] as City;
  const kind = FACILITY_KINDS[index % FACILITY_KINDS.length] as (typeof FACILITY_KINDS)[number];
  const area = AREAS[Math.floor(index / CITIES.length) % AREAS.length] as string;
  const place = city.city.replace(/^(Kota|Kab\.)\s+/, '');
  return {
    id: facilityId(index),
    name: `${kind.label} ${place} ${area}`,
    type: kind.type,
    city: city.city,
    province: city.province,
    // Geser kecil dari pusat kota supaya titik di peta tidak bertumpuk.
    lat: Number((city.lat + (index % 5) * 0.012).toFixed(4)),
    lng: Number((city.lng + (index % 4) * 0.012).toFixed(4)),
  };
});

export interface PsychologistSeed {
  id: string;
  fullName: string;
  specializations: string[];
  fee: number;
  /** Profil singkat CONTOH (tanpa riwayat pendidikan atau klaim yang bisa dikira nyata). */
  bio: string;
  /** Penilaian CONTOH untuk memperagakan direktori; tidak ada tabel ulasan, hanya rata-rata dan jumlahnya. */
  ratingAverage: number;
  totalReviews: number;
  /** Akun demo psikolog menempati psikolog pertama. */
  linkedToDemoAccount: boolean;
}

const psychologistId = (index: number) =>
  `00000000-0000-4000-8000-${(0xb5100000 + index).toString(16).padStart(12, '0')}`;

const PSYCHOLOGIST_NAMES = [
  'Rina Sari, M.Psi.',
  'Dimas Prakoso, M.Psi.',
  'Laras Wulandari, M.Psi.',
  'Hendra Gunawan, M.Psi.',
  'Maya Anindita, M.Psi.',
  'Bayu Setiawan, M.Psi.',
  'Citra Maharani, M.Psi.',
  'Fajar Nugroho, M.Psi.',
  'Sekar Ayu, M.Psi.',
  'Taufik Hidayat, M.Psi.',
] as const;

const SPECIALIZATIONS = [
  ['Kecemasan', 'Stres akademik'],
  ['Depresi', 'Remaja'],
  ['Trauma', 'Keluarga'],
  ['Stres kerja', 'Burnout'],
  ['Kecemasan', 'Remaja'],
  ['Depresi', 'Dewasa'],
  ['Keluarga', 'Pasangan'],
  ['Stres akademik', 'Karier'],
  ['Trauma', 'Duka'],
  ['Adiksi', 'Dewasa'],
] as const;

/**
 * Profil singkat contoh, sudut pandang pertama dan bahasa sehari-hari, tanpa istilah klinis, tanpa tanda seru,
 * tanpa emoji. Disusun searah dengan `SPECIALIZATIONS`. Halaman konsultasi menyatakan bahwa profil dan penilaian
 * di versi demo adalah data contoh.
 */
const PSYCHOLOGIST_BIOS = [
  'Saya mendampingi mahasiswa dan dewasa muda yang kewalahan oleh tugas, ujian, dan rasa cemas. Sesi kita berfokus pada langkah kecil yang bisa dicoba minggu ini, dengan tempo yang kamu pilih.',
  'Saya sering menemani remaja yang merasa sedih berkepanjangan atau sulit bercerita di rumah. Kita mulai dari hal yang paling ingin kamu ceritakan, tanpa dihakimi.',
  'Saya mendampingi orang yang sedang memulihkan diri dari pengalaman berat dan keluarga yang sedang mencari cara berbicara satu sama lain. Kita berjalan pelan, sesuai kesiapanmu.',
  'Saya bekerja dengan pekerja muda yang lelah dan kehilangan semangat. Kita memetakan apa yang menguras tenagamu dan menyusun batas yang realistis.',
  'Saya mendampingi remaja yang cemas menghadapi sekolah, pertemanan, dan masa depan. Kita berlatih menenangkan tubuh dan pikiran lewat latihan sederhana.',
  'Saya menemani orang dewasa yang merasa hampa atau kehilangan minat pada hal yang dulu disukai. Kita mencari kembali kegiatan kecil yang terasa bermakna.',
  'Saya mendampingi pasangan dan keluarga yang ingin berkomunikasi lebih jujur dan lebih tenang. Sesi bisa diikuti sendiri atau bersama.',
  'Saya membantu mahasiswa tingkat akhir dan pencari kerja yang bingung menentukan arah. Kita menyusun langkah berikutnya sambil menjaga tenaga dan tidurmu.',
  'Saya menemani orang yang sedang berduka atau menghadapi kehilangan. Tidak ada cara yang benar untuk berduka, dan kamu boleh datang apa adanya.',
  'Saya mendampingi orang dewasa yang ingin mengurangi kebiasaan yang mengganggu hidupnya. Kita mulai dari tujuan kecil yang kamu tetapkan sendiri.',
] as const;

/** Penilaian contoh: rata-rata 4,5 sampai 4,9 dari 7 sampai 42 penilaian. Bukan ulasan nyata. */
const SAMPLE_RATINGS: ReadonlyArray<readonly [average: number, reviews: number]> = [
  [4.9, 42],
  [4.8, 37],
  [4.7, 29],
  [4.8, 24],
  [4.6, 18],
  [4.7, 21],
  [4.5, 12],
  [4.8, 15],
  [4.9, 9],
  [4.6, 7],
];

export const PSYCHOLOGISTS: readonly PsychologistSeed[] = PSYCHOLOGIST_NAMES.map(
  (fullName, index) => ({
    id: psychologistId(index),
    fullName,
    specializations: [...(SPECIALIZATIONS[index] as readonly string[])],
    fee: 100_000 + (index % 5) * 25_000,
    bio: PSYCHOLOGIST_BIOS[index] as string,
    ratingAverage: (SAMPLE_RATINGS[index] as readonly [number, number])[0],
    totalReviews: (SAMPLE_RATINGS[index] as readonly [number, number])[1],
    linkedToDemoAccount: index === 0,
  }),
);

export const DEMO_FACILITY_IDS = FACILITIES.map((facility) => facility.id);
export const DEMO_PSYCHOLOGIST_IDS = PSYCHOLOGISTS.map((psychologist) => psychologist.id);
