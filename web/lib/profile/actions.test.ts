// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialFormState } from '@/lib/auth/form-state';
import { createFakeSupabase, type FakeSupabaseOptions } from '@/tests/helpers/fake-supabase';

const state = vi.hoisted(() => ({
  supabase: null as ReturnType<typeof createFakeSupabase> | null,
  session: {
    status: 'ok',
    profile: { id: 'user-1', email: 'rina@email.com', role: 'user' },
  } as unknown,
  envOk: true,
  signIn: null as null | ((credentials: { email: string; password: string }) => Promise<unknown>),
  signOut: null as null | (() => Promise<unknown>),
  order: [] as string[],
  verifier: null as null | { url: string; key: string; options: unknown },
}));
const revalidatePath = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: (path: string) => revalidatePath(path) }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock('@/lib/env/public', () => ({
  readPublicEnv: () => ({ ok: state.envOk }),
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'x'.repeat(40),
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  }),
}));
vi.mock('@/lib/auth/session', () => ({ getSessionState: async () => state.session }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    ...state.supabase!.client,
    auth: {
      signOut: async () => {
        state.order.push('signOut');
        return state.signOut ? state.signOut() : { error: null };
      },
    },
  }),
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: (url: string, key: string, options: unknown) => {
    state.verifier = { url, key, options };
    return {
      auth: {
        signInWithPassword: async (credentials: { email: string; password: string }) => {
          state.order.push('signIn');
          return state.signIn ? state.signIn(credentials) : { error: null };
        },
      },
    };
  },
}));

import { deleteAccountAction, updateFontSizeAction, updateProfileAction } from './actions';

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
  state.session = { status: 'ok', profile: { id: USER, email: 'rina@email.com', role: 'user' } };
  state.envOk = true;
  state.supabase = null;
  state.signIn = null;
  state.signOut = null;
  state.order = [];
  state.verifier = null;
});

describe('updateProfileAction', () => {
  const valid = {
    name: 'Rina Sari',
    city: 'Kota Bogor',
    province: 'jawa barat',
    shareRegionStats: 'on',
  };

  it('menyimpan hanya empat kolom milik profil, dengan provinsi kanonik, di baris pengguna sendiri', async () => {
    const fake = setup();
    const result = await updateProfileAction(initialFormState, form(valid));

    expect(result).toMatchObject({ status: 'success', message: 'Profilmu sudah diperbarui.' });
    const [update] = fake.writes();
    expect(update).toMatchObject({ table: 'profiles', op: 'update' });
    expect(update!.payload).toEqual({
      name: 'Rina Sari',
      city: 'Kota Bogor',
      domicile_province: 'Jawa Barat',
      share_region_stats: true,
    });
    expect(update!.filters).toEqual([{ op: 'eq', column: 'id', value: USER }]);
    expect(revalidatePath).toHaveBeenCalledWith('/profil');
    expect(revalidatePath).toHaveBeenCalledWith('/beranda');
  });

  it('kolom istimewa dari formulir (role, is_demo, requested_role) diabaikan: tidak pernah sampai ke tulisan', async () => {
    const fake = setup();
    await updateProfileAction(
      initialFormState,
      form({
        ...valid,
        role: 'admin',
        is_demo: 'true',
        requested_role: 'psychologist',
        id: 'orang-lain',
      }),
    );
    const payload = fake.writes()[0]!.payload as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(
      ['city', 'domicile_province', 'name', 'share_region_stats'].sort(),
    );
    expect(fake.writes()[0]!.filters).toEqual([{ op: 'eq', column: 'id', value: USER }]);
  });

  it('kota dan provinsi kosong disimpan sebagai NULL, dan persetujuan wilayah mati', async () => {
    const fake = setup();
    const result = await updateProfileAction(
      initialFormState,
      form({ name: 'Rina Sari', city: '   ', province: '' }),
    );
    expect(result.status).toBe('success');
    expect(fake.writes()[0]!.payload).toEqual({
      name: 'Rina Sari',
      city: null,
      domicile_province: null,
      share_region_stats: false,
    });
  });

  it.each([
    ['ikut statistik tanpa kota', { ...valid, city: '' }, 'city'],
    ['ikut statistik tanpa provinsi', { ...valid, province: '' }, 'province'],
    ['provinsi di luar daftar', { ...valid, province: 'Narnia' }, 'province'],
    ['nama kosong', { ...valid, name: ' ' }, 'name'],
    ['kota berisi tanda yang tak diizinkan', { ...valid, city: 'Bogor<script>' }, 'city'],
    ['kota terlalu panjang', { ...valid, city: 'x'.repeat(81) }, 'city'],
  ])(
    'menolak %s dengan pesan di kolomnya dan tanpa menyentuh database',
    async (_name, fields, field) => {
      const fake = setup();
      const result = await updateProfileAction(initialFormState, form(fields));
      expect(result.status).toBe('error');
      expect(result.fieldErrors?.[field]).toBeTruthy();
      expect(fake.queries).toEqual([]);
      // Nilai isian dikembalikan agar formulir tidak kosong lagi.
      expect(result.values?.name).toBe(fields.name);
    },
  );

  it('tanpa sesi, atau bukan peran pengguna, atau env belum diisi: ditolak dan database tidak disentuh', async () => {
    for (const mutate of [
      () => {
        state.session = { status: 'signed-out' };
      },
      () => {
        state.session = {
          status: 'ok',
          profile: { id: 'x', email: 'a@b.c', role: 'psychologist' },
        };
      },
      () => {
        state.envOk = false;
      },
    ]) {
      const fake = setup();
      state.session = { status: 'ok', profile: { id: USER, email: 'a@b.c', role: 'user' } };
      state.envOk = true;
      mutate();
      const result = await updateProfileAction(initialFormState, form(valid));
      expect(result.status).toBe('error');
      expect(fake.queries).toEqual([]);
    }
  });

  it('galat database: pesan umum (bukan pesan asli), nilai isian dikembalikan', async () => {
    setup({
      results: { 'profiles:update': { data: null, error: { message: 'rahasia internal' } } },
    });
    const result = await updateProfileAction(initialFormState, form(valid));
    expect(result.status).toBe('error');
    expect(result.message).not.toContain('rahasia internal');
    expect(result.values?.city).toBe('Kota Bogor');
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('updateFontSizeAction', () => {
  it.each(['small', 'normal', 'large'])('menyimpan ukuran %s di baris sendiri', async (size) => {
    const fake = setup();
    expect(await updateFontSizeAction(size)).toEqual({ status: 'ok' });
    expect(fake.writes()[0]).toMatchObject({
      table: 'profiles',
      payload: { font_size_preference: size },
      filters: [{ op: 'eq', column: 'id', value: USER }],
    });
  });

  it.each(['huge', '', null, 42, { size: 'large' }])(
    'menolak %j tanpa menyentuh database',
    async (input) => {
      const fake = setup();
      expect((await updateFontSizeAction(input)).status).toBe('error');
      expect(fake.queries).toEqual([]);
    },
  );

  it('tanpa sesi: ditolak', async () => {
    const fake = setup();
    state.session = { status: 'signed-out' };
    expect((await updateFontSizeAction('large')).status).toBe('error');
    expect(fake.queries).toEqual([]);
  });
});

describe('deleteAccountAction', () => {
  const valid = { password: 'kata-sandi-lama', confirm: 'HAPUS' };

  it.each([
    ['tanpa kata sandi', { confirm: 'HAPUS' }, 'password'],
    ['kata penegas salah', { ...valid, confirm: 'hapus' }, 'confirm'],
    ['kata penegas kosong', { ...valid, confirm: '' }, 'confirm'],
    ['kata sandi terlalu panjang', { ...valid, password: 'x'.repeat(73) }, 'password'],
  ])(
    'menolak %s: tidak ada pemeriksaan sandi, tidak ada penghapusan',
    async (_name, fields, field) => {
      const fake = setup();
      const result = await deleteAccountAction(initialFormState, form(fields));
      expect(result.status).toBe('error');
      expect(result.fieldErrors?.[field]).toBeTruthy();
      expect(state.order).toEqual([]);
      expect(fake.rpcCalls).toEqual([]);
    },
  );

  it('kata sandi salah: galat di kolom sandi, akun TIDAK dihapus, dan sandi tidak dikembalikan', async () => {
    const fake = setup();
    state.signIn = async () => ({ error: { code: 'invalid_credentials', status: 400 } });
    const result = await deleteAccountAction(initialFormState, form(valid));

    expect(result.status).toBe('error');
    expect(result.fieldErrors?.password).toContain('belum benar');
    expect(fake.rpcCalls).toEqual([]);
    expect(state.order).toEqual(['signIn']);
    expect(JSON.stringify(result)).not.toContain('kata-sandi-lama');
  });

  it('berhasil: sandi diperiksa ke email sesi DULU, baru fungsi hapus, lalu keluar, lalu ke halaman masuk', async () => {
    const fake = setup();
    const checked: Array<{ email: string; password: string }> = [];
    state.signIn = async (credentials) => {
      checked.push(credentials);
      return { error: null };
    };

    await expect(deleteAccountAction(initialFormState, form(valid))).rejects.toThrow(
      'REDIRECT:/masuk?galat=akun_dihapus',
    );
    expect(checked).toEqual([{ email: 'rina@email.com', password: 'kata-sandi-lama' }]);
    expect(fake.rpcCalls).toEqual([{ name: 'delete_my_account', args: undefined }]);
    expect(state.order).toEqual(['signIn', 'signOut']);
    // Urutan penuh termasuk RPC (log fake memuat 'rpc:...').
    expect(fake.log).toContain('rpc:delete_my_account');
  });

  it('pemeriksa sandi memakai klien terpisah tanpa sesi tersimpan (sesi berjalan tidak tersentuh, tidak ada cookie baru)', async () => {
    setup();
    await expect(deleteAccountAction(initialFormState, form(valid))).rejects.toThrow('REDIRECT:');
    expect(state.verifier).toEqual({
      url: 'https://abc.supabase.co',
      key: 'x'.repeat(40),
      options: {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      },
    });
  });

  it('galat saat keluar tidak menahan pengguna: akunnya sudah terhapus, tetap diarahkan ke halaman masuk', async () => {
    setup();
    state.signOut = async () => {
      throw new Error('jaringan');
    };
    await expect(deleteAccountAction(initialFormState, form(valid))).rejects.toThrow('REDIRECT:');
  });

  it('akun yang bukan peran pengguna (token_role): fungsi database menolak dan pesan ramah ditampilkan', async () => {
    setup({
      results: {
        'rpc:delete_my_account': { data: null, error: { message: 'role_not_deletable' } },
      },
    });
    const result = await deleteAccountAction(initialFormState, form(valid));
    expect(result.status).toBe('error');
    expect(result.message).toContain('tidak bisa dihapus sendiri');
    expect(state.order).toEqual(['signIn']); // tidak keluar
  });

  it('galat database lain: pesan umum, tanpa keluar dan tanpa mengarahkan', async () => {
    setup({
      results: { 'rpc:delete_my_account': { data: null, error: { message: 'detail internal' } } },
    });
    const result = await deleteAccountAction(initialFormState, form(valid));
    expect(result.status).toBe('error');
    expect(result.message).not.toContain('detail internal');
    expect(state.order).toEqual(['signIn']);
  });

  it('bukan peran pengguna di sesi, atau tanpa sesi: sandi tidak diperiksa dan tidak ada yang dihapus', async () => {
    for (const session of [
      { status: 'signed-out' },
      { status: 'ok', profile: { id: 'x', email: 'a@b.c', role: 'psychologist' } },
    ]) {
      const fake = setup();
      state.session = session;
      state.order = [];
      const result = await deleteAccountAction(initialFormState, form(valid));
      expect(result.status).toBe('error');
      expect(state.order).toEqual([]);
      expect(fake.rpcCalls).toEqual([]);
    }
  });

  it('kegagalan jaringan saat memeriksa sandi: pesan jaringan, tidak ada penghapusan', async () => {
    const fake = setup();
    state.signIn = async () => {
      throw new Error('putus');
    };
    const result = await deleteAccountAction(initialFormState, form(valid));
    expect(result.status).toBe('error');
    expect(fake.rpcCalls).toEqual([]);
  });
});
