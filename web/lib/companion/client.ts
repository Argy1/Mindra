import { z } from 'zod';
import { parseSse, textChunks } from '@/lib/api/sse';

/**
 * Sisi klien (peramban) untuk Teman cerita: memanggil `POST /api/v1/companion/chat` dengan token Supabase
 * sebagai Bearer dan mengubah aliran SSE menjadi peristiwa bertipe. Tidak berisi rahasia dan tidak dipakai di
 * server. Semua data dari server divalidasi ulang dengan Zod sebelum disentuh UI.
 */

export const CHAT_ENDPOINT = '/api/v1/companion/chat';

const resourceSchema = z.object({
  name: z.string(),
  displayNumber: z.string(),
  telHref: z.string().regex(/^tel:[0-9,+#*]+$/),
});

const eventSchemas = {
  meta: z.object({ conversationId: z.uuid() }),
  delta: z.object({ text: z.string() }),
  crisis: z.object({ messageId: z.string(), message: z.string(), resource: resourceSchema }),
  done: z.object({ conversationId: z.uuid(), messageId: z.string(), saved: z.boolean() }),
  error: z.object({ code: z.string(), message: z.string() }),
} as const;

export type ChatTurnEvent =
  | ({ type: 'meta' } & z.infer<typeof eventSchemas.meta>)
  | ({ type: 'delta' } & z.infer<typeof eventSchemas.delta>)
  | ({ type: 'crisis' } & z.infer<typeof eventSchemas.crisis>)
  | ({ type: 'done' } & z.infer<typeof eventSchemas.done>)
  | ({ type: 'error' } & z.infer<typeof eventSchemas.error>);

export interface TurnRequest {
  message: string;
  conversationId?: string | undefined;
  signal: AbortSignal;
}

export type ChatTransport = (request: TurnRequest) => AsyncIterable<ChatTurnEvent>;

const NETWORK_ERROR: ChatTurnEvent = {
  type: 'error',
  code: 'network',
  message: 'Koneksimu terputus. Periksa jaringan, lalu coba kirim lagi.',
};
const SERVER_ERROR: ChatTurnEvent = {
  type: 'error',
  code: 'server',
  message: 'Teman cerita sedang tidak bisa dihubungi. Coba lagi sebentar lagi.',
};
const SESSION_ERROR: ChatTurnEvent = {
  type: 'error',
  code: 'unauthorized',
  message: 'Sesimu sudah berakhir. Masuk lagi untuk melanjutkan.',
};

const errorEnvelope = z.object({
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
});

/** Pesan batas laju yang menyebut kapan boleh lanjut, dari header `Retry-After` (detik). */
export function rateLimitMessage(retryAfterSeconds: number | null): string {
  if (retryAfterSeconds === null || !Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) {
    return 'Kamu sudah mengirim banyak pesan. Istirahat sebentar, lalu lanjutkan lagi.';
  }
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Kamu sudah mengirim banyak pesan. Istirahat sebentar, lalu lanjutkan sekitar ${minutes} menit lagi.`;
}

function parseTurnEvent(event: { event: string; data: unknown }): ChatTurnEvent | null {
  const name = event.event as keyof typeof eventSchemas;
  const schema = eventSchemas[name];
  if (!schema) return null;
  const parsed = schema.safeParse(event.data);
  return parsed.success ? ({ type: name, ...parsed.data } as ChatTurnEvent) : null;
}

/**
 * Transport produksi. `getToken` mengambil token akses sesi saat ini (null = belum masuk). Respons non-2xx
 * dipetakan ke satu peristiwa `error` dengan kalimat Indonesia; isi galat server tidak ditampilkan mentah.
 */
export function createFetchTransport(
  getToken: () => Promise<string | null>,
  fetchImpl: typeof fetch = fetch,
): ChatTransport {
  return async function* transport({ message, conversationId, signal }) {
    const token = await getToken().catch(() => null);
    if (!token) {
      yield SESSION_ERROR;
      return;
    }

    let response: Response;
    try {
      response = await fetchImpl(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, ...(conversationId ? { conversationId } : {}) }),
        signal,
      });
    } catch {
      if (!signal.aborted) yield NETWORK_ERROR;
      return;
    }

    if (!response.ok || !response.body) {
      if (response.status === 401) yield SESSION_ERROR;
      else if (response.status === 429) {
        yield {
          type: 'error',
          code: 'rate_limited',
          message: rateLimitMessage(Number(response.headers.get('retry-after')) || null),
        };
      } else if (response.status === 422 || response.status === 413) {
        const body = errorEnvelope.safeParse(await response.json().catch(() => null));
        yield {
          type: 'error',
          code: 'validation_failed',
          message:
            body.success && body.data.error
              ? body.data.error.message
              : 'Pesanmu belum bisa dikirim.',
        };
      } else if (response.status === 503) {
        yield {
          type: 'error',
          code: 'not_configured',
          message: 'Teman cerita belum diaktifkan di server ini.',
        };
      } else yield SERVER_ERROR;
      return;
    }

    try {
      for await (const raw of parseSse(textChunks(response.body))) {
        const event = parseTurnEvent(raw);
        if (event) yield event;
      }
    } catch {
      if (!signal.aborted) yield NETWORK_ERROR;
    }
  };
}
