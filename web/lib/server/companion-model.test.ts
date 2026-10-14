// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  createAnthropicModel,
  DEFAULT_COMPANION_MODEL,
  MAX_OUTPUT_TOKENS,
  readCompanionConfig,
  type MessagesClient,
} from './companion-model';

const KEY = 'sk-ant-contoh-kunci-uji-0123456789';

describe('readCompanionConfig', () => {
  it('kunci valid: model bawaan bila ANTHROPIC_MODEL kosong', () => {
    expect(readCompanionConfig({ ANTHROPIC_API_KEY: KEY })).toEqual({
      apiKey: KEY,
      model: DEFAULT_COMPANION_MODEL,
    });
    expect(readCompanionConfig({ ANTHROPIC_API_KEY: KEY, ANTHROPIC_MODEL: '  ' })!.model).toBe(
      DEFAULT_COMPANION_MODEL,
    );
  });

  it('model dari lingkungan dipakai (dipangkas)', () => {
    expect(
      readCompanionConfig({
        ANTHROPIC_API_KEY: KEY,
        ANTHROPIC_MODEL: ' claude-haiku-5-5 ',
      })!.model,
    ).toBe('claude-haiku-5-5');
  });

  it.each([undefined, '', '   ', 'pendek', 'sk-ant-'])(
    'kunci tidak valid (%j): belum dikonfigurasi',
    (key) => {
      expect(readCompanionConfig({ ANTHROPIC_API_KEY: key })).toBeNull();
    },
  );

  it('kunci tidak pernah berasal dari variabel NEXT_PUBLIC_', () => {
    expect(readCompanionConfig({ NEXT_PUBLIC_ANTHROPIC_API_KEY: KEY })).toBeNull();
  });
});

describe('createAnthropicModel', () => {
  function fakeClient(events: unknown[]) {
    const calls: Array<{ body: unknown; options: unknown }> = [];
    const client: MessagesClient = {
      messages: {
        stream(body, options) {
          calls.push({ body, options });
          return (async function* () {
            for (const event of events) yield event;
          })();
        },
      },
    };
    return { client, calls };
  }

  const delta = (text: unknown) => ({
    type: 'content_block_delta',
    delta: { type: 'text_delta', text },
  });

  it('hanya teks dari content_block_delta yang diteruskan; peristiwa lain diabaikan', async () => {
    const { client } = fakeClient([
      { type: 'message_start' },
      delta('Hai, '),
      { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{}' } },
      delta(42),
      null,
      'bukan objek',
      delta('aku di sini.'),
      { type: 'message_stop' },
    ]);
    const model = createAnthropicModel({ apiKey: KEY, model: 'm-uji' }, client);
    const pieces: string[] = [];
    for await (const piece of model.stream({
      system: 's',
      messages: [{ role: 'user', content: 'halo' }],
    }))
      pieces.push(piece);
    expect(pieces).toEqual(['Hai, ', 'aku di sini.']);
  });

  it('permintaan: model dari konfigurasi, batas token, perintah sistem, pesan, dan signal', async () => {
    const { client, calls } = fakeClient([]);
    const controller = new AbortController();
    const model = createAnthropicModel({ apiKey: KEY, model: 'm-uji' }, client);
    for await (const piece of model.stream({
      system: 'sistem',
      messages: [{ role: 'user', content: 'halo' }],
      signal: controller.signal,
    }))
      void piece;

    expect(calls[0]!.body).toEqual({
      model: 'm-uji',
      max_tokens: MAX_OUTPUT_TOKENS,
      system: 'sistem',
      messages: [{ role: 'user', content: 'halo' }],
    });
    expect(calls[0]!.options).toEqual({ signal: controller.signal });
    // Kunci tidak ikut di badan permintaan (hanya dipakai klien SDK untuk header).
    expect(JSON.stringify(calls[0]!.body)).not.toContain(KEY);
  });
});
