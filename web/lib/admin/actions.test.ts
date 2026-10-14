// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialFormState } from '@/lib/auth/form-state';
import { createFakeSupabase, type FakeSupabaseOptions } from '@/tests/helpers/fake-supabase';

const state = vi.hoisted(() => ({
  supabase: null as ReturnType<typeof createFakeSupabase> | null,
  session: { status: 'ok', profile: { id: 'admin-1', role: 'admin' } } as unknown,
  envOk: true,
  mfa: 'ok' as 'ok' | 'enroll' | 'challenge',
}));
const revalidatePath = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: (path: string) => revalidatePath(path) }));
vi.mock('@/lib/env/public', () => ({ readPublicEnv: () => ({ ok: state.envOk }) }));
vi.mock('@/lib/auth/session', () => ({ getSessionState: async () => state.session }));
vi.mock('@/lib/auth/mfa-server', () => ({ currentMfaDecision: async () => state.mfa }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.supabase!.client }));

import { reviewPsychologistAction } from './actions';

const PROFILE = '11111111-1111-4111-8111-111111111111';

function setup(options: FakeSupabaseOptions = {}) {
  state.supabase = createFakeSupabase(options);
  return state.supabase;
}

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
};

const approveFields = {
  decision: 'approve',
  profileId: PROFILE,
  fullName: 'Dr. Sinta Wulandari',
  title: '',
  strNumber: 'STR-12345',
  specializations: 'Kecemasan, Tidur',
  fee: '150000',
  verified: 'on',
  days: ['1', '3'],
  start: '09:00',
  end: '15:00',
};

beforeEach(() => {
  vi.clearAllMocks();
  state.session = { status: 'ok', profile: { id: 'admin-1', role: 'admin' } };
  state.envOk = true;
  state.mfa = 'ok';
  state.supabase = null;
});

describe('reviewPsychologistAction', () => {
  it('menyetujui: satu panggilan RPC dengan argumen yang sudah dinormalkan, lalu menyegarkan antrean', async () => {
    const fake = setup();
    const result = await reviewPsychologistAction(initialFormState, form(approveFields));

    expect(result.status).toBe('success');
    expect(result.message).toContain('keluar lalu masuk lagi');
    expect(fake.rpcCalls).toEqual([
      {
        name: 'admin_review_psychologist',
        args: {
          p_profile: PROFILE,
          p_decision: 'approve',
          p_full_name: 'Dr. Sinta Wulandari',
          p_title: 'M.Psi., Psikolog',
          p_str_number: 'STR-12345',
          p_specializations: ['Kecemasan', 'Tidur'],
          p_fee: 150000,
          p_verified: true,
          p_days: [1, 3],
          p_start: '09:00',
          p_end: '15:00',
        },
      },
    ]);
    expect(fake.queries).toEqual([]); // tidak ada penulisan langsung ke tabel
    expect(revalidatePath).toHaveBeenCalledWith('/admin');
  });

  it('tanpa hari praktik: jam tidak dikirim', async () => {
    const fake = setup();
    await reviewPsychologistAction(
      initialFormState,
      form({ ...approveFields, days: [], start: '', end: '' }),
    );
    const args = fake.rpcCalls[0]!.args as Record<string, unknown>;
    expect(args.p_days).toEqual([]);
    expect(args).not.toHaveProperty('p_start');
    expect(args).not.toHaveProperty('p_end');
  });

  it('menolak: hanya id dan keputusan yang dikirim', async () => {
    const fake = setup();
    const result = await reviewPsychologistAction(
      initialFormState,
      form({ decision: 'reject', profileId: PROFILE, fullName: 'abaikan', fee: '9' }),
    );
    expect(result.status).toBe('success');
    expect(result.message).toContain('ditolak');
    expect(fake.rpcCalls).toEqual([
      { name: 'admin_review_psychologist', args: { p_profile: PROFILE, p_decision: 'reject' } },
    ]);
  });

  it('masukan tidak valid: pesan per kolom dan database tidak disentuh', async () => {
    const fake = setup();
    const result = await reviewPsychologistAction(
      initialFormState,
      form({ ...approveFields, strNumber: '', fee: 'banyak' }),
    );
    expect(result.status).toBe('error');
    expect(result.fieldErrors).toMatchObject({
      strNumber: expect.any(String),
      fee: expect.any(String),
    });
    expect(fake.rpcCalls).toEqual([]);
  });

  it('setiap galat mengembalikan isian (React 19 mengosongkan kolom setelah aksi), hari sebagai daftar bertanda koma', async () => {
    setup();
    const invalid = await reviewPsychologistAction(
      initialFormState,
      form({ ...approveFields, strNumber: '', verified: 'on', days: ['2', '4'] }),
    );
    expect(invalid.values).toMatchObject({
      fullName: 'Dr. Sinta Wulandari',
      specializations: 'Kecemasan, Tidur',
      fee: '150000',
      verified: 'on',
      days: '2,4',
      start: '09:00',
      end: '15:00',
    });

    state.session = { status: 'signed-out' };
    const ended = await reviewPsychologistAction(initialFormState, form(approveFields));
    expect(ended.values?.fullName).toBe('Dr. Sinta Wulandari');
    expect(ended.values?.days).toBe('1,3');
  });

  it.each([
    ['tanpa sesi', () => (state.session = { status: 'signed-out' })],
    [
      'peran psikolog',
      () => (state.session = { status: 'ok', profile: { id: 'x', role: 'psychologist' } }),
    ],
    [
      'peran pengguna',
      () => (state.session = { status: 'ok', profile: { id: 'x', role: 'user' } }),
    ],
    ['env belum diisi', () => (state.envOk = false)],
  ])('ditolak untuk %s: database tidak disentuh', async (_name, mutate) => {
    const fake = setup();
    mutate();
    const result = await reviewPsychologistAction(initialFormState, form(approveFields));
    expect(result.status).toBe('error');
    expect(fake.rpcCalls).toEqual([]);
  });

  it.each(['enroll', 'challenge'] as const)(
    'admin yang belum aal2 (%s): ditolak sebelum RPC, dengan arahan verifikasi',
    async (mfa) => {
      const fake = setup();
      state.mfa = mfa;
      const result = await reviewPsychologistAction(initialFormState, form(approveFields));
      expect(result.status).toBe('error');
      expect(result.message).toContain('verifikasi dua langkah');
      expect(fake.rpcCalls).toEqual([]);
    },
  );

  it.each([
    ['not_pending', 'sudah diputuskan'],
    ['invalid_fee', 'Tarif'],
    ['invalid_schedule', 'Jadwal'],
  ])('token galat database %s dipetakan ke kalimat ramah', async (token, expected) => {
    setup({
      results: { 'rpc:admin_review_psychologist': { data: null, error: { message: token } } },
    });
    const result = await reviewPsychologistAction(initialFormState, form(approveFields));
    expect(result.status).toBe('error');
    expect(result.message).toContain(expected);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('galat dari database juga mengembalikan isian, dan kotak "terverifikasi" yang tidak dicentang tetap kosong', async () => {
    setup({
      results: {
        'rpc:admin_review_psychologist': { data: null, error: { message: 'invalid_fee' } },
      },
    });
    const { verified: _unchecked, ...withoutVerified } = approveFields;
    const result = await reviewPsychologistAction(initialFormState, form(withoutVerified));
    expect(result.status).toBe('error');
    expect(result.values).toMatchObject({
      fullName: 'Dr. Sinta Wulandari',
      strNumber: 'STR-12345',
      fee: '150000',
      days: '1,3',
      verified: '',
    });
  });

  it('42501 dari database (sesi tidak berwenang) dipetakan ke pesan sesi, bukan pesan mentah', async () => {
    setup({
      results: {
        'rpc:admin_review_psychologist': {
          data: null,
          error: { message: 'Tidak berwenang.', code: '42501' },
        },
      },
    });
    const result = await reviewPsychologistAction(initialFormState, form(approveFields));
    expect(result.message).toContain('verifikasi dua langkah');
  });

  it('galat tak dikenal: pesan umum tanpa membocorkan pesan asli', async () => {
    setup({
      results: {
        'rpc:admin_review_psychologist': {
          data: null,
          error: { message: 'relation x does not exist' },
        },
      },
    });
    const result = await reviewPsychologistAction(initialFormState, form(approveFields));
    expect(result.status).toBe('error');
    expect(result.message).not.toContain('relation');
  });
});
