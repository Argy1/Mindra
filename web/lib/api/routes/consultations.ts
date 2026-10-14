import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { created, defineRoute, ok, type RouteDeps } from '@/lib/api/handler';
import {
  bookConsultationBody,
  consultationResultSchema,
  psychologistItemSchema,
  psychologistsQuery,
  slotsParams,
  slotsQuery,
  slotsResultSchema,
} from '@/lib/api/schemas';
import {
  BOOKING_ERROR_API,
  BOOKING_ERROR_MESSAGE,
  bookConsultation,
  type BookResult,
} from '@/lib/consultation/book';
import { filterPsychologists, type PsychologistCard } from '@/lib/domain/consultation/directory';
import { SESSION_MINUTES, type SlotDay } from '@/lib/domain/consultation/slots';
import { getSlots, listPsychologists } from '@/lib/server/consultation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Endpoint konsultasi (Bearer). Direktori psikolog butuh token karena RLS hanya membuka `psychologists` bagi
 * pengguna yang masuk. Pemesanan memakai inti yang sama dengan halaman web; aturannya ditegakkan database.
 */

const TAG = 'Konsultasi';
type Client = SupabaseClient<Database>;

export interface ConsultationServices {
  listPsychologists(supabase: Client): Promise<PsychologistCard[]>;
  getSlots(
    id: string,
    now: Date,
    days: number,
    supabase: Client,
  ): Promise<{ psychologist: PsychologistCard; days: SlotDay[] } | null>;
  book(supabase: Client, input: { psychologistId: string; startsAt: string }): Promise<BookResult>;
  now(): Date;
}

export const defaultConsultationServices: ConsultationServices = {
  listPsychologists: (supabase) => listPsychologists(supabase),
  getSlots: (id, now, days, supabase) => getSlots(id, now, days, supabase),
  book: (supabase, input) => bookConsultation(supabase, input),
  now: () => new Date(),
};

/** Batas pemesanan per pengguna: mencegah satu akun menguasai banyak slot. */
export const BOOKING_RATE = { name: 'booking', limit: 10, windowSeconds: 3600 } as const;

export const createListPsychologistsRoute = (
  deps?: RouteDeps,
  services: ConsultationServices = defaultConsultationServices,
) =>
  defineRoute(
    {
      method: 'GET',
      path: '/api/v1/psychologists',
      operationId: 'listPsychologists',
      summary: 'Direktori psikolog',
      description:
        'Psikolog aktif beserta spesialisasi, bahasa, tarif, dan penilaian. Nomor lisensi tidak dikembalikan. Butuh token pengguna karena direktori hanya terbuka bagi yang masuk.',
      tags: [TAG],
      auth: 'bearer',
      query: psychologistsQuery,
      example: { query: { specialization: 'Kecemasan', sort: 'rating' } },
      responses: [
        { status: 200, description: 'Daftar psikolog.', schema: z.array(psychologistItemSchema) },
      ],
      handler: async ({ principal, query }) => {
        const all = await services.listPsychologists(principal.supabase);
        const filtered = filterPsychologists(all, {
          q: query.q ?? '',
          specialization: query.specialization ?? '',
          language: (query.language ?? '').toLowerCase(),
          sort: query.sort,
          availableNow: false,
        });
        return ok(
          filtered.map((item) => ({
            id: item.id,
            name: item.name,
            title: item.title,
            specializations: item.specializations,
            languages: item.languages,
            bio: item.bio,
            rating: item.rating,
            reviews: item.reviews,
            fee: item.fee,
            verified: item.verified,
            availableNow: item.availableNow,
          })),
        );
      },
    },
    deps,
  );

export const createPsychologistSlotsRoute = (
  deps?: RouteDeps,
  services: ConsultationServices = defaultConsultationServices,
) =>
  defineRoute(
    {
      method: 'GET',
      path: '/api/v1/psychologists/{id}/slots',
      operationId: 'listPsychologistSlots',
      summary: 'Slot sesi psikolog',
      description:
        'Slot per hari (WIB) dari jadwal psikolog dikurangi sesi yang sudah dipesan. Satu sesi 50 menit pada kisi 60 menit. Hanya `startsAt` berstatus `available` yang bisa dipesan; aturan akhirnya tetap ditegakkan saat memesan.',
      tags: [TAG],
      auth: 'bearer',
      params: slotsParams,
      query: slotsQuery,
      example: {
        path: { id: '4f1b7c2e-9d3a-4e58-8b61-2a0c5d7e9f13' },
        query: { days: '7' },
      },
      responses: [{ status: 200, description: 'Slot per hari.', schema: slotsResultSchema }],
      handler: async ({ principal, params, query }) => {
        const result = await services.getSlots(
          params.id,
          services.now(),
          query.days,
          principal.supabase,
        );
        if (!result) throw new ApiError('not_found', 'Psikolog tidak ditemukan.');
        return ok({
          psychologistId: params.id,
          timezone: 'Asia/Jakarta' as const,
          sessionMinutes: SESSION_MINUTES,
          days: result.days.map((day) => ({
            date: day.date,
            slots: day.slots.map((slot) => ({ startsAt: slot.startsAt, state: slot.state })),
          })),
        });
      },
    },
    deps,
  );

export const createBookConsultationRoute = (
  deps?: RouteDeps,
  services: ConsultationServices = defaultConsultationServices,
) =>
  defineRoute(
    {
      method: 'POST',
      path: '/api/v1/consultations',
      operationId: 'bookConsultation',
      summary: 'Pesan sesi konsultasi',
      description:
        'Memesan satu slot. Penegakannya di database: bentrok jadwal ditolak constraint EXCLUDE, sehingga dua permintaan serentak untuk slot yang sama hanya menghasilkan satu 201 dan satu 409. Paling cepat 1 jam dan paling lama 30 hari ke depan; maksimal 3 sesi mendatang per akun; dibatasi 10 pemesanan per jam. Psikolog hanya melihat jam sesi; identitasmu terbuka bagi psikolog hanya bila kamu menautkan akun lewat Privasi dan izin.',
      tags: [TAG],
      auth: 'bearer',
      body: bookConsultationBody,
      rateLimit: { extra: BOOKING_RATE },
      example: {
        body: {
          psychologistId: '4f1b7c2e-9d3a-4e58-8b61-2a0c5d7e9f13',
          startsAt: '2026-10-21T10:00:00+07:00',
        },
      },
      responses: [{ status: 201, description: 'Sesi dipesan.', schema: consultationResultSchema }],
      handler: async ({ principal, body }) => {
        const result = await services.book(principal.supabase, body);
        if (!result.ok) {
          const code = BOOKING_ERROR_API[result.code];
          const message = BOOKING_ERROR_MESSAGE[result.code];
          throw new ApiError(
            code,
            message,
            code === 'validation_failed' ? { issues: [{ path: 'startsAt', message }] } : undefined,
          );
        }
        const { consultation } = result;
        return created({
          id: consultation.id,
          psychologistId: body.psychologistId,
          startsAt: consultation.scheduledAt,
          durationMinutes: consultation.durationMinutes,
          fee: consultation.bookingFee,
          status: consultation.status,
        });
      },
    },
    deps,
  );
