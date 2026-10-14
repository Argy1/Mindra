// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { encodeSse } from '@/lib/api/sse';
import { chatReducer, initialChatState, type ChatAction, type ChatState } from './state';
import {
  CHAT_ENDPOINT,
  createFetchTransport,
  rateLimitMessage,
  type ChatTurnEvent,
} from './client';

const CONV = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'aaa.bbb.ccc';

const sse = (...events: Array<{ event: string; data: unknown }>) =>
  new Response(events.map(encodeSse).join(''), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });

async function turn(
  transport: ReturnType<typeof createFetchTransport>,
  message = 'halo',
  signal = new AbortController().signal,
): Promise<ChatTurnEvent[]> {
  const out: ChatTurnEvent[] = [];
  for await (const event of transport({ message, signal })) out.push(event);
  return out;
}

describe('createFetchTransport', () => {
  it('mengirim Bearer, JSON, dan hanya menyertakan conversationId bila ada', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const transport = createFetchTransport(
      async () => TOKEN,
      async (url, init) => {
        calls.push({ url: String(url), init: init! });
        return sse({ event: 'done', data: { conversationId: CONV, messageId: 'm', saved: true } });
      },
    );
    await turn(transport);
    const signal = new AbortController().signal;
    for await (const event of transport({ message: 'lanjut', conversationId: CONV, signal }))
      void event;

    expect(calls[0]!.url).toBe(CHAT_ENDPOINT);
    expect(calls[0]!.init.method).toBe('POST');
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ message: 'halo' });
    expect(JSON.parse(String(calls[1]!.init.body))).toEqual({
      message: 'lanjut',
      conversationId: CONV,
    });
  });

  it('peristiwa dari server divalidasi: tipe salah dan peristiwa asing diabaikan', async () => {
    const transport = createFetchTransport(
      async () => TOKEN,
      async () =>
        sse(
          { event: 'meta', data: { conversationId: CONV } },
          { event: 'delta', data: { text: 'Hai' } },
          { event: 'delta', data: { text: 123 } },
          { event: 'meta', data: { conversationId: 'bukan-uuid' } },
          { event: 'aneh', data: {} },
          {
            event: 'crisis',
            data: {
              messageId: 'x',
              message: 'm',
              resource: { name: 'n', displayNumber: 'd', telHref: 'javascript:alert(1)' },
            },
          },
          { event: 'done', data: { conversationId: CONV, messageId: 'm1', saved: true } },
        ),
    );
    expect((await turn(transport)).map((event) => event.type)).toEqual(['meta', 'delta', 'done']);
  });

  it('tautan telepon dari server hanya boleh tel: (tidak ada javascript:)', async () => {
    const transport = createFetchTransport(
      async () => TOKEN,
      async () =>
        sse({
          event: 'crisis',
          data: {
            messageId: 'x',
            message: 'm',
            resource: { name: 'SEJIWA', displayNumber: '119 ext. 8', telHref: 'tel:119,8' },
          },
        }),
    );
    expect((await turn(transport))[0]).toMatchObject({ type: 'crisis' });
  });

  it('tanpa token: satu peristiwa error sesi, tanpa memanggil jaringan', async () => {
    let called = false;
    const transport = createFetchTransport(
      async () => null,
      async () => {
        called = true;
        return new Response();
      },
    );
    expect(await turn(transport)).toEqual([
      expect.objectContaining({ type: 'error', code: 'unauthorized' }),
    ]);
    expect(called).toBe(false);
  });

  it.each([
    [401, 'unauthorized'],
    [429, 'rate_limited'],
    [422, 'validation_failed'],
    [503, 'not_configured'],
    [500, 'server'],
    [502, 'server'],
  ])('status %i dipetakan ke kode %s dengan kalimat Indonesia', async (status, code) => {
    const transport = createFetchTransport(
      async () => TOKEN,
      async () =>
        new Response(
          JSON.stringify({ data: null, error: { code: 'x', message: 'Pesan terlalu panjang.' } }),
          {
            status,
            headers: { 'retry-after': '1500' },
          },
        ),
    );
    const [event] = await turn(transport);
    expect(event).toMatchObject({ type: 'error', code });
    expect((event as { message: string }).message).toMatch(/[a-z]/);
    expect((event as { message: string }).message).not.toContain('!');
  });

  it('429 menyebut berapa menit lagi dari Retry-After', async () => {
    const transport = createFetchTransport(
      async () => TOKEN,
      async () => new Response('{}', { status: 429, headers: { 'retry-after': '1500' } }),
    );
    const [event] = await turn(transport);
    expect((event as { message: string }).message).toContain('25 menit');
    expect(rateLimitMessage(null)).toMatch(/Istirahat sebentar/);
    expect(rateLimitMessage(0)).toMatch(/Istirahat sebentar/);
    expect(rateLimitMessage(61)).toContain('2 menit');
  });

  it('jaringan putus: error network; dibatalkan pengguna: tidak ada galat', async () => {
    const failing = createFetchTransport(
      async () => TOKEN,
      async () => {
        throw new TypeError('gagal');
      },
    );
    expect(await turn(failing)).toEqual([expect.objectContaining({ code: 'network' })]);

    const controller = new AbortController();
    controller.abort();
    expect(await turn(failing, 'halo', controller.signal)).toEqual([]);
  });

  it('galat server tidak membocorkan isi mentahnya ke pengguna', async () => {
    const transport = createFetchTransport(
      async () => TOKEN,
      async () => new Response('Traceback: kunci sk-ant-RAHASIA', { status: 500 }),
    );
    const [event] = await turn(transport);
    expect(JSON.stringify(event)).not.toContain('RAHASIA');
  });
});

describe('chatReducer', () => {
  const run = (actions: ChatAction[], state: ChatState = initialChatState()) =>
    actions.reduce(chatReducer, state);
  const ev = (event: ChatTurnEvent): ChatAction => ({ type: 'turn', event });
  const send = (text: string): ChatAction => ({ type: 'send', text, localId: 'u1' });

  it('alur normal: pesan tertunda → aliran → pesan dan balasan masuk daftar saat selesai', () => {
    const mid = run([
      send('halo'),
      ev({ type: 'meta', conversationId: CONV }),
      ev({ type: 'delta', text: 'Hai, ' }),
      ev({ type: 'delta', text: 'aku di sini.' }),
    ]);
    expect(mid).toMatchObject({
      status: 'streaming',
      streaming: 'Hai, aku di sini.',
      conversationId: CONV,
    });
    expect(mid.messages).toEqual([]);
    expect(mid.pending).toMatchObject({ content: 'halo' });

    const end = chatReducer(
      mid,
      ev({ type: 'done', conversationId: CONV, messageId: 'a1', saved: true }),
    );
    expect(end.status).toBe('idle');
    expect(end.streaming).toBeNull();
    expect(end.pending).toBeNull();
    expect(end.messages.map((m) => [m.role, m.content])).toEqual([
      ['user', 'halo'],
      ['assistant', 'Hai, aku di sini.'],
    ]);
    expect(end.unsaved).toBe(false);
  });

  it('krisis: pesan pengguna dan balasan tetap masuk dengan tanda krisis; info layanan tersedia', () => {
    const state = run([
      send('ingin mati saja'),
      ev({ type: 'meta', conversationId: CONV }),
      ev({
        type: 'crisis',
        messageId: 'c1',
        message: 'Aku dengar kamu.',
        resource: { name: 'SEJIWA', displayNumber: '119 ext. 8', telHref: 'tel:119,8' },
      }),
      ev({ type: 'done', conversationId: CONV, messageId: 'c1', saved: true }),
    ]);
    expect(state.messages.map((m) => [m.role, m.crisis])).toEqual([
      ['user', true],
      ['assistant', true],
    ]);
    expect(state.crisis).toMatchObject({ telHref: 'tel:119,8' });
    expect(state.status).toBe('idle');
    expect(state.messages).toHaveLength(2); // done tidak menggandakan
  });

  it('galat: teks dikembalikan ke kolom tulis, tidak ada pesan setengah jadi di daftar', () => {
    const state = run([
      send('curhat panjang'),
      ev({ type: 'delta', text: 'separuh' }),
      ev({ type: 'error', code: 'model_unavailable', message: 'Sedang tidak bisa menjawab.' }),
    ]);
    expect(state).toMatchObject({
      status: 'idle',
      error: 'Sedang tidak bisa menjawab.',
      restoreText: 'curhat panjang',
      streaming: null,
      pending: null,
    });
    expect(state.messages).toEqual([]);
  });

  it('pengiriman baru menghapus galat dan pemulihan sebelumnya', () => {
    const failed = run([send('a'), ev({ type: 'error', code: 'x', message: 'gagal' })]);
    const again = chatReducer(failed, send('a'));
    expect(again).toMatchObject({ error: null, restoreText: null, status: 'sending' });
  });

  it('dihentikan pengguna: teks dikembalikan, tidak ada galat', () => {
    const state = run([send('halo'), ev({ type: 'delta', text: 'ha' }), { type: 'aborted' }]);
    expect(state).toMatchObject({
      status: 'idle',
      error: null,
      restoreText: 'halo',
      streaming: null,
    });
    expect(state.messages).toEqual([]);
  });

  it('balasan tampil tetapi gagal tersimpan: ditandai unsaved', () => {
    const state = run([
      send('halo'),
      ev({ type: 'delta', text: 'Hai' }),
      ev({ type: 'done', conversationId: CONV, messageId: 'a', saved: false }),
    ]);
    expect(state.unsaved).toBe(true);
    expect(state.messages).toHaveLength(2);
  });

  it('balasan kosong tidak menambah gelembung kosong', () => {
    const state = run([
      send('halo'),
      ev({ type: 'delta', text: '   ' }),
      ev({ type: 'done', conversationId: CONV, messageId: 'a', saved: true }),
    ]);
    expect(state.messages.map((m) => m.role)).toEqual(['user']);
  });

  it('percakapan lama dimulai dari riwayat dan pesan baru ditambahkan di belakang', () => {
    const start = initialChatState(CONV, [{ id: 'm0', role: 'assistant', content: 'dulu' }]);
    const end = run(
      [
        send('baru'),
        ev({ type: 'delta', text: 'ok' }),
        ev({ type: 'done', conversationId: CONV, messageId: 'a', saved: true }),
      ],
      start,
    );
    expect(end.messages.map((m) => m.content)).toEqual(['dulu', 'baru', 'ok']);
  });
});
