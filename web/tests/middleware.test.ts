// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config, middleware } from '../middleware';

const request = (path: string) => new NextRequest(`http://localhost:3000${path}`);

beforeEach(() => {
  // Tanpa Supabase: sesi selalu "belum masuk". Itu keadaan yang diuji (dan keadaan CI tanpa rahasia).
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('middleware: gerbang /dev/*', () => {
  it('pengecualian matcher: aset statis, berkas berekstensi, dan /api tidak melewati middleware', () => {
    const pattern = new RegExp(`^${config.matcher[0]!}$`);
    for (const skipped of [
      '/api/health',
      '/api/v1/instruments',
      '/_next/static/x.js',
      '/_next/image',
      '/assets/logo.svg',
      '/favicon.ico',
      '/icon.svg',
      '/robots.txt',
    ]) {
      expect(pattern.test(skipped), skipped).toBe(false);
    }
    for (const handled of [
      '/',
      '/masuk',
      '/beranda',
      '/psikolog/klien/1',
      '/dev/ui',
      '/auth/callback',
    ]) {
      expect(pattern.test(handled), handled).toBe(true);
    }
  });

  it('produksi tanpa ENABLE_DEV_PAGES: ditulis ulang ke rute yang tidak ada dengan status 404', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ENABLE_DEV_PAGES', '');

    const response = await middleware(request('/dev/ui'));

    expect(response.status).toBe(404);
    expect(response.headers.get('x-middleware-rewrite')).toContain('/_dev-dinonaktifkan');
    // Halaman /dev tidak boleh sampai dijalankan (respons 404 pernah terbukti membawa payload halaman).
    expect(response.headers.get('x-middleware-next')).toBeNull();
  });

  it('/dev sendiri (tanpa garis miring) juga dijaga', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = await middleware(request('/dev'));
    expect(response.status).toBe(404);
  });

  it('produksi dengan ENABLE_DEV_PAGES=true: diteruskan', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ENABLE_DEV_PAGES', 'true');

    const response = await middleware(request('/dev/shell'));

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('pengembangan: selalu diteruskan', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const response = await middleware(request('/dev/ui'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('middleware: guard rute (tanpa sesi)', () => {
  it.each([
    '/beranda',
    '/asesmen/phq9',
    '/psikolog',
    '/psikolog/klien/1',
    '/pendamping',
    '/faskes',
  ])('pengunjung ke %s dialihkan ke /masuk dengan ?next= yang asli', async (path) => {
    const response = await middleware(request(`${path}?tab=mood`));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/masuk');
    expect(location.searchParams.get('next')).toBe(`${path}?tab=mood`);
  });

  it.each(['/', '/masuk', '/daftar', '/lupa-sandi', '/tentang', '/developers', '/auth/callback'])(
    'halaman publik %s tidak dialihkan',
    async (path) => {
      const response = await middleware(request(path));
      expect(response.headers.get('location')).toBeNull();
    },
  );

  it('halaman pembuat sandi baru butuh sesi: pengunjung dialihkan ke /lupa-sandi', async () => {
    const response = await middleware(request('/atur-sandi'));
    expect(new URL(response.headers.get('location')!).pathname).toBe('/lupa-sandi');
  });

  it('situs publik tetap hidup walau Supabase belum dikonfigurasi (tidak melempar galat)', async () => {
    await expect(middleware(request('/'))).resolves.toBeDefined();
  });
});
