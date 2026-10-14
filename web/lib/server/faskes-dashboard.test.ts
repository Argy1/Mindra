// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase, type FakeSupabaseOptions } from '@/tests/helpers/fake-supabase';

const state = vi.hoisted(() => ({
  supabase: null as ReturnType<typeof createFakeSupabase> | null,
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.supabase!.client }));

import {
  FaskesDataError,
  getMapPage,
  getReportPage,
  getTrendPage,
  parseAggregateRows,
  pickFacility,
  type ManagedFacility,
} from './faskes-dashboard';

const USER = 'fa-1';
const OWN = '00000000-0000-4000-8000-0000000000f1';
const OTHER = '00000000-0000-4000-8000-0000000000f2';
const FOREIGN = '00000000-0000-4000-8000-0000000000f9';
const NOW = new Date('2026-10-14T03:00:00Z');

const membership = (id: string, name: string, city: string) => ({
  facility_id: id,
  facilities: { id, name, type: 'puskesmas', city, province: 'Jawa Barat' },
});

const aggregateRow = (overrides: Record<string, unknown> = {}) => ({
  city: 'Kota Bogor',
  province: 'Jawa Barat',
  week_start: '2026-10-05',
  suppressed: false,
  active_users: 25,
  avg_phq9: 7.4,
  avg_gad7: 6.1,
  avg_pss10: 15.2,
  minimal_count: 10,
  mild_count: 8,
  moderate_count: 5,
  severe_count: 2,
  crisis_alert_count: 1,
  ...overrides,
});

function setup(options: FakeSupabaseOptions = {}) {
  state.supabase = createFakeSupabase({
    tables: { facility_admins: [membership(OWN, 'Puskesmas Bogor Tengah', 'Kota Bogor')] },
    rpcs: { facility_aggregate: [aggregateRow()] },
    ...options,
  });
  return state.supabase;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.supabase = null;
});

describe('hanya agregat: tidak ada pembacaan data individu', () => {
  it('halaman tren: satu pembacaan keanggotaan, lalu SATU rpc facility_aggregate, tanpa tabel data pengguna', async () => {
    const fake = setup();
    await getTrendPage(USER, {}, NOW);

    expect(fake.tablesQueried()).toEqual(['facility_admins']);
    expect(fake.rpcCalls).toEqual([
      {
        name: 'facility_aggregate',
        args: { p_facility: OWN, p_from: '2026-07-27', p_to: '2026-10-14' },
      },
    ]);
  });

  it('halaman peta: tambahan hanya direktori `facilities` publik (provinsi yang sama)', async () => {
    const fake = setup({
      tables: {
        facility_admins: [membership(OWN, 'Puskesmas Bogor Tengah', 'Kota Bogor')],
        facilities: [
          {
            id: OWN,
            name: 'Puskesmas Bogor Tengah',
            type: 'puskesmas',
            city: 'Kota Bogor',
            lat: -6.59,
            lng: 106.8,
          },
          {
            id: OTHER,
            name: 'Tanpa Koordinat',
            type: 'klinik',
            city: 'Kota Bogor',
            lat: null,
            lng: null,
          },
        ],
      },
    });
    const page = await getMapPage(USER, {}, NOW);

    expect(fake.tablesQueried()).toEqual(['facility_admins', 'facilities']);
    expect(fake.queriesTo('facilities')[0]!.filters).toEqual([
      { op: 'eq', column: 'province', value: 'Jawa Barat' },
    ]);
    expect(fake.rpcCalls.map((call) => call.name)).toEqual(['facility_aggregate']);
    // Baris tanpa koordinat tidak ikut sebagai pin.
    expect(page!.pins.map((pin) => pin.id)).toEqual([OWN]);
  });

  it('halaman laporan: rentang 52 pekan, bulan dari Senin pekan', async () => {
    const fake = setup();
    const page = await getReportPage(USER, {}, NOW);

    expect(fake.rpcCalls).toHaveLength(1);
    const args = fake.rpcCalls[0]!.args as { p_from: string; p_to: string };
    const days = (Date.parse(args.p_to) - Date.parse(args.p_from)) / 86_400_000;
    expect(days).toBeLessThanOrEqual(400);
    expect(page!.months[0]).toBe('2026-10');
    expect(page!.rows.map((row) => row.city)).toEqual(['Kota Bogor']);
  });
});

describe('pemilihan faskes', () => {
  const facilities: ManagedFacility[] = [
    { id: OWN, name: 'A', type: 'puskesmas', city: 'Kota Bogor', province: 'Jawa Barat' },
    { id: OTHER, name: 'B', type: 'puskesmas', city: 'Kota Depok', province: 'Jawa Barat' },
  ];

  it('id yang dikelola dipakai; id asing, rusak, atau kosong jatuh ke faskes pertama', () => {
    expect(pickFacility(facilities, OTHER)!.id).toBe(OTHER);
    expect(pickFacility(facilities, [OTHER, OWN])!.id).toBe(OTHER);
    for (const bad of [FOREIGN, 'x', '', "' or 1=1 --", undefined]) {
      expect(pickFacility(facilities, bad)!.id, String(bad)).toBe(OWN);
    }
    expect(pickFacility([], OWN)).toBeNull();
  });

  it('?faskes= faskes orang lain TIDAK diteruskan ke database', async () => {
    const fake = setup();
    await getTrendPage(USER, { faskes: FOREIGN }, NOW);
    expect(fake.rpcCalls.map((call) => (call.args as { p_facility: string }).p_facility)).toEqual([
      OWN,
    ]);
  });

  it('akun tanpa faskes: null dan tidak ada panggilan agregat sama sekali', async () => {
    const fake = setup({ tables: { facility_admins: [] } });
    expect(await getTrendPage(USER, {}, NOW)).toBeNull();
    expect(await getMapPage(USER, {}, NOW)).toBeNull();
    expect(await getReportPage(USER, {}, NOW)).toBeNull();
    expect(fake.rpcCalls).toEqual([]);
  });

  it('faskes dipilih mengikuti nama (urut Indonesia) bila mengelola lebih dari satu', async () => {
    setup({
      tables: {
        facility_admins: [
          membership(OTHER, 'Zebra', 'Kota Depok'),
          membership(OWN, 'Alfa', 'Kota Bogor'),
        ],
      },
    });
    const page = await getTrendPage(USER, {}, NOW);
    expect(page!.facility.name).toBe('Alfa');
    expect(page!.facilities.map((facility) => facility.name)).toEqual(['Alfa', 'Zebra']);
  });
});

describe('periode dan bulan dari URL', () => {
  it('?periode= yang tak dikenal jatuh ke 12 minggu; yang valid dipakai', async () => {
    setup();
    expect((await getTrendPage(USER, { periode: '4' }, NOW))!.view.weeks).toHaveLength(4);
    expect((await getTrendPage(USER, { periode: '999' }, NOW))!.view.weeks).toHaveLength(12);
    expect((await getTrendPage(USER, { periode: '1 or 1=1' }, NOW))!.view.weeks).toHaveLength(12);
  });

  it('?bulan= hanya dari bulan yang tersedia; selain itu bulan terbaru', async () => {
    setup();
    expect((await getReportPage(USER, { bulan: '2026-09' }, NOW))!.month).toBe('2026-09');
    for (const bad of ['2020-01', '2026-13', 'x', '2026-10; drop table x']) {
      expect((await getReportPage(USER, { bulan: bad }, NOW))!.month, bad).toBe('2026-10');
    }
  });
});

describe('gagal tertutup', () => {
  it('galat database pada rpc: FaskesDataError, tanpa membocorkan pesan asli', async () => {
    setup({
      results: {
        'rpc:facility_aggregate': {
          data: null,
          error: { message: 'detail rahasia', code: '42501' },
        },
      },
    });
    const error = await getTrendPage(USER, {}, NOW).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(FaskesDataError);
    expect((error as Error).message).not.toContain('rahasia');
  });

  it('galat membaca keanggotaan: FaskesDataError', async () => {
    setup({ failTables: ['facility_admins'] });
    await expect(getTrendPage(USER, {}, NOW)).rejects.toBeInstanceOf(FaskesDataError);
  });

  it('baris dengan bentuk salah menggagalkan seluruhnya, bukan menampilkan sebagian', async () => {
    setup({ rpcs: { facility_aggregate: [aggregateRow(), aggregateRow({ suppressed: 'ya' })] } });
    await expect(getTrendPage(USER, {}, NOW)).rejects.toBeInstanceOf(FaskesDataError);
  });
});

describe('parseAggregateRows', () => {
  it('angka numeric dari PostgREST boleh berupa string; null tetap null (sel tertekan)', () => {
    const [shown, hidden] = parseAggregateRows([
      aggregateRow({ avg_phq9: '7.4', active_users: 25 }),
      aggregateRow({
        suppressed: true,
        active_users: null,
        avg_phq9: null,
        avg_gad7: null,
        avg_pss10: null,
        minimal_count: null,
        mild_count: null,
        moderate_count: null,
        severe_count: null,
        crisis_alert_count: null,
      }),
    ]);
    expect(shown!.avgPhq9).toBe(7.4);
    expect(hidden).toMatchObject({
      suppressed: true,
      activeUsers: null,
      avgPhq9: null,
      crisisAlerts: null,
    });
  });

  it('data kosong atau null menjadi daftar kosong; string angka sembarang ditolak', () => {
    expect(parseAggregateRows(null)).toEqual([]);
    expect(parseAggregateRows([])).toEqual([]);
    expect(() => parseAggregateRows([aggregateRow({ avg_phq9: '7,4' })])).toThrow(FaskesDataError);
    expect(() => parseAggregateRows([aggregateRow({ week_start: 'kemarin' })])).toThrow(
      FaskesDataError,
    );
  });
});
