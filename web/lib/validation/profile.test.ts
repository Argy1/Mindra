import { describe, expect, it } from 'vitest';
import { PROVINCES } from '@/lib/domain/region/provinces';
import {
  CITY_MAX,
  DELETE_CONFIRM_WORD,
  FONT_SIZES,
  FONT_SIZE_LABEL,
  deleteAccountSchema,
  fontSizeSchema,
  profileSchema,
} from './profile';

const valid = {
  name: 'Rina Sari',
  city: 'Kota Bogor',
  province: 'Jawa Barat',
  shareRegionStats: 'on',
};

const errorsOf = (raw: unknown): Record<string, string> => {
  const result = profileSchema.safeParse(raw);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0] ?? '_form'), issue.message]),
  );
};

describe('profileSchema', () => {
  it('masukan sah dinormalkan: spasi dirapikan, provinsi kanonik, persetujuan menjadi boolean', () => {
    expect(
      profileSchema.parse({
        name: '  Rina   Sari ',
        city: '  Kota   Bogor ',
        province: 'jawa barat',
        shareRegionStats: 'on',
      }),
    ).toEqual({
      name: 'Rina Sari',
      city: 'Kota Bogor',
      province: 'Jawa Barat',
      shareRegionStats: true,
    });
  });

  it('tanpa kotak centang: persetujuan false; nilai selain "on" juga false (tidak ada tebakan)', () => {
    expect(profileSchema.parse({ ...valid, shareRegionStats: undefined }).shareRegionStats).toBe(
      false,
    );
    for (const value of ['true', '1', 'ON', 'yes', '']) {
      expect(
        profileSchema.parse({ ...valid, shareRegionStats: value }).shareRegionStats,
        value,
      ).toBe(false);
    }
  });

  it('kota dan provinsi kosong sah bila tidak ikut statistik', () => {
    expect(
      profileSchema.parse({ name: 'Rina', city: '', province: '', shareRegionStats: undefined }),
    ).toMatchObject({ city: '', province: '', shareRegionStats: false });
  });

  it('ikut statistik wajib kota DAN provinsi, dengan pesan di masing-masing kolom', () => {
    expect(errorsOf({ ...valid, city: '' }).city).toContain('Isi kotamu');
    expect(errorsOf({ ...valid, province: '' }).province).toContain('Pilih provinsimu');
    const both = errorsOf({ ...valid, city: '', province: '' });
    expect(Object.keys(both).sort()).toEqual(['city', 'province']);
  });

  it.each([
    ['Kota Bogor', true],
    ['Kab. Cianjur', true],
    ['Kota Jakarta Selatan (Jaksel)', true],
    ['Kab. Tanah Datar/Sumbar', true],
    ['Bogor<script>', false],
    ['Kota; DROP TABLE', false],
    ['-Bogor', false],
    ['Bogor\nBarat', false],
    ['x'.repeat(CITY_MAX + 1), false],
    ['x'.repeat(CITY_MAX), true],
  ])('kota %j → %s', (city, ok) => {
    expect(errorsOf({ ...valid, city }).city === undefined).toBe(ok);
  });

  it('batas kota persis 80 karakter (angka literal, bukan konstanta yang ikut berubah)', () => {
    expect(CITY_MAX).toBe(80);
    expect(errorsOf({ ...valid, city: 'x'.repeat(80) }).city).toBeUndefined();
    expect(errorsOf({ ...valid, city: 'x'.repeat(81) }).city).toBeTruthy();
  });

  it('provinsi di luar daftar ditolak; semua 38 provinsi diterima', () => {
    expect(errorsOf({ ...valid, province: 'Narnia' }).province).toBe('Pilih provinsi dari daftar.');
    for (const province of PROVINCES) {
      expect(profileSchema.safeParse({ ...valid, province }).success, province).toBe(true);
    }
  });

  it('nama memakai aturan yang sama dengan pendaftaran', () => {
    expect(errorsOf({ ...valid, name: '' }).name).toBeTruthy();
    expect(errorsOf({ ...valid, name: 'A' }).name).toBeTruthy();
    expect(errorsOf({ ...valid, name: 'Rina<b>' }).name).toBeTruthy();
    expect(errorsOf({ ...valid, name: 'x'.repeat(81) }).name).toBeTruthy();
  });

  it('kolom asing (role, is_demo, id) dibuang dari hasil', () => {
    const parsed = profileSchema.parse({ ...valid, role: 'admin', is_demo: true, id: 'x' });
    expect(Object.keys(parsed).sort()).toEqual(['city', 'name', 'province', 'shareRegionStats']);
  });
});

describe('fontSizeSchema', () => {
  it('menerima tepat nilai CHECK database (small, normal, large) dan menolak sisanya', () => {
    expect([...FONT_SIZES]).toEqual(['small', 'normal', 'large']);
    for (const size of FONT_SIZES) expect(fontSizeSchema.safeParse(size).success).toBe(true);
    for (const bad of ['huge', 'extra_large', '', 'Large', null, 1]) {
      expect(fontSizeSchema.safeParse(bad).success, String(bad)).toBe(false);
    }
  });

  it('setiap ukuran punya label berbahasa Indonesia', () => {
    for (const size of FONT_SIZES) expect(FONT_SIZE_LABEL[size]).toMatch(/\S/);
  });
});

describe('deleteAccountSchema', () => {
  it('butuh kata penegas HURUF KAPITAL dan sandi', () => {
    expect(
      deleteAccountSchema.safeParse({ password: 'abc', confirm: DELETE_CONFIRM_WORD }).success,
    ).toBe(true);
    expect(
      deleteAccountSchema.safeParse({ password: 'abc', confirm: ` ${DELETE_CONFIRM_WORD} ` })
        .success,
    ).toBe(true);
    for (const confirm of ['hapus', 'Hapus', 'HAPUS AKUN', '', undefined]) {
      expect(
        deleteAccountSchema.safeParse({ password: 'abc', confirm }).success,
        String(confirm),
      ).toBe(false);
    }
    expect(deleteAccountSchema.safeParse({ password: '', confirm: 'HAPUS' }).success).toBe(false);
    expect(
      deleteAccountSchema.safeParse({ password: 'x'.repeat(73), confirm: 'HAPUS' }).success,
    ).toBe(false);
  });
});
