import { describe, expect, it } from 'vitest';
import { cn } from './cn';
import { formatDateId } from './date';
import { isDevPagesEnabled } from './dev-pages';
import { getInitials } from './initials';
import { isActivePath } from './navigation';

describe('cn', () => {
  it('membuang nilai falsy dan menggabungkan class', () => {
    expect(cn('a', false, null, undefined, 'b', { c: true, d: false })).toBe('a b c');
  });

  it('utilitas Tailwind yang bentrok: yang terakhir menang', () => {
    expect(cn('px-4 py-2', 'px-6')).toBe('py-2 px-6');
  });

  it('mengenali token radius Mindra: rounded-pill menimpa rounded-lg', () => {
    expect(cn('rounded-lg', 'rounded-pill')).toBe('rounded-pill');
  });

  it('mengenali utilitas tipografi Mindra: h3 menimpa h2, tetapi warna tetap', () => {
    expect(cn('h2', 'text-fg-1', 'h3')).toBe('text-fg-1 h3');
  });
});

describe('getInitials', () => {
  it.each([
    ['Rina Sari, M.Psi.', 'RS'],
    ['Argy', 'AR'],
    ['Argy Febriansyah Putra', 'AF'],
    ['Dr. Bagas Hadi', 'BH'],
    ['  dimas   pratama ', 'DP'],
    ['Puskesmas Bogor Tengah', 'PB'],
    ["O'Neil", 'ON'],
    ['Al-Fatih', 'AL'],
    ['', ''],
    ['   ', ''],
  ])('%j → %j', (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });
});

describe('formatDateId', () => {
  it('memakai Bahasa Indonesia', () => {
    expect(formatDateId(new Date('2026-10-13T05:00:00Z'))).toBe('Selasa, 13 Oktober');
  });

  it('memakai zona WIB, bukan UTC (20.00 UTC sudah hari berikutnya di Jakarta)', () => {
    expect(formatDateId(new Date('2026-10-13T20:00:00Z'))).toBe('Rabu, 14 Oktober');
  });

  it('bisa diberi format lain', () => {
    expect(formatDateId(new Date('2026-10-13T05:00:00Z'), { day: 'numeric', month: 'short' })).toBe(
      '13 Okt',
    );
  });
});

describe('isActivePath', () => {
  it('cocok persis', () => {
    expect(isActivePath('/beranda', '/beranda')).toBe(true);
  });

  it('induk segmen aktif untuk halaman anak', () => {
    expect(isActivePath('/asesmen', '/asesmen/phq9')).toBe(true);
    expect(isActivePath('/asesmen', '/asesmen/hasil/123')).toBe(true);
  });

  it('bukan sekadar awalan teks', () => {
    expect(isActivePath('/asesmen', '/asesmen-lama')).toBe(false);
  });

  it('exact: akar portal tidak ikut menyala di halaman anak', () => {
    expect(isActivePath('/psikolog', '/psikolog/jadwal', true)).toBe(false);
    expect(isActivePath('/psikolog', '/psikolog', true)).toBe(true);
  });

  it('mengabaikan query, hash, dan garis miring akhir', () => {
    expect(isActivePath('/jurnal', '/jurnal/?tab=tidur#atas')).toBe(true);
  });

  it('halaman lain tidak aktif', () => {
    expect(isActivePath('/jurnal', '/beranda')).toBe(false);
  });
});

describe('isDevPagesEnabled', () => {
  const env = (value: Record<string, string>) => value as unknown as NodeJS.ProcessEnv;

  it('aktif saat pengembangan dan tes', () => {
    expect(isDevPagesEnabled(env({ NODE_ENV: 'development' }))).toBe(true);
    expect(isDevPagesEnabled(env({ NODE_ENV: 'test' }))).toBe(true);
  });

  it('mati di produksi secara bawaan', () => {
    expect(isDevPagesEnabled(env({ NODE_ENV: 'production' }))).toBe(false);
  });

  it('di produksi hanya nyala bila ENABLE_DEV_PAGES=true persis', () => {
    expect(isDevPagesEnabled(env({ NODE_ENV: 'production', ENABLE_DEV_PAGES: 'true' }))).toBe(true);
    expect(isDevPagesEnabled(env({ NODE_ENV: 'production', ENABLE_DEV_PAGES: '1' }))).toBe(false);
    expect(isDevPagesEnabled(env({ NODE_ENV: 'production', ENABLE_DEV_PAGES: 'false' }))).toBe(
      false,
    );
  });
});
