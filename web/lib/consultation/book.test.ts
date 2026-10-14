// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createFakeSupabase } from '@/tests/helpers/fake-supabase';
import {
  BOOKING_ERROR_API,
  BOOKING_ERROR_CODES,
  BOOKING_ERROR_MESSAGE,
  bookConsultation,
  bookInputSchema,
  mapBookingError,
} from './book';

const PSY = '00000000-0000-4000-8000-0000000000e5';

describe('bookInputSchema', () => {
  it('menerima UUID dan ISO dengan offset', () => {
    expect(
      bookInputSchema.safeParse({ psychologistId: PSY, startsAt: '2026-10-15T09:00:00+07:00' })
        .success,
    ).toBe(true);
    expect(
      bookInputSchema.safeParse({ psychologistId: PSY, startsAt: '2026-10-15T02:00:00Z' }).success,
    ).toBe(true);
  });

  it.each([
    ['id bukan UUID', { psychologistId: 'x', startsAt: '2026-10-15T09:00:00+07:00' }],
    ['tanpa offset', { psychologistId: PSY, startsAt: '2026-10-15T09:00:00' }],
    ['hanya tanggal', { psychologistId: PSY, startsAt: '2026-10-15' }],
    ['bukan tanggal', { psychologistId: PSY, startsAt: 'besok pagi' }],
    ['tanggal mustahil', { psychologistId: PSY, startsAt: '2026-02-31T09:00:00+07:00' }],
    ['kosong', {}],
  ])('menolak %s', (_label, input) => {
    expect(bookInputSchema.safeParse(input).success).toBe(false);
  });
});

describe('mapBookingError', () => {
  it('setiap token database dipetakan; token asing atau galat lain menjadi failed', () => {
    for (const code of BOOKING_ERROR_CODES.filter((entry) => entry !== 'failed')) {
      expect(mapBookingError({ message: code, code: 'P0001' })).toBe(code);
    }
    expect(mapBookingError({ message: 'relation does not exist', code: '42P01' })).toBe('failed');
    expect(mapBookingError({ message: 'failed' })).toBe('failed');
    expect(mapBookingError(null)).toBe('failed');
    expect(mapBookingError({ message: null })).toBe('failed');
  });

  it('hak eksekusi ditolak (42501) berarti belum masuk', () => {
    expect(
      mapBookingError({
        message: 'permission denied for function book_consultation',
        code: '42501',
      }),
    ).toBe('not_signed_in');
  });

  it('semua kode punya kalimat Indonesia tanpa tanda seru dan pemetaan kode API', () => {
    for (const code of BOOKING_ERROR_CODES) {
      expect(BOOKING_ERROR_MESSAGE[code], code).toMatch(/[a-z]/);
      expect(BOOKING_ERROR_MESSAGE[code], code).not.toContain('!');
      expect(BOOKING_ERROR_API[code], code).toBeDefined();
    }
    expect(BOOKING_ERROR_API.slot_taken).toBe('conflict');
    expect(BOOKING_ERROR_API.slot_not_offered).toBe('validation_failed');
    expect(BOOKING_ERROR_API.psychologist_unavailable).toBe('not_found');
  });
});

describe('bookConsultation', () => {
  const input = { psychologistId: PSY, startsAt: '2026-10-15T09:00:00+07:00' };

  it('memanggil RPC book_consultation dengan argumen yang benar dan memetakan barisnya', async () => {
    const fake = createFakeSupabase({
      rpcs: {
        book_consultation: [
          {
            id: 'c1',
            scheduled_at: '2026-10-15T02:00:00+00:00',
            duration_minutes: 50,
            booking_fee: 150000,
            status: 'confirmed',
          },
        ],
      },
    });
    const result = await bookConsultation(fake.client as never, input);
    expect(fake.rpcCalls).toEqual([
      {
        name: 'book_consultation',
        args: { p_psychologist: PSY, p_scheduled_at: '2026-10-15T09:00:00+07:00' },
      },
    ]);
    expect(result).toEqual({
      ok: true,
      consultation: {
        id: 'c1',
        scheduledAt: '2026-10-15T02:00:00+00:00',
        durationMinutes: 50,
        bookingFee: 150000,
        status: 'confirmed',
      },
    });
    expect(fake.tablesQueried()).toEqual([]);
  });

  it('galat database dipetakan ke kode; tanpa baris = failed', async () => {
    const taken = createFakeSupabase({
      results: {
        'rpc:book_consultation': { data: null, error: { message: 'slot_taken', code: 'P0001' } },
      },
    });
    expect(await bookConsultation(taken.client as never, input)).toEqual({
      ok: false,
      code: 'slot_taken',
    });

    const empty = createFakeSupabase({ rpcs: { book_consultation: [] } });
    expect(await bookConsultation(empty.client as never, input)).toEqual({
      ok: false,
      code: 'failed',
    });
  });
});
