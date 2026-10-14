/**
 * Server-Sent Events untuk jawaban yang mengalir (teman cerita). Bentuk aliran:
 *
 *   event: delta
 *   data: {"text":"Halo"}
 *   <baris kosong>
 *
 * `data` selalu satu baris JSON (JSON.stringify tidak menghasilkan baris baru mentah), dan nama peristiwa
 * dibatasi huruf kecil dan garis bawah, jadi isi yang berasal dari model atau pengguna tidak bisa menyuntikkan
 * peristiwa atau kolom SSE baru.
 */

export interface SseEvent {
  event: string;
  data: unknown;
}

const EVENT_NAME = /^[a-z][a-z_]{0,31}$/;

export function encodeSse({ event, data }: SseEvent): string {
  if (!EVENT_NAME.test(event)) throw new Error('Nama peristiwa SSE tidak valid.');
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export const SSE_INTERNAL_ERROR: SseEvent = {
  event: 'error',
  data: { code: 'internal_error', message: 'Terjadi gangguan di server. Coba lagi sebentar lagi.' },
};

/**
 * Mengubah generator peristiwa menjadi aliran byte. Ditarik per peristiwa (pull), sehingga pembaca yang
 * lambat tidak menumpuk memori. Bila pembaca memutus (tab ditutup, tombol berhenti), `source.return()`
 * dipanggil supaya pemanggilan model di belakangnya ikut dibatalkan. Galat tak terduga dari generator
 * menjadi satu peristiwa `error` generik (tanpa pesan asli) lalu aliran ditutup.
 */
export function sseStream(
  source: AsyncGenerator<SseEvent, void, void>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await source.next();
        if (next.done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(encodeSse(next.value)));
      } catch {
        controller.enqueue(encoder.encode(encodeSse(SSE_INTERNAL_ERROR)));
        controller.close();
      }
    },
    async cancel() {
      await source.return(undefined);
    },
  });
}

// ─── Pembaca (klien) ─────────────────────────────────────────────────────────────

/** Membaca aliran SSE dari potongan teks (mis. dari `TextDecoderStream`). Komentar (`:`) dan kolom tak dikenal diabaikan. */
export async function* parseSse(chunks: AsyncIterable<string>): AsyncGenerator<SseEvent> {
  let buffer = '';
  for await (const chunk of chunks) {
    buffer += chunk;
    for (;;) {
      const match = /\r?\n\r?\n/.exec(buffer);
      if (!match) break;
      const block = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
      const event = parseBlock(block);
      if (event) yield event;
    }
  }
  const tail = parseBlock(buffer);
  if (tail) yield tail;
}

function parseBlock(block: string): SseEvent | null {
  let name = 'message';
  const dataLines: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line === '' || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'event') name = value;
    else if (field === 'data') dataLines.push(value);
  }
  if (dataLines.length === 0) return null;
  try {
    return { event: name, data: JSON.parse(dataLines.join('\n')) as unknown };
  } catch {
    return null;
  }
}

/** Mengubah body `fetch` menjadi potongan teks untuk `parseSse` (UTF-8 yang terpotong di batas paket tetap utuh). */
export async function* textChunks(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        const tail = decoder.decode();
        if (tail) yield tail;
        return;
      }
      yield decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
