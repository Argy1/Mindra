// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { SseEvent } from '@/lib/api/sse';
import { buildCrisisReply } from '@/lib/domain/companion/crisis-reply';
import { MAX_STORED_MESSAGES, type StoredMessage } from '@/lib/domain/companion/messages';
import { CRISIS_KEYWORDS } from '@/lib/domain/crisis/detector';
import { createFakeSupabase, type FakeSupabaseOptions } from '@/tests/helpers/fake-supabase';
import {
  ALERT_DEDUPE_HOURS,
  MAX_REPLY_CHARS,
  runCompanionTurn,
  type CompanionDeps,
  type CompanionModel,
} from './companion';

const USER = '11111111-1111-4111-8111-111111111111';
const CONV = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-10-14T03:00:00Z');

function ids() {
  let counter = 0;
  return () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;
}

function fakeModel(pieces: string[] | (() => AsyncIterable<string>)) {
  const calls: Array<{
    system: string;
    messages: Array<{ role: string; content: string }>;
    signal?: AbortSignal;
  }> = [];
  const model: CompanionModel = {
    stream(input) {
      calls.push(input);
      if (typeof pieces === 'function') return pieces();
      return (async function* () {
        for (const piece of pieces) yield piece;
      })();
    },
  };
  return { model, calls };
}

const deps = (model: CompanionModel | null, extra: Partial<CompanionDeps> = {}): CompanionDeps => ({
  model,
  now: () => NOW,
  newId: ids(),
  ...extra,
});

async function collect(generator: AsyncGenerator<SseEvent, void, void>): Promise<SseEvent[]> {
  const events: SseEvent[] = [];
  for await (const event of generator) events.push(event);
  return events;
}

const msg = (role: 'user' | 'assistant', content: string, index: number): StoredMessage => ({
  id: `m${index}`,
  role,
  content,
  timestamp: '2026-10-14T01:00:00.000Z',
});

function conversationRow(messages: unknown, extra: Record<string, unknown> = {}) {
  return {
    id: CONV,
    messages,
    crisis_detected: false,
    updated_at: '2026-10-14T02:00:00Z',
    ...extra,
  };
}

const saved = { 'ai_conversations:update': { data: [{ id: CONV }], error: null } };

function run(
  message: string,
  options: {
    fake?: FakeSupabaseOptions;
    model?: CompanionModel | null;
    conversationId?: string;
    deps?: Partial<CompanionDeps>;
  } = {},
) {
  const fake = createFakeSupabase(options.fake ?? {});
  const model = options.model === undefined ? fakeModel(['Aku dengar kamu.']).model : options.model;
  const events = collect(
    runCompanionTurn(
      fake.client as never,
      USER,
      { message, conversationId: options.conversationId },
      deps(model, options.deps),
    ),
  );
  return { fake, events };
}

const writes = (fake: ReturnType<typeof createFakeSupabase>, table: string) =>
  fake.writes().filter((entry) => entry.table === table);

describe('jalur krisis: berbasis aturan, SEBELUM dan TANPA model', () => {
  const crisisText = 'Aku capek, rasanya ingin mati saja.';

  it('model tidak pernah dipanggil; balasan tetap; percakapan dan peringatan tersimpan', async () => {
    const { model, calls } = fakeModel(['tidak boleh muncul']);
    const { fake, events } = run(crisisText, { model });
    const out = await events;

    expect(calls).toHaveLength(0);
    expect(out.map((event) => event.event)).toEqual(['meta', 'crisis', 'done']);
    const crisis = out[1]!.data as {
      message: string;
      resource: { displayNumber: string; telHref: string };
    };
    expect(crisis.message).toBe(buildCrisisReply());
    expect(crisis.resource.telHref).toMatch(/^tel:/);
    expect(JSON.stringify(out)).not.toContain('tidak boleh muncul');

    const [conversation] = writes(fake, 'ai_conversations');
    const payload = conversation!.payload as {
      user_id: string;
      crisis_detected: boolean;
      messages: StoredMessage[];
    };
    expect(payload).toMatchObject({ user_id: USER, crisis_detected: true });
    expect(payload.messages.map((entry) => [entry.role, entry.crisis_detected])).toEqual([
      ['user', true],
      ['assistant', true],
    ]);

    const [alert] = writes(fake, 'crisis_alerts');
    expect(alert!.payload).toEqual({ user_id: USER, source: 'ai_chat', severity: 'high' });
  });

  it('urutan: simpan dan peringatan terjadi, lalu balasan krisis dikirim', async () => {
    const { fake, events } = run(crisisText);
    const out = await events;
    expect(out.at(-1)!.data).toMatchObject({ saved: true });
    expect(fake.tablesQueried()).toEqual(
      expect.arrayContaining(['ai_conversations', 'crisis_alerts']),
    );
  });

  it('setiap frasa di CRISIS_KEYWORDS menghentikan jalur model', async () => {
    for (const keyword of CRISIS_KEYWORDS) {
      const { model, calls } = fakeModel(['x']);
      const { events } = run(`hari ini ${keyword.toUpperCase()} deh`, { model });
      const out = await events;
      expect(calls, keyword).toHaveLength(0);
      expect(
        out.some((event) => event.event === 'crisis'),
        keyword,
      ).toBe(true);
    }
  });

  it('tetap menjawab walau kunci model belum dikonfigurasi', async () => {
    const { events } = run(crisisText, { model: null });
    const out = await events;
    expect(out.map((event) => event.event)).toEqual(['meta', 'crisis', 'done']);
  });

  it('tetap menjawab walau penyimpanan gagal: saved=false, balasan krisis tidak hilang', async () => {
    const { events } = run(crisisText, { fake: { failTables: ['ai_conversations'] } });
    const out = await events;
    expect(out.map((event) => event.event)).toEqual(['meta', 'crisis', 'done']);
    expect(out.at(-1)!.data).toMatchObject({ saved: false });
  });

  it('peringatan tidak diulang bila masih ada yang terbuka dalam jendela dedupe', async () => {
    const { fake, events } = run(crisisText, {
      fake: { tables: { crisis_alerts: [{ id: 'a1' }] } },
    });
    await events;
    expect(writes(fake, 'crisis_alerts')).toHaveLength(0);
    const lookup = fake.queriesTo('crisis_alerts')[0]!;
    expect(lookup.filters).toEqual(
      expect.arrayContaining([
        { op: 'eq', column: 'user_id', value: USER },
        { op: 'eq', column: 'source', value: 'ai_chat' },
        { op: 'eq', column: 'status', value: 'open' },
        {
          op: 'gte',
          column: 'created_at',
          value: new Date(NOW.getTime() - ALERT_DEDUPE_HOURS * 3_600_000).toISOString(),
        },
      ]),
    );
  });

  it('deteksi hanya pada pesan TERBARU: kata krisis di riwayat tidak memblokir pesan yang aman', async () => {
    const history = [
      msg('user', 'dulu aku sempat ingin mati saja', 0),
      msg('assistant', 'terima kasih sudah cerita', 1),
    ];
    const { model, calls } = fakeModel(['Syukurlah kamu lebih baik.']);
    const { events } = run('hari ini aku lebih baik', {
      model,
      conversationId: CONV,
      fake: { tables: { ai_conversations: [conversationRow(history)] }, results: saved },
    });
    const out = await events;
    expect(calls).toHaveLength(1);
    expect(out.some((event) => event.event === 'crisis')).toBe(false);
  });

  it('percakapan yang pernah krisis tetap bertanda crisis_detected saat pesan berikutnya aman', async () => {
    const { fake, events } = run('terima kasih', {
      conversationId: CONV,
      fake: {
        tables: { ai_conversations: [conversationRow([], { crisis_detected: true })] },
        results: saved,
      },
    });
    await events;
    const [update] = writes(fake, 'ai_conversations');
    expect((update!.payload as { crisis_detected: boolean }).crisis_detected).toBe(true);
  });
});

describe('jalur biasa: model mengalir', () => {
  it('urutan peristiwa meta → delta → done; konteks dan perintah sistem sampai ke model', async () => {
    const { model, calls } = fakeModel(['Hai, ', 'aku di sini.']);
    const { events } = run('Capek banget hari ini', { model });
    const out = await events;

    expect(out.map((event) => event.event)).toEqual(['meta', 'delta', 'delta', 'done']);
    expect(
      out
        .filter((event) => event.event === 'delta')
        .map((event) => (event.data as { text: string }).text)
        .join(''),
    ).toBe('Hai, aku di sini.');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.messages).toEqual([{ role: 'user', content: 'Capek banget hari ini' }]);
    expect(calls[0]!.system).toMatch(/Teman cerita di Mindra/);
  });

  it('percakapan baru disimpan dengan INSERT memakai id yang sama dengan peristiwa meta', async () => {
    const { fake, events } = run('halo');
    const out = await events;
    const conversationId = (out[0]!.data as { conversationId: string }).conversationId;

    const [insert] = writes(fake, 'ai_conversations');
    expect(insert!.op).toBe('insert');
    const payload = insert!.payload as {
      id: string;
      user_id: string;
      crisis_detected: boolean;
      messages: StoredMessage[];
    };
    expect(payload).toMatchObject({ id: conversationId, user_id: USER, crisis_detected: false });
    expect(payload.messages.map((entry) => entry.role)).toEqual(['user', 'assistant']);
    expect(payload.messages[1]!.content).toBe('Aku dengar kamu.');
    // Bentuk yang dibaca aplikasi Flutter.
    for (const entry of payload.messages) {
      expect(Object.keys(entry).sort()).toEqual(['content', 'id', 'role', 'timestamp']);
    }
    expect(out.at(-1)!.data).toMatchObject({ conversationId, saved: true });
  });

  it('percakapan lama: dimuat dengan penyaring user_id, ditambah di belakang, diperbarui dengan penjaga updated_at', async () => {
    const history = [msg('user', 'halo', 0), msg('assistant', 'hai', 1)];
    const { model, calls } = fakeModel(['balasan']);
    const { fake, events } = run('lanjut', {
      model,
      conversationId: CONV,
      fake: { tables: { ai_conversations: [conversationRow(history)] }, results: saved },
    });
    const out = await events;

    const [load] = fake.queriesTo('ai_conversations');
    expect(load!.filters).toEqual(
      expect.arrayContaining([
        { op: 'eq', column: 'id', value: CONV },
        { op: 'eq', column: 'user_id', value: USER },
      ]),
    );
    expect(calls[0]!.messages.map((entry) => entry.content)).toEqual(['halo', 'hai', 'lanjut']);

    const [update] = writes(fake, 'ai_conversations');
    expect(update!.op).toBe('update');
    expect(update!.filters).toEqual(
      expect.arrayContaining([
        { op: 'eq', column: 'id', value: CONV },
        { op: 'eq', column: 'user_id', value: USER },
        { op: 'eq', column: 'updated_at', value: '2026-10-14T02:00:00Z' },
      ]),
    );
    const payload = update!.payload as { messages: StoredMessage[] };
    expect(payload.messages.map((entry) => entry.content)).toEqual([
      'halo',
      'hai',
      'lanjut',
      'balasan',
    ]);
    expect(out.at(-1)!.data).toMatchObject({ saved: true });
  });

  it('pengingat bahwa lawan bicara adalah AI muncul pada pesan pengguna kelima', async () => {
    const history = Array.from({ length: 4 }, (_, index) => [
      msg('user', `u${index}`, index * 2),
      msg('assistant', `a${index}`, index * 2 + 1),
    ]).flat();
    const { model, calls } = fakeModel(['ok']);
    await run('kelima', {
      model,
      conversationId: CONV,
      fake: { tables: { ai_conversations: [conversationRow(history)] }, results: saved },
    }).events;
    expect(calls[0]!.system).toMatch(/pengingat yang halus/);
  });

  it('balasan melebihi batas dipotong dan berhenti dikirim', async () => {
    const { model } = fakeModel(['a'.repeat(MAX_REPLY_CHARS - 10), 'b'.repeat(500), 'c']);
    const { fake, events } = run('halo', { model });
    const out = await events;
    const sent = out
      .filter((event) => event.event === 'delta')
      .map((event) => (event.data as { text: string }).text)
      .join('');
    expect(sent.length).toBeLessThanOrEqual(MAX_REPLY_CHARS);
    const stored = (writes(fake, 'ai_conversations')[0]!.payload as { messages: StoredMessage[] })
      .messages[1]!.content;
    expect(stored.length).toBeLessThanOrEqual(MAX_REPLY_CHARS);
    expect(stored).not.toContain('c');
  });

  it('pembatalan oleh klien menghentikan model (signal diteruskan)', async () => {
    const controller = new AbortController();
    const { model, calls } = fakeModel(['x']);
    await run('halo', { model, deps: { signal: controller.signal } }).events;
    expect(calls[0]!.signal).toBeInstanceOf(AbortSignal);

    let modelSignal: AbortSignal | undefined;
    const hanging: CompanionModel = {
      stream(input) {
        modelSignal = input.signal;
        return (async function* () {
          yield 'a';
          controller.abort();
          yield 'b';
        })();
      },
    };
    await run('halo', { model: hanging, deps: { signal: controller.signal } }).events;
    expect(modelSignal!.aborted).toBe(true);
  });
});

describe('pesan krisis tidak boleh gagal karena percakapannya bermasalah', () => {
  const crisisText = 'aku ingin mati saja';

  it('percakapan tidak ada atau milik orang lain: dijawab di percakapan BARU, bukan galat', async () => {
    const { fake, events } = run(crisisText, {
      conversationId: CONV,
      fake: { tables: { ai_conversations: [] } },
    });
    const out = await events;
    expect(out.map((event) => event.event)).toEqual(['meta', 'crisis', 'done']);
    const [insert] = writes(fake, 'ai_conversations');
    expect(insert!.op).toBe('insert');
    expect((insert!.payload as { id: string }).id).not.toBe(CONV);
    expect(writes(fake, 'crisis_alerts')).toHaveLength(1);
  });

  it('isi percakapan rusak: tidak ditimpa, krisis dijawab di percakapan baru', async () => {
    const { fake, events } = run(crisisText, {
      conversationId: CONV,
      fake: { tables: { ai_conversations: [conversationRow([{ role: 'system', content: 1 }])] } },
    });
    const out = await events;
    expect(out.map((event) => event.event)).toEqual(['meta', 'crisis', 'done']);
    expect(writes(fake, 'ai_conversations').every((entry) => entry.op === 'insert')).toBe(true);
  });

  it('percakapan penuh: krisis dijawab di percakapan baru, pesan biasa tetap ditolak', async () => {
    const long = Array.from({ length: MAX_STORED_MESSAGES }, (_, index) =>
      msg(index % 2 ? 'assistant' : 'user', 'x', index),
    );
    const fake = { tables: { ai_conversations: [conversationRow(long)] } };
    const crisis = await run(crisisText, { conversationId: CONV, fake }).events;
    expect(crisis.map((event) => event.event)).toEqual(['meta', 'crisis', 'done']);
    const safe = await run('halo', { conversationId: CONV, fake }).events;
    expect(safe[0]!.data).toMatchObject({ code: 'conversation_full' });
  });

  it('gagal memuat (galat database): krisis tetap dijawab', async () => {
    const out = await run(crisisText, {
      conversationId: CONV,
      fake: { failTables: ['ai_conversations'] },
    }).events;
    expect(out.map((event) => event.event)).toEqual(['meta', 'crisis', 'done']);
    expect(out.at(-1)!.data).toMatchObject({ saved: false });
  });
});

describe('kegagalan', () => {
  it('percakapan milik orang lain atau tidak ada: not_found, model dan penulisan tidak disentuh', async () => {
    const { model, calls } = fakeModel(['x']);
    const { fake, events } = run('halo', {
      model,
      conversationId: CONV,
      fake: { tables: { ai_conversations: [] } },
    });
    const out = await events;
    expect(out).toEqual([{ event: 'error', data: expect.objectContaining({ code: 'not_found' }) }]);
    expect(calls).toHaveLength(0);
    expect(fake.writes()).toEqual([]);
  });

  it('isi percakapan rusak: conversation_corrupt, tidak menimpa data', async () => {
    const { fake, events } = run('halo', {
      conversationId: CONV,
      fake: { tables: { ai_conversations: [conversationRow([{ role: 'system', content: 1 }])] } },
    });
    expect((await events)[0]!.data).toMatchObject({ code: 'conversation_corrupt' });
    expect(fake.writes()).toEqual([]);
  });

  it('percakapan sudah terlalu panjang: conversation_full', async () => {
    const long = Array.from({ length: MAX_STORED_MESSAGES }, (_, index) =>
      msg(index % 2 ? 'assistant' : 'user', 'x', index),
    );
    const { model, calls } = fakeModel(['x']);
    const { events } = run('halo', {
      model,
      conversationId: CONV,
      fake: { tables: { ai_conversations: [conversationRow(long)] } },
    });
    expect((await events)[0]!.data).toMatchObject({ code: 'conversation_full' });
    expect(calls).toHaveLength(0);
  });

  it('galat model di tengah aliran: pesan generik, pesan asli tidak bocor, tidak ada yang disimpan', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failing = fakeModel(() =>
      (async function* () {
        yield 'separuh ';
        throw new Error('401 invalid x-api-key sk-ant-RAHASIA');
      })(),
    );
    const { fake, events } = run('halo', { model: failing.model });
    const out = await events;
    expect(out.at(-1)).toEqual({
      event: 'error',
      data: { code: 'model_unavailable', message: expect.stringContaining('tidak bisa menjawab') },
    });
    expect(JSON.stringify(out)).not.toContain('RAHASIA');
    expect(fake.writes()).toEqual([]);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('balasan kosong: error, tidak ada yang disimpan', async () => {
    const { fake, events } = run('halo', { model: fakeModel(['   ', '\n']).model });
    expect((await events).at(-1)!.data).toMatchObject({ code: 'empty_reply' });
    expect(fake.writes()).toEqual([]);
  });

  it('kunci model belum ada dan pesan aman: not_configured tanpa menulis apa pun', async () => {
    const { fake, events } = run('halo', { model: null });
    expect(await events).toEqual([
      { event: 'error', data: expect.objectContaining({ code: 'not_configured' }) },
    ]);
    expect(fake.writes()).toEqual([]);
  });

  it('dua tab saling menimpa: pembaruan tanpa baris yang cocok dilaporkan conflict', async () => {
    const { events } = run('halo', {
      conversationId: CONV,
      fake: {
        tables: { ai_conversations: [conversationRow([])] },
        results: { 'ai_conversations:update': { data: [], error: null } },
      },
    });
    expect((await events).at(-1)!.data).toMatchObject({ code: 'conflict' });
  });

  it('gagal menyimpan setelah balasan terkirim: done dengan saved=false', async () => {
    const { events } = run('halo', { fake: { failTables: ['ai_conversations'] } });
    expect((await events).at(-1)).toEqual({
      event: 'done',
      data: expect.objectContaining({ saved: false }),
    });
  });
});

describe('privasi: isi percakapan tidak pernah ke log', () => {
  it('tidak ada console.* yang memuat isi pesan di semua jalur', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const secret = 'RAHASIA-CURHAT-123';
    await run(`${secret} ingin mati saja`).events;
    await run(secret).events;
    await run(secret, {
      model: fakeModel(() =>
        (async function* () {
          throw new Error(secret);
        })(),
      ).model,
    }).events;
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(secret);
      spy.mockRestore();
    }
  });
});
