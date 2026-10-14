import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { PORTAL_PREFIXES, portalRoleFor } from '@/lib/auth/route-access';

afterEach(() => {
  vi.unstubAllEnvs();
});

const rules = () => {
  const value = robots().rules;
  return Array.isArray(value) ? value[0]! : value;
};
const asList = (value: string | string[] | undefined) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

describe('robots', () => {
  it('menutup SETIAP portal berlogin (daftar diambil dari guard rute, jadi tak bisa menyimpang)', () => {
    const disallow = asList(rules().disallow);
    expect(PORTAL_PREFIXES.length).toBeGreaterThanOrEqual(8);
    for (const prefix of PORTAL_PREFIXES) expect(disallow, prefix).toContain(prefix);
  });

  it('menutup API, pratinjau pengembang, callback auth, dan penyetelan sandi', () => {
    const disallow = asList(rules().disallow);
    for (const path of ['/api/', '/dev/', '/auth/', '/atur-sandi'])
      expect(disallow).toContain(path);
  });

  it('halaman publik tidak tertutup oleh awalan mana pun', () => {
    const disallow = asList(rules().disallow);
    for (const path of [
      '/',
      '/tentang',
      '/kebijakan-privasi',
      '/developers',
      '/masuk',
      '/daftar',
    ]) {
      const blocked = disallow.filter((prefix) => path === prefix || path.startsWith(prefix));
      expect(blocked, path).toEqual([]);
    }
  });

  it('mengarah ke sitemap di alamat situs', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://mindra.example.id/');
    expect(robots().sitemap).toBe('https://mindra.example.id/sitemap.xml');
  });
});

describe('sitemap', () => {
  it('hanya halaman publik, tanpa portal berlogin', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://mindra.example.id');
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toEqual([
      'https://mindra.example.id',
      'https://mindra.example.id/tentang',
      'https://mindra.example.id/bantuan',
      'https://mindra.example.id/layanan-terdekat',
      'https://mindra.example.id/kebijakan-privasi',
      'https://mindra.example.id/syarat-penggunaan',
      'https://mindra.example.id/developers',
    ]);
    for (const url of urls) expect(portalRoleFor(new URL(url).pathname), url).toBeNull();
  });

  it('beranda berprioritas tertinggi', () => {
    const entries = sitemap();
    expect(entries[0]?.priority).toBe(1);
    expect(entries.slice(1).every((entry) => (entry.priority ?? 0) < 1)).toBe(true);
  });
});
