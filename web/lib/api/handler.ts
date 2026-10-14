import { type z } from 'zod';
import {
  authenticateApiKey,
  authenticateBearer,
  type AnonymousPrincipal,
  type ApiKeyPrincipal,
  type AuthDeps,
  type UserPrincipal,
} from '@/lib/api/auth';
import { ApiError, type ValidationIssue } from '@/lib/api/errors';
import type { ApiScope } from '@/lib/api/keys';
import {
  clientIp,
  type RateLimiter,
  type RateLimitResult,
  type RateRule,
} from '@/lib/api/ratelimit';
import {
  BASE_HEADERS,
  errorBody,
  FHIR_CONTENT_TYPE,
  jsonResponse,
  operationOutcome,
  successBody,
  type ResponseMeta,
} from '@/lib/api/response';

/**
 * Pembungkus semua Route Handler `/api/v1/*` (CLAUDE.md: validasi Zod → auth → rate limit → handler →
 * respons terstandar). Urutan sebenarnya sengaja:
 *
 *   1. batas laju per IP        : sebelum apa pun, supaya tebakan kredensial pun dibatasi
 *   2. autentikasi              : Bearer (pengguna) atau X-API-Key (mitra); gagal = 401 yang seragam
 *   3. batas laju per prinsipal : per pengguna / per kunci (tulis lebih ketat dari baca)
 *   4. validasi Zod             : params, query, lalu badan JSON (ukuran dan Content-Type dicek dulu)
 *   5. handler                  : hanya menerima data yang sudah tervalidasi dan prinsipal yang sudah terbukti
 *
 * Galat tak terduga menjadi 500 generik; yang dicatat hanya id permintaan, rute, dan NAMA galat (bukan
 * pesan atau isi permintaan, yang bisa memuat data kesehatan).
 */

export type AuthMode = 'public' | 'bearer' | 'apiKey';

type PrincipalFor<A extends AuthMode> = A extends 'bearer'
  ? UserPrincipal
  : A extends 'apiKey'
    ? ApiKeyPrincipal
    : AnonymousPrincipal;

export interface ResponseDoc {
  status: number;
  description: string;
  /** Skema isi `data` (atau seluruh badan untuk `raw`). Dipakai dokumentasi OpenAPI dan tes. */
  schema?: z.ZodType;
  contentType?: string;
  /** Daftar berpaginasi: dokumentasi menambahkan `meta.nextCursor` pada amplop. */
  paged?: boolean;
}

export interface ApiResult {
  data: unknown;
  status?: number;
  headers?: Record<string, string>;
  meta?: ResponseMeta;
  /** Kirim `data` apa adanya (tanpa amplop) dengan Content-Type ini, mis. FHIR atau OpenAPI. */
  raw?: { contentType: string };
  /**
   * Jawab dengan aliran SSE (`text/event-stream`), mis. teman cerita. Seluruh tahap sebelum handler (batas laju,
   * autentikasi, validasi) tetap berlaku; yang berubah hanya cara badan jawaban dikirim. `data` diabaikan.
   */
  stream?: { body: ReadableStream<Uint8Array> };
}

export const ok = (data: unknown, extra: Omit<ApiResult, 'data'> = {}): ApiResult => ({
  data,
  ...extra,
});
export const created = (
  data: unknown,
  extra: Omit<ApiResult, 'data' | 'status'> = {},
): ApiResult => ({
  data,
  status: 201,
  ...extra,
});

export interface RouteContext<Pr, Q, B, P> {
  request: Request;
  principal: Pr;
  query: Q;
  body: B;
  params: P;
  requestId: string;
}

export interface RouteConfig<
  A extends AuthMode,
  Q extends z.ZodType,
  B extends z.ZodType,
  P extends z.ZodType,
> {
  method: 'GET' | 'POST' | 'DELETE';
  /** Templat OpenAPI, mis. `/api/v1/facilities/{id}/aggregates`. Harus sama dengan lokasi berkas rute. */
  path: string;
  operationId: string;
  summary: string;
  description?: string;
  tags: string[];
  auth: A;
  /** Hanya untuk `apiKey`. */
  scope?: ApiScope;
  query?: Q;
  body?: B;
  params?: P;
  /** Respons sukses yang didokumentasikan; galat umum ditambahkan otomatis ke OpenAPI. */
  responses: ResponseDoc[];
  /** Contoh nilai untuk dokumentasi dan contoh curl (tidak dipakai saat menjalankan permintaan). */
  example?: {
    body?: unknown;
    query?: Record<string, string>;
    path?: Record<string, string>;
  };
  /** `fhir` = respons mentah FHIR dan galat sebagai OperationOutcome. */
  format?: 'json' | 'fhir';
  rateLimit?: {
    perMinute?: number;
    /** Batas tambahan per pengguna (hanya `bearer`), mis. 20 pesan per jam untuk teman cerita. */
    extra?: RateRule;
    /**
     * Permintaan yang DIKECUALIKAN dari batas tambahan, diputuskan dari badan yang sudah divalidasi. Dipakai Teman
     * cerita: pesan yang memuat tanda krisis tidak boleh mendapat 429, karena jawabannya (balasan tetap + nomor
     * layanan) tidak memanggil model dan justru yang paling dibutuhkan saat batas sudah habis. Batas per menit,
     * per IP, dan penjagaan ukuran badan tetap berlaku.
     */
    exemptWhen?: (body: z.output<B>) => boolean;
  };
  maxBodyBytes?: number;
  handler: (
    context: RouteContext<PrincipalFor<A>, z.output<Q>, z.output<B>, z.output<P>>,
  ) => Promise<ApiResult>;
}

export interface HandlerDeps {
  auth: AuthDeps;
  limiter: RateLimiter;
  newRequestId: () => string;
}

/** Dependensi yang boleh diganti (tes). Di produksi dibiarkan kosong. */
export type RouteDeps = Partial<HandlerDeps> & { now?: () => number };

export type RouteContextParams = {
  params?: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Tanda tangan yang diterima pemeriksa tipe rute Next.js 15: argumen kedua WAJIB ada dan berbentuk
 * `{ params: Promise<...> }` (untuk rute tanpa segmen dinamis, Promise objek kosong).
 */
export type NextRouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

export interface RouteDefinition {
  config: RouteConfig<AuthMode, z.ZodType, z.ZodType, z.ZodType>;
  handle: (request: Request, context?: RouteContextParams) => Promise<Response>;
}

// ─── Aturan laju ──────────────────────────────────────────────────────────────
const MINUTE = 60;
export const RATE_RULES = {
  /** Semua rute, per IP, sebelum autentikasi. */
  ip: { name: 'ip', limit: 120, windowSeconds: MINUTE },
  /** Rute publik (tanpa kredensial), per IP. */
  public: { name: 'public', limit: 60, windowSeconds: MINUTE },
  userRead: { name: 'user-read', limit: 120, windowSeconds: MINUTE },
  userWrite: { name: 'user-write', limit: 30, windowSeconds: MINUTE },
  apiKey: { name: 'key', limit: 60, windowSeconds: MINUTE },
} as const satisfies Record<string, RateRule>;

export const DEFAULT_MAX_BODY_BYTES = 32 * 1024;
const REQUEST_ID_SHAPE = /^[A-Za-z0-9._-]{8,64}$/;

function requestIdFrom(request: Request, deps: HandlerDeps): string {
  const incoming = request.headers.get('x-request-id');
  return incoming && REQUEST_ID_SHAPE.test(incoming) ? incoming : deps.newRequestId();
}

function rateHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetAt),
  };
}

function issuesFrom(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

async function checkRate(
  limiter: RateLimiter,
  key: string,
  rule: RateRule,
  now: () => number,
): Promise<RateLimitResult> {
  const result = await limiter.check(key, rule);
  if (!result.allowed) {
    const retryAfter = Math.max(1, result.resetAt - Math.ceil(now() / 1000));
    throw new ApiError('rate_limited', undefined, {
      retryAfter,
      headers: { ...rateHeaders(result), 'Retry-After': String(retryAfter) },
    });
  }
  return result;
}

async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!/^application\/json(\s*;.*)?$/i.test(contentType.trim())) {
    throw new ApiError('unsupported_media_type');
  }

  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new ApiError('payload_too_large');

  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new ApiError('payload_too_large');

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('invalid_json');
  }
}

/**
 * Mendefinisikan satu operasi API. `deps` hanya diganti oleh tes; di produksi diambil dari
 * lib/api/deps.ts saat permintaan pertama.
 */
export function defineRoute<
  A extends AuthMode,
  Q extends z.ZodType = z.ZodUndefined,
  B extends z.ZodType = z.ZodUndefined,
  P extends z.ZodType = z.ZodUndefined,
>(config: RouteConfig<A, Q, B, P>, injected?: RouteDeps): RouteDefinition {
  const now = injected?.now ?? Date.now;

  async function resolveDeps(): Promise<HandlerDeps> {
    const base =
      injected?.auth && injected.limiter && injected.newRequestId
        ? undefined
        : (await import('@/lib/api/deps')).getDefaultHandlerDeps();
    return {
      auth: injected?.auth ?? base!.auth,
      limiter: injected?.limiter ?? base!.limiter,
      newRequestId: injected?.newRequestId ?? base!.newRequestId,
    };
  }

  async function handle(request: Request, context?: RouteContextParams): Promise<Response> {
    const deps = await resolveDeps();
    const requestId = requestIdFrom(request, deps);
    const fhir = config.format === 'fhir';
    let extraHeaders: Record<string, string> = { 'X-Request-Id': requestId };

    try {
      const ip = clientIp(request.headers);
      await checkRate(deps.limiter, ip, RATE_RULES.ip, now);

      // Autentikasi.
      let principal: UserPrincipal | ApiKeyPrincipal | AnonymousPrincipal;
      let rate: RateLimitResult;
      if (config.auth === 'bearer') {
        const user = await authenticateBearer(request.headers, deps.auth);
        principal = user;
        const base = request.method === 'GET' ? RATE_RULES.userRead : RATE_RULES.userWrite;
        const rule = config.rateLimit?.perMinute
          ? { ...base, limit: config.rateLimit.perMinute }
          : base;
        rate = await checkRate(deps.limiter, user.userId, rule, now);
      } else if (config.auth === 'apiKey') {
        const client = await authenticateApiKey(request.headers, deps.auth, config.scope);
        principal = client;
        const rule = config.rateLimit?.perMinute
          ? { ...RATE_RULES.apiKey, limit: config.rateLimit.perMinute }
          : RATE_RULES.apiKey;
        rate = await checkRate(deps.limiter, client.clientId, rule, now);
      } else {
        principal = { kind: 'anonymous' };
        const rule = config.rateLimit?.perMinute
          ? { ...RATE_RULES.public, limit: config.rateLimit.perMinute }
          : RATE_RULES.public;
        rate = await checkRate(deps.limiter, ip, rule, now);
      }
      extraHeaders = { ...extraHeaders, ...rateHeaders(rate) };

      // Validasi: params → query → badan.
      let params: unknown;
      if (config.params) {
        const raw = context?.params ? await context.params : {};
        const parsed = config.params.safeParse(raw);
        if (!parsed.success) {
          throw new ApiError('validation_failed', undefined, { issues: issuesFrom(parsed.error) });
        }
        params = parsed.data;
      }

      let query: unknown;
      if (config.query) {
        const url = new URL(request.url);
        const parsed = config.query.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          throw new ApiError('validation_failed', undefined, { issues: issuesFrom(parsed.error) });
        }
        query = parsed.data;
      }

      let body: unknown;
      if (config.body) {
        const json = await readJsonBody(request, config.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES);
        const parsed = config.body.safeParse(json);
        if (!parsed.success) {
          throw new ApiError('validation_failed', undefined, { issues: issuesFrom(parsed.error) });
        }
        body = parsed.data;
      }

      // Batas tambahan per pengguna (mis. 20 pesan per jam). Dicek setelah validasi: permintaan yang ditolak
      // validasi tidak menghabiskan jatah, dan `exemptWhen` bisa membaca badan.
      if (config.rateLimit?.extra && principal.kind === 'user') {
        const exempt = config.rateLimit.exemptWhen?.(body as z.output<B>) === true;
        if (!exempt) {
          // Yang dilaporkan di header adalah yang paling cepat habis.
          rate = await checkRate(deps.limiter, principal.userId, config.rateLimit.extra, now);
          extraHeaders = { ...extraHeaders, ...rateHeaders(rate) };
        }
      }

      const result = await config.handler({
        request,
        principal: principal as PrincipalFor<A>,
        query: query as z.output<Q>,
        body: body as z.output<B>,
        params: params as z.output<P>,
        requestId,
      });

      const headers = { ...extraHeaders, ...result.headers };
      const status = result.status ?? 200;
      if (result.stream) {
        return new Response(result.stream.body, {
          status,
          headers: {
            ...BASE_HEADERS,
            ...headers,
            'Content-Type': 'text/event-stream; charset=utf-8',
            // Cegah perantara (proksi, CDN) menahan atau mengubah aliran.
            'Cache-Control': 'no-store, no-transform',
            'X-Accel-Buffering': 'no',
          },
        });
      }
      if (result.raw) {
        return jsonResponse(result.data, { status, headers, contentType: result.raw.contentType });
      }
      if (fhir) {
        return jsonResponse(result.data, { status, headers, contentType: FHIR_CONTENT_TYPE });
      }
      return jsonResponse(successBody(result.data, result.meta), { status, headers });
    } catch (caught) {
      const error =
        caught instanceof ApiError ? caught : toInternalError(caught, requestId, config);
      const headers = { ...extraHeaders, ...error.headers };
      return fhir
        ? jsonResponse(operationOutcome(error), {
            status: error.status,
            headers,
            contentType: FHIR_CONTENT_TYPE,
          })
        : jsonResponse(errorBody(error), { status: error.status, headers });
    }
  }

  return { config: config as unknown as RouteDefinition['config'], handle };
}

/** Galat tak terduga: catat HANYA id, rute, dan nama galat; jawab generik. */
function toInternalError(
  caught: unknown,
  requestId: string,
  config: { method: string; path: string },
): ApiError {
  const name = caught instanceof Error ? caught.name : 'NonError';
  console.error(
    JSON.stringify({
      level: 'error',
      event: 'api_unhandled',
      requestId,
      route: `${config.method} ${config.path}`,
      name,
    }),
  );
  return new ApiError('internal_error');
}

/** Memasang definisi rute sebagai handler Next.js (`export const GET = mount(route)`). */
export const mount =
  (route: RouteDefinition) =>
  (request: Request, context: NextRouteContext): Promise<Response> =>
    route.handle(request, context);
