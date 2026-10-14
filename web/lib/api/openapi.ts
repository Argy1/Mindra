import { z } from 'zod';
import { API_ERROR_CODES, API_ERROR_STATUS, type ApiErrorCode } from '@/lib/api/errors';
import type { AuthMode, RouteDefinition } from '@/lib/api/handler';

/**
 * Pembangun dokumen OpenAPI 3.1 dari definisi rute. Satu sumber kebenaran: skema Zod yang SAMA memvalidasi
 * permintaan di handler dan menjadi skema di dokumen (`z.toJSONSchema`, JSON Schema 2020-12 yang memang dipakai
 * OpenAPI 3.1; tidak perlu pustaka tambahan). Tes membandingkan dokumen dengan berkas rute di `app/api/v1`
 * supaya endpoint tidak bisa ada tanpa dokumentasi, atau sebaliknya.
 */

type JsonSchema = Record<string, unknown>;

export interface OpenApiDocument {
  openapi: '3.1.0';
  info: Record<string, unknown>;
  servers: Array<{ url: string; description: string }>;
  tags: Array<{ name: string; description: string }>;
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, JsonSchema>;
  };
}

export interface OpenApiOperation {
  operationId: string;
  summary: string;
  description?: string;
  tags: string[];
  security: Array<Record<string, string[]>>;
  parameters?: OpenApiParameter[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
  'x-rate-limit'?: string;
}

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query';
  required: boolean;
  description?: string;
  schema: JsonSchema;
}

const TAG_DESCRIPTION: Readonly<Record<string, string>> = {
  Skrining: 'Katalog instrumen skrining (publik).',
  'Data pengguna': 'Data milik pemilik token: hasil skrining, mood, tidur, dan ringkasan mingguan.',
  FHIR: 'Hasil skrining sebagai sumber daya FHIR R4.',
  SATUSEHAT: 'Pengiriman hasil skrining yang disetujui ke platform SATUSEHAT.',
  Mitra: 'Agregat anonim untuk sistem mitra (kunci API).',
  Dokumentasi: 'Spesifikasi API itu sendiri.',
};

const SECURITY: Readonly<Record<AuthMode, Array<Record<string, string[]>>>> = {
  public: [],
  bearer: [{ bearerAuth: [] }],
  apiKey: [{ apiKeyAuth: [] }],
};

/** Menghapus `$schema` dan pola UUID yang sangat panjang (formatnya sudah tercantum di `format: uuid`). */
function clean(schema: JsonSchema): JsonSchema {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (node !== null && typeof node === 'object') {
      const entries = Object.entries(node as JsonSchema).filter(([key]) => key !== '$schema');
      const result = Object.fromEntries(
        entries.map(([key, value]) => [key, walk(value)]),
      ) as JsonSchema;
      if (result.format === 'uuid') delete result.pattern;
      return result;
    }
    return node;
  };
  return walk(schema) as JsonSchema;
}

export function toJsonSchema(schema: z.ZodType, io: 'input' | 'output'): JsonSchema {
  return clean(
    z.toJSONSchema(schema, { target: 'draft-2020-12', io, unrepresentable: 'any' }) as JsonSchema,
  );
}

function parametersFrom(
  schema: z.ZodType | undefined,
  location: 'path' | 'query',
): OpenApiParameter[] {
  if (!schema) return [];
  const json = toJsonSchema(schema, 'input');
  const properties = (json.properties ?? {}) as Record<string, JsonSchema>;
  const required = new Set((json.required ?? []) as string[]);
  return Object.entries(properties).map(([name, property]) => {
    const { description, ...rest } = property as JsonSchema & { description?: string };
    return {
      name,
      in: location,
      required: location === 'path' ? true : required.has(name),
      ...(typeof description === 'string' ? { description } : {}),
      schema: rest,
    };
  });
}

const ERROR_ENVELOPE: JsonSchema = {
  type: 'object',
  required: ['data', 'error'],
  properties: {
    data: { type: 'null' },
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string', enum: API_ERROR_CODES },
        message: { type: 'string' },
        issues: {
          type: 'array',
          description:
            'Hanya pada `validation_failed`: lokasi dan alasan, tanpa mengulang nilai yang dikirim.',
          items: {
            type: 'object',
            required: ['path', 'message'],
            properties: { path: { type: 'string' }, message: { type: 'string' } },
          },
        },
      },
    },
  },
};

const OPERATION_OUTCOME: JsonSchema = {
  type: 'object',
  required: ['resourceType', 'issue'],
  properties: {
    resourceType: { const: 'OperationOutcome' },
    issue: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string' },
          code: { type: 'string' },
          diagnostics: { type: 'string' },
        },
      },
    },
  },
};

const ERROR_DESCRIPTION: Readonly<Record<ApiErrorCode, string>> = {
  invalid_json: 'Badan permintaan bukan JSON yang valid.',
  unauthorized: 'Kredensial tidak ada atau tidak valid (jawabannya sama untuk semua sebab).',
  forbidden: 'Kredensial valid tetapi tidak berhak.',
  not_found: 'Sumber daya tidak ditemukan.',
  conflict: 'Bertentangan dengan keadaan saat ini, mis. slot konsultasi sudah dipesan orang lain.',
  payload_too_large: 'Badan permintaan melebihi 32 KB.',
  unsupported_media_type: 'Content-Type harus application/json.',
  validation_failed: 'Permintaan tidak lolos validasi; lihat `error.issues`.',
  rate_limited: 'Terlalu banyak permintaan; lihat header `Retry-After`.',
  internal_error: 'Kesalahan di server (jawaban generik).',
  upstream_error: 'Layanan eksternal bermasalah.',
  not_configured: 'Layanan belum dikonfigurasi di server ini.',
};

/** Kode galat yang mungkin untuk satu operasi, diturunkan dari konfigurasinya. */
export function possibleErrors(config: RouteDefinition['config']): ApiErrorCode[] {
  const codes = new Set<ApiErrorCode>(['rate_limited', 'internal_error']);
  if (config.auth !== 'public') codes.add('unauthorized');
  if (config.auth === 'apiKey' || config.scope) codes.add('forbidden');
  if (config.path === '/api/v1/satusehat/sync') {
    codes.add('forbidden');
    codes.add('not_configured');
  }
  if (config.path === '/api/v1/companion/chat') codes.add('not_configured');
  if (config.path === '/api/v1/consultations') {
    codes.add('not_found');
    codes.add('conflict');
  }
  if (config.path === '/api/v1/psychologists/{id}/slots') codes.add('not_found');
  if (config.params || config.query) codes.add('validation_failed');
  if (config.body) {
    for (const code of [
      'invalid_json',
      'payload_too_large',
      'unsupported_media_type',
      'validation_failed',
    ] as const) {
      codes.add(code);
    }
  }
  return [...codes].sort((a, b) => API_ERROR_STATUS[a] - API_ERROR_STATUS[b]);
}

function operationFor(config: RouteDefinition['config']): OpenApiOperation {
  const fhir = config.format === 'fhir';
  const errorSchema = fhir ? OPERATION_OUTCOME : ERROR_ENVELOPE;
  const errorContentType = fhir ? 'application/fhir+json' : 'application/json';

  const responses: Record<string, unknown> = {};
  for (const doc of config.responses) {
    const raw = fhir || Boolean(doc.contentType);
    const contentType = doc.contentType ?? 'application/json';
    let schema: JsonSchema;
    if (!doc.schema) {
      schema = contentType.startsWith('text/event-stream')
        ? { type: 'string' }
        : { type: 'object' };
    } else if (raw) {
      schema = toJsonSchema(doc.schema, 'output');
    } else {
      schema = {
        type: 'object',
        required: ['data', 'error'],
        properties: {
          data: toJsonSchema(doc.schema, 'output'),
          error: { type: 'null' },
          ...(doc.paged
            ? {
                meta: {
                  type: 'object',
                  required: ['nextCursor'],
                  properties: {
                    nextCursor: {
                      type: ['string', 'null'],
                      description: 'Kursor halaman berikutnya, atau null bila habis.',
                    },
                  },
                },
              }
            : {}),
        },
      };
    }
    responses[String(doc.status)] = {
      description: doc.description,
      content: { [contentType]: { schema } },
    };
  }

  for (const code of possibleErrors(config)) {
    const status = String(API_ERROR_STATUS[code]);
    const existing = responses[status] as { description: string } | undefined;
    responses[status] = {
      description: existing
        ? `${existing.description} / ${ERROR_DESCRIPTION[code]}`
        : ERROR_DESCRIPTION[code],
      content: { [errorContentType]: { schema: errorSchema } },
      ...(code === 'rate_limited'
        ? {
            headers: {
              'Retry-After': {
                description: 'Detik sampai boleh mencoba lagi.',
                schema: { type: 'integer' },
              },
              'X-RateLimit-Limit': { schema: { type: 'integer' } },
              'X-RateLimit-Remaining': { schema: { type: 'integer' } },
              'X-RateLimit-Reset': { description: 'Epoch detik.', schema: { type: 'integer' } },
            },
          }
        : {}),
    };
  }

  const parameters = [
    ...parametersFrom(config.params, 'path'),
    ...parametersFrom(config.query, 'query'),
  ];

  return {
    operationId: config.operationId,
    summary: config.summary,
    ...(config.description ? { description: config.description } : {}),
    tags: config.tags,
    security: SECURITY[config.auth],
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(config.body
      ? {
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: toJsonSchema(config.body, 'input'),
                ...(config.example?.body !== undefined ? { example: config.example.body } : {}),
              },
            },
          },
        }
      : {}),
    responses,
  };
}

export interface OpenApiOptions {
  serverUrl: string;
  version?: string;
}

export function buildOpenApiDocument(
  routes: readonly RouteDefinition[],
  options: OpenApiOptions,
): OpenApiDocument {
  const paths: OpenApiDocument['paths'] = {};
  const tagNames = new Set<string>();

  for (const route of routes) {
    const { config } = route;
    const entry = (paths[config.path] ??= {});
    entry[config.method.toLowerCase()] = operationFor(config);
    for (const tag of config.tags) tagNames.add(tag);
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Mindra API',
      version: options.version ?? '1.0.0',
      description:
        'API publik Mindra untuk aplikasi pihak ketiga dan sistem mitra. Semua respons berbentuk `{ "data": ..., "error": null }` atau `{ "data": null, "error": { "code", "message" } }`, kecuali FHIR (sumber daya mentah, `application/fhir+json`). Hasil skrining adalah skrining, bukan diagnosis.',
      license: { name: 'Hak cipta proyek Mindra (UINIC 8.0 Web Development Competition 2026)' },
    },
    servers: [{ url: options.serverUrl, description: 'Server ini' }],
    tags: [...tagNames].map((name) => ({ name, description: TAG_DESCRIPTION[name] ?? '' })),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Token akses Supabase milik pengguna (`Authorization: Bearer <token>`). Semua kueri berjalan di bawah kebijakan RLS pemilik token.',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description:
            'Kunci API sistem mitra (`mk_live_...`), dibuat oleh admin faskes. Hanya hash-nya yang tersimpan; kunci utuh tampil sekali saat dibuat.',
        },
      },
      schemas: { ErrorEnvelope: ERROR_ENVELOPE, OperationOutcome: OPERATION_OUTCOME },
    },
  };
}
