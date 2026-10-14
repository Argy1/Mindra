// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildCurl, flattenSchema, groupOperations } from './docs';
import { toJsonSchema } from './openapi';
import { API_ROUTES, currentOpenApiDocument } from './routes';
import { createAssessmentBody, createMoodBody } from './schemas';

describe('flattenSchema', () => {
  it('kolom objek: tipe, wajib, deskripsi, batasan', () => {
    const rows = flattenSchema(toJsonSchema(createMoodBody, 'input'));
    const byPath = Object.fromEntries(rows.map((row) => [row.path, row]));
    expect(byPath.moodType).toMatchObject({ type: 'string', required: true });
    expect(byPath.moodType!.constraints).toMatch(/salah satu: .*tenang/);
    expect(byPath.energyLevel).toMatchObject({ type: 'integer', required: false });
    expect(byPath.energyLevel!.constraints).toMatch(/min 1; maks 5; bawaan 3/);
    expect(byPath.note!.constraints).toMatch(/panjang maks 500/);
  });

  it('record (answers) dijelaskan sebagai jalur .* dan array pemicu sebagai kolom array', () => {
    const answers = flattenSchema(toJsonSchema(createAssessmentBody, 'input'));
    expect(answers.map((row) => row.path)).toEqual(
      expect.arrayContaining(['type', 'answers', 'answers.*']),
    );
    const moods = flattenSchema(toJsonSchema(createMoodBody, 'input'));
    expect(moods.find((row) => row.path === 'triggers')?.type).toBe('array');
  });

  it('kedalaman dibatasi supaya skema bersarang dalam tidak meledak', () => {
    let schema: Record<string, unknown> = { type: 'string' };
    for (let i = 0; i < 8; i += 1)
      schema = { type: 'object', properties: { anak: schema }, required: ['anak'] };
    const rows = flattenSchema(schema);
    expect(rows.length).toBeLessThanOrEqual(4);
  });
});

describe('buildCurl', () => {
  it('GET publik dengan query', () => {
    expect(
      buildCurl({
        baseUrl: 'https://m.id/',
        path: '/api/v1/instruments',
        method: 'GET',
        auth: 'public',
        query: { a: '1' },
      }),
    ).toBe("curl 'https://m.id/api/v1/instruments?a=1'");
  });

  it('Bearer memakai variabel lingkungan, BUKAN nilai token', () => {
    const curl = buildCurl({
      baseUrl: 'https://m.id',
      path: '/api/v1/assessments',
      method: 'GET',
      auth: 'bearer',
    });
    expect(curl).toContain('Authorization: Bearer $MINDRA_TOKEN');
    expect(curl).not.toMatch(/eyJ|aaaa\.bbbb/);
  });

  it('API key, parameter jalur, dan badan JSON dengan kutip tunggal yang aman', () => {
    const curl = buildCurl({
      baseUrl: 'https://m.id',
      path: '/api/v1/facilities/{id}/aggregates',
      method: 'POST',
      auth: 'apiKey',
      pathParams: { id: 'abc 123' },
      body: { catatan: "dia bilang 'halo'" },
    });
    expect(curl).toContain("-X POST 'https://m.id/api/v1/facilities/abc%20123/aggregates'");
    expect(curl).toContain('X-API-Key: $MINDRA_API_KEY');
    expect(curl).toContain(String.raw`'{"catatan":"dia bilang '\''halo'\''"}'`);
  });
});

describe('contoh curl untuk semua operasi dari dokumen nyata', () => {
  const doc = currentOpenApiDocument();
  it('setiap operasi menghasilkan curl tanpa rahasia dan tanpa "undefined"', () => {
    for (const route of API_ROUTES) {
      const curl = buildCurl({
        baseUrl: 'https://mindra.example',
        path: route.config.path,
        method: route.config.method,
        auth: route.config.auth,
        ...(route.config.example?.body !== undefined ? { body: route.config.example.body } : {}),
        ...(route.config.example?.query ? { query: route.config.example.query } : {}),
        ...(route.config.example?.path ? { pathParams: route.config.example.path } : {}),
      });
      expect(curl, route.config.path).toMatch(/^curl /);
      expect(curl, route.config.path).not.toMatch(/undefined|\{id\}/);
    }
    expect(doc.openapi).toBe('3.1.0');
  });
});

describe('groupOperations', () => {
  it('mengelompokkan per tag dan tidak kehilangan satu operasi pun', () => {
    const groups = groupOperations(currentOpenApiDocument());
    expect(groups.flatMap((g) => g.operations)).toHaveLength(API_ROUTES.length);
    expect(groups.map((g) => g.tag)).toContain('FHIR');
  });
});
