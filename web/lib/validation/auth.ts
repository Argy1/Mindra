import { z } from 'zod';
import { MIN_AGE } from '@/lib/legal/version';

/**
 * Skema Zod untuk SEMUA formulir autentikasi (satu sumber untuk form dan Server Action).
 * Pesan galat memakai sapaan "kamu", menjelaskan cara memperbaiki, tanpa tanda seru.
 */

const email = z
  .string({ error: 'Isi alamat emailmu.' })
  .trim()
  .toLowerCase()
  .min(1, 'Isi alamat emailmu.')
  .max(254, 'Alamat emailmu terlalu panjang.')
  .pipe(z.email({ error: 'Alamat email belum benar. Contoh: nama@email.com' }));

/** bcrypt (dipakai Supabase Auth) hanya membaca 72 byte pertama, jadi batas atas ditetapkan eksplisit. */
const newPassword = z
  .string({ error: 'Buat kata sandi.' })
  .min(8, 'Kata sandi minimal 8 karakter.')
  .max(72, 'Kata sandi maksimal 72 karakter.');

export const personName = z
  .string({ error: 'Isi namamu.' })
  .trim()
  .min(1, 'Isi namamu.')
  .min(2, 'Nama minimal 2 huruf.')
  .max(80, 'Nama maksimal 80 karakter.')
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}\p{Zs}.'’,-]*$/u, 'Tulis namamu dengan huruf. Contoh: Rina Sari')
  .transform((value) => value.replace(/\s+/g, ' '));

const name = personName;

export const loginSchema = z.object({
  email,
  // Aturan panjang sengaja tidak diulang di sini: pesan galat login tidak boleh membocorkan kebijakan sandi.
  password: z
    .string({ error: 'Isi kata sandimu.' })
    .min(1, 'Isi kata sandimu.')
    .max(72, 'Kata sandi terlalu panjang.'),
});

export const ACCOUNT_TYPES = ['self', 'psychologist'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const registerSchema = z
  .object({
    name,
    email,
    password: newPassword,
    accountType: z.enum(ACCOUNT_TYPES, { error: 'Pilih salah satu.' }).default('self'),
    // Kotak centang HTML mengirim "on" bila dicentang dan tidak mengirim apa pun bila tidak.
    ageConfirmed: z.literal('on', {
      error: `Centang bahwa kamu berusia ${MIN_AGE} tahun ke atas.`,
    }),
    consent: z.literal('on', { error: 'Centang persetujuan untuk melanjutkan.' }),
  })
  .refine((data) => data.password.toLowerCase() !== data.email, {
    path: ['password'],
    error: 'Kata sandi tidak boleh sama dengan emailmu.',
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirm: z
      .string({ error: 'Ketik ulang kata sandi barumu.' })
      .min(1, 'Ketik ulang kata sandi barumu.'),
  })
  .refine((data) => data.password === data.confirm, {
    path: ['confirm'],
    error: 'Kata sandi belum sama. Ketik ulang dengan teliti.',
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/** Ambil hanya kolom yang dikenal dari FormData (kolom asing diabaikan); File/null menjadi undefined. */
export function pickFields(
  formData: FormData,
  keys: readonly string[],
): Record<string, string | undefined> {
  return Object.fromEntries(
    keys.map((key) => {
      const value = formData.get(key);
      return [key, typeof value === 'string' ? value : undefined];
    }),
  );
}

/** Satu pesan per kolom (yang pertama), siap ditampilkan di bawah input. */
export function firstErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_form');
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}
