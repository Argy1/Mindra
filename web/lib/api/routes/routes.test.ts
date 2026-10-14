// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { generateApiKey } from '@/lib/api/keys';
import { createFakeSupabase } from '@/tests/helpers/fake-supabase';
import { bearer, jsonBody, makeKit, parse, USER_ID } from '@/tests/helpers/api';
import {
  createFacilityAggregatesRoute,
  createFhirObservationRoute,
  createInstrumentsRoute,
  createSatusehatSyncRoute,
  type SatusehatServices,
} from './interop';
import {
  createCreateAssessmentRoute,
  createCreateMoodRoute,
  createCreateSleepRoute,
  createListAssessmentsRoute,
  createListMoodRoute,
  createWeeklyInsightRoute,
} from './user-data';

const row = (n: number) => ({
  id: `${n}${n}111111-1111-4111-8111-111111111111`,
  type: 'phq9',
  total_score: 10 + n,
  category: 'moderate',
  completed_at: `2026-10-1${n}T01:00:00.000000+00:00`,
});

describe('GET /api/v1/instruments (publik)', () => {
  it('katalog 4 instrumen dengan butir terbalik PSS-10, boleh di-cache, tanpa kredensial', async () => {
    const kit = makeKit();
    const response = await createInstrumentsRoute(kit.deps).handle(
      new Request('http://localhost/api/v1/instruments'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
    const body = await parse(response);
    const catalog = body.data as Array<{
      id: string;
      maxScore: number;
      questions: Array<{ id: string; reverseScored: boolean }>;
    }>;
    expect(catalog.map((i) => i.id)).toEqual(['phq9', 'gad7', 'pss10', 'srq20']);
    expect(catalog.map((i) => i.maxScore)).toEqual([27, 21, 40, 20]);
    const reversed = catalog
      .find((i) => i.id === 'pss10')!
      .questions.filter((q) => q.reverseScored)
      .map((q) => q.id);
    expect(reversed).toEqual(['pss10_4', 'pss10_5', 'pss10_7', 'pss10_8']);
  });
});

describe('endpoint data pengguna: autentikasi dan pembatasan pemilik', () => {
  it('semua endpoint Bearer menjawab 401 tanpa token', async () => {
    const kit = makeKit();
    const cases = [
      [createListAssessmentsRoute(kit.deps), 'GET', '/api/v1/assessments'],
      [createListMoodRoute(kit.deps), 'GET', '/api/v1/mood-entries'],
      [createWeeklyInsightRoute(kit.deps), 'GET', '/api/v1/insights/weekly'],
      [createFhirObservationRoute(kit.deps), 'GET', '/api/v1/fhir/Observation'],
    ] as const;
    for (const [route, method, path] of cases) {
      const response = await route.handle(new Request(`http://localhost${path}`, { method }));
      expect(response.status, path).toBe(401);
    }
    expect(kit.supabase.queries).toEqual([]);
  });

  it('GET /assessments: token psikolog tidak "tersasar": kueri selalu memuat user_id token', async () => {
    const kit = makeKit({ supabase: createFakeSupabase({ tables: { assessments: [row(1)] } }) });
    const response = await createListAssessmentsRoute(kit.deps).handle(
      bearer('/api/v1/assessments?limit=5&type=phq9'),
    );
    expect(response.status).toBe(200);
    for (const query of kit.supabase.queries) {
      expect(query.filters).toContainEqual({ op: 'eq', column: 'user_id', value: USER_ID });
    }
    const body = await parse(response);
    expect(body.meta).toEqual({ nextCursor: null });
    expect(JSON.stringify(body)).not.toMatch(/answers|question_id/);
  });

  it('GET /assessments: parameter asing, limit di luar rentang, dan jenis tak dikenal → 422', async () => {
    const kit = makeKit();
    const route = createListAssessmentsRoute(kit.deps);
    for (const query of [
      'limit=0',
      'limit=101',
      'limit=abc',
      'type=dass21',
      'user_id=x',
      'cursor=salah!!',
    ]) {
      const response = await route.handle(bearer(`/api/v1/assessments?${query}`));
      expect(response.status, query).toBe(422);
    }
    expect(kit.supabase.queries).toEqual([]);
  });

  it('POST /assessments: 201 dengan hasil; badan dengan skor dari klien → 422', async () => {
    const kit = makeKit({
      supabase: createFakeSupabase({
        results: {
          'assessments:insert': {
            data: [{ id: '22222222-2222-4222-8222-222222222222' }],
            error: null,
          },
        },
      }),
    });
    const route = createCreateAssessmentRoute(kit.deps);
    const answers = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`phq9_${i + 1}`, 0]));

    const okResponse = await route.handle(
      jsonBody('/api/v1/assessments', { type: 'phq9', answers }),
    );
    expect(okResponse.status).toBe(201);
    expect(((await parse(okResponse)).data as { totalScore: number }).totalScore).toBe(0);

    const forged = await route.handle(
      jsonBody('/api/v1/assessments', { type: 'phq9', answers, total_score: 0, user_id: 'x' }),
    );
    expect(forged.status).toBe(422);
    const strings = await route.handle(
      jsonBody('/api/v1/assessments', { type: 'phq9', answers: { ...answers, phq9_1: '2' } }),
    );
    expect(strings.status).toBe(422);
  });

  it('POST /mood-entries dan /sleep-entries: 201 atas nama pemilik token', async () => {
    const kit = makeKit({
      supabase: createFakeSupabase({
        results: {
          'mood_entries:insert': {
            data: [
              { id: '33333333-3333-4333-8333-333333333333', created_at: '2026-10-13T01:00:00Z' },
            ],
            error: null,
          },
          'sleep_entries:insert': {
            data: [{ id: '44444444-4444-4444-8444-444444444444' }],
            error: null,
          },
        },
      }),
    });
    const mood = await createCreateMoodRoute(kit.deps).handle(
      jsonBody('/api/v1/mood-entries', { moodType: 'tenang' }),
    );
    expect(mood.status).toBe(201);
    // Bawaan terisi: energi 3, tanpa pemicu, catatan kosong.
    expect(kit.supabase.writes()[0]!.payload).toMatchObject({
      user_id: USER_ID,
      energy_level: 3,
      triggers: [],
      note: '',
    });

    const nowKey = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const sleep = await createCreateSleepRoute(kit.deps).handle(
      jsonBody('/api/v1/sleep-entries', {
        wakeDate: nowKey,
        bedtime: '22:30',
        wakeTime: '06:00',
        quality: 4,
      }),
    );
    expect(sleep.status).toBe(201);
  });

  it('POST /mood-entries: perasaan atau pemicu tak dikenal, energi di luar 1–5 → 422', async () => {
    const kit = makeKit();
    const route = createCreateMoodRoute(kit.deps);
    for (const body of [
      { moodType: 'marah' },
      { moodType: 'tenang', energyLevel: 9 },
      { moodType: 'tenang', triggers: ['Hujan'] },
      { moodType: 'tenang', note: 'x'.repeat(501) },
      {},
    ]) {
      expect(
        (await route.handle(jsonBody('/api/v1/mood-entries', body))).status,
        JSON.stringify(body),
      ).toBe(422);
    }
    expect(kit.supabase.writes()).toEqual([]);
  });
});

describe('GET /api/v1/fhir/Observation', () => {
  it('Bundle FHIR mentah (application/fhir+json), subject = pemilik token, tanpa jawaban per butir', async () => {
    const kit = makeKit({
      supabase: createFakeSupabase({ tables: { assessments: [row(1), row(2)] } }),
    });
    const response = await createFhirObservationRoute(kit.deps).handle(
      bearer('/api/v1/fhir/Observation?patient=me&_count=10'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/fhir+json');
    const bundle = (await response.json()) as {
      resourceType: string;
      type: string;
      total: number;
      entry: Array<{ resource: { subject: { reference: string }; valueInteger: number } }>;
    };
    expect(bundle).toMatchObject({ resourceType: 'Bundle', type: 'searchset', total: 2 });
    expect(bundle.entry[0]!.resource.subject.reference).toBe(`Patient/${USER_ID}`);
    expect(JSON.stringify(bundle)).not.toMatch(/answers|question/i.source);
  });

  it('halaman berikutnya: tautan next membawa kursor dan parameter yang sama', async () => {
    const kit = makeKit({
      supabase: createFakeSupabase({ tables: { assessments: [row(1), row(2), row(3)] } }),
    });
    const response = await createFhirObservationRoute(kit.deps).handle(
      bearer('/api/v1/fhir/Observation?_count=2'),
    );
    const bundle = (await response.json()) as {
      total: number;
      link: Array<{ relation: string; url: string }>;
    };
    expect(bundle.total).toBe(2);
    const next = bundle.link.find((l) => l.relation === 'next');
    expect(next).toBeDefined();
    const url = new URL(next!.url);
    expect(url.searchParams.get('patient')).toBe('me');
    expect(url.searchParams.get('_count')).toBe('2');
    expect(url.searchParams.get('cursor')).toBeTruthy();
  });

  it('pasien selain "me" ditolak sebagai OperationOutcome 422', async () => {
    const kit = makeKit();
    const response = await createFhirObservationRoute(kit.deps).handle(
      bearer(`/api/v1/fhir/Observation?patient=${USER_ID}`),
    );
    expect(response.status).toBe(422);
    expect(((await response.json()) as { resourceType: string }).resourceType).toBe(
      'OperationOutcome',
    );
  });
});

describe('POST /api/v1/satusehat/sync', () => {
  const services = (overrides: Partial<SatusehatServices> = {}): SatusehatServices => ({
    readConfig: () => ({ ok: true, config: { mode: 'mock' } }),
    createClient: () => ({
      mode: 'mock',
      organizationId: undefined,
      createObservation: vi.fn(async () => ({ ok: true as const, id: 'mock-1' })),
    }),
    store: {
      findSynced: vi.fn(async () => new Map()),
      recordSynced: vi.fn(async () => undefined),
      recordFailure: vi.fn(async () => undefined),
    },
    ...overrides,
  });
  const ID = '55555555-5555-4555-8555-555555555555';

  it('persetujuan menyala: terkirim, mode disebut, log dicatat', async () => {
    const kit = makeKit({
      supabase: createFakeSupabase({
        tables: {
          profiles: [{ satusehat_consent: true }],
          assessments: [
            {
              id: ID,
              type: 'phq9',
              total_score: 12,
              category: 'moderate',
              completed_at: '2026-10-13T01:00:00.000000+00:00',
            },
          ],
        },
      }),
    });
    const svc = services();
    const response = await createSatusehatSyncRoute(kit.deps, svc).handle(
      jsonBody('/api/v1/satusehat/sync', { assessmentIds: [ID] }),
    );
    expect(response.status).toBe(200);
    expect((await parse(response)).data).toEqual({
      mode: 'mock',
      results: [{ assessmentId: ID, status: 'synced', satusehatId: 'mock-1', message: null }],
    });
    expect(svc.store.recordSynced).toHaveBeenCalledWith({
      userId: USER_ID,
      assessmentId: ID,
      satusehatId: 'mock-1',
    });
  });

  it('tanpa persetujuan: 403 dan TIDAK ADA yang dikirim atau dicatat', async () => {
    const kit = makeKit({
      supabase: createFakeSupabase({ tables: { profiles: [{ satusehat_consent: false }] } }),
    });
    const svc = services();
    const response = await createSatusehatSyncRoute(kit.deps, svc).handle(
      jsonBody('/api/v1/satusehat/sync', { assessmentIds: [ID] }),
    );
    expect(response.status).toBe(403);
    expect(svc.store.recordSynced).not.toHaveBeenCalled();
    expect(svc.store.recordFailure).not.toHaveBeenCalled();
  });

  it('konfigurasi salah → 503 dengan pesan yang membantu; badan tidak valid → 422', async () => {
    const kit = makeKit();
    const notConfigured = services({ readConfig: () => ({ ok: false, reason: 'x' }) });
    const response = await createSatusehatSyncRoute(kit.deps, notConfigured).handle(
      jsonBody('/api/v1/satusehat/sync', { assessmentIds: [ID] }),
    );
    expect(response.status).toBe(503);

    const route = createSatusehatSyncRoute(kit.deps, services());
    for (const body of [
      { assessmentIds: [] },
      { assessmentIds: ['bukan-uuid'] },
      { assessmentIds: Array.from({ length: 11 }, () => ID) },
      {},
      { assessmentIds: [ID], userId: 'x' },
    ]) {
      expect(
        (await route.handle(jsonBody('/api/v1/satusehat/sync', body))).status,
        JSON.stringify(body),
      ).toBe(422);
    }
  });
});

describe('GET /api/v1/facilities/{id}/aggregates (kunci API)', () => {
  const FACILITY = '66666666-6666-4666-8666-666666666666';
  const key = generateApiKey();
  const kitWith = (
    facilityId: string | null,
    scopes: Array<'aggregates:read'> = ['aggregates:read'],
  ) =>
    makeKit({
      clients: { [key.hash]: { id: 'client-1', facilityId, scopes, keyPrefix: key.prefix } },
    });
  const call = (route: ReturnType<typeof createFacilityAggregatesRoute>, id: string, query = '') =>
    route.handle(
      new Request(`http://localhost/api/v1/facilities/${id}/aggregates${query}`, {
        headers: { 'x-api-key': key.key },
      }),
      { params: Promise.resolve({ id }) },
    );

  const services = (rows: Awaited<ReturnType<() => Promise<never[]>>> = []) => ({
    getAggregates: vi.fn(async () => rows),
    today: () => '2026-10-13',
  });

  it('kunci faskes yang sama: agregat dikembalikan dengan rentang bawaan 84 hari dan k = 10', async () => {
    const kit = kitWith(FACILITY);
    const svc = services();
    const response = await call(createFacilityAggregatesRoute(kit.deps, svc), FACILITY);
    expect(response.status).toBe(200);
    expect(svc.getAggregates).toHaveBeenCalledWith(FACILITY, '2026-07-21', '2026-10-13');
    expect((await parse(response)).data).toEqual({
      facilityId: FACILITY,
      from: '2026-07-21',
      to: '2026-10-13',
      kAnonymity: 10,
      rows: [],
    });
  });

  it('faskes lain atau kunci tanpa faskes → 403, dan layanan agregat TIDAK dipanggil', async () => {
    const svc = services();
    const other = await call(
      createFacilityAggregatesRoute(kitWith(FACILITY).deps, svc),
      '77777777-7777-4777-8777-777777777777',
    );
    expect(other.status).toBe(403);
    const none = await call(createFacilityAggregatesRoute(kitWith(null).deps, svc), FACILITY);
    expect(none.status).toBe(403);
    expect(svc.getAggregates).not.toHaveBeenCalled();
  });

  it('tanpa cakupan aggregates:read → 403; tanpa kunci → 401; token Bearer pengguna tidak diterima', async () => {
    const kit = kitWith(FACILITY, []);
    const route = createFacilityAggregatesRoute(kit.deps, services());
    expect((await call(route, FACILITY)).status).toBe(403);
    const anon = await route.handle(
      new Request(`http://localhost/api/v1/facilities/${FACILITY}/aggregates`),
      { params: Promise.resolve({ id: FACILITY }) },
    );
    expect(anon.status).toBe(401);
    const user = await route.handle(bearer(`/api/v1/facilities/${FACILITY}/aggregates`), {
      params: Promise.resolve({ id: FACILITY }),
    });
    expect(user.status).toBe(401);
  });

  it.each([
    ['from setelah to', '?from=2026-10-13&to=2026-10-01'],
    ['rentang > 400 hari', '?from=2025-01-01&to=2026-10-13'],
    ['format tanggal salah', '?from=13-10-2026'],
    ['tanggal tidak nyata', '?from=2026-02-31&to=2026-03-01'],
    ['parameter asing', '?admin=1'],
  ])('422 untuk %s', async (_name, query) => {
    const svc = services();
    const response = await call(
      createFacilityAggregatesRoute(kitWith(FACILITY).deps, svc),
      FACILITY,
      query,
    );
    expect(response.status).toBe(422);
    expect(svc.getAggregates).not.toHaveBeenCalled();
  });

  it('id faskes bukan UUID → 422', async () => {
    const kit = kitWith(FACILITY);
    const response = await call(createFacilityAggregatesRoute(kit.deps, services()), 'bukan-uuid');
    expect(response.status).toBe(422);
  });
});
