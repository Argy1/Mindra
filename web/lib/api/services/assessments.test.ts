// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createFakeSupabase } from '@/tests/helpers/fake-supabase';
import { decodeCursor, encodeCursor } from '@/lib/api/cursor';
import { ApiError } from '@/lib/api/errors';
import {
  createAssessmentResult,
  DISCLAIMER,
  listAssessmentRows,
  listAssessments,
  toAssessmentItem,
} from './assessments';

const USER = '11111111-1111-4111-8111-111111111111';
const NOW = Date.parse('2026-10-13T03:00:00Z');

const asClient = (fake: ReturnType<typeof createFakeSupabase>) => fake.client as never;

/** PHQ-9 lengkap dengan semua jawaban `value`, butir 9 diganti `item9`. */
const phq9 = (value: number, item9 = value) => ({
  type: 'phq9' as const,
  answers: Object.fromEntries(
    Array.from({ length: 9 }, (_, i) => [`phq9_${i + 1}`, i === 8 ? item9 : value]),
  ),
});

const insertOk = { data: [{ id: '22222222-2222-4222-8222-222222222222' }], error: null };

describe('createAssessmentResult', () => {
  it('menyimpan atas nama pemilik token, skor dihitung SERVER, dan mengembalikan hasil lengkap', async () => {
    const fake = createFakeSupabase({ results: { 'assessments:insert': insertOk } });
    const result = await createAssessmentResult(asClient(fake), USER, phq9(2, 0), NOW);

    const [insert] = fake.writes();
    expect(insert!.table).toBe('assessments');
    expect(insert!.payload).toMatchObject({
      user_id: USER,
      type: 'phq9',
      total_score: 16,
      category: 'severe',
      sent_to_satusehat: false,
    });
    expect(result).toMatchObject({
      id: '22222222-2222-4222-8222-222222222222',
      type: 'phq9',
      totalScore: 16,
      maxScore: 27,
      category: 'severe',
      completedAt: '2026-10-13T03:00:00.000Z',
      disclaimer: DISCLAIMER,
    });
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(DISCLAIMER).toMatch(/bukan diagnosis/);
  });

  it('PHQ-9 butir 9 > 0: krisis terdeteksi dan layanan krisis WAJIB ikut dikembalikan', async () => {
    const fake = createFakeSupabase({ results: { 'assessments:insert': insertOk } });
    const result = await createAssessmentResult(asClient(fake), USER, phq9(0, 1), NOW);
    expect(result.crisis.detected).toBe(true);
    expect(result.crisis.resource).toMatchObject({
      name: 'Healing119.id',
      telHref: expect.stringMatching(/^tel:/),
    });
  });

  it('tanpa butir krisis: tidak ada layanan krisis yang dipaksakan', async () => {
    const fake = createFakeSupabase({ results: { 'assessments:insert': insertOk } });
    const result = await createAssessmentResult(asClient(fake), USER, phq9(1, 0), NOW);
    expect(result.crisis).toEqual({ detected: false, resource: null });
  });

  it('SRQ-20 butir 17 = ya terdeteksi sebagai krisis', async () => {
    const fake = createFakeSupabase({ results: { 'assessments:insert': insertOk } });
    const answers = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`srq20_${i + 1}`, i === 16 ? 1 : 0]),
    );
    const result = await createAssessmentResult(
      asClient(fake),
      USER,
      { type: 'srq20', answers },
      NOW,
    );
    expect(result.crisis.detected).toBe(true);
  });

  it.each([
    ['jawaban kurang', { type: 'phq9' as const, answers: { phq9_1: 1 } }],
    [
      'kunci butir tidak dikenal',
      { type: 'phq9' as const, answers: { ...phq9(1).answers, phq9_99: 1 } },
    ],
    ['nilai di luar opsi', phq9(7)],
    ['nilai pecahan', { type: 'phq9' as const, answers: { ...phq9(1).answers, phq9_1: 1.5 } }],
    [
      'butir instrumen lain',
      {
        type: 'phq9' as const,
        answers: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`gad7_${i + 1}`, 1])),
      },
    ],
  ])('422 untuk %s, tanpa menyentuh database', async (_name, body) => {
    const fake = createFakeSupabase();
    const error = await createAssessmentResult(asClient(fake), USER, body, NOW).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.issues[0].path).toBe('answers');
    expect(fake.queries).toEqual([]);
  });

  it('batas 12 skrining per jam: 429 dengan Retry-After, tanpa menyimpan', async () => {
    const fake = createFakeSupabase({
      tables: { assessments: Array.from({ length: 12 }, (_, i) => ({ id: `a${i}` })) },
    });
    const error = await createAssessmentResult(asClient(fake), USER, phq9(1), NOW).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(429);
    expect(error.headers['Retry-After']).toBe('3600');
    expect(fake.writes()).toEqual([]);
    // Hitungan dibatasi pada pengguna ini.
    expect(fake.queriesTo('assessments')[0]!.filters).toContainEqual({
      op: 'eq',
      column: 'user_id',
      value: USER,
    });
  });

  it('galat database menjadi 500 generik', async () => {
    const fake = createFakeSupabase({
      results: {
        'assessments:insert': { data: null, error: { message: 'relation "x" tidak ada' } },
      },
    });
    const error = await createAssessmentResult(asClient(fake), USER, phq9(1), NOW).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(500);
    expect(error.message).not.toMatch(/relation/);
  });

  it('skor, kategori, atau user_id kiriman klien DITOLAK (bukan diabaikan), tanpa menyentuh database', async () => {
    for (const extra of [{ total_score: 27 }, { category: 'severe' }, { user_id: 'orang-lain' }]) {
      const fake = createFakeSupabase({ results: { 'assessments:insert': insertOk } });
      const body = { ...phq9(0, 0), ...extra } as never;
      const error = await createAssessmentResult(asClient(fake), USER, body, NOW).catch((e) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(422);
      expect(fake.queries).toEqual([]);
    }
  });
});

describe('listAssessmentRows', () => {
  const row = (n: number) => ({
    id: `${n}${n}111111-1111-4111-8111-111111111111`,
    type: 'phq9',
    total_score: n,
    category: 'mild',
    completed_at: `2026-10-13T08:30:0${n}.123456+00:00`,
  });

  it('SELALU dibatasi user_id token (token psikolog/pendamping tidak boleh tersasar ke data klien)', async () => {
    const fake = createFakeSupabase({ tables: { assessments: [] } });
    await listAssessmentRows(asClient(fake), USER, { limit: 20 });
    expect(fake.queries[0]!.filters).toContainEqual({ op: 'eq', column: 'user_id', value: USER });
  });

  it('urutan (waktu, id) menurun dan meminta limit+1 baris', async () => {
    const fake = createFakeSupabase({ tables: { assessments: [] } });
    await listAssessmentRows(asClient(fake), USER, { limit: 7 });
    expect(fake.queries[0]!.orders).toEqual([
      { column: 'completed_at', ascending: false },
      { column: 'id', ascending: false },
    ]);
    expect(fake.queries[0]!.limit).toBe(8);
  });

  it('kursor menambahkan filter keyset; filter jenis hanya bila diminta', async () => {
    const fake = createFakeSupabase({ tables: { assessments: [] } });
    const cursor = encodeCursor({ t: '2026-10-13T08:30:00.123456+00:00', id: USER });
    await listAssessmentRows(asClient(fake), USER, { limit: 5, cursor, type: 'gad7' });
    const filters = fake.queries[0]!.filters;
    expect(filters).toContainEqual({ op: 'eq', column: 'type', value: 'gad7' });
    expect(filters.find((f) => f.op === 'or')?.value).toBe(
      `completed_at.lt.2026-10-13T08:30:00.123456+00:00,and(completed_at.eq.2026-10-13T08:30:00.123456+00:00,id.lt.${USER})`,
    );
  });

  it('kursor rusak → 422 sebelum kueri apa pun', async () => {
    const fake = createFakeSupabase();
    const error = await listAssessmentRows(asClient(fake), USER, {
      limit: 5,
      cursor: 'salah!!',
    }).catch((e) => e);
    expect(error.status).toBe(422);
    expect(fake.queries).toEqual([]);
  });

  it('nextCursor menunjuk baris terakhir yang ditampilkan, hanya bila masih ada baris', async () => {
    const rows = [1, 2, 3].map(row);
    const fake = createFakeSupabase({ tables: { assessments: rows } });
    const page = await listAssessmentRows(asClient(fake), USER, { limit: 2 });
    expect(page.rows).toHaveLength(2);
    expect(decodeCursor(page.nextCursor!)).toEqual({ t: rows[1]!.completed_at, id: rows[1]!.id });

    const last = await listAssessmentRows(asClient(fake), USER, { limit: 3 });
    expect(last.nextCursor).toBeNull();
  });

  it('galat database → 500 generik', async () => {
    const fake = createFakeSupabase({ failTables: ['assessments'] });
    expect(
      (await listAssessmentRows(asClient(fake), USER, { limit: 5 }).catch((e) => e)).status,
    ).toBe(500);
  });
});

describe('listAssessments / toAssessmentItem', () => {
  it('baris dengan jenis tak dikenal dilewati; kategori tak valid dianggap minimal; tanpa jawaban per butir', async () => {
    const fake = createFakeSupabase({
      tables: {
        assessments: [
          {
            id: 'a',
            type: 'phq9',
            total_score: 4,
            category: null,
            completed_at: '2026-10-13T01:00:00.000000+00:00',
            answers: [{ question_id: 'phq9_1', score: 3 }],
          },
          {
            id: 'b',
            type: 'dass21',
            total_score: 40,
            category: 'severe',
            completed_at: '2026-10-12T01:00:00.000000+00:00',
          },
        ],
      },
    });
    const page = await listAssessments(asClient(fake), USER, { limit: 10 });
    expect(page.items).toEqual([
      {
        id: 'a',
        type: 'phq9',
        totalScore: 4,
        category: 'minimal',
        completedAt: '2026-10-13T01:00:00.000000+00:00',
      },
    ]);
    expect(JSON.stringify(page)).not.toMatch(/question_id|answers/);
    expect(
      toAssessmentItem({
        id: 'x',
        type: 'nope',
        total_score: 1,
        category: 'mild',
        completed_at: 't',
      }),
    ).toBeNull();
  });
});
