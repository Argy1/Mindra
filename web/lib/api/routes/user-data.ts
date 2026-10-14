import { defineRoute, created, ok, type RouteDeps } from '@/lib/api/handler';
import {
  assessmentItemSchema,
  assessmentResultSchema,
  assessmentsQuery,
  createAssessmentBody,
  createMoodBody,
  createSleepBody,
  entriesQuery,
  moodItemSchema,
  sleepItemSchema,
  weeklyInsightSchema,
} from '@/lib/api/schemas';
import { createAssessmentResult, listAssessments } from '@/lib/api/services/assessments';
import { createMood, createSleep, listMood, listSleep } from '@/lib/api/services/journal';
import { loadWeeklyInsight } from '@/lib/data/weekly-insight';
import { z } from 'zod';

/** Endpoint data milik pengguna (Bearer). Semua kueri dibatasi `user_id` token, lihat layanan. */

const TAG = 'Data pengguna';

export const createListAssessmentsRoute = (deps?: RouteDeps) =>
  defineRoute(
    {
      method: 'GET',
      path: '/api/v1/assessments',
      operationId: 'listAssessments',
      summary: 'Riwayat hasil skrining',
      description:
        'Hasil skrining milik pemilik token, terbaru dulu, dengan paginasi kursor. Tidak memuat jawaban per butir.',
      tags: [TAG],
      auth: 'bearer',
      query: assessmentsQuery,
      example: { query: { limit: '10', type: 'phq9' } },
      responses: [
        {
          status: 200,
          description: 'Satu halaman hasil skrining.',
          schema: z.array(assessmentItemSchema),
          paged: true,
        },
      ],
      handler: async ({ principal, query }) => {
        const page = await listAssessments(principal.supabase, principal.userId, query);
        return ok(page.items, { meta: { nextCursor: page.nextCursor } });
      },
    },
    deps,
  );

export const createCreateAssessmentRoute = (deps?: RouteDeps) =>
  defineRoute(
    {
      method: 'POST',
      path: '/api/v1/assessments',
      operationId: 'createAssessment',
      summary: 'Kirim jawaban skrining',
      description:
        'Mengirim jawaban MENTAH; server memvalidasi, menghitung skor dan kategori, menyimpan, lalu mengembalikan hasil, rekomendasi, dan penanda krisis. Skor dari klien tidak pernah diterima. Bila `crisis.detected` true, klien WAJIB menampilkan `crisis.resource` kepada pengguna. Dibatasi 12 skrining per jam per akun.',
      tags: [TAG],
      auth: 'bearer',
      body: createAssessmentBody,
      example: {
        body: {
          type: 'phq9',
          answers: {
            phq9_1: 1,
            phq9_2: 1,
            phq9_3: 0,
            phq9_4: 2,
            phq9_5: 1,
            phq9_6: 0,
            phq9_7: 1,
            phq9_8: 0,
            phq9_9: 0,
          },
        },
      },
      responses: [
        { status: 201, description: 'Hasil skrining tersimpan.', schema: assessmentResultSchema },
      ],
      handler: async ({ principal, body }) =>
        created(await createAssessmentResult(principal.supabase, principal.userId, body)),
    },
    deps,
  );

export const createListMoodRoute = (deps?: RouteDeps) =>
  defineRoute(
    {
      method: 'GET',
      path: '/api/v1/mood-entries',
      operationId: 'listMoodEntries',
      summary: 'Riwayat catatan perasaan',
      tags: [TAG],
      auth: 'bearer',
      query: entriesQuery,
      responses: [
        {
          status: 200,
          description: 'Satu halaman catatan perasaan.',
          schema: z.array(moodItemSchema),
          paged: true,
        },
      ],
      handler: async ({ principal, query }) => {
        const page = await listMood(principal.supabase, principal.userId, query);
        return ok(page.items, { meta: { nextCursor: page.nextCursor } });
      },
    },
    deps,
  );

export const createCreateMoodRoute = (deps?: RouteDeps) =>
  defineRoute(
    {
      method: 'POST',
      path: '/api/v1/mood-entries',
      operationId: 'createMoodEntry',
      summary: 'Catat perasaan',
      tags: [TAG],
      auth: 'bearer',
      body: createMoodBody,
      example: {
        body: {
          moodType: 'cemas',
          energyLevel: 2,
          triggers: ['Pekerjaan'],
          note: 'Tenggat menumpuk.',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Catatan tersimpan.',
          schema: z.object({ id: z.uuid(), createdAt: z.string() }),
        },
      ],
      handler: async ({ principal, body }) =>
        created(await createMood(principal.supabase, principal.userId, body)),
    },
    deps,
  );

export const createListSleepRoute = (deps?: RouteDeps) =>
  defineRoute(
    {
      method: 'GET',
      path: '/api/v1/sleep-entries',
      operationId: 'listSleepEntries',
      summary: 'Riwayat catatan tidur',
      tags: [TAG],
      auth: 'bearer',
      query: entriesQuery,
      responses: [
        {
          status: 200,
          description: 'Satu halaman catatan tidur.',
          schema: z.array(sleepItemSchema),
          paged: true,
        },
      ],
      handler: async ({ principal, query }) => {
        const page = await listSleep(principal.supabase, principal.userId, query);
        return ok(page.items, { meta: { nextCursor: page.nextCursor } });
      },
    },
    deps,
  );

export const createCreateSleepRoute = (deps?: RouteDeps) =>
  defineRoute(
    {
      method: 'POST',
      path: '/api/v1/sleep-entries',
      operationId: 'createSleepEntry',
      summary: 'Catat tidur',
      description:
        'Jam dipahami sebagai WIB. Jam tidur yang lebih larut dari jam bangun berarti malam sebelumnya.',
      tags: [TAG],
      auth: 'bearer',
      body: createSleepBody,
      example: {
        body: { wakeDate: '2026-10-13', bedtime: '22:30', wakeTime: '06:00', quality: 4 },
      },
      responses: [
        { status: 201, description: 'Catatan tersimpan.', schema: z.object({ id: z.uuid() }) },
      ],
      handler: async ({ principal, body }) =>
        created(await createSleep(principal.supabase, principal.userId, body)),
    },
    deps,
  );

export const createWeeklyInsightRoute = (deps?: RouteDeps) =>
  defineRoute(
    {
      method: 'GET',
      path: '/api/v1/insights/weekly',
      operationId: 'getWeeklyInsight',
      summary: 'Ringkasan 7 hari terakhir',
      description:
        'Tren mood dan tidur, streak, pola, dan saran. Aturan perhitungannya sama dengan beranda web dan aplikasi mobile.',
      tags: [TAG],
      auth: 'bearer',
      responses: [{ status: 200, description: 'Ringkasan mingguan.', schema: weeklyInsightSchema }],
      handler: async ({ principal }) =>
        ok(await loadWeeklyInsight(principal.supabase, principal.userId)),
    },
    deps,
  );
