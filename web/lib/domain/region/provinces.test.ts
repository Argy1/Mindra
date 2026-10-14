import { describe, expect, it } from 'vitest';
import { CITIES, FACILITIES } from '../../../scripts/seed/catalog';
import { canonicalProvince, PROVINCES } from './provinces';

describe('PROVINCES', () => {
  it('memuat 38 provinsi, tanpa duplikat (tidak membedakan huruf besar-kecil)', () => {
    expect(PROVINCES).toHaveLength(38);
    expect(new Set(PROVINCES.map((p) => p.toLowerCase())).size).toBe(38);
  });

  it('setiap provinsi pada data demo (kota dan faskes) ada di daftar dengan penulisan yang sama', () => {
    for (const city of CITIES) expect(PROVINCES, city.city).toContain(city.province);
    for (const facility of FACILITIES)
      expect(PROVINCES, facility.name).toContain(facility.province);
  });

  it('tidak ada spasi di tepi atau spasi ganda (cocok dengan pembandingan btrim di database)', () => {
    for (const province of PROVINCES) expect(province).toBe(province.trim().replace(/\s+/g, ' '));
  });
});

describe('canonicalProvince', () => {
  it.each([
    ['jawa barat', 'Jawa Barat'],
    ['  JAWA   BARAT ', 'Jawa Barat'],
    ['dki jakarta', 'DKI Jakarta'],
    ['di yogyakarta', 'DI Yogyakarta'],
  ])('%j → %j', (input, expected) => {
    expect(canonicalProvince(input)).toBe(expected);
  });

  it.each(['', '   ', 'Jawa', 'Yogyakarta', 'Narnia', null, undefined])(
    'tidak dikenal: %j → null',
    (input) => {
      expect(canonicalProvince(input)).toBeNull();
    },
  );
});
