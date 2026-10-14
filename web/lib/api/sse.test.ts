// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { encodeSse, parseSse, sseStream, textChunks, type SseEvent } from './sse';

async function collect(stream: ReadableStream<Uint8Array>): Promise<string> {
  let text = '';
  for await (const chunk of textChunks(stream)) text += chunk;
  return text;
}

async function* events(...items: SseEvent[]): AsyncGenerator<SseEvent, void, void> {
  for (const item of items) yield item;
}

async function* chunked(text: string, size: number): AsyncGenerator<string> {
  for (let index = 0; index < text.length; index += size) yield text.slice(index, index + size);
}

async function parseAll(text: string, size = 7): Promise<SseEvent[]> {
  const out: SseEvent[] = [];
  for await (const event of parseSse(chunked(text, size))) out.push(event);
  return out;
}

describe('encodeSse', () => {
  it('format peristiwa: nama, satu baris JSON, baris kosong penutup', () => {
    expect(encodeSse({ event: 'delta', data: { text: 'Halo' } })).toBe(
      'event: delta\ndata: {"text":"Halo"}\n\n',
    );
  });

  it('teks dengan baris baru dari model tidak memecah peristiwa atau menyuntik kolom baru', () => {
    const hostile = 'baris satu\n\nevent: crisis\ndata: {"x":1}';
    const encoded = encodeSse({ event: 'delta', data: { text: hostile } });
    expect(encoded.split('\n\n')).toHaveLength(2); // satu peristiwa + sisa kosong
    expect(encoded).not.toContain('\nevent: crisis');
  });

  it.each(['', 'Delta', 'a b', 'delta\nx', 'x'.repeat(40), '1abc'])(
    'nama peristiwa tidak valid ditolak: %j',
    (event) => {
      expect(() => encodeSse({ event, data: {} })).toThrow();
    },
  );
});

describe('sseStream', () => {
  it('mengalirkan semua peristiwa berurutan', async () => {
    const text = await collect(
      sseStream(
        events(
          { event: 'delta', data: { text: 'a' } },
          { event: 'delta', data: { text: 'b' } },
          { event: 'done', data: { ok: true } },
        ),
      ),
    );
    expect(text).toBe(
      'event: delta\ndata: {"text":"a"}\n\nevent: delta\ndata: {"text":"b"}\n\nevent: done\ndata: {"ok":true}\n\n',
    );
  });

  it('galat tak terduga: satu peristiwa error generik, tanpa pesan asli, lalu aliran ditutup', async () => {
    async function* boom(): AsyncGenerator<SseEvent, void, void> {
      yield { event: 'delta', data: { text: 'a' } };
      throw new Error('kunci rahasia sk-123');
    }
    const text = await collect(sseStream(boom()));
    expect(text).toContain('event: error');
    expect(text).toContain('internal_error');
    expect(text).not.toContain('sk-123');
  });

  it('pembaca memutus: generator sumber dihentikan (pemanggilan model ikut dibatalkan)', async () => {
    let finished = false;
    async function* source(): AsyncGenerator<SseEvent, void, void> {
      try {
        for (let index = 0; ; index += 1) yield { event: 'delta', data: { index } };
      } finally {
        finished = true;
      }
    }
    const reader = sseStream(source()).getReader();
    await reader.read();
    await reader.cancel();
    expect(finished).toBe(true);
  });
});

describe('parseSse', () => {
  it('membaca peristiwa walau potongan jaringan memotong di tengah baris', async () => {
    const wire =
      'event: delta\ndata: {"text":"Halo"}\n\nevent: crisis\ndata: {"a":1}\n\nevent: done\ndata: {}\n\n';
    for (const size of [1, 3, 7, 50, 500]) {
      expect(
        (await parseAll(wire, size)).map((event) => event.event),
        String(size),
      ).toEqual(['delta', 'crisis', 'done']);
    }
  });

  it('CRLF, komentar keep-alive, dan kolom tak dikenal diabaikan', async () => {
    const wire = ': ping\r\n\r\nid: 7\r\nevent: delta\r\ndata: {"text":"x"}\r\n\r\n';
    expect(await parseAll(wire)).toEqual([{ event: 'delta', data: { text: 'x' } }]);
  });

  it('data bukan JSON atau tanpa data dilewati, bukan melempar', async () => {
    const wire = 'event: delta\ndata: bukan-json\n\nevent: kosong\n\nevent: ok\ndata: {"a":1}\n\n';
    expect(await parseAll(wire)).toEqual([{ event: 'ok', data: { a: 1 } }]);
  });

  it('blok terakhir tanpa baris kosong penutup tetap dibaca', async () => {
    expect(await parseAll('event: done\ndata: {"x":2}')).toEqual([
      { event: 'done', data: { x: 2 } },
    ]);
  });

  it('peristiwa bolak-balik: encode lalu parse menghasilkan data yang sama', async () => {
    const original: SseEvent = { event: 'delta', data: { text: 'Aku di sini.\nApa kabar?' } };
    expect(await parseAll(encodeSse(original))).toEqual([original]);
  });
});

describe('textChunks', () => {
  it('karakter UTF-8 yang terpotong di batas paket tetap utuh', async () => {
    const bytes = new TextEncoder().encode('Aku di sini — “tenang”');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Potong di tengah karakter multibita.
        controller.enqueue(bytes.slice(0, 11));
        controller.enqueue(bytes.slice(11));
        controller.close();
      },
    });
    let text = '';
    for await (const chunk of textChunks(stream)) text += chunk;
    expect(text).toBe('Aku di sini — “tenang”');
  });
});
