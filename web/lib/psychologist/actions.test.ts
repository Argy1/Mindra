// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialFormState } from '@/lib/auth/form-state';
import { createFakeSupabase, type FakeSupabaseOptions } from '@/tests/helpers/fake-supabase';

const state = vi.hoisted(() => ({
  supabase: null as ReturnType<typeof createFakeSupabase> | null,
  session: { status: 'ok', profile: { id: 'psy-1', role: 'psychologist' } } as unknown,
  auditFailure: false,
}));
const revalidatePath = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: (path: string) => revalidatePath(path) }));
vi.mock('@/lib/env/public', () => ({ readPublicEnv: () => ({ ok: true }) }));
vi.mock('@/lib/auth/session', () => ({ getSessionState: async () => state.session }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.supabase!.client }));
vi.mock('@/lib/server/audit', () => {
  class AuditError extends Error {}
  return {
    AuditError,
    auditAccess: async (subject: string, resource: string, action = 'read') => {
      state.supabase!.log.push(`audit:${resource}:${action}:${subject}`);
      if (state.auditFailure) throw new AuditError();
    },
  };
});

import { acknowledgeAlertAction, saveSessionNoteAction } from './actions';

const ALERT = '11111111-1111-4111-8111-111111111111';
const PATIENT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CONSULTATION = '22222222-2222-4222-8222-222222222222';

function setup(options: FakeSupabaseOptions = {}) {
  state.supabase = createFakeSupabase(options);
  return state.supabase;
}

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  state.session = { status: 'ok', profile: { id: 'psy-1', role: 'psychologist' } };
  state.auditFailure = false;
  state.supabase = null;
});

describe('acknowledgeAlertAction', () => {
  const openAlert = { user_id: PATIENT, status: 'open' };

  it('id bukan UUID: ditolak tanpa menyentuh database', async () => {
    const fake = setup();
    const result = await acknowledgeAlertAction(initialFormState, form({ id: 'x' }));
    expect(result.status).toBe('error');
    expect(fake.queries).toEqual([]);
  });

  it.each([
    ['pengguna biasa', { status: 'ok', profile: { id: 'u', role: 'user' } }],
    ['pendamping', { status: 'ok', profile: { id: 'c', role: 'caregiver' } }],
    ['belum masuk', { status: 'signed-out' }],
  ])('%s tidak boleh menandai peringatan', async (_name, session) => {
    const fake = setup({ tables: { crisis_alerts: [openAlert] } });
    state.session = session;
    const result = await acknowledgeAlertAction(initialFormState, form({ id: ALERT }));
    expect(result.status).toBe('error');
    expect(fake.queries).toEqual([]);
  });

  it('peringatan yang tidak terlihat (RLS: klien mencabut akses atau bukan kliennya): galat izin', async () => {
    const fake = setup({ tables: { crisis_alerts: [] } });
    const result = await acknowledgeAlertAction(initialFormState, form({ id: ALERT }));
    expect(result).toMatchObject({
      status: 'error',
      message: expect.stringContaining('tidak punya izin'),
    });
    expect(fake.writes()).toEqual([]);
  });

  it('mencatat akses (acknowledge) SEBELUM mengubah status, lalu hanya mengubah kolom status', async () => {
    const fake = setup({
      tables: { crisis_alerts: [openAlert] },
      results: { 'crisis_alerts:update': { data: [{ id: ALERT }], error: null } },
    });
    const result = await acknowledgeAlertAction(initialFormState, form({ id: ALERT }));

    expect(result.status).toBe('success');
    const auditAt = fake.log.indexOf(`audit:crisis_alerts:acknowledge:${PATIENT}`);
    expect(auditAt).toBeGreaterThanOrEqual(0);
    const updateAt = fake.log.lastIndexOf('from:crisis_alerts');
    expect(auditAt).toBeLessThan(updateAt);

    const [update] = fake.writes();
    expect(update!.payload).toEqual({ status: 'resolved' });
    // Hanya peringatan yang masih terbuka yang diubah (tidak menimpa status lain).
    expect(update!.filters).toEqual(
      expect.arrayContaining([
        { op: 'eq', column: 'id', value: ALERT },
        { op: 'eq', column: 'status', value: 'open' },
      ]),
    );
    expect(revalidatePath).toHaveBeenCalledWith('/psikolog');
  });

  it('gagal mencatat akses: status TIDAK diubah', async () => {
    const fake = setup({ tables: { crisis_alerts: [openAlert] } });
    state.auditFailure = true;
    const result = await acknowledgeAlertAction(initialFormState, form({ id: ALERT }));
    expect(result.status).toBe('error');
    expect(fake.writes()).toEqual([]);
  });

  it('peringatan yang sudah ditangani: sukses tanpa menulis ulang dan tanpa catatan akses baru', async () => {
    const fake = setup({ tables: { crisis_alerts: [{ user_id: PATIENT, status: 'resolved' }] } });
    const result = await acknowledgeAlertAction(initialFormState, form({ id: ALERT }));
    expect(result.status).toBe('success');
    expect(fake.writes()).toEqual([]);
    expect(fake.log.some((entry) => entry.startsWith('audit:'))).toBe(false);
  });

  it('tidak ada baris yang berubah (balapan dengan sesi lain): galat, bukan sukses semu', async () => {
    setup({
      tables: { crisis_alerts: [openAlert] },
      results: { 'crisis_alerts:update': { data: [], error: null } },
    });
    expect((await acknowledgeAlertAction(initialFormState, form({ id: ALERT }))).status).toBe(
      'error',
    );
  });
});

describe('saveSessionNoteAction', () => {
  const valid = {
    consultationId: CONSULTATION,
    summary: 'Klien lebih tenang.',
    notesForPatient: '',
  };

  it('hanya dua kolom catatan yang dikirim ke database', async () => {
    const fake = setup({
      results: { 'consultations:update': { data: [{ id: CONSULTATION }], error: null } },
    });
    const result = await saveSessionNoteAction(
      initialFormState,
      form({ ...valid, notesForPatient: '  Latihan napas.  ' }),
    );

    expect(result).toMatchObject({ status: 'success' });
    const [update] = fake.writes();
    expect(update!.table).toBe('consultations');
    expect(update!.payload).toEqual({
      session_summary: 'Klien lebih tenang.',
      notes_for_patient: 'Latihan napas.',
    });
    expect(update!.filters).toEqual([{ op: 'eq', column: 'id', value: CONSULTATION }]);
  });

  it.each([
    ['sesi bukan UUID', { ...valid, consultationId: 'x' }, 'consultationId'],
    ['catatan terlalu panjang', { ...valid, summary: 'a'.repeat(5001) }, 'summary'],
    [
      'catatan klien terlalu panjang',
      { ...valid, notesForPatient: 'a'.repeat(2001) },
      'notesForPatient',
    ],
  ])(
    '%s: galat di kolomnya, nilai yang diketik dikembalikan, database tidak disentuh',
    async (_n, fields, key) => {
      const fake = setup();
      const result = await saveSessionNoteAction(initialFormState, form(fields));
      expect(result.status).toBe('error');
      expect(result.fieldErrors?.[key]).toBeTruthy();
      expect(result.values?.summary).toBe(fields.summary);
      expect(fake.queries).toEqual([]);
    },
  );

  it('kolom di luar catatan yang dikirim lewat formulir diabaikan (tidak diteruskan ke database)', async () => {
    const fake = setup({
      results: { 'consultations:update': { data: [{ id: CONSULTATION }], error: null } },
    });
    await saveSessionNoteAction(
      initialFormState,
      form({ ...valid, status: 'completed', user_id: PATIENT, scheduled_at: '2020-01-01' }),
    );
    expect(Object.keys(fake.writes()[0]!.payload as object).sort()).toEqual([
      'notes_for_patient',
      'session_summary',
    ]);
  });

  it('sesi yang bukan milik klien psikolog ini (RLS menolak): galat izin', async () => {
    setup({ results: { 'consultations:update': { data: [], error: null } } });
    const result = await saveSessionNoteAction(initialFormState, form(valid));
    expect(result).toMatchObject({
      status: 'error',
      message: expect.stringContaining('tidak punya izin'),
    });
  });

  it('bukan psikolog: ditolak', async () => {
    const fake = setup();
    state.session = { status: 'ok', profile: { id: 'u', role: 'user' } };
    expect((await saveSessionNoteAction(initialFormState, form(valid))).status).toBe('error');
    expect(fake.queries).toEqual([]);
  });
});
