import { z } from 'zod';
import { defineRoute, ok, type RouteDefinition, type RouteDeps } from '@/lib/api/handler';
import { buildOpenApiDocument, type OpenApiDocument } from '@/lib/api/openapi';
import { createCompanionChatRoute } from '@/lib/api/routes/companion';
import {
  createBookConsultationRoute,
  createListPsychologistsRoute,
  createPsychologistSlotsRoute,
} from '@/lib/api/routes/consultations';
import {
  createFacilityAggregatesRoute,
  createFhirObservationRoute,
  createInstrumentsRoute,
  createSatusehatSyncRoute,
} from '@/lib/api/routes/interop';
import {
  createCreateAssessmentRoute,
  createCreateMoodRoute,
  createCreateSleepRoute,
  createListAssessmentsRoute,
  createListMoodRoute,
  createListSleepRoute,
  createWeeklyInsightRoute,
} from '@/lib/api/routes/user-data';
import { siteUrl } from '@/lib/env/public';

/**
 * Daftar SEMUA operasi API v1. Satu-satunya tempat yang dibaca pembangun OpenAPI dan halaman /developers.
 * Tes (tests/api/route-registry.test.ts) memastikan daftar ini sama persis dengan berkas rute di `app/api/v1`.
 */

export const instrumentsRoute = createInstrumentsRoute();
export const listAssessmentsRoute = createListAssessmentsRoute();
export const createAssessmentRoute = createCreateAssessmentRoute();
export const listMoodRoute = createListMoodRoute();
export const createMoodRoute = createCreateMoodRoute();
export const listSleepRoute = createListSleepRoute();
export const createSleepRoute = createCreateSleepRoute();
export const weeklyInsightRoute = createWeeklyInsightRoute();
export const fhirObservationRoute = createFhirObservationRoute();
export const satusehatSyncRoute = createSatusehatSyncRoute();
export const facilityAggregatesRoute = createFacilityAggregatesRoute();
export const companionChatRoute = createCompanionChatRoute();
export const listPsychologistsRoute = createListPsychologistsRoute();
export const psychologistSlotsRoute = createPsychologistSlotsRoute();
export const bookConsultationRoute = createBookConsultationRoute();

export function serverUrl(): string {
  return siteUrl();
}

/** Dokumen OpenAPI dari seluruh operasi (termasuk dirinya sendiri). */
export function currentOpenApiDocument(): OpenApiDocument {
  return buildOpenApiDocument(API_ROUTES, { serverUrl: serverUrl() });
}

export const createOpenApiRoute = (deps?: RouteDeps) =>
  defineRoute(
    {
      method: 'GET',
      path: '/api/v1/openapi.json',
      operationId: 'getOpenApiDocument',
      summary: 'Spesifikasi OpenAPI 3.1',
      description:
        'Dokumen ini, dalam bentuk yang bisa dibaca mesin (Scalar, Swagger UI, Postman, generator klien).',
      tags: ['Dokumentasi'],
      auth: 'public',
      responses: [
        {
          status: 200,
          description: 'Dokumen OpenAPI 3.1.',
          schema: z.object({ openapi: z.string() }).loose(),
          contentType: 'application/json',
        },
      ],
      // Spesifikasi publik dan statis per penerapan: boleh di-cache sebentar.
      handler: async () =>
        ok(currentOpenApiDocument(), {
          raw: { contentType: 'application/json; charset=utf-8' },
          headers: { 'Cache-Control': 'public, max-age=300' },
        }),
    },
    deps,
  );

export const openApiRoute = createOpenApiRoute();

export const API_ROUTES: readonly RouteDefinition[] = [
  instrumentsRoute,
  listAssessmentsRoute,
  createAssessmentRoute,
  listMoodRoute,
  createMoodRoute,
  listSleepRoute,
  createSleepRoute,
  weeklyInsightRoute,
  fhirObservationRoute,
  satusehatSyncRoute,
  facilityAggregatesRoute,
  companionChatRoute,
  listPsychologistsRoute,
  psychologistSlotsRoute,
  bookConsultationRoute,
  openApiRoute,
];
