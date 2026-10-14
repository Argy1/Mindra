// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import type { FhirObservation } from '@/lib/domain/fhir/observation';
import { createFakeSupabase } from '@/tests/helpers/fake-supabase';
import type { CreateObservationResult, SatusehatClient } from './satusehat-client';
import { syncAssessmentsToSatusehat, type SyncStore } from './satusehat-sync';

const USER = '11111111-1111-4111-8111-111111111111';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const NOW = new Date('2026-10-13T03:00:00Z');

const assessmentRow = (id: string, type = 'phq9') => ({
  id,
  type,
  total_score: 12,
  category: 'moderate',
  completed_at: '2026-10-13T01:00:00.000000+00:00',
});

function setup(
  options: {
    consent?: boolean | null;
    assessments?: unknown[];
    synced?: Array<[string, string]>;
    results?: CreateObservationResult[];
    mode?: 'mock' | 'staging';
  } = {},
) {
  const supabase = createFakeSupabase({
    tables: {
      profiles: options.consent === null ? [] : [{ satusehat_consent: options.consent ?? true }],
      assessments: options.assessments ?? [assessmentRow(A)],
    },
  });
  const posted: FhirObservation[] = [];
  const queue = [...(options.results ?? [])];
  const client: SatusehatClient = {
    mode: options.mode ?? 'mock',
    organizationId: options.mode === 'staging' ? 'org-1' : undefined,
    createObservation: vi.fn(async (observation: FhirObservation) => {
      posted.push(observation);
      return queue.shift() ?? { ok: true as const, id: `mock-${posted.length}` };
    }),
  };
  const store: SyncStore = {
    findSynced: vi.fn(async () => new Map(options.synced ?? [])),
    recordSynced: vi.fn(async () => undefined),
    recordFailure: vi.fn(async () => undefined),
  };
  const run = (ids: string[]) =>
    syncAssessmentsToSatusehat({
      supabase: supabase.client as never,
      userId: USER,
      assessmentIds: ids,
      client,
      store,
      now: NOW,
    });
  return { supabase, client, store, posted, run };
}

describe('persetujuan', () => {
  it.each([
    ['dimatikan', false],
    ['profil tidak terbaca', null],
  ])(
    'persetujuan %s → 403 dan TIDAK ADA yang dikirim, dibaca, atau dicatat',
    async (_name, consent) => {
      const kit = setup({ consent });
      const error = await kit.run([A]).catch((e) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(403);
      expect(error.message).toMatch(/Privasi dan izin/);
      expect(kit.client.createObservation).not.toHaveBeenCalled();
      expect(kit.store.findSynced).not.toHaveBeenCalled();
      expect(kit.store.recordSynced).not.toHaveBeenCalled();
      expect(kit.supabase.tablesQueried()).toEqual(['profiles']);
    },
  );

  it('persetujuan dibaca dari profil pemanggil', async () => {
    const kit = setup();
    await kit.run([A]);
    const profileQuery = kit.supabase.queriesTo('profiles')[0]!;
    expect(profileQuery.filters).toContainEqual({ op: 'eq', column: 'id', value: USER });
  });
});

describe('pengiriman', () => {
  it('hanya yang dipilih, milik pemanggil: kueri dibatasi user_id dan daftar id', async () => {
    const kit = setup();
    await kit.run([A]);
    const query = kit.supabase.queriesTo('assessments')[0]!;
    expect(query.filters).toContainEqual({ op: 'eq', column: 'user_id', value: USER });
    expect(query.filters).toContainEqual({ op: 'in', column: 'id', value: [A] });
  });

  it('berhasil: Observation mode create (tanpa id), pasien pseudonim, tanpa jawaban; log tercatat', async () => {
    const kit = setup();
    const results = await kit.run([A]);
    expect(results).toEqual([
      { assessmentId: A, status: 'synced', satusehatId: 'mock-1', message: null },
    ]);

    const [observation] = kit.posted;
    expect('id' in observation!).toBe(false);
    expect(observation!.subject.reference).toBe(`Patient/mock-${USER.slice(0, 8)}`);
    expect(observation!.valueInteger).toBe(12);
    expect(observation!.issued).toBe('2026-10-13T03:00:00.000Z');
    expect(JSON.stringify(observation)).not.toMatch(/answers|"name"|email|nik/i);
    expect(kit.store.recordSynced).toHaveBeenCalledWith({
      userId: USER,
      assessmentId: A,
      satusehatId: 'mock-1',
    });
  });

  it('id ganda dikirim sekali; id yang bukan milik pemanggil tampil sebagai tidak ditemukan (tanpa membocorkan)', async () => {
    const kit = setup({ assessments: [assessmentRow(A)] });
    const results = await kit.run([A, A, B]);
    expect(results.map((r) => [r.assessmentId, r.status])).toEqual([
      [A, 'synced'],
      [B, 'not_found'],
    ]);
    expect(kit.client.createObservation).toHaveBeenCalledTimes(1);
  });

  it('jenis instrumen tak dikenal diperlakukan sebagai tidak ditemukan', async () => {
    const kit = setup({ assessments: [assessmentRow(A, 'dass21')] });
    expect((await kit.run([A]))[0]!.status).toBe('not_found');
    expect(kit.client.createObservation).not.toHaveBeenCalled();
  });

  it('yang sudah terkirim tidak dikirim ulang (idempoten)', async () => {
    const kit = setup({ synced: [[A, 'sat-9']] });
    const results = await kit.run([A]);
    expect(results).toEqual([
      { assessmentId: A, status: 'already_synced', satusehatId: 'sat-9', message: null },
    ]);
    expect(kit.client.createObservation).not.toHaveBeenCalled();
    expect(kit.store.recordSynced).not.toHaveBeenCalled();
  });
});

describe('kegagalan', () => {
  it('sementara (transient): dicatat dapat dicoba lagi dengan Retry-After, pesan tanpa isi respons', async () => {
    const kit = setup({
      results: [
        {
          ok: false,
          kind: 'transient',
          message: 'SATUSEHAT sedang membatasi permintaan.',
          retryAfterSeconds: 30,
        },
      ],
    });
    const [result] = await kit.run([A]);
    expect(result).toMatchObject({
      status: 'failed',
      message: 'SATUSEHAT sedang membatasi permintaan.',
    });
    expect(kit.store.recordFailure).toHaveBeenCalledWith({
      userId: USER,
      assessmentId: A,
      message: 'SATUSEHAT sedang membatasi permintaan.',
      retryable: true,
      retryAfterSeconds: 30,
    });
    expect(kit.store.recordSynced).not.toHaveBeenCalled();
  });

  it('validasi atau kredensial: dicatat TIDAK dapat dicoba lagi', async () => {
    for (const kind of ['validation', 'auth'] as const) {
      const kit = setup({ results: [{ ok: false, kind, message: 'ditolak' }] });
      await kit.run([A]);
      expect(kit.store.recordFailure).toHaveBeenCalledWith(
        expect.objectContaining({ retryable: false }),
      );
    }
  });

  it('satu gagal tidak menghentikan yang lain', async () => {
    const kit = setup({
      assessments: [assessmentRow(A), assessmentRow(B)],
      results: [
        { ok: false, kind: 'transient', message: 'gagal' },
        { ok: true, id: 'sat-2' },
      ],
    });
    const results = await kit.run([A, B]);
    expect(results.map((r) => r.status)).toEqual(['failed', 'synced']);
  });

  it('staging tanpa nomor IHS: tidak dikirim, dicatat gagal permanen dengan alasan yang jelas', async () => {
    const kit = setup({ mode: 'staging' });
    const [result] = await kit.run([A]);
    expect(result).toMatchObject({ status: 'failed' });
    expect(result!.message).toMatch(/IHS/);
    expect(kit.client.createObservation).not.toHaveBeenCalled();
    expect(kit.store.recordFailure).toHaveBeenCalledWith(
      expect.objectContaining({ retryable: false }),
    );
  });

  it('galat membaca profil atau asesmen → 500 generik', async () => {
    const failing = createFakeSupabase({ failTables: ['profiles'] });
    const kit = setup();
    const error = await syncAssessmentsToSatusehat({
      supabase: failing.client as never,
      userId: USER,
      assessmentIds: [A],
      client: kit.client,
      store: kit.store,
    }).catch((e) => e);
    expect(error.status).toBe(500);
  });
});
