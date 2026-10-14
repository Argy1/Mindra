import { describe, expect, it } from 'vitest';
import {
  FACILITY_DIRECTORY_VERIFIED,
  FACILITY_TYPE_LABEL,
  arrangeFacilities,
  filterFacilities,
  formatDistance,
  haversineKm,
  isValidCoordinates,
  openStreetMapLink,
  provincesOf,
  telHrefOf,
  type DirectoryFacility,
} from './nearest';

const facility = (overrides: Partial<DirectoryFacility> & { id: string }): DirectoryFacility => ({
  name: 'Puskesmas Contoh',
  type: 'puskesmas',
  city: 'Kota Bogor',
  province: 'Jawa Barat',
  address: null,
  phone: null,
  lat: -6.595,
  lng: 106.8166,
  ...overrides,
});

describe('haversineKm', () => {
  it('titik yang sama berjarak 0; satu derajat bujur di khatulistiwa sekitar 111,19 km', () => {
    expect(haversineKm({ lat: -6.2, lng: 106.8 }, { lat: -6.2, lng: 106.8 })).toBe(0);
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.19, 1);
  });

  it('Jakarta ke Bandung sekitar 116 km garis lurus, dan simetris', () => {
    const jakarta = { lat: -6.2088, lng: 106.8456 };
    const bandung = { lat: -6.9175, lng: 107.6191 };
    const distance = haversineKm(jakarta, bandung);
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(122);
    expect(haversineKm(bandung, jakarta)).toBeCloseTo(distance, 9);
  });

  it('melewati garis bujur 180 tidak menghasilkan jarak raksasa', () => {
    expect(haversineKm({ lat: 0, lng: 179.5 }, { lat: 0, lng: -179.5 })).toBeCloseTo(111.19, 1);
  });
});

describe('isValidCoordinates', () => {
  it.each([
    [-6.2, 106.8, true],
    [0, 0, true],
    [90, 180, true],
    [-90, -180, true],
    [90.1, 0, false],
    [0, 180.1, false],
    [Number.NaN, 0, false],
    [0, Number.POSITIVE_INFINITY, false],
    [null, 0, false],
    [0, null, false],
  ])('(%s, %s) → %s', (lat, lng, expected) => {
    expect(isValidCoordinates(lat, lng)).toBe(expected);
  });
});

describe('formatDistance', () => {
  it.each([
    [0, '10 m'],
    [0.004, '10 m'],
    [0.85, '850 m'],
    [0.8549, '850 m'],
    [0.999, '1,0 km'],
    [1, '1,0 km'],
    [3.24, '3,2 km'],
    [9.94, '9,9 km'],
    [9.95, '10 km'],
    [10, '10 km'],
    [119.6, '120 km'],
    [1234.4, '1.234 km'],
  ])('%s km → %s', (km, expected) => {
    expect(formatDistance(km)).toBe(expected);
  });

  it('nilai tidak sah menghasilkan teks kosong', () => {
    expect(formatDistance(-1)).toBe('');
    expect(formatDistance(Number.NaN)).toBe('');
    expect(formatDistance(Number.POSITIVE_INFINITY)).toBe('');
  });
});

describe('filterFacilities', () => {
  const list = [
    facility({ id: 'a', name: 'Puskesmas Bogor Tengah', city: 'Kota Bogor' }),
    facility({ id: 'b', name: 'RS Jiwa Bandung', type: 'rumah_sakit', city: 'Kota Bandung' }),
    facility({
      id: 'c',
      name: 'Klinik Sehat',
      type: 'klinik',
      city: 'Kota Surabaya',
      province: 'Jawa Timur',
      address: 'Jl. Pemuda No. 7',
    }),
  ];

  it('tanpa filter semua tampil', () => {
    expect(filterFacilities(list)).toHaveLength(3);
    expect(filterFacilities(list, { province: '', query: '' })).toHaveLength(3);
  });

  it('provinsi dicocokkan tepat tanpa peka huruf besar-kecil dan spasi ganda', () => {
    expect(filterFacilities(list, { province: 'jawa  timur' }).map((f) => f.id)).toEqual(['c']);
    expect(filterFacilities(list, { province: 'Jawa Barat' }).map((f) => f.id)).toEqual(['a', 'b']);
    expect(filterFacilities(list, { province: 'Jawa' })).toEqual([]);
  });

  it('pencarian memeriksa nama, kota, dan alamat', () => {
    expect(filterFacilities(list, { query: 'bandung' }).map((f) => f.id)).toEqual(['b']);
    expect(filterFacilities(list, { query: '  SEHAT ' }).map((f) => f.id)).toEqual(['c']);
    expect(filterFacilities(list, { query: 'pemuda' }).map((f) => f.id)).toEqual(['c']);
    expect(filterFacilities(list, { query: 'tidak ada' })).toEqual([]);
  });

  it('provinsi dan pencarian bekerja bersama', () => {
    expect(
      filterFacilities(list, { province: 'Jawa Barat', query: 'bogor' }).map((f) => f.id),
    ).toEqual(['a']);
    expect(filterFacilities(list, { province: 'Jawa Timur', query: 'bogor' })).toEqual([]);
  });

  it('pencarian menemukan layanan lewat KOTA saja (nama dan alamatnya tidak memuat kata itu)', () => {
    const medan = facility({
      id: 'd',
      name: 'Klinik Sehat Sentosa',
      city: 'Kota Medan',
      province: 'Sumatera Utara',
    });
    expect(filterFacilities([...list, medan], { query: 'medan' }).map((f) => f.id)).toEqual(['d']);
  });

  it('tidak mengubah daftar asli', () => {
    const before = [...list];
    filterFacilities(list, { query: 'bogor' });
    expect(list).toEqual(before);
  });
});

describe('arrangeFacilities', () => {
  const bogor = facility({ id: 'bogor', name: 'B', lat: -6.595, lng: 106.8166 });
  const jakarta = facility({
    id: 'jakarta',
    name: 'A',
    city: 'Kota Jakarta Pusat',
    province: 'DKI Jakarta',
    lat: -6.1754,
    lng: 106.8272,
  });
  const bandung = facility({
    id: 'bandung',
    name: 'C',
    city: 'Kota Bandung',
    lat: -6.9175,
    lng: 107.6191,
  });
  const nowhere = facility({ id: 'nowhere', name: 'D', lat: null, lng: null });

  it('tanpa titik asal: urut provinsi, kota, lalu nama; jarak kosong', () => {
    const result = arrangeFacilities([bogor, jakarta, bandung, nowhere], null);
    expect(result.map((f) => f.id)).toEqual(['jakarta', 'bandung', 'bogor', 'nowhere']);
    expect(result.every((f) => f.distanceKm === null)).toBe(true);
  });

  it('dengan titik asal di Bogor: terdekat dulu, tanpa koordinat di paling akhir', () => {
    const result = arrangeFacilities([nowhere, bandung, jakarta, bogor], { lat: -6.6, lng: 106.8 });
    expect(result.map((f) => f.id)).toEqual(['bogor', 'jakarta', 'bandung', 'nowhere']);
    expect(result[0]?.distanceKm).toBeLessThan(2);
    expect(result[1]?.distanceKm).toBeGreaterThan(40);
    expect(result[3]?.distanceKm).toBeNull();
  });

  it('jarak sama diurutkan menurut nama (hasil sama untuk masukan sama)', () => {
    const twinA = facility({ id: 'x', name: 'Alfa' });
    const twinB = facility({ id: 'y', name: 'Beta' });
    const first = arrangeFacilities([twinB, twinA], { lat: -6.5, lng: 106.8 }).map((f) => f.id);
    const second = arrangeFacilities([twinA, twinB], { lat: -6.5, lng: 106.8 }).map((f) => f.id);
    expect(first).toEqual(['x', 'y']);
    expect(second).toEqual(first);
  });

  it('koordinat faskes yang tidak sah dianggap tanpa koordinat', () => {
    const broken = facility({ id: 'broken', lat: 123, lng: 106.8 });
    const [only] = arrangeFacilities([broken], { lat: -6.5, lng: 106.8 });
    expect(only?.distanceKm).toBeNull();
  });

  it('tidak mengubah daftar asli', () => {
    const list = [bandung, bogor];
    arrangeFacilities(list, { lat: -6.6, lng: 106.8 });
    expect(list.map((f) => f.id)).toEqual(['bandung', 'bogor']);
  });
});

describe('provincesOf', () => {
  it('unik, urut abjad, tanpa kosong', () => {
    expect(
      provincesOf([
        facility({ id: '1', province: 'Jawa Timur' }),
        facility({ id: '2', province: 'Jawa Barat' }),
        facility({ id: '3', province: ' Jawa Barat ' }),
        facility({ id: '4', province: '  ' }),
      ]),
    ).toEqual(['Jawa Barat', 'Jawa Timur']);
  });
});

describe('openStreetMapLink', () => {
  it('memuat koordinat faskes dengan 5 desimal dan bukan lokasi pengguna', () => {
    expect(openStreetMapLink(-6.595, 106.8166)).toBe(
      'https://www.openstreetmap.org/?mlat=-6.59500&mlon=106.81660#map=16/-6.59500/106.81660',
    );
  });
});

describe('telHrefOf', () => {
  it.each([
    ['(0251) 8321-234', 'tel:02518321234'],
    ['+62 251 8321234', 'tel:+622518321234'],
    ['0251-8321234 ext 5', 'tel:025183212345'],
    ['112', null],
    ['', null],
    ['tidak ada', null],
    [null, null],
  ])('%s → %s', (phone, expected) => {
    expect(telHrefOf(phone)).toBe(expected);
  });
});

describe('konstanta', () => {
  it('label tipe: Puskesmas, Rumah sakit, Klinik, Biro psikologi', () => {
    expect(FACILITY_TYPE_LABEL).toEqual({
      puskesmas: 'Puskesmas',
      rumah_sakit: 'Rumah sakit',
      klinik: 'Klinik',
      biro_psikologi: 'Biro psikologi',
    });
  });

  it('semua tipe faskes di database punya label', () => {
    expect(Object.keys(FACILITY_TYPE_LABEL).sort()).toEqual([
      'biro_psikologi',
      'klinik',
      'puskesmas',
      'rumah_sakit',
    ]);
  });

  it('direktori belum dinyatakan terverifikasi (data bawaan adalah contoh)', () => {
    expect(FACILITY_DIRECTORY_VERIFIED).toBe(false);
  });
});
