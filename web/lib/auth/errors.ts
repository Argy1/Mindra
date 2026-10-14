/**
 * Mengubah galat Supabase Auth menjadi pesan ramah berbahasa Indonesia. Pesan asli server TIDAK
 * pernah ditampilkan (bisa membocorkan detail, dan berbahasa Inggris); yang dipakai hanya `code`.
 */
interface AuthErrorLike {
  code?: string | undefined;
  status?: number | undefined;
}

const BY_CODE: Record<string, string> = {
  // Pesan sama untuk "email tidak ada" dan "sandi salah": mencegah penebakan akun (user enumeration).
  invalid_credentials:
    'Email atau kata sandi belum cocok. Periksa lagi, atau atur ulang kata sandimu.',
  email_not_confirmed: 'Emailmu belum dikonfirmasi. Buka kotak masuk dan klik tautan dari Mindra.',
  over_request_rate_limit: 'Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.',
  over_email_send_rate_limit:
    'Terlalu banyak email terkirim. Tunggu beberapa menit, lalu coba lagi.',
  weak_password: 'Kata sandi terlalu mudah ditebak. Coba yang lebih panjang atau lebih unik.',
  same_password: 'Kata sandi baru harus berbeda dari yang lama.',
  signup_disabled: 'Pendaftaran sedang ditutup sementara. Coba lagi nanti.',
  user_banned: 'Akun ini sedang dinonaktifkan. Hubungi kami bila kamu merasa ini keliru.',
  session_not_found: 'Sesimu sudah berakhir. Minta tautan baru lalu coba lagi.',
  session_expired: 'Sesimu sudah berakhir. Minta tautan baru lalu coba lagi.',
  reauthentication_needed: 'Demi keamanan, masuk ulang dulu lalu coba lagi.',
};

export const GENERIC_ERROR = 'Ada kendala di sisi kami. Coba lagi sebentar lagi.';
export const NETWORK_ERROR = 'Koneksi terputus. Periksa jaringanmu, lalu coba kirim lagi.';
export const NOT_CONFIGURED_ERROR =
  'Layanan masuk belum dikonfigurasi di lingkungan ini. Hubungi pengelola situs.';

export function mapAuthError(error: AuthErrorLike | null | undefined): string {
  if (!error) return GENERIC_ERROR;
  if (error.code && error.code in BY_CODE) return BY_CODE[error.code] as string;
  if (error.status === 429) return BY_CODE.over_request_rate_limit as string;
  return GENERIC_ERROR;
}

/** Kode `?galat=` pada halaman masuk (dari /auth/callback) → pesan. */
export const CALLBACK_ERRORS: Record<string, string> = {
  tautan: 'Tautan sudah tidak berlaku atau sudah dipakai. Minta tautan baru, lalu coba lagi.',
  // Bukan galat: pengguna dikirim ke sini sesudah menghapus akunnya sendiri.
  akun_dihapus: 'Akunmu dan seluruh datanya sudah dihapus. Terima kasih sudah memakai Mindra.',
};
