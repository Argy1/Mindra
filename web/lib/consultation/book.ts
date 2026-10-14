import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Inti pemesanan konsultasi, dipakai bersama oleh halaman web (Server Action) dan API (`POST /api/v1/consultations`).
 * Semua aturan (kisi jadwal, jarak waktu, batas 3 sesi, bentrok) ditegakkan di DATABASE oleh fungsi
 * `book_consultation` dan constraint EXCLUDE; di sini hanya validasi bentuk masukan dan pemetaan galat.
 */

export const bookInputSchema = z.object({
  psychologistId: z.uuid({ error: 'Psikolog tidak valid.' }),
  /** ISO 8601 dengan offset, mis. `2026-10-15T09:00:00+07:00`. */
  startsAt: z.iso.datetime({ offset: true, error: 'Jam sesi tidak valid.' }),
});
export type BookInput = z.infer<typeof bookInputSchema>;

export const BOOKING_ERROR_CODES = [
  'not_signed_in',
  'psychologist_unavailable',
  'slot_not_offered',
  'too_soon',
  'too_far',
  'limit_reached',
  'slot_taken',
  'patient_busy',
  'failed',
] as const;
export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number];

export const BOOKING_ERROR_MESSAGE: Readonly<Record<BookingErrorCode, string>> = {
  not_signed_in: 'Sesimu sudah berakhir. Masuk lagi untuk memesan sesi.',
  psychologist_unavailable: 'Psikolog ini sedang tidak menerima sesi baru.',
  slot_not_offered: 'Jam itu tidak ada di jadwal psikolog. Pilih jam lain.',
  too_soon: 'Sesi paling cepat dipesan satu jam sebelum mulai. Pilih jam yang lebih akhir.',
  too_far: 'Sesi hanya bisa dipesan sampai 30 hari ke depan.',
  limit_reached:
    'Kamu sudah punya 3 sesi yang akan datang. Batalkan salah satu, atau tunggu sampai ada yang selesai.',
  slot_taken: 'Jam itu baru saja dipesan orang lain. Pilih jam lain.',
  patient_busy: 'Kamu sudah punya sesi lain di jam itu.',
  failed: 'Sesi belum bisa dipesan. Coba lagi sebentar lagi.',
};

/** Status HTTP dan kode API untuk tiap galat pemesanan (dipakai rute API). */
export const BOOKING_ERROR_API: Readonly<
  Record<
    BookingErrorCode,
    'unauthorized' | 'not_found' | 'validation_failed' | 'conflict' | 'upstream_error'
  >
> = {
  not_signed_in: 'unauthorized',
  psychologist_unavailable: 'not_found',
  slot_not_offered: 'validation_failed',
  too_soon: 'validation_failed',
  too_far: 'validation_failed',
  limit_reached: 'conflict',
  slot_taken: 'conflict',
  patient_busy: 'conflict',
  failed: 'upstream_error',
};

/** Token dari `raise exception '<token>'` (SQLSTATE P0001) menjadi kode; selain itu `failed`. */
export function mapBookingError(
  error: { message?: string | null; code?: string | null } | null,
): BookingErrorCode {
  if (!error) return 'failed';
  const token = (error.message ?? '').trim();
  if (error.code === '42501') return 'not_signed_in';
  return (BOOKING_ERROR_CODES as readonly string[]).includes(token) && token !== 'failed'
    ? (token as BookingErrorCode)
    : 'failed';
}

export interface BookedConsultation {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  bookingFee: number;
  status: string;
}

export type BookResult =
  { ok: true; consultation: BookedConsultation } | { ok: false; code: BookingErrorCode };

export async function bookConsultation(
  supabase: SupabaseClient<Database>,
  input: BookInput,
): Promise<BookResult> {
  const { data, error } = await supabase.rpc('book_consultation', {
    p_psychologist: input.psychologistId,
    p_scheduled_at: input.startsAt,
  });
  if (error) return { ok: false, code: mapBookingError(error) };
  const row = data?.[0];
  if (!row) return { ok: false, code: 'failed' };
  return {
    ok: true,
    consultation: {
      id: row.id,
      scheduledAt: row.scheduled_at,
      durationMinutes: row.duration_minutes,
      bookingFee: row.booking_fee,
      status: row.status,
    },
  };
}
