// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { ApiClientRecord, AuthDeps } from './auth';
import { ApiError } from './errors';
import { created, defineRoute, ok, RATE_RULES, type HandlerDeps } from './handler';
import { generateApiKey, hashApiKey } from './keys';
import { createMemoryLimiter } from './ratelimit';

const VALID_TOKEN = 'aaaa.bbbb.cccc';
const USER_ID = '11111111-1111-4111-8111-111111111111';

interface Setup {
  now: { value: number };
  auth: AuthDeps & {
    verifyToken: ReturnType<typeof vi.fn>;
    findApiClient: ReturnType<typeof vi.fn>;
  };
  deps: Partial<HandlerDeps> & { now: () => number };
}

function setup(clients: Record<string, ApiClientRecord> = {}): Setup {
  const now = { value: 1_700_000_000_000 };
  const auth = {
    verifyToken: vi.fn(async (token: string) =>
      token === VALID_TOKEN ? { userId: USER_ID } : null,
    ),
    createUserClient: vi.fn(() => ({ marker: 'klien-pengguna' }) as never),
    findApiClient: vi.fn(async (hash: string) => clients[hash] ?? null),
    touchApiClient: vi.fn(async () => undefined),
  };
  let counter = 0;
  return {
    now,
    auth,
    deps: {
      auth,
      limiter: createMemoryLimiter(() => now.value),
      newRequestId: () => `req-generated-${(counter += 1)}`,
      now: () => now.value,
    },
  };
}

const request = (path: string, init: RequestInit & { headers?: Record<string, string> } = {}) =>
  new Request(`http://localhost${path}`, init);

const json = async (response: Response) => (await response.json()) as Record<string, unknown>;

const publicRoute = (deps: Setup['deps']) =>
  defineRoute(
    {
      method: 'GET',
      path: '/api/v1/uji',
      operationId: 'uji',
      summary: 'Uji',
      tags: ['Uji'],
      auth: 'public',
      responses: [{ status: 200, description: 'ok' }],
      handler: async () => ok({ halo: 'dunia' }),
    },
    deps,
  );

afterEach(() => vi.restoreAllMocks());

describe('respons dasar', () => {
  it('amplop { data, error }, tanpa cache, nosniff, id permintaan, dan header laju', async () => {
    const { deps } = setup();
    const response = await publicRoute(deps).handle(request('/api/v1/uji'));

    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ data: { halo: 'dunia' }, error: null });
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-request-id')).toBe('req-generated-1');
    expect(response.headers.get('x-ratelimit-limit')).toBe(String(RATE_RULES.public.limit));
    expect(response.headers.get('x-ratelimit-remaining')).toBe(String(RATE_RULES.public.limit - 1));
  });

  it('memakai X-Request-Id dari klien bila bentuknya aman, dan menggantinya bila tidak', async () => {
    const { deps } = setup();
    const route = publicRoute(deps);
    const good = await route.handle(
      request('/api/v1/uji', { headers: { 'x-request-id': 'abc-123_DEF.456' } }),
    );
    expect(good.headers.get('x-request-id')).toBe('abc-123_DEF.456');

    for (const bad of [
      'pendek',
      'a b c d e f g h',
      `x${'y'.repeat(100)}`,
      '<script>alert(1)</script>',
    ]) {
      const response = await route.handle(
        request('/api/v1/uji', { headers: { 'x-request-id': bad } }),
      );
      expect(response.headers.get('x-request-id')).toMatch(/^req-generated-/);
    }
  });

  it('status dan header tambahan dari handler (created, meta)', async () => {
    const { deps } = setup();
    const route = defineRoute(
      {
        method: 'GET',
        path: '/api/v1/uji',
        operationId: 'uji',
        summary: 'Uji',
        tags: ['Uji'],
        auth: 'public',
        responses: [{ status: 201, description: 'dibuat' }],
        handler: async () =>
          created({ id: 1 }, { meta: { nextCursor: 'abc' }, headers: { Location: '/x/1' } }),
      },
      deps,
    );
    const response = await route.handle(request('/api/v1/uji'));
    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe('/x/1');
    expect(await json(response)).toEqual({
      data: { id: 1 },
      error: null,
      meta: { nextCursor: 'abc' },
    });
  });

  it('hasil mentah dikirim tanpa amplop dengan Content-Type-nya', async () => {
    const { deps } = setup();
    const route = defineRoute(
      {
        method: 'GET',
        path: '/api/v1/uji',
        operationId: 'uji',
        summary: 'Uji',
        tags: ['Uji'],
        auth: 'public',
        responses: [{ status: 200, description: 'ok' }],
        handler: async () => ok({ openapi: '3.1.0' }, { raw: { contentType: 'application/json' } }),
      },
      deps,
    );
    const response = await route.handle(request('/api/v1/uji'));
    expect(await json(response)).toEqual({ openapi: '3.1.0' });
  });
});

describe('401: autentikasi Bearer', () => {
  const bearerRoute = (deps: Setup['deps']) =>
    defineRoute(
      {
        method: 'GET',
        path: '/api/v1/uji',
        operationId: 'uji',
        summary: 'Uji',
        tags: ['Uji'],
        auth: 'bearer',
        responses: [{ status: 200, description: 'ok' }],
        handler: async ({ principal }) =>
          ok({
            userId: principal.userId,
            klien: (principal.supabase as unknown as { marker: string }).marker,
          }),
      },
      deps,
    );

  it('token valid: handler menerima id pengguna dan klien yang membawa token pengguna', async () => {
    const { deps, auth } = setup();
    const response = await bearerRoute(deps).handle(
      request('/api/v1/uji', { headers: { authorization: `Bearer ${VALID_TOKEN}` } }),
    );
    expect(response.status).toBe(200);
    expect((await json(response)).data).toEqual({ userId: USER_ID, klien: 'klien-pengguna' });
    expect(auth.createUserClient).toHaveBeenCalledWith(VALID_TOKEN);
  });

  it.each([
    ['tanpa header', undefined],
    ['skema salah', `Basic ${VALID_TOKEN}`],
    ['tanpa token', 'Bearer '],
    ['bukan bentuk JWT', 'Bearer bukan-jwt'],
    ['dua segmen', 'Bearer aaa.bbb'],
    ['spasi di dalam', 'Bearer aaa.bbb ccc.ddd'],
    ['terlalu panjang', `Bearer ${'a'.repeat(5000)}.b.c`],
    ['token ditolak server Auth', 'Bearer zzzz.yyyy.xxxx'],
  ])('%s → 401 dengan jawaban yang sama', async (_name, header) => {
    const { deps } = setup();
    const response = await bearerRoute(deps).handle(
      request('/api/v1/uji', header ? { headers: { authorization: header } } : {}),
    );
    expect(response.status).toBe(401);
    expect(await json(response)).toEqual({
      data: null,
      error: { code: 'unauthorized', message: 'Kredensial tidak ada atau tidak valid.' },
    });
  });

  it('token yang bentuknya jelas salah tidak sampai menelepon server Auth', async () => {
    const { deps, auth } = setup();
    await bearerRoute(deps).handle(
      request('/api/v1/uji', { headers: { authorization: 'Bearer bukan-jwt' } }),
    );
    expect(auth.verifyToken).not.toHaveBeenCalled();
  });

  it('kredensial API key tidak diterima di rute Bearer, dan sebaliknya', async () => {
    const key = generateApiKey();
    const { deps } = setup({
      [key.hash]: {
        id: 'c1',
        facilityId: null,
        scopes: ['aggregates:read'],
        keyPrefix: key.prefix,
      },
    });
    const response = await bearerRoute(deps).handle(
      request('/api/v1/uji', { headers: { 'x-api-key': key.key } }),
    );
    expect(response.status).toBe(401);
  });
});

describe('401 dan 403: X-API-Key', () => {
  const key = generateApiKey();
  const record: ApiClientRecord = {
    id: 'client-1',
    facilityId: 'facility-1',
    scopes: ['aggregates:read'],
    keyPrefix: key.prefix,
  };
  const keyRoute = (
    deps: Setup['deps'],
    scope: 'aggregates:read' | undefined = 'aggregates:read',
  ) =>
    defineRoute(
      {
        method: 'GET',
        path: '/api/v1/uji',
        operationId: 'uji',
        summary: 'Uji',
        tags: ['Uji'],
        auth: 'apiKey',
        scope,
        responses: [{ status: 200, description: 'ok' }],
        handler: async ({ principal }) =>
          ok({ clientId: principal.clientId, facilityId: principal.facilityId }),
      },
      deps,
    );

  it('kunci valid → handler menerima id klien dan faskes; pemakaian dicatat', async () => {
    const { deps, auth } = setup({ [key.hash]: record });
    const response = await keyRoute(deps).handle(
      request('/api/v1/uji', { headers: { 'x-api-key': key.key } }),
    );
    expect(response.status).toBe(200);
    expect((await json(response)).data).toEqual({ clientId: 'client-1', facilityId: 'facility-1' });
    expect(auth.touchApiClient).toHaveBeenCalledWith('client-1');
    // Yang dicari di database adalah HASH, bukan kunci utuh.
    expect(auth.findApiClient).toHaveBeenCalledWith(hashApiKey(key.key));
  });

  it('kunci tidak ada, dicabut (database mengembalikan null), atau bentuknya salah: 401 yang SAMA persis', async () => {
    const { deps } = setup({ [key.hash]: record });
    const route = keyRoute(deps);
    const other = generateApiKey().key;
    const bodies = [];
    for (const value of [other, 'mk_live_pendek', '', 'bukan-kunci']) {
      const response = await route.handle(
        request('/api/v1/uji', { headers: { 'x-api-key': value } }),
      );
      expect(response.status).toBe(401);
      bodies.push(await json(response));
    }
    expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
  });

  it('tanpa header: 401; kunci dengan bentuk salah tidak menyentuh database', async () => {
    const { deps, auth } = setup({ [key.hash]: record });
    const route = keyRoute(deps);
    expect((await route.handle(request('/api/v1/uji'))).status).toBe(401);
    await route.handle(request('/api/v1/uji', { headers: { 'x-api-key': 'mk_live_salah' } }));
    expect(auth.findApiClient).not.toHaveBeenCalled();
  });

  it('kunci valid tanpa cakupan yang dibutuhkan → 403 (dikenal, tetapi tidak berhak)', async () => {
    const { deps } = setup({ [key.hash]: { ...record, scopes: [] } });
    const response = await keyRoute(deps).handle(
      request('/api/v1/uji', { headers: { 'x-api-key': key.key } }),
    );
    expect(response.status).toBe(403);
    expect(((await json(response)).error as { code: string }).code).toBe('forbidden');
  });
});

describe('422, 400, 413, 415: validasi', () => {
  const route = (deps: Setup['deps']) =>
    defineRoute(
      {
        method: 'POST',
        path: '/api/v1/uji/{id}',
        operationId: 'uji',
        summary: 'Uji',
        tags: ['Uji'],
        auth: 'public',
        params: z.object({ id: z.uuid() }),
        query: z.object({ halaman: z.coerce.number().int().min(1).default(1) }).strict(),
        body: z
          .object({ mood: z.enum(['tenang', 'cemas']), catatan: z.string().max(10).optional() })
          .strict(),
        maxBodyBytes: 200,
        responses: [{ status: 200, description: 'ok' }],
        handler: async ({ params, query, body }) => ok({ params, query, body }),
      },
      deps,
    );
  const ID = '22222222-2222-4222-8222-222222222222';
  const call = (
    r: ReturnType<typeof route>,
    init: { path?: string; body?: string; headers?: Record<string, string> } = {},
  ) =>
    r.handle(
      request(init.path ?? '/api/v1/uji/x', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...init.headers },
        body: init.body ?? JSON.stringify({ mood: 'tenang' }),
      }),
      { params: Promise.resolve({ id: ID }) },
    );

  it('masukan valid: handler menerima nilai yang SUDAH diparse (default terisi)', async () => {
    const { deps } = setup();
    const response = await call(route(deps), { path: '/api/v1/uji/x?halaman=3' });
    expect(response.status).toBe(200);
    expect((await json(response)).data).toEqual({
      params: { id: ID },
      query: { halaman: 3 },
      body: { mood: 'tenang' },
    });
  });

  it('422: badan salah → daftar masalah dengan lokasi, TANPA mengulang nilai yang dikirim', async () => {
    const { deps } = setup();
    const secret = 'rahasia-kesehatan-pengguna';
    const response = await call(route(deps), { body: JSON.stringify({ mood: secret, ekstra: 1 }) });
    expect(response.status).toBe(422);
    const text = JSON.stringify(await json(response));
    expect(text).toContain('"code":"validation_failed"');
    expect(text).toContain('"path":"mood"');
    expect(text).not.toContain(secret);
  });

  it('422: query salah dan kolom asing ditolak (strict)', async () => {
    const { deps } = setup();
    const r = route(deps);
    expect((await call(r, { path: '/api/v1/uji/x?halaman=0' })).status).toBe(422);
    expect((await call(r, { path: '/api/v1/uji/x?halaman=abc' })).status).toBe(422);
    expect((await call(r, { path: '/api/v1/uji/x?halaman=1&admin=1' })).status).toBe(422);
  });

  it('422: parameter jalur salah', async () => {
    const { deps } = setup();
    const response = await route(deps).handle(
      request('/api/v1/uji/x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"mood":"tenang"}',
      }),
      { params: Promise.resolve({ id: 'bukan-uuid' }) },
    );
    expect(response.status).toBe(422);
  });

  it('400: JSON rusak', async () => {
    const { deps } = setup();
    const response = await call(route(deps), { body: '{"mood":' });
    expect(response.status).toBe(400);
    expect(((await json(response)).error as { code: string }).code).toBe('invalid_json');
  });

  it('415: Content-Type bukan JSON', async () => {
    const { deps } = setup();
    for (const type of [
      'text/plain',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      '',
    ]) {
      const response = await call(route(deps), { headers: { 'content-type': type } });
      expect(response.status, type).toBe(415);
    }
  });

  it('application/json dengan charset diterima', async () => {
    const { deps } = setup();
    const response = await call(route(deps), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
    expect(response.status).toBe(200);
  });

  it('413: badan melebihi batas, baik dari Content-Length maupun dari isi sebenarnya', async () => {
    const { deps } = setup();
    const big = JSON.stringify({ mood: 'tenang', catatan: 'x'.repeat(500) });
    expect((await call(route(deps), { body: big })).status).toBe(413);
    expect(
      (await call(route(deps), { body: big, headers: { 'content-length': '5' } })).status,
    ).toBe(413);
    expect((await call(route(deps), { headers: { 'content-length': '999999' } })).status).toBe(413);
  });

  it('JSON dengan kunci __proto__ tidak mencemari dan ditolak sebagai kolom asing', async () => {
    const { deps } = setup();
    const response = await call(route(deps), {
      body: '{"mood":"tenang","__proto__":{"admin":true}}',
    });
    expect(response.status).toBe(422);
    expect(({} as { admin?: boolean }).admin).toBeUndefined();
  });
});

describe('429: batas laju', () => {
  it('rute publik: permintaan ke-61 dalam semenit ditolak dengan Retry-After dan header laju', async () => {
    const { deps, now } = setup();
    const route = publicRoute(deps);
    const statuses: number[] = [];
    for (let i = 0; i < RATE_RULES.public.limit + 1; i += 1) {
      statuses.push(
        (await route.handle(request('/api/v1/uji', { headers: { 'x-real-ip': '8.8.8.8' } })))
          .status,
      );
    }
    expect(statuses.slice(0, -1).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);

    const blocked = await route.handle(
      request('/api/v1/uji', { headers: { 'x-real-ip': '8.8.8.8' } }),
    );
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThanOrEqual(1);
    expect(Number(blocked.headers.get('retry-after'))).toBeLessThanOrEqual(60);
    expect(blocked.headers.get('x-ratelimit-remaining')).toBe('0');
    expect(((await json(blocked)).error as { code: string }).code).toBe('rate_limited');

    // IP lain tidak ikut terkena; sesudah jendela lewat, IP semula pulih.
    expect(
      (await route.handle(request('/api/v1/uji', { headers: { 'x-real-ip': '9.9.9.9' } }))).status,
    ).toBe(200);
    now.value += 61_000;
    expect(
      (await route.handle(request('/api/v1/uji', { headers: { 'x-real-ip': '8.8.8.8' } }))).status,
    ).toBe(200);
  });

  it('batas IP berlaku SEBELUM autentikasi: tebakan kredensial pun terkena 429', async () => {
    const { deps } = setup();
    const route = defineRoute(
      {
        method: 'GET',
        path: '/api/v1/uji',
        operationId: 'uji',
        summary: 'Uji',
        tags: ['Uji'],
        auth: 'bearer',
        responses: [{ status: 200, description: 'ok' }],
        handler: async () => ok({}),
      },
      deps,
    );
    const statuses: number[] = [];
    for (let i = 0; i < RATE_RULES.ip.limit + 5; i += 1) {
      statuses.push(
        (
          await route.handle(
            request('/api/v1/uji', {
              headers: { 'x-real-ip': '7.7.7.7', authorization: 'Bearer salah.salah.salah' },
            }),
          )
        ).status,
      );
    }
    expect(statuses.filter((s) => s === 401)).toHaveLength(RATE_RULES.ip.limit);
    expect(statuses.filter((s) => s === 429)).toHaveLength(5);
  });

  it('tulis lebih ketat daripada baca, dihitung per pengguna', async () => {
    const { deps } = setup();
    const make = (method: 'GET' | 'POST') =>
      defineRoute(
        {
          method,
          path: '/api/v1/uji',
          operationId: `uji-${method}`,
          summary: 'Uji',
          tags: ['Uji'],
          auth: 'bearer',
          responses: [{ status: 200, description: 'ok' }],
          handler: async () => ok({}),
        },
        deps,
      );
    const auth = { authorization: `Bearer ${VALID_TOKEN}` };
    const post = make('POST');
    const results: number[] = [];
    for (let i = 0; i < RATE_RULES.userWrite.limit + 1; i += 1) {
      results.push(
        (
          await post.handle(
            request('/api/v1/uji', {
              method: 'POST',
              headers: { ...auth, 'x-real-ip': `10.0.0.${i % 200}` },
            }),
          )
        ).status,
      );
    }
    expect(results.at(-1)).toBe(429);
    expect(results.slice(0, -1).every((s) => s === 200)).toBe(true);
  });

  it('batas per kunci API memakai id klien, bukan IP', async () => {
    const key = generateApiKey();
    const { deps } = setup({
      [key.hash]: {
        id: 'c1',
        facilityId: null,
        scopes: ['aggregates:read'],
        keyPrefix: key.prefix,
      },
    });
    const route = defineRoute(
      {
        method: 'GET',
        path: '/api/v1/uji',
        operationId: 'uji',
        summary: 'Uji',
        tags: ['Uji'],
        auth: 'apiKey',
        scope: 'aggregates:read',
        rateLimit: { perMinute: 3 },
        responses: [{ status: 200, description: 'ok' }],
        handler: async () => ok({}),
      },
      deps,
    );
    const statuses: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      // IP berganti-ganti: batas tetap berlaku karena dihitung per kunci.
      statuses.push(
        (
          await route.handle(
            request('/api/v1/uji', {
              headers: { 'x-api-key': key.key, 'x-real-ip': `1.1.1.${i}` },
            }),
          )
        ).status,
      );
    }
    expect(statuses).toEqual([200, 200, 200, 429, 429]);
  });
});

describe('500: galat tak terduga', () => {
  it('jawaban generik tanpa pesan asli; log hanya memuat id, rute, dan nama galat', async () => {
    const { deps } = setup();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const route = defineRoute(
      {
        method: 'GET',
        path: '/api/v1/uji',
        operationId: 'uji',
        summary: 'Uji',
        tags: ['Uji'],
        auth: 'public',
        responses: [{ status: 200, description: 'ok' }],
        handler: async () => {
          throw new TypeError('relation "profiles" does not exist; user rahasia@contoh.id skor 27');
        },
      },
      deps,
    );
    const response = await route.handle(request('/api/v1/uji'));
    expect(response.status).toBe(500);
    const text = JSON.stringify(await json(response));
    expect(text).toContain('internal_error');
    expect(text).not.toMatch(/relation|profiles|rahasia|skor/);

    const logged = String(spy.mock.calls[0]?.[0]);
    expect(logged).toContain('TypeError');
    expect(logged).toContain('GET /api/v1/uji');
    expect(logged).not.toMatch(/relation|profiles|rahasia|skor/);
  });

  it('ApiError dari handler dipetakan apa adanya', async () => {
    const { deps } = setup();
    const route = defineRoute(
      {
        method: 'GET',
        path: '/api/v1/uji',
        operationId: 'uji',
        summary: 'Uji',
        tags: ['Uji'],
        auth: 'public',
        responses: [{ status: 200, description: 'ok' }],
        handler: async () => {
          throw new ApiError('not_found', 'Hasil tidak ditemukan.');
        },
      },
      deps,
    );
    const response = await route.handle(request('/api/v1/uji'));
    expect(response.status).toBe(404);
    expect((await json(response)).error).toEqual({
      code: 'not_found',
      message: 'Hasil tidak ditemukan.',
    });
  });
});

describe('format FHIR', () => {
  const fhirRoute = (deps: Setup['deps'], fail = false) =>
    defineRoute(
      {
        method: 'GET',
        path: '/api/v1/fhir/uji',
        operationId: 'fhirUji',
        summary: 'Uji',
        tags: ['FHIR'],
        auth: 'bearer',
        format: 'fhir',
        responses: [{ status: 200, description: 'Bundle' }],
        handler: async () => {
          if (fail) throw new ApiError('not_found');
          return ok({ resourceType: 'Bundle', type: 'searchset', total: 0 });
        },
      },
      deps,
    );

  it('sukses: sumber daya FHIR mentah dengan application/fhir+json', async () => {
    const { deps } = setup();
    const response = await fhirRoute(deps).handle(
      request('/api/v1/fhir/uji', { headers: { authorization: `Bearer ${VALID_TOKEN}` } }),
    );
    expect(response.headers.get('content-type')).toBe('application/fhir+json; charset=utf-8');
    expect(await json(response)).toEqual({ resourceType: 'Bundle', type: 'searchset', total: 0 });
  });

  it('galat (termasuk 401): OperationOutcome, bukan amplop { data, error }', async () => {
    const { deps } = setup();
    const unauthorized = await fhirRoute(deps).handle(request('/api/v1/fhir/uji'));
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get('content-type')).toContain('application/fhir+json');
    const body = await json(unauthorized);
    expect(body.resourceType).toBe('OperationOutcome');
    expect((body.issue as Array<{ code: string }>)[0]!.code).toBe('login');

    const missing = await fhirRoute(deps, true).handle(
      request('/api/v1/fhir/uji', { headers: { authorization: `Bearer ${VALID_TOKEN}` } }),
    );
    expect(missing.status).toBe(404);
    expect(((await json(missing)).issue as Array<{ code: string }>)[0]!.code).toBe('not-found');
  });
});
