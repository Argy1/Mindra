// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { BookResult } from '@/lib/consultation/book';
import type { PsychologistCard } from '@/lib/domain/consultation/directory';
import { generateSlots } from '@/lib/domain/consultation/slots';
import { bearer, jsonBody, makeKit, parse } from '@/tests/helpers/api';
import {
  BOOKING_RATE,
  createBookConsultationRoute,
  createListPsychologistsRoute,
  createPsychologistSlotsRoute,
  type ConsultationServices,
} from './consultations';

const PSY = '00000000-0000-4000-8000-0000000000e5';
const NOW = new Date('2026-10-14T10:00:00+07:00');

const card = (
  id: string,
  name: string,
  extra: Partial<PsychologistCard> = {},
): PsychologistCard => ({
  id,
  name,
  title: 'M.Psi., Psikolog',
  specializations: ['Kecemasan'],
  languages: ['id'],
  bio: null,
  photoUrl: 'https://contoh.test/foto.png',
  rating: 4.5,
  reviews: 10,
  fee: 150000,
  verified: true,
  availableNow: false,
  ...extra,
});

function services(overrides: Partial<ConsultationServices> = {}) {
  const calls = { book: vi.fn(), getSlots: vi.fn() };
  const value: ConsultationServices = {
    listPsychologists: async () => [
      card(PSY, 'Rina Sari', { rating: 4.9 }),
      card('00000000-0000-4000-8000-0000000000e6', 'Budi', {
        specializations: ['Stres kerja'],
        languages: ['en'],
      }),
    ],
    getSlots: async (id, now, days, supabase) => {
      calls.getSlots(id, now, days, supabase);
      return {
        psychologist: card(id, 'Rina Sari'),
        days: generateSlots([{ dayOfWeek: 4, start: '09:00', end: '12:00' }], [], now, days),
      };
    },
    book: async (supabase, input) => {
      calls.book(supabase, input);
      return {
        ok: true,
        consultation: {
          id: '11111111-2222-4333-8444-555555555555',
          scheduledAt: input.startsAt,
          durationMinutes: 50,
          bookingFee: 150000,
          status: 'confirmed',
        },
      } satisfies BookResult;
    },
    now: () => NOW,
    ...overrides,
  };
  return { value, calls };
}

const unauthenticated = (path: string, method = 'GET') =>
  new Request(`http://localhost${path}`, { method });
const BODY = { psychologistId: PSY, startsAt: '2026-10-15T09:00:00+07:00' };

describe('GET /api/v1/psychologists', () => {
  it('tanpa token: 401; dengan token: daftar tanpa nomor lisensi atau foto', async () => {
    const kit = makeKit();
    const route = createListPsychologistsRoute(kit.deps, services().value);
    expect((await route.handle(unauthenticated('/api/v1/psychologists'))).status).toBe(401);

    const response = await route.handle(bearer('/api/v1/psychologists'));
    expect(response.status).toBe(200);
    const items = (await parse(response)).data as Array<Record<string, unknown>>;
    expect(items.map((item) => item.name)).toEqual(['Rina Sari', 'Budi']);
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual([
        'availableNow',
        'bio',
        'fee',
        'id',
        'languages',
        'name',
        'rating',
        'reviews',
        'specializations',
        'title',
        'verified',
      ]);
    }
    expect(JSON.stringify(items)).not.toMatch(/license|str_number|photo/i);
  });

  it('menyaring menurut spesialisasi, bahasa, dan q; urutan tak dikenal 422', async () => {
    const route = createListPsychologistsRoute(makeKit().deps, services().value);
    const bySpec = (
      await parse(await route.handle(bearer('/api/v1/psychologists?specialization=stres%20kerja')))
    ).data as Array<{ name: string }>;
    expect(bySpec.map((item) => item.name)).toEqual(['Budi']);
    const byLang = (await parse(await route.handle(bearer('/api/v1/psychologists?language=EN'))))
      .data as Array<{ name: string }>;
    expect(byLang.map((item) => item.name)).toEqual(['Budi']);
    const byQuery = (await parse(await route.handle(bearer('/api/v1/psychologists?q=rina'))))
      .data as Array<{ name: string }>;
    expect(byQuery.map((item) => item.name)).toEqual(['Rina Sari']);
    expect((await route.handle(bearer('/api/v1/psychologists?sort=acak'))).status).toBe(422);
  });
});

describe('GET /api/v1/psychologists/{id}/slots', () => {
  const path = `/api/v1/psychologists/${PSY}/slots`;
  const context = (id: string) => ({ params: Promise.resolve({ id }) });

  it('slot per hari dengan jam WIB; hari tanpa jadwal berdaftar kosong; days bawaan 7', async () => {
    const { value, calls } = services();
    const kit = makeKit();
    const route = createPsychologistSlotsRoute(kit.deps, value);
    const response = await route.handle(bearer(path), context(PSY));
    expect(response.status).toBe(200);
    const body = (await parse(response)).data as {
      timezone: string;
      sessionMinutes: number;
      days: Array<{ date: string; slots: Array<{ startsAt: string; state: string }> }>;
    };
    expect(body).toMatchObject({ timezone: 'Asia/Jakarta', sessionMinutes: 50 });
    expect(body.days).toHaveLength(7);
    const thursday = body.days.find((day) => day.date === '2026-10-15')!;
    expect(thursday.slots.map((slot) => slot.startsAt)).toEqual([
      '2026-10-15T09:00:00+07:00',
      '2026-10-15T10:00:00+07:00',
      '2026-10-15T11:00:00+07:00',
    ]);
    expect(thursday.slots.every((slot) => slot.state === 'available')).toBe(true);
    expect(calls.getSlots).toHaveBeenCalledWith(PSY, NOW, 7, kit.supabase.client);
  });

  it('days 1–14; di luar itu atau bukan angka: 422; id bukan UUID: 422; psikolog tidak ada: 404', async () => {
    const route = createPsychologistSlotsRoute(makeKit().deps, services().value);
    expect((await route.handle(bearer(`${path}?days=14`), context(PSY))).status).toBe(200);
    for (const bad of ['0', '15', 'x', '2.5']) {
      expect((await route.handle(bearer(`${path}?days=${bad}`), context(PSY))).status, bad).toBe(
        422,
      );
    }
    expect((await route.handle(bearer('/api/v1/psychologists/x/slots'), context('x'))).status).toBe(
      422,
    );

    const missing = createPsychologistSlotsRoute(
      makeKit().deps,
      services({ getSlots: async () => null }).value,
    );
    const response = await missing.handle(bearer(path), context(PSY));
    expect(response.status).toBe(404);
    expect((await parse(response)).error?.code).toBe('not_found');
  });

  it('tanpa token: 401', async () => {
    const route = createPsychologistSlotsRoute(makeKit().deps, services().value);
    expect((await route.handle(unauthenticated(path), context(PSY))).status).toBe(401);
  });
});

describe('POST /api/v1/consultations', () => {
  it('berhasil: 201 dengan bentuk hasil, memanggil inti dengan klien milik pengguna', async () => {
    const { value, calls } = services();
    const kit = makeKit();
    const route = createBookConsultationRoute(kit.deps, value);
    const response = await route.handle(jsonBody('/api/v1/consultations', BODY));

    expect(response.status).toBe(201);
    expect((await parse(response)).data).toEqual({
      id: '11111111-2222-4333-8444-555555555555',
      psychologistId: PSY,
      startsAt: BODY.startsAt,
      durationMinutes: 50,
      fee: 150000,
      status: 'confirmed',
    });
    expect(calls.book).toHaveBeenCalledWith(kit.supabase.client, BODY);
  });

  it.each([
    ['slot_taken', 409, 'conflict'],
    ['patient_busy', 409, 'conflict'],
    ['limit_reached', 409, 'conflict'],
    ['slot_not_offered', 422, 'validation_failed'],
    ['too_soon', 422, 'validation_failed'],
    ['too_far', 422, 'validation_failed'],
    ['psychologist_unavailable', 404, 'not_found'],
    ['not_signed_in', 401, 'unauthorized'],
    ['failed', 502, 'upstream_error'],
  ] as const)('galat pemesanan %s → %i %s', async (code, status, apiCode) => {
    const route = createBookConsultationRoute(
      makeKit().deps,
      services({ book: async () => ({ ok: false, code }) }).value,
    );
    const response = await route.handle(jsonBody('/api/v1/consultations', BODY));
    expect(response.status).toBe(status);
    const body = await parse(response);
    expect(body.error?.code).toBe(apiCode);
    expect(body.error?.message).toMatch(/[a-z]/);
    if (apiCode === 'validation_failed') expect(body.error?.issues?.[0]?.path).toBe('startsAt');
  });

  it.each([
    ['tanpa startsAt', { psychologistId: PSY }],
    ['startsAt tanpa offset', { psychologistId: PSY, startsAt: '2026-10-15T09:00:00' }],
    ['id bukan UUID', { psychologistId: 'x', startsAt: BODY.startsAt }],
    ['kolom tak dikenal (mis. biaya dari klien)', { ...BODY, fee: 0 }],
    ['status dari klien', { ...BODY, status: 'completed' }],
  ])('422 untuk %s, inti pemesanan tidak dipanggil', async (_label, body) => {
    const { value, calls } = services();
    const route = createBookConsultationRoute(makeKit().deps, value);
    const response = await route.handle(jsonBody('/api/v1/consultations', body));
    expect(response.status).toBe(422);
    expect(calls.book).not.toHaveBeenCalled();
  });

  it('tanpa token: 401 dan inti tidak dipanggil', async () => {
    const { value, calls } = services();
    const route = createBookConsultationRoute(makeKit().deps, value);
    const response = await route.handle(
      new Request('http://localhost/api/v1/consultations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(BODY),
      }),
    );
    expect(response.status).toBe(401);
    expect(calls.book).not.toHaveBeenCalled();
  });

  it('batas 10 pemesanan per jam: yang ke-11 mendapat 429', async () => {
    const route = createBookConsultationRoute(makeKit().deps, services().value);
    for (let index = 0; index < BOOKING_RATE.limit; index += 1) {
      expect(
        (await route.handle(jsonBody('/api/v1/consultations', BODY))).status,
        `ke-${index + 1}`,
      ).toBe(201);
    }
    const blocked = await route.handle(jsonBody('/api/v1/consultations', BODY));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThanOrEqual(1);
  });
});
