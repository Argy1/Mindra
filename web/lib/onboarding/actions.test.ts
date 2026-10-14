// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialFormState } from '@/lib/auth/form-state';

const state = vi.hoisted(() => ({
  session: { status: 'ok', profile: { id: 'user-1', role: 'user' } } as unknown,
  envOk: true,
  metadata: { full_name: 'Rina', terms_version: '1.1.0' } as Record<string, unknown>,
  getUserError: null as null | { message: string },
  user: true,
  updateError: null as null | { message: string },
  throwOnUpdate: false,
  updates: [] as unknown[],
}));
const revalidatePath = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: (path: string) => revalidatePath(path) }));
vi.mock('@/lib/env/public', () => ({ readPublicEnv: () => ({ ok: state.envOk }) }));
vi.mock('@/lib/auth/session', () => ({ getSessionState: async () => state.session }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: state.user ? { id: 'user-1', user_metadata: state.metadata } : null },
        error: state.getUserError,
      }),
      updateUser: async (attributes: unknown) => {
        if (state.throwOnUpdate) throw new Error('jaringan');
        state.updates.push(attributes);
        return { error: state.updateError };
      },
    },
  }),
}));

import { dismissOnboardingAction } from './actions';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  state.session = { status: 'ok', profile: { id: 'user-1', role: 'user' } };
  state.envOk = true;
  state.metadata = { full_name: 'Rina', terms_version: '1.1.0' };
  state.getUserError = null;
  state.user = true;
  state.updateError = null;
  state.throwOnUpdate = false;
  state.updates = [];
});

const run = () => dismissOnboardingAction(initialFormState, new FormData());

describe('dismissOnboardingAction', () => {
  it('menulis penanda waktu, mempertahankan metadata yang ada, dan menyegarkan beranda', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T10:00:00.000Z'));
    const result = await run();

    expect(result).toEqual({ status: 'success' });
    expect(state.updates).toEqual([
      {
        data: {
          full_name: 'Rina',
          terms_version: '1.1.0',
          onboarding_done_at: '2026-10-14T10:00:00.000Z',
        },
      },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith('/beranda');
  });

  it('metadata kosong tetap berhasil', async () => {
    state.metadata = {};
    expect((await run()).status).toBe('success');
    expect(Object.keys((state.updates[0] as { data: object }).data)).toEqual([
      'onboarding_done_at',
    ]);
  });

  it.each([
    ['tanpa sesi', () => (state.session = { status: 'signed-out' })],
    ['profil hilang', () => (state.session = { status: 'no-profile' })],
    ['env belum diisi', () => (state.envOk = false)],
  ])('%s: ditolak tanpa menyentuh akun', async (_name, mutate) => {
    mutate();
    const result = await run();
    expect(result.status).toBe('error');
    expect(state.updates).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each(['psychologist', 'caregiver', 'facility_admin', 'admin'])(
    'peran %s: panduan khusus pengguna, tidak ada yang ditulis',
    async (role) => {
      state.session = { status: 'ok', profile: { id: 'x', role } };
      const result = await run();
      expect(result).toEqual({
        status: 'error',
        message: 'Panduan ini hanya untuk akun pengguna.',
      });
      expect(state.updates).toEqual([]);
    },
  );

  it('akun tidak terbaca (sesi Auth berakhir): pesan sesi, tidak ada tulisan', async () => {
    state.user = false;
    const result = await run();
    expect(result.status).toBe('error');
    expect(result.message).toContain('Sesimu sudah berakhir');
    expect(state.updates).toEqual([]);
  });

  it('galat membaca akun: pesan sesi', async () => {
    state.getUserError = { message: 'jwt expired' };
    const result = await run();
    expect(result.message).toContain('Sesimu sudah berakhir');
    expect(state.updates).toEqual([]);
  });

  it('galat menulis: pesan umum (bukan pesan asli) dan beranda tidak disegarkan', async () => {
    state.updateError = { message: 'relation x does not exist' };
    const result = await run();
    expect(result.status).toBe('error');
    expect(result.message).not.toContain('relation');
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('jaringan putus saat menulis: pesan jaringan', async () => {
    state.throwOnUpdate = true;
    const result = await run();
    expect(result.status).toBe('error');
    expect(result.message).toMatch(/koneksi|jaringan|internet/i);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
