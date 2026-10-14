// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialFormState } from '@/lib/auth/form-state';
import { createFakeSupabase, type FakeSupabaseOptions } from '@/tests/helpers/fake-supabase';

const state = vi.hoisted(() => ({
  supabase: null as ReturnType<typeof createFakeSupabase> | null,
  session: { status: 'ok', profile: { id: 'cg-1', role: 'caregiver' } } as unknown,
}));
const revalidatePath = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: (path: string) => revalidatePath(path) }));
vi.mock('@/lib/env/public', () => ({ readPublicEnv: () => ({ ok: true }) }));
vi.mock('@/lib/auth/session', () => ({ getSessionState: async () => state.session }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.supabase!.client }));

import { acceptInviteAction } from './actions';

function setup(options: FakeSupabaseOptions = {}) {
  state.supabase = createFakeSupabase(options);
  return state.supabase;
}

const form = (code: string) => {
  const data = new FormData();
  data.append('code', code);
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  state.session = { status: 'ok', profile: { id: 'cg-1', role: 'caregiver' } };
  state.supabase = null;
});

describe('acceptInviteAction', () => {
  it('kode dinormalkan (huruf besar, tanpa spasi/strip) lalu dikirim HANYA lewat RPC accept_caregiver_invite', async () => {
    const fake = setup({ rpcs: { accept_caregiver_invite: { id: 'rel-1' } } });
    const result = await acceptInviteAction(initialFormState, form(' abcd-2345 '));

    expect(result.status).toBe('success');
    expect(fake.rpcCalls).toEqual([
      { name: 'accept_caregiver_invite', args: { p_code: 'ABCD2345' } },
    ]);
    // Tidak ada tulis langsung ke tabel hubungan (itulah celah F1 yang sudah ditutup).
    expect(fake.queries).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith('/pendamping');
  });

  it('kode bentuknya salah: galat di kolom, RPC tidak dipanggil (tidak membakar jatah percobaan)', async () => {
    const fake = setup();
    const result = await acceptInviteAction(initialFormState, form('ab'));
    expect(result.status).toBe('error');
    expect(result.fieldErrors?.code).toMatch(/8 huruf dan angka/);
    expect(fake.rpcCalls).toEqual([]);
  });

  it('kode salah, kedaluwarsa, atau undangan sendiri: SATU pesan yang sama (kode tidak bisa ditebak)', async () => {
    setup({ results: { 'rpc:accept_caregiver_invite': { data: null, error: null } } });
    const result = await acceptInviteAction(initialFormState, form('ZZZZ9999'));
    expect(result.status).toBe('error');
    expect(result.fieldErrors?.code).toBe(
      'Kode tidak valid atau sudah kedaluwarsa. Minta orang yang mengundangmu membuat undangan baru bila perlu.',
    );
  });

  it('pembatasan percobaan dari database ditampilkan apa adanya (sudah berbahasa Indonesia)', async () => {
    setup({
      results: {
        'rpc:accept_caregiver_invite': {
          data: null,
          error: { message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
        },
      },
    });
    const result = await acceptInviteAction(initialFormState, form('ZZZZ9999'));
    expect(result.message).toBe('Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
  });

  it('galat database lain tidak membocorkan pesan mentah', async () => {
    setup({
      results: {
        'rpc:accept_caregiver_invite': {
          data: null,
          error: { message: 'relation "x" does not exist' },
        },
      },
    });
    const result = await acceptInviteAction(initialFormState, form('ZZZZ9999'));
    expect(result.status).toBe('error');
    expect(JSON.stringify(result)).not.toContain('relation');
  });

  it.each([
    ['pengguna biasa', { status: 'ok', profile: { id: 'u', role: 'user' } }],
    ['psikolog', { status: 'ok', profile: { id: 'p', role: 'psychologist' } }],
    ['belum masuk', { status: 'signed-out' }],
  ])('%s tidak boleh menerima undangan pendamping', async (_name, session) => {
    const fake = setup();
    state.session = session;
    const result = await acceptInviteAction(initialFormState, form('ABCD2345'));
    expect(result.status).toBe('error');
    expect(fake.rpcCalls).toEqual([]);
  });

  it('kode yang diketik dikembalikan saat galat supaya tidak perlu mengetik ulang', async () => {
    setup({ results: { 'rpc:accept_caregiver_invite': { data: null, error: null } } });
    const result = await acceptInviteAction(initialFormState, form('zzzz 9999'));
    expect(result.values?.code).toBe('ZZZZ9999');
  });
});
