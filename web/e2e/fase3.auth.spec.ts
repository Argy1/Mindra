import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * API v1 dengan AKUN SUNGGUHAN di Supabase: masuk lewat Supabase Auth, lalu memakai token akses sebagai
 * Bearer. Dilewati kecuali kredensial uji DAN alamat Supabase ada di lingkungan proses Playwright:
 *
 *   E2E_USER_EMAIL=pengguna@demo.mindra.test E2E_USER_PASSWORD=... \
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   pnpm exec playwright test e2e/fase3.auth.spec.ts --project=desktop-1440
 *
 * PERHATIAN: spec ini MENULIS data ke proyek Supabase (satu hasil GAD-7, satu PHQ-9 dengan butir 9 > 0 yang
 * memicu alert krisis lewat trigger, satu catatan mood dan satu tidur). Pakai akun uji khusus, bukan akun
 * pribadi. Berjalan serial karena tiap tes memakai data tes sebelumnya.
 */
const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test.skip(
  !email || !password || !supabaseUrl || !anonKey,
  'Butuh E2E_USER_EMAIL, E2E_USER_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, dan NEXT_PUBLIC_SUPABASE_ANON_KEY.',
);
test.describe.configure({ mode: 'serial' });

let token = '';
let gadId = '';
let phqId = '';

const bearer = () => ({ authorization: `Bearer ${token}`, 'x-real-ip': '198.51.100.77' });

type Envelope = {
  data: unknown;
  error: { code: string; message: string } | null;
  meta?: { nextCursor: string | null };
};
const envelope = async (response: Awaited<ReturnType<APIRequestContext['get']>>) =>
  (await response.json()) as Envelope;

const phq9 = (item9: number) => ({
  type: 'phq9',
  answers: Object.fromEntries(
    Array.from({ length: 9 }, (_, i) => [`phq9_${i + 1}`, i === 8 ? item9 : 1]),
  ),
});

test('masuk lewat Supabase Auth dan mendapat token akses', async ({ request }) => {
  const response = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey!, 'content-type': 'application/json' },
    data: { email, password },
  });
  expect(response.status()).toBe(200);
  token = ((await response.json()) as { access_token: string }).access_token;
  expect(token.split('.')).toHaveLength(3);
});

test('GET /assessments dengan token valid: amplop sukses dengan meta.nextCursor', async ({
  request,
}) => {
  const response = await request.get('/api/v1/assessments?limit=5', { headers: bearer() });
  expect(response.status()).toBe(200);
  const body = await envelope(response);
  expect(body.error).toBeNull();
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.meta).toHaveProperty('nextCursor');
  expect(JSON.stringify(body)).not.toMatch(/question_id|"answers"/);
});

test('POST /assessments (GAD-7 semua 0): skor dihitung server, tanpa krisis', async ({
  request,
}) => {
  const answers = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`gad7_${i + 1}`, 0]));
  const response = await request.post('/api/v1/assessments', {
    headers: { ...bearer(), 'content-type': 'application/json' },
    data: { type: 'gad7', answers },
  });
  expect(response.status()).toBe(201);
  const result = (await envelope(response)).data as {
    id: string;
    totalScore: number;
    maxScore: number;
    category: string;
    crisis: { detected: boolean; resource: unknown };
    disclaimer: string;
  };
  gadId = result.id;
  expect(result).toMatchObject({ totalScore: 0, maxScore: 21, category: 'minimal' });
  expect(result.crisis).toEqual({ detected: false, resource: null });
  expect(result.disclaimer).toMatch(/bukan diagnosis/);
});

test('POST /assessments: skor kiriman klien ditolak (422), bukan diabaikan', async ({
  request,
}) => {
  const response = await request.post('/api/v1/assessments', {
    headers: { ...bearer(), 'content-type': 'application/json' },
    data: { ...phq9(0), total_score: 0, category: 'minimal' },
  });
  expect(response.status()).toBe(422);
  expect((await envelope(response)).error?.code).toBe('validation_failed');
});

test('POST /assessments (PHQ-9 butir 9 > 0): krisis terdeteksi dengan layanan krisis di respons', async ({
  request,
}) => {
  const response = await request.post('/api/v1/assessments', {
    headers: { ...bearer(), 'content-type': 'application/json' },
    data: phq9(1),
  });
  expect(response.status()).toBe(201);
  const result = (await envelope(response)).data as {
    id: string;
    crisis: { detected: boolean; resource: { telHref: string } | null };
  };
  phqId = result.id;
  expect(result.crisis.detected).toBe(true);
  expect(result.crisis.resource?.telHref).toMatch(/^tel:/);
});

test('mood dan tidur: simpan lalu muncul di daftar', async ({ request }) => {
  const mood = await request.post('/api/v1/mood-entries', {
    headers: { ...bearer(), 'content-type': 'application/json' },
    data: { moodType: 'tenang', note: 'Catatan uji e2e API.' },
  });
  expect(mood.status()).toBe(201);
  const moodId = ((await envelope(mood)).data as { id: string }).id;

  const list = await request.get('/api/v1/mood-entries?limit=10', { headers: bearer() });
  expect(((await envelope(list)).data as Array<{ id: string }>).map((m) => m.id)).toContain(moodId);

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const sleep = await request.post('/api/v1/sleep-entries', {
    headers: { ...bearer(), 'content-type': 'application/json' },
    data: { wakeDate: yesterday, bedtime: '22:30', wakeTime: '06:00', quality: 4 },
  });
  expect(sleep.status()).toBe(201);
});

test('GET /insights/weekly: 7 hari dengan narasi', async ({ request }) => {
  const response = await request.get('/api/v1/insights/weekly', { headers: bearer() });
  expect(response.status()).toBe(200);
  const insight = (await envelope(response)).data as { days: unknown[]; narrative: string };
  expect(insight.days).toHaveLength(7);
  expect(insight.narrative.length).toBeGreaterThan(0);
});

test('GET /fhir/Observation: Bundle FHIR R4 berisi hasil yang baru dibuat, tanpa jawaban per butir', async ({
  request,
}) => {
  const response = await request.get('/api/v1/fhir/Observation?patient=me&_count=50', {
    headers: bearer(),
  });
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/fhir+json');
  const bundle = (await response.json()) as {
    resourceType: string;
    type: string;
    entry: Array<{ resource: { id: string; code: { coding: Array<{ code: string }> } } }>;
  };
  expect(bundle).toMatchObject({ resourceType: 'Bundle', type: 'searchset' });
  const ids = bundle.entry.map((e) => e.resource.id);
  expect(ids).toEqual(expect.arrayContaining([gadId, phqId]));
  const phqEntry = bundle.entry.find((e) => e.resource.id === phqId)!;
  expect(phqEntry.resource.code.coding[0]!.code).toBe('44261-6');
  expect(JSON.stringify(bundle)).not.toMatch(/question_id|"answers"/);
});

test('POST /satusehat/sync: tanpa persetujuan 403, dengan persetujuan terkirim (mode disebut)', async ({
  request,
}) => {
  const response = await request.post('/api/v1/satusehat/sync', {
    headers: { ...bearer(), 'content-type': 'application/json' },
    data: { assessmentIds: [gadId] },
  });
  const body = await envelope(response);
  if (response.status() === 403) {
    expect(body.error?.message).toMatch(/Privasi dan izin/);
  } else {
    expect(response.status()).toBe(200);
    const data = body.data as { mode: string; results: Array<{ status: string }> };
    expect(['mock', 'staging']).toContain(data.mode);
    expect(['synced', 'already_synced', 'failed']).toContain(data.results[0]!.status);
  }
});

test('token pengguna tidak dapat memakai endpoint mitra (kunci API)', async ({ request }) => {
  const response = await request.get(
    '/api/v1/facilities/66666666-6666-4666-8666-666666666666/aggregates',
    {
      headers: bearer(),
    },
  );
  expect(response.status()).toBe(401);
});
