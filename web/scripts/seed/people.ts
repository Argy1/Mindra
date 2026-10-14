import { CITIES, DEMO_EMAIL_DOMAIN } from './catalog';
import { approxNormal, clamp, createRng, pick, type Rng } from './rng';

export interface SyntheticUser {
  /** 1-based, stabil antar-jalan. */
  index: number;
  email: string;
  name: string;
  city: string;
  province: string;
  gender: 'laki_laki' | 'perempuan' | 'lainnya';
  dateOfBirth: string;
  /** 0 (sangat baik) … 1 (sangat berat): sifat dasar yang membentuk mood/tidur/skor. */
  distress: number;
  /** Pengguna yang pernah menjawab pikiran menyakiti diri (memicu alert krisis demo). */
  ideation: boolean;
}

const FIRST_NAMES = [
  'Adi',
  'Aisyah',
  'Bagas',
  'Bella',
  'Citra',
  'Dewi',
  'Dimas',
  'Eka',
  'Farhan',
  'Gita',
  'Hana',
  'Indra',
  'Intan',
  'Joko',
  'Kirana',
  'Lestari',
  'Mawar',
  'Nadia',
  'Oka',
  'Putri',
  'Raka',
  'Salsabila',
  'Tegar',
  'Umar',
  'Vina',
  'Wulan',
  'Yoga',
  'Zahra',
  'Rizky',
  'Sinta',
] as const;

const LAST_NAMES = [
  'Pratama',
  'Saputra',
  'Wijaya',
  'Lestari',
  'Hidayat',
  'Nugroho',
  'Kusuma',
  'Santoso',
  'Rahma',
  'Permata',
  'Firmansyah',
  'Anggraini',
  'Maulana',
  'Putra',
  'Wibowo',
  'Utami',
] as const;

/** Persentase pengguna yang menjawab pikiran menyakiti diri, dihitung dari total (≈ 2%). */
const IDEATION_RATE = 0.02;

/** Pengguna sintetis sesuai jumlah per kota di katalog (total 300). Deterministik untuk `seed` yang sama. */
export function generateUsers(seed = 20261013): SyntheticUser[] {
  const rng: Rng = createRng(seed);
  const users: SyntheticUser[] = [];

  for (const city of CITIES) {
    for (let i = 0; i < city.users; i += 1) {
      const index = users.length + 1;
      // Kota Bogor sengaja sedikit lebih berat di minggu ujian (diatur di records); dasar distress merata.
      // `spread` pada approxNormal adalah SETENGAH RENTANG (simpangan baku ≈ spread / 3,5): 0,7 →
      // simpangan baku ≈ 0,2, cukup lebar untuk menghasilkan pengguna ringan sampai sangat berat.
      const distress = clamp(approxNormal(rng, 0.38, 0.7), 0.03, 0.95);
      users.push({
        index,
        email: `warga.${String(index).padStart(3, '0')}@${DEMO_EMAIL_DOMAIN}`,
        name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
        city: city.city,
        province: city.province,
        gender: pick(rng, ['laki_laki', 'perempuan', 'perempuan', 'lainnya'] as const),
        dateOfBirth: `${1998 + Math.floor(rng() * 11)}-${String(1 + Math.floor(rng() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rng() * 28)).padStart(2, '0')}`,
        distress,
        ideation: false,
      });
    }
  }

  // Tandai sebagian kecil sebagai pernah menjawab pikiran menyakiti diri (bukan di Cianjur kecil).
  const eligible = users.filter((user) => user.distress > 0.6 && user.city !== 'Kab. Cianjur');
  const target = Math.round(users.length * IDEATION_RATE);
  for (const user of eligible.slice(0, target)) user.ideation = true;
  return users;
}
