// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialFormState } from '@/lib/auth/form-state';
import { createFakeSupabase, type FakeSupabaseOptions } from '@/tests/helpers/fake-supabase';

const state = vi.hoisted(() => ({
  supabase: null as ReturnType<typeof createFakeSupabase> | null,
  session: { status: 'ok', profile: { id: 'user-1', role: 'user' } } as unknown,
  envOk: true,
}));
const revalidatePath = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: (path: string) => revalidatePath(path) }));
vi.mock('@/lib/env/public', () => ({ readPublicEnv: () => ({ ok: state.envOk }) }));
vi.mock('@/lib/auth/session', () => ({ getSessionState: async () => state.session }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.supabase!.client }));

import {
  connectPsychologistAction,
  inviteCaregiverAction,
  revokeCaregiverAction,
  revokeCareLinkAction,
  setPermissionAction,
  setSatusehatConsentAction,
} from './actions';

const LINK = '11111111-1111-4111-8111-111111111111';
const PSY = '22222222-2222-4222-8222-222222222222';
const USER = 'user-1';

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
  state.session = { status: 'ok', profile: { id: USER, role: 'user' } };
  state.envOk = true;
  state.supabase = null;
});

describe('setPermissionAction', () => {
  it.each([
    ['bukan objek', 'teks'],
    [
      'kunci milik jenis lain',
      { kind: 'psychologist', id: LINK, key: 'mood_daily', enabled: true },
    ],
    ['id bukan UUID', { kind: 'caregiver', id: 'abc', key: 'mood_daily', enabled: true }],
    ['nilai bukan boolean', { kind: 'caregiver', id: LINK, key: 'mood_daily', enabled: 'true' }],
    [
      'kolom tambahan',
      { kind: 'caregiver', id: LINK, key: 'mood_daily', enabled: true, role: 'admin' },
    ],
  ])('menolak %s tanpa menyentuh database', async (_name, input) => {
    const fake = setup();
    const result = await setPermissionAction(input);
    expect(result.status).toBe('error');
    expect(fake.queries).toEqual([]);
  });

  it('tanpa sesi: ditolak dan database tidak disentuh', async () => {
    const fake = setup();
    state.session = { status: 'signed-out' };
    const result = await setPermissionAction({
      kind: 'caregiver',
      id: LINK,
      key: 'mood_daily',
      enabled: true,
    });
    expect(result).toMatchObject({ status: 'error' });
    expect(fake.queries).toEqual([]);
  });

  it('izin psikolog: dibaca dulu, lalu SELURUH objek ditulis ulang dan dinormalkan', async () => {
    const fake = setup({
      tables: {
        care_links: [
          // Kunci asing dan nilai aneh dari data lama: tidak boleh terbawa.
          { permissions: { assessments: true, mood: 'true', sleep: 1, hack: true } },
        ],
      },
    });
    const result = await setPermissionAction({
      kind: 'psychologist',
      id: LINK,
      key: 'sleep',
      enabled: true,
    });

    expect(result).toEqual({ status: 'ok' });
    const [update] = fake.writes();
    expect(update!.table).toBe('care_links');
    expect(update!.payload).toEqual({
      permissions: {
        assessments: true,
        mood: true,
        sleep: true,
        crisis_alerts: false,
        ai_summary: false,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith('/privasi');
  });

  it('selalu dibatasi pada milik pemanggil (patient_id) di pembacaan DAN penulisan', async () => {
    const fake = setup({ tables: { care_links: [{ permissions: {} }] } });
    await setPermissionAction({ kind: 'psychologist', id: LINK, key: 'mood', enabled: false });
    for (const query of fake.queries) {
      expect(query.filters, query.op).toContainEqual({
        op: 'eq',
        column: 'patient_id',
        value: USER,
      });
      expect(query.filters, query.op).toContainEqual({ op: 'eq', column: 'id', value: LINK });
    }
  });

  it('izin yang tidak ditemukan (bukan milik pemanggil atau sudah dicabut): galat tanpa menulis', async () => {
    const fake = setup({ tables: { care_links: [] } });
    const result = await setPermissionAction({
      kind: 'psychologist',
      id: LINK,
      key: 'mood',
      enabled: true,
    });
    expect(result).toEqual({
      status: 'error',
      message: 'Izin ini tidak ditemukan atau sudah dicabut.',
    });
    expect(fake.writes()).toEqual([]);
  });

  it('izin pendamping boleh diubah untuk undangan yang belum diterima (pending)', async () => {
    const fake = setup({
      tables: { caregiver_relationships: [{ permissions: { mood_daily: true } }] },
    });
    await setPermissionAction({
      kind: 'caregiver',
      id: LINK,
      key: 'assessment_results',
      enabled: true,
    });
    const select = fake.queries[0]!;
    expect(select.filters).toContainEqual({
      op: 'in',
      column: 'status',
      value: ['active', 'pending'],
    });
    expect(fake.writes()[0]!.payload).toEqual({
      permissions: {
        mood_daily: true,
        assessment_results: true,
        app_activity: false,
        emergency_alerts: false,
      },
    });
  });

  it('galat database tidak membocorkan pesan mentah', async () => {
    setup({ failTables: ['care_links'] });
    const result = await setPermissionAction({
      kind: 'psychologist',
      id: LINK,
      key: 'mood',
      enabled: true,
    });
    expect(result.status).toBe('error');
    expect(JSON.stringify(result)).not.toContain('gagal');
  });
});

describe('revokeCareLinkAction', () => {
  it('mencabut hanya tautan aktif milik pemanggil', async () => {
    const fake = setup({ results: { 'care_links:update': { data: [{ id: LINK }], error: null } } });
    const result = await revokeCareLinkAction(LINK);
    expect(result.status).toBe('ok');
    const [update] = fake.writes();
    expect(update!.payload).toEqual({ status: 'revoked' });
    expect(update!.filters).toEqual(
      expect.arrayContaining([
        { op: 'eq', column: 'id', value: LINK },
        { op: 'eq', column: 'patient_id', value: USER },
        { op: 'eq', column: 'status', value: 'active' },
      ]),
    );
  });

  it('tidak ada baris yang berubah: galat yang jelas, bukan sukses semu', async () => {
    setup({ results: { 'care_links:update': { data: [], error: null } } });
    expect(await revokeCareLinkAction(LINK)).toEqual({
      status: 'error',
      message: 'Izin ini tidak ditemukan atau sudah dicabut.',
    });
  });

  it('id bukan UUID ditolak tanpa menyentuh database', async () => {
    const fake = setup();
    expect((await revokeCareLinkAction('bukan-uuid')).status).toBe('error');
    expect(fake.queries).toEqual([]);
  });
});

describe('revokeCaregiverAction', () => {
  it('undangan yang belum diterima dihapus', async () => {
    const fake = setup({ tables: { caregiver_relationships: [{ status: 'pending' }] } });
    await revokeCaregiverAction(LINK);
    expect(fake.writes()[0]).toMatchObject({ table: 'caregiver_relationships', op: 'delete' });
  });

  it('pendamping aktif dicabut (riwayat tetap ada), bukan dihapus', async () => {
    const fake = setup({ tables: { caregiver_relationships: [{ status: 'active' }] } });
    await revokeCaregiverAction(LINK);
    expect(fake.writes()[0]).toMatchObject({ op: 'update', payload: { status: 'revoked' } });
    for (const query of fake.queries) {
      expect(query.filters).toContainEqual({ op: 'eq', column: 'patient_id', value: USER });
    }
  });

  it('hubungan yang bukan milik pemanggil: galat tanpa menulis', async () => {
    const fake = setup({ tables: { caregiver_relationships: [] } });
    expect((await revokeCaregiverAction(LINK)).status).toBe('error');
    expect(fake.writes()).toEqual([]);
  });
});

describe('connectPsychologistAction', () => {
  it('menghubungkan dengan izin awal: ringkasan teman cerita mati, status aktif, atas nama pemanggil', async () => {
    const fake = setup();
    const result = await connectPsychologistAction(PSY);
    expect(result.status).toBe('ok');
    expect(fake.writes()[0]).toMatchObject({
      table: 'care_links',
      op: 'insert',
      payload: {
        patient_id: USER,
        psychologist_id: PSY,
        status: 'active',
        permissions: {
          assessments: true,
          mood: true,
          sleep: true,
          crisis_alerts: true,
          ai_summary: false,
        },
      },
    });
  });

  it('pernah terhubung lalu dicabut (kode 23505): diaktifkan lagi dengan izin awal, bukan izin lama', async () => {
    const fake = setup({
      results: {
        'care_links:insert': { data: null, error: { message: 'dup', code: '23505' } },
        'care_links:update': { data: [{ id: LINK }], error: null },
      },
    });
    const result = await connectPsychologistAction(PSY);
    expect(result.status).toBe('ok');
    const update = fake.writes().find((query) => query.op === 'update');
    expect(update!.payload).toMatchObject({ status: 'active', permissions: { ai_summary: false } });
    expect(update!.filters).toContainEqual({ op: 'eq', column: 'status', value: 'revoked' });
  });

  it('sudah terhubung aktif: pesan yang jelas, tanpa mengubah izin yang ada', async () => {
    setup({
      results: {
        'care_links:insert': { data: null, error: { message: 'dup', code: '23505' } },
        'care_links:update': { data: [], error: null },
      },
    });
    expect(await connectPsychologistAction(PSY)).toEqual({
      status: 'error',
      message: 'Kamu sudah terhubung dengan psikolog ini.',
    });
  });

  it('ditolak RLS (42501): psikolog tidak tersedia', async () => {
    setup({
      results: { 'care_links:insert': { data: null, error: { message: 'rls', code: '42501' } } },
    });
    expect(await connectPsychologistAction(PSY)).toEqual({
      status: 'error',
      message: 'Psikolog ini tidak tersedia untuk dihubungkan.',
    });
  });
});

describe('inviteCaregiverAction', () => {
  it('nomor tidak valid: galat di kolom phone, tanpa menyentuh database, nilai diisi ulang', async () => {
    const fake = setup();
    const result = await inviteCaregiverAction(initialFormState, form({ phone: '123' }));
    expect(result.status).toBe('error');
    expect(result.fieldErrors?.phone).toMatch(/nomor ponsel/i);
    expect(result.values).toEqual({ phone: '123' });
    expect(fake.queries).toEqual([]);
  });

  it('berhasil: kode yang ditampilkan adalah kode dari DATABASE, bukan buatan klien', async () => {
    const fake = setup({
      results: {
        'caregiver_relationships:insert': { data: [{ invite_code: 'SERVER42' }], error: null },
      },
    });
    const result = await inviteCaregiverAction(initialFormState, form({ phone: '0812 3456 7890' }));

    expect(result.status).toBe('success');
    expect(result.values).toEqual({ inviteCode: 'SERVER42' });
    const [insert] = fake.writes();
    expect(insert!.payload).toMatchObject({
      patient_id: USER,
      caregiver_phone: '081234567890',
      status: 'pending',
      permissions: { mood_daily: true, assessment_results: false, emergency_alerts: true },
    });
  });

  it('kode pengisi tempat tidak pernah kode tetap', async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      const fake = setup({
        results: {
          'caregiver_relationships:insert': { data: [{ invite_code: 'X' }], error: null },
        },
      });
      await inviteCaregiverAction(initialFormState, form({ phone: '081234567890' }));
      codes.add(String((fake.writes()[0]!.payload as { invite_code: string }).invite_code));
    }
    expect(codes.size).toBe(20);
    expect([...codes]).not.toContain('PENDING00');
  });

  it('galat database: pesan umum, kode tidak ditampilkan', async () => {
    setup({
      results: {
        'caregiver_relationships:insert': { data: null, error: { message: 'boom' } },
      },
    });
    const result = await inviteCaregiverAction(initialFormState, form({ phone: '081234567890' }));
    expect(result.status).toBe('error');
    expect(result.values?.inviteCode).toBeUndefined();
  });
});

describe('setSatusehatConsentAction', () => {
  it('hanya menerima boolean sungguhan', async () => {
    const fake = setup();
    for (const bad of ['true', 1, null, undefined, {}]) {
      expect((await setSatusehatConsentAction(bad)).status).toBe('error');
    }
    expect(fake.queries).toEqual([]);
  });

  it('mengubah persetujuan HANYA di profil pemanggil', async () => {
    const fake = setup();
    const result = await setSatusehatConsentAction(true);
    expect(result.status).toBe('ok');
    expect(fake.writes()[0]).toMatchObject({
      table: 'profiles',
      op: 'update',
      payload: { satusehat_consent: true },
    });
    expect(fake.writes()[0]!.filters).toEqual([{ op: 'eq', column: 'id', value: USER }]);
  });

  it('pesan menjelaskan bahwa tidak ada yang dikirim otomatis', async () => {
    setup();
    const on = await setSatusehatConsentAction(true);
    expect(on).toMatchObject({ message: expect.stringContaining('Tidak ada yang dikirim') });
  });
});
