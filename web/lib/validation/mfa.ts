import { z } from 'zod';

/**
 * Kode TOTP 6 digit dari aplikasi autentikator. Spasi dibuang (aplikasi sering menampilkan "123 456"),
 * selain itu harus persis 6 angka. Nilai ini hanya dikirim ke Supabase Auth; tidak disimpan atau dicatat.
 */
export const TOTP_LENGTH = 6;

export const totpCodeSchema = z
  .string({ error: 'Isi kode 6 angka dari aplikasi autentikatormu.' })
  .transform((value) => value.replace(/\s/g, ''))
  .refine((value) => /^\d{6}$/.test(value), {
    error: 'Kode terdiri dari 6 angka. Periksa lagi kodenya di aplikasi autentikator.',
  });

/** Secret TOTP ditampilkan per 4 karakter supaya mudah diketik manual: `ABCDEFGH` → "ABCD EFGH". */
export function groupTotpSecret(secret: string): string {
  return secret.replace(/\s/g, '').replace(/(.{4})(?=.)/g, '$1 ');
}
