// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashApiKey, isApiKeyFormat } from '@/lib/api/keys';
import { initialFormState } from '@/lib/auth/form-state';
import { createFakeSupabase, type FakeSupabaseOptions } from '@/tests/helpers/fake-supabase';

const state = vi.hoisted(() => ({
  mfa: 'ok' as 'ok' | 'enroll' | 'challenge',
  supabase: null as ReturnType<typeof createFakeSupabase> | null,
  session: { status: 'ok', profile: { id: 'fa-1', role: 'facility_admin' } } as unknown,
}));
const revalidatePath = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: (path: string) => revalidatePath(path) }));
vi.mock('@/lib/env/public', () => ({ readPublicEnv: () => ({ ok: true }) }));
vi.mock('@/lib/auth/session', () => ({ getSessionState: async () => state.session }));
vi.mock('@/lib/auth/mfa-server', () => ({ currentMfaDecision: async () => state.mfa }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.supabase!.client }));

import { createApiKeyAction, revokeApiKeyAction } from './actions';

const FACILITY = '66666666-6666-4666-8666-666666666666';
const KEY_ID = '77777777-7777-4777-8777-777777777777';

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
  state.session = { status: 'ok', profile: { id: 'fa-1', role: 'facility_admin' } };
  state.mfa = 'ok';
  state.supabase = null;
});

describe('createApiKeyAction', () => {
  const valid = { name: 'Dinkes Kota Bogor', facilityId: FACILITY };

  it('membuat kunci: yang tersimpan HANYA hash dan prefiks, kunci utuh hanya dikembalikan sekali', async () => {
    const fake = setup({ tables: { api_clients: [] } });
    const result = await createApiKeyAction(initialFormState, form(valid));

    expect(result.status).toBe('success');
    const key = result.values!.apiKey!;
    expect(isApiKeyFormat(key)).toBe(true);
    // Hanya `apiKey` yang dikembalikan; nama dan faskes sudah ada di daftar.
    expect(Object.keys(result.values!)).toEqual(['apiKey']);

    const [insert] = fake.writes();
    expect(insert!.table).toBe('api_clients');
    expect(insert!.payload).toEqual({
      name: 'Dinkes Kota Bogor',
      owner_id: 'fa-1',
      facility_id: FACILITY,
      key_prefix: key.slice(8, 16),
      key_hash: hashApiKey(key),
      scopes: ['aggregates:read'],
    });
    // Kunci utuh tidak muncul di mana pun dalam yang ditulis ke database.
    expect(JSON.stringify(insert!.payload)).not.toContain(key);
    expect(revalidatePath).toHaveBeenCalledWith('/faskes/kunci-api');
  });

  it('dua pembuatan menghasilkan kunci berbeda', async () => {
    setup({ tables: { api_clients: [] } });
    const a = await createApiKeyAction(initialFormState, form(valid));
    const b = await createApiKeyAction(initialFormState, form(valid));
    expect(a.values!.apiKey).not.toBe(b.values!.apiKey);
  });

  it.each([
    ['nama kosong', { ...valid, name: '' }, 'name'],
    ['nama terlalu pendek', { ...valid, name: 'ab' }, 'name'],
    ['nama terlalu panjang', { ...valid, name: 'a'.repeat(61) }, 'name'],
    ['nama berisi karakter kontrol', { ...valid, name: 'Dinkes\nBogor' }, 'name'],
    ['faskes bukan UUID', { ...valid, facilityId: 'x' }, 'facilityId'],
    ['faskes kosong', { name: 'Nama sah', facilityId: '' }, 'facilityId'],
  ])(
    '%s: galat di kolomnya, nilai dikembalikan, database tidak disentuh',
    async (_n, fields, key) => {
      const fake = setup();
      const result = await createApiKeyAction(initialFormState, form(fields));
      expect(result.status).toBe('error');
      expect(result.fieldErrors?.[key]).toBeTruthy();
      expect(result.values?.name).toBe(fields.name);
      expect(fake.queries).toEqual([]);
    },
  );

  it.each([
    ['psikolog', { status: 'ok', profile: { id: 'p', role: 'psychologist' } }],
    ['pengguna biasa', { status: 'ok', profile: { id: 'u', role: 'user' } }],
    ['belum masuk', { status: 'signed-out' }],
  ])('%s tidak boleh membuat kunci', async (_name, session) => {
    const fake = setup();
    state.session = session;
    expect((await createApiKeyAction(initialFormState, form(valid))).status).toBe('error');
    expect(fake.queries).toEqual([]);
  });

  it('batas 5 kunci aktif: ditolak dengan pesan jelas, tanpa menulis', async () => {
    const fake = setup({
      tables: { api_clients: Array.from({ length: 5 }, (_, i) => ({ id: `k${i}` })) },
    });
    const result = await createApiKeyAction(initialFormState, form(valid));
    expect(result.status).toBe('error');
    expect(result.message).toMatch(/5 kunci aktif/);
    expect(fake.writes()).toEqual([]);
    // Hitungan hanya kunci milik pemanggil yang belum dicabut.
    const count = fake.queriesTo('api_clients')[0]!;
    expect(count.filters).toContainEqual({ op: 'eq', column: 'owner_id', value: 'fa-1' });
    expect(count.filters).toContainEqual({ op: 'is', column: 'revoked_at', value: null });
  });

  it('bukan pengelola faskes itu (RLS menolak, 42501): pesan izin, tanpa kunci', async () => {
    setup({
      tables: { api_clients: [] },
      results: { 'api_clients:insert': { data: null, error: { message: 'rls', code: '42501' } } },
    });
    const result = await createApiKeyAction(initialFormState, form(valid));
    expect(result).toMatchObject({
      status: 'error',
      message: expect.stringContaining('tidak berhak'),
    });
    expect(result.values?.apiKey).toBeUndefined();
  });

  it('galat database lain: pesan umum, tanpa kunci', async () => {
    setup({
      tables: { api_clients: [] },
      results: { 'api_clients:insert': { data: null, error: { message: 'boom', code: 'XX000' } } },
    });
    const result = await createApiKeyAction(initialFormState, form(valid));
    expect(result.status).toBe('error');
    expect(result.values?.apiKey).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('boom');
  });
});

describe('revokeApiKeyAction', () => {
  it('mencabut: hanya kunci milik pemanggil yang belum dicabut, hanya kolom revoked_at', async () => {
    const fake = setup({
      results: { 'api_clients:update': { data: [{ id: KEY_ID }], error: null } },
    });
    const result = await revokeApiKeyAction(initialFormState, form({ id: KEY_ID }));

    expect(result.status).toBe('success');
    const [update] = fake.writes();
    expect(Object.keys(update!.payload as object)).toEqual(['revoked_at']);
    expect(update!.filters).toEqual(
      expect.arrayContaining([
        { op: 'eq', column: 'id', value: KEY_ID },
        { op: 'eq', column: 'owner_id', value: 'fa-1' },
        { op: 'is', column: 'revoked_at', value: null },
      ]),
    );
  });

  it('tidak ada baris yang berubah (bukan milik pemanggil atau sudah dicabut): galat yang jelas', async () => {
    setup({ results: { 'api_clients:update': { data: [], error: null } } });
    expect(await revokeApiKeyAction(initialFormState, form({ id: KEY_ID }))).toEqual({
      status: 'error',
      message: 'Kunci tidak ditemukan atau sudah dicabut.',
    });
  });

  it('id bukan UUID ditolak tanpa menyentuh database; peran lain ditolak', async () => {
    const fake = setup();
    expect((await revokeApiKeyAction(initialFormState, form({ id: 'x' }))).status).toBe('error');
    state.session = { status: 'ok', profile: { id: 'p', role: 'psychologist' } };
    expect((await revokeApiKeyAction(initialFormState, form({ id: KEY_ID }))).status).toBe('error');
    expect(fake.queries).toEqual([]);
  });
});

describe('verifikasi dua langkah (MFA) untuk kunci API', () => {
  it.each(['enroll', 'challenge'] as const)(
    'sesi yang belum lolos MFA (%s): membuat dan mencabut ditolak tanpa menyentuh database',
    async (decision) => {
      state.mfa = decision;
      const fake = setup({ tables: { api_clients: [] } });

      const created = await createApiKeyAction(
        initialFormState,
        form({ name: 'Dinkes Kota Bogor', facilityId: FACILITY }),
      );
      const revoked = await revokeApiKeyAction(initialFormState, form({ id: KEY_ID }));

      for (const result of [created, revoked]) {
        expect(result.status).toBe('error');
        expect(result.message).toMatch(/verifikasi dua langkah/i);
      }
      expect(created.values?.apiKey).toBeUndefined();
      expect(fake.queries).toEqual([]);
      expect(fake.writes()).toEqual([]);
    },
  );
});
