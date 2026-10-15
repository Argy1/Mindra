import { ApiError } from '@/lib/api/errors';
import { defineRoute, ok, type RouteDeps } from '@/lib/api/handler';
import {
  aggregatesParams,
  aggregatesQuery,
  aggregatesResultSchema,
  fhirBundleSchema,
  fhirObservationQuery,
  instrumentCatalogSchema,
  satusehatSyncBody,
  satusehatSyncResultSchema,
} from '@/lib/api/schemas';
import { listAssessmentRows, toAssessmentItem } from '@/lib/api/services/assessments';
import { instrumentCatalog } from '@/lib/api/services/catalog';
import { observationBundle, type AssessmentForFhir } from '@/lib/domain/fhir/observation';
import { readPublicEnv } from '@/lib/env/public';
import { getFacilityAggregates, type AggregateRow } from '@/lib/server/aggregates';
import {
  createSatusehatClient,
  readSatusehatConfig,
  type SatusehatClient,
} from '@/lib/server/satusehat-client';
import { satusehatStore } from '@/lib/server/satusehat-store';
import { syncAssessmentsToSatusehat, type SyncStore } from '@/lib/server/satusehat-sync';
import { addDaysToKey, dateKeyWib } from '@/lib/utils/date';

/** Endpoint interoperabilitas: katalog publik, FHIR, SATUSEHAT, dan agregat anonim untuk mitra. */

const MAX_RANGE_DAYS = 400;
const DEFAULT_RANGE_DAYS = 84;

export const createInstrumentsRoute = (deps?: RouteDeps) =>
  defineRoute(
    {
      method: 'GET',
      path: '/api/v1/instruments',
      operationId: 'listInstruments',
      summary: 'Katalog instrumen skrining',
      description:
        'PHQ-9, GAD-7, PSS-10, dan SRQ-20 beserta pertanyaan, opsi jawaban, dan butir berskor terbalik. Publik dan boleh di-cache.',
      tags: ['Skrining'],
      auth: 'public',
      responses: [
        { status: 200, description: 'Katalog instrumen.', schema: instrumentCatalogSchema },
      ],
      // Data statis publik: satu-satunya respons yang boleh disimpan cache perantara.
      handler: async () =>
        ok(instrumentCatalog(), { headers: { 'Cache-Control': 'public, max-age=3600' } }),
    },
    deps,
  );

function siteBaseUrl(request: Request): string {
  const env = readPublicEnv();
  const origin = env.ok ? env.env.NEXT_PUBLIC_SITE_URL : new URL(request.url).origin;
  return origin.replace(/\/+$/, '');
}

export const createFhirObservationRoute = (deps?: RouteDeps) =>
  defineRoute(
    {
      method: 'GET',
      path: '/api/v1/fhir/Observation',
      operationId: 'searchFhirObservations',
      summary: 'Hasil skrining sebagai FHIR R4 Observation',
      description:
        'Bundle `searchset` berisi Observation: satu per hasil skrining (skor total + interpretasi). PHQ-9, GAD-7, dan PSS-10 memakai kode LOINC; SRQ-20 memakai sistem kode lokal Mindra. Jawaban per butir tidak pernah disertakan. Respons memakai `application/fhir+json` dan galat berupa OperationOutcome.',
      tags: ['FHIR'],
      auth: 'bearer',
      format: 'fhir',
      query: fhirObservationQuery,
      example: { query: { patient: 'me', _count: '10' } },
      responses: [
        {
          status: 200,
          description: 'FHIR Bundle (searchset).',
          schema: fhirBundleSchema,
          contentType: 'application/fhir+json',
        },
      ],
      handler: async ({ principal, query, request }) => {
        const page = await listAssessmentRows(principal.supabase, principal.userId, {
          limit: query._count,
          ...(query.cursor ? { cursor: query.cursor } : {}),
        });
        const assessments: AssessmentForFhir[] = page.rows.flatMap((row) => {
          const item = toAssessmentItem(row);
          return item
            ? [
                {
                  id: item.id,
                  type: item.type,
                  score: item.totalScore,
                  category: item.category,
                  completedAt: item.completedAt,
                },
              ]
            : [];
        });

        const base = siteBaseUrl(request);
        const self = new URL(`${base}/api/v1/fhir/Observation`);
        self.searchParams.set('patient', 'me');
        self.searchParams.set('_count', String(query._count));
        if (query.cursor) self.searchParams.set('cursor', query.cursor);
        let next: string | undefined;
        if (page.nextCursor) {
          const url = new URL(self);
          url.searchParams.set('cursor', page.nextCursor);
          next = url.toString();
        }

        return ok(
          observationBundle(assessments, {
            patientRef: `Patient/${principal.userId}`,
            issuedAt: new Date().toISOString(),
            baseUrl: `${base}/api/v1/fhir`,
            selfUrl: self.toString(),
            ...(next ? { nextUrl: next } : {}),
          }),
        );
      },
    },
    deps,
  );

export interface SatusehatServices {
  readConfig: typeof readSatusehatConfig;
  createClient: (config: Parameters<typeof createSatusehatClient>[0]) => SatusehatClient;
  store: SyncStore;
}

const defaultSatusehatServices: SatusehatServices = {
  readConfig: readSatusehatConfig,
  createClient: (config) => createSatusehatClient(config),
  store: satusehatStore,
};

export const createSatusehatSyncRoute = (
  deps?: RouteDeps,
  services: SatusehatServices = defaultSatusehatServices,
) =>
  defineRoute(
    {
      method: 'POST',
      path: '/api/v1/satusehat/sync',
      operationId: 'syncToSatusehat',
      summary: 'Kirim hasil skrining ke SATUSEHAT',
      description:
        'Mengirim HANYA hasil skrining yang kamu pilih (maks. 10) sebagai Observation FHIR, dan hanya bila persetujuan SATUSEHAT menyala di Privasi dan izin. Yang sudah terkirim tidak dikirim ulang. Dalam mode `mock` (bawaan) tidak ada data yang keluar dari server Mindra; bidang `mode` pada respons selalu menyebutkan mode yang dipakai.',
      tags: ['SATUSEHAT'],
      auth: 'bearer',
      body: satusehatSyncBody,
      example: { body: { assessmentIds: ['4f1b7c2e-9d3a-4e58-8b61-2a0c5d7e9f13'] } },
      responses: [
        { status: 200, description: 'Hasil per skrining.', schema: satusehatSyncResultSchema },
      ],
      handler: async ({ principal, body }) => {
        const config = services.readConfig();
        if (!config.ok) {
          throw new ApiError(
            'not_configured',
            'Integrasi SATUSEHAT belum dikonfigurasi di server ini.',
          );
        }
        const client = services.createClient(config.config);
        const results = await syncAssessmentsToSatusehat({
          supabase: principal.supabase,
          userId: principal.userId,
          assessmentIds: body.assessmentIds,
          client,
          store: services.store,
        });
        return ok({ mode: client.mode, results });
      },
    },
    deps,
  );

export interface AggregateServices {
  getAggregates: (facilityId: string, from: string, to: string) => Promise<AggregateRow[]>;
  today: () => string;
}

const defaultAggregateServices: AggregateServices = {
  getAggregates: getFacilityAggregates,
  today: () => dateKeyWib(new Date()),
};

const dayNumber = (key: string) => Date.parse(`${key}T00:00:00Z`) / 86_400_000;

export const createFacilityAggregatesRoute = (
  deps?: RouteDeps,
  services: AggregateServices = defaultAggregateServices,
) =>
  defineRoute(
    {
      method: 'GET',
      path: '/api/v1/facilities/{id}/aggregates',
      operationId: 'getFacilityAggregates',
      summary: 'Agregat anonim wilayah faskes',
      description:
        'Ringkasan per kota dan minggu untuk sistem mitra. Anonimitas k ≥ 10 diterapkan di database: grup dengan kurang dari 10 pengguna aktif ditandai `suppressed` dan SEMUA angkanya null; di grup yang lolos, setiap metrik hanya tampil bila ≥ 10 pengguna berbeda mengerjakannya. Tidak pernah ada data individu. Kunci hanya berhak atas faskesnya sendiri.',
      tags: ['Mitra'],
      auth: 'apiKey',
      scope: 'aggregates:read',
      params: aggregatesParams,
      query: aggregatesQuery,
      example: {
        path: { id: '4f1b7c2e-9d3a-4e58-8b61-2a0c5d7e9f13' },
        query: { from: '2026-08-01', to: '2026-10-13' },
      },
      responses: [
        { status: 200, description: 'Agregat per kota-minggu.', schema: aggregatesResultSchema },
      ],
      handler: async ({ principal, params, query }) => {
        // 403, bukan 404: pemegang kunci memang sah, hanya tidak berhak atas faskes lain.
        if (!principal.facilityId || principal.facilityId !== params.id) {
          throw new ApiError('forbidden', 'Kunci ini tidak berhak atas faskes tersebut.');
        }

        const to = query.to ?? services.today();
        const from = query.from ?? addDaysToKey(to, -DEFAULT_RANGE_DAYS);
        const invalid = (message: string) =>
          new ApiError('validation_failed', undefined, { issues: [{ path: 'from', message }] });
        if (from > to) throw invalid('`from` harus sebelum atau sama dengan `to`.');
        if (dayNumber(to) - dayNumber(from) > MAX_RANGE_DAYS) {
          throw invalid(`Rentang maksimal ${MAX_RANGE_DAYS} hari.`);
        }

        const rows = await services.getAggregates(params.id, from, to);
        return ok({ facilityId: params.id, from, to, kAnonymity: 10 as const, rows });
      },
    },
    deps,
  );
