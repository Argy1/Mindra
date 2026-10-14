// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { API_ERROR_CODES } from '@/lib/api/errors';
import { buildOpenApiDocument, possibleErrors } from '@/lib/api/openapi';
import {
  aggregatesResultSchema,
  assessmentResultSchema,
  fhirBundleSchema,
  instrumentCatalogSchema,
  weeklyInsightSchema,
} from '@/lib/api/schemas';
import { instrumentCatalog } from '@/lib/api/services/catalog';
import { API_ROUTES, currentOpenApiDocument } from '@/lib/api/routes';
import { observationBundle } from '@/lib/domain/fhir/observation';
import { buildWeeklyInsight } from '@/lib/domain/insight/weekly';
import { toAggregateRow } from '@/lib/server/aggregates';

const doc = buildOpenApiDocument(API_ROUTES, { serverUrl: 'https://mindra.example' });
const operations = Object.entries(doc.paths).flatMap(([route, methods]) =>
  Object.entries(methods).map(([method, operation]) => ({ route, method, operation })),
);

describe('dokumen OpenAPI 3.1', () => {
  it('versi, info, server, dan skema keamanan', () => {
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.info.title).toBe('Mindra API');
    expect(doc.servers).toEqual([{ url: 'https://mindra.example', description: 'Server ini' }]);
    expect(Object.keys(doc.components.securitySchemes).sort()).toEqual([
      'apiKeyAuth',
      'bearerAuth',
    ]);
    expect(doc.components.securitySchemes.apiKeyAuth).toMatchObject({
      in: 'header',
      name: 'X-API-Key',
    });
  });

  it('setiap operasi dokumentasikan ringkasan, tag, dan respons; jumlah sama dengan registri', () => {
    expect(operations).toHaveLength(API_ROUTES.length);
    for (const { route, method, operation } of operations) {
      const label = `${method.toUpperCase()} ${route}`;
      expect(operation.summary, label).toBeTruthy();
      expect(operation.operationId, label).toBeTruthy();
      expect(operation.tags.length, label).toBeGreaterThan(0);
      expect(Object.keys(operation.responses).length, label).toBeGreaterThan(1);
    }
    for (const tag of operations.flatMap((o) => o.operation.tags)) {
      expect(
        doc.tags.map((t) => t.name),
        tag,
      ).toContain(tag);
    }
  });

  it('keamanan per operasi sesuai jenis autentikasi: publik tanpa, Bearer, atau X-API-Key', () => {
    for (const route of API_ROUTES) {
      const operation = doc.paths[route.config.path]![route.config.method.toLowerCase()]!;
      const expected = { public: [], bearer: [{ bearerAuth: [] }], apiKey: [{ apiKeyAuth: [] }] }[
        route.config.auth
      ];
      expect(operation.security, route.config.path).toEqual(expected);
    }
  });

  it('parameter jalur `{id}` terdaftar sebagai parameter wajib', () => {
    const operation = doc.paths['/api/v1/facilities/{id}/aggregates']!.get!;
    expect(operation.parameters).toContainEqual(
      expect.objectContaining({ name: 'id', in: 'path', required: true }),
    );
    for (const { route, operation: op } of operations) {
      for (const name of route.match(/\{(\w+)\}/g)?.map((m) => m.slice(1, -1)) ?? []) {
        expect(
          op.parameters?.map((p) => p.name),
          `${route} ${name}`,
        ).toContain(name);
      }
    }
  });

  it('badan permintaan hanya pada operasi yang punya skema badan, dengan contoh', () => {
    for (const route of API_ROUTES) {
      const operation = doc.paths[route.config.path]![route.config.method.toLowerCase()]!;
      if (route.config.body) {
        const content = (
          operation.requestBody as {
            content: Record<string, { schema: unknown; example?: unknown }>;
          }
        ).content['application/json']!;
        expect(content.schema, route.config.path).toBeDefined();
        expect(content.example, `${route.config.path}: contoh badan`).toBeDefined();
      } else {
        expect(operation.requestBody, route.config.path).toBeUndefined();
      }
    }
  });

  it('galat didokumentasikan sesuai kemungkinan sebenarnya; kode di dokumen = kode di kode', () => {
    const envelope = doc.components.schemas.ErrorEnvelope as {
      properties: { error: { properties: { code: { enum: string[] } } } };
    };
    expect(envelope.properties.error.properties.code.enum).toEqual(API_ERROR_CODES);

    for (const route of API_ROUTES) {
      const operation = doc.paths[route.config.path]![route.config.method.toLowerCase()]!;
      const statuses = Object.keys(operation.responses);
      expect(statuses, route.config.path).toContain('429');
      expect(statuses, route.config.path).toContain('500');
      expect(statuses.includes('401'), route.config.path).toBe(route.config.auth !== 'public');
      expect(statuses.includes('422'), route.config.path).toBe(
        Boolean(route.config.body || route.config.query || route.config.params),
      );
    }
    expect(
      possibleErrors(API_ROUTES.find((r) => r.config.path === '/api/v1/satusehat/sync')!.config),
    ).toEqual(expect.arrayContaining(['forbidden', 'not_configured', 'unauthorized']));
  });

  it('galat FHIR didokumentasikan sebagai OperationOutcome, bukan amplop { data, error }', () => {
    const operation = doc.paths['/api/v1/fhir/Observation']!.get!;
    const unauthorized = operation.responses['401'] as { content: Record<string, unknown> };
    expect(Object.keys(unauthorized.content)).toEqual(['application/fhir+json']);
  });

  it('respons berpaginasi mendokumentasikan meta.nextCursor', () => {
    const operation = doc.paths['/api/v1/assessments']!.get!;
    const schema = (
      operation.responses['200'] as {
        content: { 'application/json': { schema: { properties: Record<string, unknown> } } };
      }
    ).content['application/json'].schema;
    expect(Object.keys(schema.properties)).toEqual(['data', 'error', 'meta']);
  });

  it('dokumen yang disajikan bisa dibuat dan memuat dirinya sendiri', () => {
    const served = currentOpenApiDocument();
    expect(served.paths['/api/v1/openapi.json']).toBeDefined();
    expect(JSON.parse(JSON.stringify(served))).toEqual(served);
  });
});

describe('contoh di dokumentasi lolos validasi skemanya sendiri', () => {
  for (const route of API_ROUTES) {
    const { config } = route;
    if (config.body && config.example?.body !== undefined) {
      it(`${config.method} ${config.path}: contoh badan valid`, () => {
        expect(config.body!.safeParse(config.example!.body).success).toBe(true);
      });
    }
    if (config.query && config.example?.query) {
      it(`${config.method} ${config.path}: contoh query valid`, () => {
        expect(config.query!.safeParse(config.example!.query).success).toBe(true);
      });
    }
    if (config.params && config.example?.path) {
      it(`${config.method} ${config.path}: contoh parameter jalur valid`, () => {
        expect(config.params!.safeParse(config.example!.path).success).toBe(true);
      });
    }
  }
});

describe('kontrak: keluaran nyata cocok dengan skema yang didokumentasikan', () => {
  it('katalog instrumen', () => {
    expect(instrumentCatalogSchema.safeParse(instrumentCatalog()).success).toBe(true);
  });

  it('ringkasan mingguan', () => {
    const insight = buildWeeklyInsight({
      today: '2026-10-13',
      moods: [{ mood_type: 'cemas', created_at: '2026-10-12T01:00:00Z' }],
      sleeps: [{ bedtime: '2026-10-11T15:00:00Z', wake_time: '2026-10-11T22:00:00Z', quality: 3 }],
      assessmentsDone: 1,
      recentMoodTimestamps: ['2026-10-12T01:00:00Z'],
    });
    const parsed = weeklyInsightSchema.safeParse(insight);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it('FHIR Bundle', () => {
    const bundle = observationBundle(
      [
        {
          id: '11111111-1111-4111-8111-111111111111',
          type: 'phq9',
          score: 9,
          category: 'mild',
          completedAt: '2026-10-13T01:00:00Z',
        },
      ],
      {
        patientRef: 'Patient/x',
        issuedAt: '2026-10-13T02:00:00Z',
        baseUrl: 'https://m/api/v1/fhir',
        selfUrl: 'https://m/api/v1/fhir/Observation',
      },
    );
    expect(fhirBundleSchema.safeParse(bundle).success).toBe(true);
  });

  it('agregat, termasuk baris yang disembunyikan', () => {
    const rows = [
      toAggregateRow({
        city: 'Bogor',
        province: 'Jawa Barat',
        week_start: '2026-10-05',
        suppressed: false,
        active_users: 12,
        avg_phq9: 7,
        avg_gad7: 5,
        avg_pss10: 18,
        minimal_count: 6,
        mild_count: 3,
        moderate_count: 2,
        severe_count: 1,
        crisis_alert_count: 0,
      }),
      toAggregateRow({
        city: 'Depok',
        province: 'Jawa Barat',
        week_start: '2026-10-05',
        suppressed: true,
        active_users: null,
        avg_phq9: null,
        avg_gad7: null,
        avg_pss10: null,
        minimal_count: null,
        mild_count: null,
        moderate_count: null,
        severe_count: null,
        crisis_alert_count: null,
      }),
    ];
    const result = {
      facilityId: '66666666-6666-4666-8666-666666666666',
      from: '2026-08-01',
      to: '2026-10-13',
      kAnonymity: 10,
      rows,
    };
    expect(aggregatesResultSchema.safeParse(result).success).toBe(true);
  });

  it('hasil skrining (bentuk dari layanan) lolos skema', () => {
    const result = {
      id: '22222222-2222-4222-8222-222222222222',
      type: 'phq9',
      totalScore: 16,
      maxScore: 27,
      category: 'severe',
      completedAt: '2026-10-13T03:00:00.000Z',
      crisis: { detected: false, resource: null },
      recommendations: [{ id: 'x', title: 't', description: 'd', highlight: false }],
      disclaimer: 'bukan diagnosis',
    };
    expect(assessmentResultSchema.safeParse(result).success).toBe(true);
  });
});
