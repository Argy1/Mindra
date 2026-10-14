import { z } from 'zod';

/** Batas kunci AKTIF per pemilik: mencegah kunci menumpuk tak terkelola (tiap kunci adalah jalan masuk). */
export const MAX_ACTIVE_API_KEYS = 5;
export const API_KEY_NAME_MIN = 3;
export const API_KEY_NAME_MAX = 60;

export const createApiKeySchema = z
  .object({
    name: z
      .string({ error: 'Beri nama kunci ini.' })
      .trim()
      .min(API_KEY_NAME_MIN, { error: `Nama kunci minimal ${API_KEY_NAME_MIN} karakter.` })
      .max(API_KEY_NAME_MAX, { error: `Nama kunci maksimal ${API_KEY_NAME_MAX} karakter.` })
      // Nama tampil di daftar dan log; huruf kontrol dan baris baru tidak punya tempat di sana.
      .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
        error: 'Nama kunci tidak boleh memuat karakter kontrol.',
      }),
    facilityId: z.uuid({ error: 'Pilih faskes untuk kunci ini.' }),
  })
  .strict();

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export const apiKeyIdSchema = z.uuid({ error: 'Kunci tidak ditemukan.' });

export function createApiKeyFieldsFromForm(formData: FormData): Record<string, unknown> {
  return {
    name: formData.get('name') ?? '',
    facilityId: formData.get('facilityId') ?? '',
  };
}
