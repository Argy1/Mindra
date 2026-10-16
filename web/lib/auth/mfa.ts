import type { UserRole } from '@/lib/auth/roles';

/**
 * Keputusan MFA (TOTP) untuk peran yang wajib memakainya. Fungsi murni supaya aturannya bisa diuji;
 * pembacaan AAL dari Supabase ada di lib/auth/mfa-server.ts.
 *
 * Ini lapisan UX/server. Penegakan sebenarnya ada di DATABASE: `psychologist_mfa_ok()` membuat
 * `can_view()` menolak psikolog yang sesinya belum aal2 (migrasi 20261014000300), sehingga token
 * aal1 yang dipakai langsung ke PostgREST pun tidak membaca data klien.
 */

/** Parameter alamat `?berhasil=1`: halaman Keamanan baru saja memasang TOTP dan menampilkan pesan sukses. */
export const MFA_ENROLLED_PARAM = 'berhasil';

export type MfaLevel = 'aal1' | 'aal2';
export interface AalInfo {
  currentLevel: MfaLevel | null;
  nextLevel: MfaLevel | null;
}

/** Tipe SDK terbuka (`string & {}`); nilai di luar aal1/aal2 diperlakukan sebagai tidak terbaca (gagal tertutup). */
export function normalizeMfaLevel(value: string | null | undefined): MfaLevel | null {
  return value === 'aal1' || value === 'aal2' ? value : null;
}

/** ok = lanjut; enroll = belum punya faktor TOTP; challenge = punya faktor tetapi sesi belum memverifikasi. */
export type MfaDecision = 'ok' | 'enroll' | 'challenge';

export type MfaEnforcement = 'required' | 'off';

/**
 * Peran yang wajib MFA (docs/ARCHITECTURE.md §8). Untuk `facility_admin` penegakannya di database juga:
 * `facility_aggregate()` dan kebijakan `api_clients` mensyaratkan aal2 (migrasi 20261014000500). Untuk `admin`
 * (peninjau akun psikolog) fungsi `admin_pending_psychologists()` dan `admin_review_psychologist()` mensyaratkannya
 * (migrasi 20261014000600).
 */
export const MFA_REQUIRED_ROLES: readonly UserRole[] = ['psychologist', 'facility_admin', 'admin'];

/** Hanya persis "off" yang mematikan; nilai lain (kosong, salah ketik) tetap mewajibkan: gagal tertutup. */
export function readMfaEnforcement(value: string | undefined): MfaEnforcement {
  return value === 'off' ? 'off' : 'required';
}

export function decideMfa(
  role: UserRole,
  aal: AalInfo | null,
  enforcement: MfaEnforcement = 'required',
): MfaDecision {
  if (enforcement === 'off' || !MFA_REQUIRED_ROLES.includes(role)) return 'ok';
  // AAL tidak terbaca (galat jaringan, token rusak): jangan meloloskan.
  if (!aal || aal.currentLevel === null) return 'challenge';
  if (aal.currentLevel === 'aal2') return 'ok';
  return aal.nextLevel === 'aal2' ? 'challenge' : 'enroll';
}

/** Halaman tujuan untuk tiap keputusan, dan ke mana pengguna kembali setelah lolos. */
export interface MfaRoutes {
  enroll: string;
  challenge: string;
  home: string;
}

export const MFA_ROUTES_BY_ROLE = {
  psychologist: {
    enroll: '/psikolog/keamanan',
    challenge: '/psikolog/verifikasi',
    home: '/psikolog',
  },
  facility_admin: { enroll: '/faskes/keamanan', challenge: '/faskes/verifikasi', home: '/faskes' },
  admin: { enroll: '/admin/keamanan', challenge: '/admin/verifikasi', home: '/admin' },
} as const satisfies Partial<Record<UserRole, MfaRoutes>>;

export type MfaRole = keyof typeof MFA_ROUTES_BY_ROLE;

/** Rute psikolog (nama lama dipertahankan untuk halaman yang sudah ada). */
export const MFA_ROUTES = MFA_ROUTES_BY_ROLE.psychologist;
