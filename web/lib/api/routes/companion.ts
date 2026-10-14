import { randomUUID } from 'node:crypto';
import { ApiError } from '@/lib/api/errors';
import { defineRoute, type ApiResult, type RouteDeps } from '@/lib/api/handler';
import { companionChatBody } from '@/lib/api/schemas';
import { sseStream } from '@/lib/api/sse';
import { detectCrisisText } from '@/lib/domain/crisis/detector';
import { runCompanionTurn, type CompanionModel } from '@/lib/server/companion';
import { getCompanionModel } from '@/lib/server/companion-model';

/** Batas pesan ke Teman cerita per pengguna (docs/ARCHITECTURE.md §7). */
export const COMPANION_RATE = { name: 'companion', limit: 20, windowSeconds: 3600 } as const;

/** `runtime.model` hanya diganti oleh tes; produksi memakai model dari lingkungan. */
export const createCompanionChatRoute = (
  deps?: RouteDeps,
  runtime: { model?: CompanionModel | null; newId?: () => string; now?: () => Date } = {},
) =>
  defineRoute(
    {
      method: 'POST',
      path: '/api/v1/companion/chat',
      operationId: 'companionChat',
      summary: 'Kirim pesan ke Teman cerita (SSE)',
      description:
        'Mengirim satu pesan dan menerima balasan sebagai aliran Server-Sent Events. Urutan di server: batas laju (20 pesan per jam per akun; pesan yang memuat tanda krisis dikecualikan dari batas ini) → deteksi krisis berbasis aturan pada pesanmu → bila krisis, balasan TETAP dikirim sebagai peristiwa `crisis` dan model TIDAK dipanggil; bila aman, balasan model dialirkan. Peristiwa: `meta` ({conversationId}), `delta` ({text}, berulang), `crisis` ({messageId, message, resource}), `done` ({conversationId, messageId, saved}), `error` ({code, message}). Klien WAJIB menampilkan `crisis.resource` kepada pengguna. Teman cerita bukan psikolog dan bukan alat diagnosis.',
      tags: ['Teman cerita'],
      auth: 'bearer',
      body: companionChatBody,
      example: { body: { message: 'Capek banget hari ini, tugas numpuk.' } },
      // Pesan krisis dikecualikan dari batas per jam: jawabannya tetap dan tanpa model, dan paling dibutuhkan
      // justru ketika seseorang sudah banyak menulis. Batas per menit dan per IP tetap berlaku.
      rateLimit: { extra: COMPANION_RATE, exemptWhen: (body) => detectCrisisText(body.message) },
      responses: [
        {
          status: 200,
          description:
            'Aliran SSE (`text/event-stream`). Galat yang terjadi setelah aliran dimulai datang sebagai peristiwa `error`.',
          contentType: 'text/event-stream',
        },
      ],
      handler: async ({ principal, body, request }): Promise<ApiResult> => {
        const model = runtime.model === undefined ? getCompanionModel() : runtime.model;
        // Jalur krisis tidak butuh model, jadi tetap dilayani walau kunci belum dikonfigurasi.
        if (!model && !detectCrisisText(body.message)) {
          throw new ApiError('not_configured', 'Teman cerita belum diaktifkan di server ini.');
        }
        const events = runCompanionTurn(
          principal.supabase,
          principal.userId,
          { conversationId: body.conversationId, message: body.message },
          {
            model,
            now: runtime.now ?? (() => new Date()),
            newId: runtime.newId ?? randomUUID,
            signal: request.signal,
          },
        );
        return { data: null, stream: { body: sseStream(events) } };
      },
    },
    deps,
  );
