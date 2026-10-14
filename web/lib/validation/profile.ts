import { z } from 'zod';
import { canonicalProvince, type Province } from '@/lib/domain/region/provinces';
import { personName } from '@/lib/validation/auth';

/**
 * Skema Zod halaman Profil (satu sumber untuk formulir dan Server Action). Pesan galat memakai sapaan "kamu",
 * menjelaskan cara memperbaiki, tanpa tanda seru.
 */

export const CITY_MAX = 80;
/** Nama kota ditulis bebas tetapi bersih: huruf, angka, spasi, dan . ' , ( ) / - saja ("Kota Bogor", "Kab. Cianjur"). */
const CITY_PATTERN = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}\p{Zs}.'’,()/-]*$/u;

const city = z
  .string({ error: 'Nama kota tidak valid.' })
  .trim()
  .max(CITY_MAX, `Nama kota maksimal ${CITY_MAX} karakter.`)
  .refine((value) => value === '' || CITY_PATTERN.test(value), {
    error: 'Tulis nama kota dengan huruf dan angka saja. Contoh: Kota Bogor atau Kab. Cianjur',
  })
  .transform((value) => value.replace(/\s+/g, ' '));

const province = z
  .string({ error: 'Pilih provinsi dari daftar.' })
  .trim()
  .transform((value, ctx): Province | '' => {
    if (value === '') return '';
    const canonical = canonicalProvince(value);
    if (!canonical) {
      ctx.addIssue({ code: 'custom', message: 'Pilih provinsi dari daftar.' });
      return z.NEVER;
    }
    return canonical;
  });

export const profileSchema = z
  .object({
    name: personName,
    city,
    province,
    // Kotak centang HTML mengirim "on" bila dicentang dan tidak mengirim apa pun bila tidak.
    shareRegionStats: z
      .string()
      .optional()
      .transform((value) => value === 'on'),
  })
  .superRefine((data, ctx) => {
    if (!data.shareRegionStats) return;
    if (data.province === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['province'],
        message: 'Pilih provinsimu untuk ikut statistik wilayah, atau matikan pilihan itu.',
      });
    }
    if (data.city === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['city'],
        message: 'Isi kotamu untuk ikut statistik wilayah, atau matikan pilihan itu.',
      });
    }
  });

export type ProfileInput = z.infer<typeof profileSchema>;

/** Nilai sama dengan CHECK `profiles_font_size_preference_check` dan dipakai CSS `html[data-font-size]`. */
export const FONT_SIZES = ['small', 'normal', 'large'] as const;
export type FontSize = (typeof FONT_SIZES)[number];
export const FONT_SIZE_LABEL: Readonly<Record<FontSize, string>> = {
  small: 'Lebih kecil',
  normal: 'Biasa',
  large: 'Lebih besar',
};

export const fontSizeSchema = z.enum(FONT_SIZES, { error: 'Pilih salah satu ukuran teks.' });

/** Penjagaan terakhir sebelum akun dihapus: sandi diperiksa ulang dan kata penegas diketik sendiri. */
export const DELETE_CONFIRM_WORD = 'HAPUS';
export const deleteAccountSchema = z.object({
  password: z
    .string({ error: 'Isi kata sandimu.' })
    .min(1, 'Isi kata sandimu.')
    .max(72, 'Kata sandi terlalu panjang.'),
  confirm: z
    .string({ error: `Ketik ${DELETE_CONFIRM_WORD} untuk melanjutkan.` })
    .trim()
    .refine((value) => value === DELETE_CONFIRM_WORD, {
      error: `Ketik ${DELETE_CONFIRM_WORD} (huruf kapital) untuk melanjutkan.`,
    }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
