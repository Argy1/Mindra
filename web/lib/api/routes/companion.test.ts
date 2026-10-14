// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseSse, textChunks, type SseEvent } from '@/lib/api/sse';
import { MAX_MESSAGE_CHARS } from '@/lib/domain/companion/messages';
import type { CompanionModel } from '@/lib/server/companion';
import { createFakeSupabase } from '@/tests/helpers/fake-supabase';
import { jsonBody, makeKit, parse } from '@/tests/helpers/api';
import { COMPANION_RATE, createCompanionChatRoute } from './companion';

const model = (pieces: string[]): CompanionModel & { calls: number } => {
  const value = {
    calls: 0,
    stream() {
      value.calls += 1;
      return (async function* () {
        for (const piece of pieces) yield piece;
      })();
    },
  };
  return value;
};

async function events(response: Response): Promise<SseEvent[]> {
  const out: SseEvent[] = [];
  for await (const event of parseSse(textChunks(response.body!))) out.push(event);
  return out;
}

function setup(options: { model?: CompanionModel | null } = {}) {
  const supabase = createFakeSupabase({
    results: { 'ai_conversations:update': { data: [{ id: 'x' }], error: null } },
  });
  const kit = makeKit({ supabase });
  let counter = 0;
  const route = createCompanionChatRoute(kit.deps, {
    model: options.model === undefined ? model(['Hai. Aku di sini.']) : options.model,
    newId: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`,
    now: () => new Date('2026-10-14T03:00:00Z'),
  });
  return { kit, supabase, route };
}

const post = (body: unknown) => jsonBody('/api/v1/companion/chat', body);

describe('POST /api/v1/companion/chat', () => {
  it('tanpa token: 401 seragam, model dan database tidak disentuh', async () => {
    const { route, supabase } = setup();
    const response = await route.handle(
      new Request('http://localhost/api/v1/companion/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'halo' }),
      }),
    );
    expect(response.status).toBe(401);
    expect(supabase.queries).toEqual([]);
  });

  it.each([
    ['pesan kosong', { message: '   ' }],
    ['pesan tidak ada', {}],
    ['pesan terlalu panjang', { message: 'a'.repeat(MAX_MESSAGE_CHARS + 1) }],
    ['pesan bukan string', { message: 12 }],
    ['id percakapan bukan UUID', { message: 'halo', conversationId: 'abc' }],
    ['kolom tak dikenal ditolak', { message: 'halo', role: 'system' }],
    ['karakter kontrol', { message: 'halo\u0000' }],
  ])('422 untuk %s', async (_label, body) => {
    const { route, supabase } = setup();
    const response = await route.handle(post(body));
    expect(response.status).toBe(422);
    expect((await parse(response)).error?.code).toBe('validation_failed');
    expect(supabase.queries).toEqual([]);
  });

  it('badan bukan JSON: 400; Content-Type salah: 415', async () => {
    const { route } = setup();
    const notJson = await route.handle(
      new Request('http://localhost/api/v1/companion/chat', {
        method: 'POST',
        headers: { authorization: 'Bearer aaaa.bbbb.cccc', 'content-type': 'application/json' },
        body: '{bukan json',
      }),
    );
    expect(notJson.status).toBe(400);
    const wrongType = await route.handle(
      new Request('http://localhost/api/v1/companion/chat', {
        method: 'POST',
        headers: { authorization: 'Bearer aaaa.bbbb.cccc', 'content-type': 'text/plain' },
        body: 'halo',
      }),
    );
    expect(wrongType.status).toBe(415);
  });

  it('pesan aman: 200 text/event-stream, tanpa cache, aliran meta → delta → done', async () => {
    const { route } = setup();
    const response = await route.handle(post({ message: 'Capek banget hari ini' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store, no-transform');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-request-id')).toMatch(/^req-test-/);
    expect(response.headers.get('x-ratelimit-limit')).toBe(String(COMPANION_RATE.limit));

    const out = await events(response);
    expect(out.map((event) => event.event)).toEqual(['meta', 'delta', 'done']);
    expect(out[1]!.data).toEqual({ text: 'Hai. Aku di sini.' });
  });

  it('pesan krisis: balasan tetap, model tidak dipanggil, peristiwa crisis membawa nomor layanan', async () => {
    const llm = model(['tidak boleh']);
    const { route } = setup({ model: llm });
    const response = await route.handle(post({ message: 'aku ingin mati saja' }));
    const out = await events(response);

    expect(llm.calls).toBe(0);
    expect(out.map((event) => event.event)).toEqual(['meta', 'crisis', 'done']);
    const crisis = out[1]!.data as { resource: { telHref: string } };
    expect(crisis.resource.telHref).toMatch(/^tel:/);
  });

  it('kunci model belum ada: pesan aman 503 not_configured; pesan krisis tetap dijawab', async () => {
    const { route, supabase } = setup({ model: null });

    const safe = await route.handle(post({ message: 'halo' }));
    expect(safe.status).toBe(503);
    expect((await parse(safe)).error?.code).toBe('not_configured');
    expect(supabase.writes()).toEqual([]);

    const crisis = await route.handle(post({ message: 'ingin bunuh diri' }));
    expect(crisis.status).toBe(200);
    expect((await events(crisis)).some((event) => event.event === 'crisis')).toBe(true);
  });

  it('batas 20 pesan per jam: yang ke-21 mendapat 429 dengan Retry-After; pengguna lain tidak terkena', async () => {
    const { route } = setup();
    for (let index = 1; index <= COMPANION_RATE.limit; index += 1) {
      const response = await route.handle(post({ message: `pesan ${index}` }));
      expect(response.status, `pesan ${index}`).toBe(200);
      await events(response);
    }
    const blocked = await route.handle(post({ message: 'pesan ke-21' }));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThanOrEqual(1);
    expect(blocked.headers.get('x-ratelimit-remaining')).toBe('0');
    expect((await parse(blocked)).error?.code).toBe('rate_limited');
  });

  it('pesan krisis DIKECUALIKAN dari batas per jam: tetap dijawab setelah jatah habis, pesan biasa tidak', async () => {
    const llm = model(['ok']);
    const { route } = setup({ model: llm });
    for (let index = 1; index <= COMPANION_RATE.limit; index += 1) {
      await events(await route.handle(post({ message: `pesan ${index}` })));
    }
    expect((await route.handle(post({ message: 'pesan biasa lagi' }))).status).toBe(429);

    const crisis = await route.handle(
      post({ message: 'aku sudah tidak kuat lagi, ingin mati saja' }),
    );
    expect(crisis.status).toBe(200);
    const out = await events(crisis);
    expect(out.map((event) => event.event)).toEqual(['meta', 'crisis', 'done']);
    // Model hanya dipanggil untuk 20 pesan biasa: balasan krisis tidak memakai model.
    expect(llm.calls).toBe(COMPANION_RATE.limit);
  });

  it('pengecualian krisis tidak membuka pintu: batas per menit tetap menahan banjir pesan krisis', async () => {
    const { route } = setup();
    let blockedAt = 0;
    for (let index = 1; index <= 40 && blockedAt === 0; index += 1) {
      const response = await route.handle(post({ message: 'ingin mati saja' }));
      if (response.status === 429) blockedAt = index;
      else await events(response);
    }
    // 30 permintaan tulis per menit per pengguna (RATE_RULES.userWrite).
    expect(blockedAt).toBe(31);
  });

  it('pesan yang ditolak validasi tidak menghabiskan jatah per jam', async () => {
    const { route } = setup();
    for (let index = 0; index < 5; index += 1) {
      expect((await route.handle(post({ message: '   ' }))).status).toBe(422);
    }
    const ok = await route.handle(post({ message: 'halo' }));
    expect(ok.headers.get('x-ratelimit-remaining')).toBe(String(COMPANION_RATE.limit - 1));
    await events(ok);
  });
});
