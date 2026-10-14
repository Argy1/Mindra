import { z } from 'zod';

/**
 * Peninjauan akun psikolog oleh admin. Fungsi dan skema murni: penegakan sebenarnya di database
 * (`admin_review_psychologist`, migrasi 20261014000600); di sini hanya bentuk masukan dan pemetaan pesan.
 * Aturan batas SAMA dengan fungsi database (nama ≤ 120, STR ≤ 60, tarif 0 sampai 5.000.000, spesialisasi ≤ 10
 * @ ≤ 60, hari 0 sampai 6, jam akhir setelah jam mulai), jadi pesan yang ramah muncul sebelum ke database.
 */

/** Urutan tampil Senin dulu; nilai = `psychologist_schedules.day_of_week` (0 = Minggu). */
export const PRACTICE_DAYS = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 0, label: 'Minggu' },
] as const;

export const FEE_MAX = 5_000_000;
export const SPECIALIZATIONS_MAX = 10;
export const DEFAULT_TITLE = 'M.Psi., Psikolog';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const text = (max: number, message: string) =>
  z
    .string({ error: message })
    .trim()
    .max(max, message)
    .transform((value) => value.replace(/\s+/g, ' '));

/** "Kecemasan, Tidur ,, Trauma" → ["Kecemasan", "Tidur", "Trauma"] (tanpa kosong dan ganda). */
export function parseSpecializations(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(',')) {
    const value = part.trim().replace(/\s+/g, ' ');
    if (value && !seen.has(value.toLowerCase())) {
      seen.add(value.toLowerCase());
      result.push(value);
    }
  }
  return result;
}

const approveSchema = z
  .object({
    decision: z.literal('approve'),
    profileId: z.uuid({ error: 'Permintaan tidak valid. Muat ulang halaman.' }),
    fullName: text(120, 'Nama tampil maksimal 120 karakter.').pipe(
      z.string().min(2, 'Isi nama yang tampil di direktori.'),
    ),
    title: text(60, 'Gelar maksimal 60 karakter.').transform((value) => value || DEFAULT_TITLE),
    strNumber: text(60, 'Nomor STR maksimal 60 karakter.').pipe(
      z.string().min(1, 'Isi nomor STR yang sudah kamu periksa.'),
    ),
    specializations: z
      .string({ error: 'Spesialisasi tidak valid.' })
      .transform(parseSpecializations)
      .pipe(
        z
          .array(z.string().max(60, 'Tiap spesialisasi maksimal 60 karakter.'))
          .max(SPECIALIZATIONS_MAX, `Maksimal ${SPECIALIZATIONS_MAX} spesialisasi.`),
      ),
    fee: z
      .string({ error: 'Isi tarif per sesi.' })
      .trim()
      .regex(/^\d{1,7}$/, 'Tarif berupa bilangan bulat rupiah, mis. 150000.')
      .transform(Number)
      .pipe(z.number().max(FEE_MAX, `Tarif maksimal Rp ${FEE_MAX.toLocaleString('id-ID')}.`)),
    verified: z
      .string()
      .optional()
      .transform((value) => value === 'on'),
    days: z
      .array(z.coerce.number().int().min(0).max(6), { error: 'Hari praktik tidak valid.' })
      .transform((values) => [...new Set(values)].sort((a, b) => a - b)),
    start: z
      .string()
      .trim()
      .optional()
      .transform((value) => value ?? ''),
    end: z
      .string()
      .trim()
      .optional()
      .transform((value) => value ?? ''),
  })
  .superRefine((data, ctx) => {
    if (data.days.length === 0) return;
    if (!TIME.test(data.start)) {
      ctx.addIssue({ code: 'custom', path: ['start'], message: 'Isi jam mulai, mis. 09:00.' });
    }
    if (!TIME.test(data.end)) {
      ctx.addIssue({ code: 'custom', path: ['end'], message: 'Isi jam selesai, mis. 15:00.' });
    } else if (TIME.test(data.start) && data.end <= data.start) {
      ctx.addIssue({
        code: 'custom',
        path: ['end'],
        message: 'Jam selesai harus setelah jam mulai.',
      });
    }
  });

const rejectSchema = z.object({
  decision: z.literal('reject'),
  profileId: z.uuid({ error: 'Permintaan tidak valid. Muat ulang halaman.' }),
});

export const reviewSchema = z.discriminatedUnion('decision', [approveSchema, rejectSchema], {
  error: 'Permintaan tidak valid. Muat ulang halaman.',
});

export type ReviewInput = z.infer<typeof reviewSchema>;

/** Bentuk mentah dari FormData untuk {@link reviewSchema}; kolom di luar daftar dibuang. */
export function reviewFieldsFromForm(formData: FormData): Record<string, unknown> {
  const get = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value : undefined;
  };
  return {
    decision: get('decision'),
    profileId: get('profileId'),
    fullName: get('fullName') ?? '',
    title: get('title') ?? '',
    strNumber: get('strNumber') ?? '',
    specializations: get('specializations') ?? '',
    fee: get('fee') ?? '',
    verified: get('verified'),
    days: formData.getAll('days').filter((value): value is string => typeof value === 'string'),
    start: get('start'),
    end: get('end'),
  };
}

/** Token galat dari `admin_review_psychologist` → kalimat untuk admin. */
export const REVIEW_ERRORS: Readonly<Record<string, string>> = {
  not_pending: 'Permintaan ini sudah diputuskan atau tidak ada lagi. Muat ulang halaman.',
  invalid_name: 'Nama yang tampil belum benar (1 sampai 120 karakter).',
  invalid_str: 'Nomor STR belum benar (1 sampai 60 karakter).',
  invalid_fee: 'Tarif harus antara Rp 0 dan Rp 5.000.000.',
  invalid_specializations:
    'Spesialisasi belum benar (maksimal 10, masing-masing 1 sampai 60 karakter).',
  invalid_schedule: 'Jadwal belum benar: hari 0 sampai 6, dan jam selesai harus setelah jam mulai.',
  invalid_decision: 'Keputusan tidak dikenal. Muat ulang halaman.',
};

export function reviewErrorMessage(message: string | undefined, code?: string): string | null {
  if (code === '42501') return 'Sesimu belum memenuhi syarat admin (perlu verifikasi dua langkah).';
  return message && message in REVIEW_ERRORS ? (REVIEW_ERRORS[message] ?? null) : null;
}

export const ACTION_LABEL: Readonly<Record<string, string>> = {
  approve_psychologist: 'Disetujui',
  reject_psychologist: 'Ditolak',
};
