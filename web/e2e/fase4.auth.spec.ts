import { expect, test, type APIRequestContext } from '@playwright/test';
import { parseSse, textChunks, type SseEvent } from '../lib/api/sse';

/**
 * Fase 4 dengan AKUN SUNGGUHAN di Supabase: Teman cerita (jalur krisis dan jalur model) dan pemesanan konsultasi
 * lewat API publik. Dilewati kecuali kredensial uji DAN alamat Supabase ada di lingkungan proses Playwright:
 *
 *   E2E_USER_EMAIL=pengguna@demo.mindra.test E2E_USER_PASSWORD=... \
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   pnpm exec playwright test e2e/fase4.auth.spec.ts --project=desktop-1440
 *
 * PERHATIAN: spec ini MENULIS data ke proyek Supabase (dua percakapan Teman cerita, satu peringatan krisis dari
 * chat, satu konsultasi yang langsung dibatalkan lagi). Pakai akun uji khusus, bukan akun pribadi; akun itu
 * sebaiknya TIDAK tertaut ke psikolog sungguhan karena peringatan krisis dikirim ke psikolog yang berizin.
 * Jalur model (pesan aman) butuh ANTHROPIC_API_KEY di server aplikasi; tanpa itu tesnya dilewati.
 * Berjalan serial karena tiap tes memakai data tes sebelumnya.
 *
 * Yang TIDAK dicakup di sini dan diuji di tempat lain: MFA admin faskes (tests/db/facility-booking.test.ts, butuh
 * sesi aal2 dengan TOTP), dan konkurensi dua pengguna berbeda (constraint EXCLUDE, tests/db/facility-booking.test.ts).
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
let crisisConversation = '';
let bookedId = '';
let bookedPsychologist = '';
let bookedStartsAt = '';

const headers = (extra: Record<string, string> = {}) => ({
  authorization: `Bearer ${token}`,
  'x-real-ip': '198.51.100.78',
  ...extra,
});

const restHeaders = () => ({ apikey: anonKey!, authorization: `Bearer ${token}` });

async function readEvents(
  response: Awaited<ReturnType<APIRequestContext['post']>>,
): Promise<SseEvent[]> {
  const body = await response.body();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(body));
      controller.close();
    },
  });
  const events: SseEvent[] = [];
  for await (const event of parseSse(textChunks(stream))) events.push(event);
  return events;
}

test('masuk lewat Supabase Auth dan mendapat token akses', async ({ request }) => {
  const response = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey!, 'content-type': 'application/json' },
    data: { email, password },
  });
  expect(response.status()).toBe(200);
  token = ((await response.json()) as { access_token: string }).access_token;
  expect(token.split('.')).toHaveLength(3);
});

test('Teman cerita, pesan krisis: balasan tetap tanpa model, percakapan dan peringatan tersimpan', async ({
  request,
}) => {
  const response = await request.post('/api/v1/companion/chat', {
    headers: headers({ 'content-type': 'application/json' }),
    data: { message: 'Aku capek sekali, rasanya ingin mati saja.' },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/event-stream');

  const events = await readEvents(response);
  expect(events.map((event) => event.event)).toEqual(['meta', 'crisis', 'done']);
  const crisis = events[1]!.data as { message: string; resource: { telHref: string } };
  expect(crisis.resource.telHref).toMatch(/^tel:/);
  expect(crisis.message).toMatch(/Apakah kamu aman sekarang\?/);
  crisisConversation = (events[0]!.data as { conversationId: string }).conversationId;
  expect(events[2]!.data).toMatchObject({ conversationId: crisisConversation, saved: true });

  // Tersimpan dengan bentuk yang dibaca aplikasi Flutter, dan ditandai krisis.
  const stored = await request.get(
    `${supabaseUrl}/rest/v1/ai_conversations?id=eq.${crisisConversation}&select=crisis_detected,messages`,
    { headers: restHeaders() },
  );
  const [row] = (await stored.json()) as Array<{
    crisis_detected: boolean;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      timestamp: string;
      crisis_detected?: boolean;
    }>;
  }>;
  expect(row!.crisis_detected).toBe(true);
  expect(row!.messages.map((message) => message.role)).toEqual(['user', 'assistant']);
  for (const message of row!.messages) {
    expect(Object.keys(message)).toEqual(
      expect.arrayContaining(['id', 'role', 'content', 'timestamp']),
    );
  }

  // Peringatan krisis dari chat dibuat (pemilik boleh membacanya sendiri).
  const alerts = await request.get(
    `${supabaseUrl}/rest/v1/crisis_alerts?source=eq.ai_chat&select=id,status,severity&order=created_at.desc&limit=1`,
    { headers: restHeaders() },
  );
  const [alert] = (await alerts.json()) as Array<{ status: string; severity: string }>;
  expect(alert).toMatchObject({ status: 'open', severity: 'high' });
});

test('Teman cerita, pesan aman: balasan model mengalir dan tersimpan (dilewati bila model belum dikonfigurasi)', async ({
  request,
}) => {
  const response = await request.post('/api/v1/companion/chat', {
    headers: headers({ 'content-type': 'application/json' }),
    data: { message: 'Hari ini tugasku menumpuk dan aku agak kewalahan.' },
  });
  test.skip(response.status() === 503, 'ANTHROPIC_API_KEY belum diatur di server aplikasi.');
  expect(response.status()).toBe(200);

  const events = await readEvents(response);
  const names = events.map((event) => event.event);
  expect(names[0]).toBe('meta');
  expect(names.at(-1)).toBe('done');
  expect(names).toContain('delta');
  expect(names).not.toContain('crisis');
  const text = events
    .filter((event) => event.event === 'delta')
    .map((event) => (event.data as { text: string }).text)
    .join('');
  expect(text.trim().length).toBeGreaterThan(10);
  // Aturan gaya dari perintah sistem: tanpa tanda seru.
  expect(text).not.toContain('!');
});

test('Teman cerita: percakapan milik orang lain atau tidak ada dijawab not_found tanpa membuat apa pun', async ({
  request,
}) => {
  const response = await request.post('/api/v1/companion/chat', {
    headers: headers({ 'content-type': 'application/json' }),
    data: { message: 'halo', conversationId: '00000000-0000-4000-8000-00000000dead' },
  });
  expect([200, 503]).toContain(response.status());
  if (response.status() === 200) {
    const events = await readEvents(response);
    expect(events).toEqual([
      { event: 'error', data: expect.objectContaining({ code: 'not_found' }) },
    ]);
  }
});

test('direktori psikolog dan slot: bentuk jawaban, tanpa nomor lisensi', async ({ request }) => {
  const list = await request.get('/api/v1/psychologists', { headers: headers() });
  expect(list.status()).toBe(200);
  const psychologists = ((await list.json()) as { data: Array<{ id: string; name: string }> }).data;
  expect(psychologists.length).toBeGreaterThan(0);
  expect(JSON.stringify(psychologists)).not.toMatch(/license|str_number/i);

  let found: { id: string; startsAt: string } | null = null;
  for (const psychologist of psychologists) {
    const slots = await request.get(`/api/v1/psychologists/${psychologist.id}/slots?days=14`, {
      headers: headers(),
    });
    expect(slots.status()).toBe(200);
    const days = (
      (await slots.json()) as {
        data: { days: Array<{ slots: Array<{ startsAt: string; state: string }> }> };
      }
    ).data.days;
    const open = days.flatMap((day) => day.slots).find((slot) => slot.state === 'available');
    if (open) {
      found = { id: psychologist.id, startsAt: open.startsAt };
      break;
    }
  }
  expect(found, 'seharusnya ada minimal satu slot kosong dalam 14 hari').not.toBeNull();
  bookedPsychologist = found!.id;
  bookedStartsAt = found!.startsAt;
});

test('memesan sesi: 201; memesan jam yang sama lagi: 409', async ({ request }) => {
  const book = (startsAt: string) =>
    request.post('/api/v1/consultations', {
      headers: headers({ 'content-type': 'application/json' }),
      data: { psychologistId: bookedPsychologist, startsAt },
    });

  const first = await book(bookedStartsAt);
  expect(first.status()).toBe(201);
  const body = (
    (await first.json()) as {
      data: { id: string; status: string; durationMinutes: number; startsAt: string };
    }
  ).data;
  expect(body).toMatchObject({ status: 'confirmed', durationMinutes: 50 });
  bookedId = body.id;

  const again = await book(bookedStartsAt);
  expect(again.status()).toBe(409);
  expect(((await again.json()) as { error: { code: string } }).error.code).toBe('conflict');
});

test('jam di luar kisi ditolak 422 dan psikolog asing 404', async ({ request }) => {
  const offGrid = bookedStartsAt.replace(/T(\d{2}):00:00/, 'T$1:30:00');
  const off = await request.post('/api/v1/consultations', {
    headers: headers({ 'content-type': 'application/json' }),
    data: { psychologistId: bookedPsychologist, startsAt: offGrid },
  });
  expect(off.status()).toBe(422);

  const stranger = await request.post('/api/v1/consultations', {
    headers: headers({ 'content-type': 'application/json' }),
    data: { psychologistId: '00000000-0000-4000-8000-00000000dead', startsAt: bookedStartsAt },
  });
  expect(stranger.status()).toBe(404);
});

test('penulisan langsung yang tumpang-tindih (seperti aplikasi Flutter) ditolak constraint database', async ({
  request,
}) => {
  const overlap = await request.post(`${supabaseUrl}/rest/v1/consultations`, {
    headers: { ...restHeaders(), 'content-type': 'application/json', prefer: 'return=minimal' },
    data: {
      psychologist_id: bookedPsychologist,
      scheduled_at: new Date(new Date(bookedStartsAt).getTime() + 20 * 60_000).toISOString(),
      duration_minutes: 50,
      status: 'pending',
      user_id: (
        JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString()) as { sub: string }
      ).sub,
    },
  });
  expect(overlap.status()).toBe(409);
  expect(((await overlap.json()) as { code: string }).code).toBe('23P01');
});

test('pembersihan: sesi uji dibatalkan, slotnya terbuka lagi, dan percakapan uji dihapus', async ({
  request,
}) => {
  const cancel = await request.patch(`${supabaseUrl}/rest/v1/consultations?id=eq.${bookedId}`, {
    headers: {
      ...restHeaders(),
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    data: { status: 'cancelled' },
  });
  expect(cancel.status()).toBe(200);

  // Slot yang dibatalkan bisa dipesan lagi, lalu dibatalkan lagi.
  const rebook = await request.post('/api/v1/consultations', {
    headers: headers({ 'content-type': 'application/json' }),
    data: { psychologistId: bookedPsychologist, startsAt: bookedStartsAt },
  });
  expect(rebook.status()).toBe(201);
  const rebookId = ((await rebook.json()) as { data: { id: string } }).data.id;
  await request.patch(`${supabaseUrl}/rest/v1/consultations?id=eq.${rebookId}`, {
    headers: { ...restHeaders(), 'content-type': 'application/json' },
    data: { status: 'cancelled' },
  });

  if (crisisConversation) {
    const removed = await request.delete(
      `${supabaseUrl}/rest/v1/ai_conversations?id=eq.${crisisConversation}`,
      {
        headers: restHeaders(),
      },
    );
    expect([200, 204]).toContain(removed.status());
  }
});
