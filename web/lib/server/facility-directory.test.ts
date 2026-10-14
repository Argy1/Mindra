// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase, type FakeSupabaseOptions } from '@/tests/helpers/fake-supabase';

vi.mock('server-only', () => ({}));

const state = vi.hoisted(() => ({
  supabase: null as ReturnType<typeof createFakeSupabase> | null,
  envOk: true,
  throwOnCreate: false,
}));

vi.mock('@/lib/env/public', () => ({ readPublicEnv: () => ({ ok: state.envOk }) }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    if (state.throwOnCreate) throw new Error('cookie tidak tersedia');
    return state.supabase!.client;
  },
}));

import { DIRECTORY_LIMIT, listFacilityDirectory } from './facility-directory';

function setup(options: FakeSupabaseOptions = {}) {
  state.supabase = createFakeSupabase(options);
  return state.supabase;
}

const ROW = {
  id: 'f1',
  name: 'Puskesmas Contoh',
  type: 'puskesmas',
  city: 'Kota Bogor',
  province: 'Jawa Barat',
  address: null,
  phone: null,
  lat: -6.59,
  lng: 106.8,
};

beforeEach(() => {
  state.supabase = null;
  state.envOk = true;
  state.throwOnCreate = false;
});

describe('listFacilityDirectory', () => {
  it('membaca tabel facilities: hanya layanan kesehatan jiwa, kolom tampil saja, urut provinsi-kota-nama, dibatasi', async () => {
    const fake = setup({ tables: { facilities: [ROW] } });
    const result = await listFacilityDirectory();

    expect(result).toEqual({ ok: true, facilities: [ROW] });
    expect(fake.queries).toHaveLength(1);
    const [query] = fake.queries;
    expect(query?.table).toBe('facilities');
    expect(query?.op).toBe('select');
    expect(query?.columns).toBe('id, name, type, city, province, address, phone, lat, lng');
    expect(query?.filters).toEqual([
      { op: 'eq', column: 'has_mental_health_service', value: true },
    ]);
    expect(query?.orders.map((order) => order.column)).toEqual(['province', 'city', 'name']);
    expect(query?.orders.every((order) => order.ascending)).toBe(true);
    expect(query?.limit).toBe(DIRECTORY_LIMIT);
    expect(DIRECTORY_LIMIT).toBe(1000);
  });

  it('tidak membaca kolom di luar yang tampil (mis. tidak ada kolom pengelola atau rahasia)', async () => {
    const fake = setup({ tables: { facilities: [] } });
    await listFacilityDirectory();
    const columns = fake.queries[0]?.columns ?? '';
    expect(columns).not.toContain('*');
    expect(columns.split(',').map((column) => column.trim())).toEqual([
      'id',
      'name',
      'type',
      'city',
      'province',
      'address',
      'phone',
      'lat',
      'lng',
    ]);
  });

  it('tabel kosong: berhasil dengan daftar kosong (bukan galat)', async () => {
    setup({ tables: { facilities: [] } });
    expect(await listFacilityDirectory()).toEqual({ ok: true, facilities: [] });
  });

  it('data null dari database diperlakukan sebagai daftar kosong', async () => {
    setup({ results: { 'facilities:select': { data: null, error: null } } });
    expect(await listFacilityDirectory()).toEqual({ ok: true, facilities: [] });
  });

  it('galat database: ok false tanpa membocorkan pesan', async () => {
    setup({ failTables: ['facilities'] });
    const result = await listFacilityDirectory();
    expect(result).toEqual({ ok: false });
    expect(JSON.stringify(result)).not.toContain('gagal');
  });

  it('variabel lingkungan belum diisi: ok false dan database tidak disentuh', async () => {
    state.envOk = false;
    const fake = setup({ tables: { facilities: [ROW] } });
    expect(await listFacilityDirectory()).toEqual({ ok: false });
    expect(fake.queries).toEqual([]);
  });

  it('klien gagal dibuat (mis. di luar konteks permintaan): ok false, bukan pengecualian', async () => {
    state.throwOnCreate = true;
    setup();
    await expect(listFacilityDirectory()).resolves.toEqual({ ok: false });
  });
});
