// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Penjaga hasil BUILD (bukan kode): halaman yang bergantung pada sesi tidak boleh terprerender.
 *
 * Pernah terjadi: build di lingkungan tanpa env Supabase membuat /beranda dkk. berstatus "Static"
 * karena kode berhenti sebelum menyentuh cookies(); redirect('/masuk') ikut "terpanggang" dan
 * pengguna yang sudah masuk terus dilempar ke halaman masuk. Tes ini hanya berarti setelah
 * `pnpm build` (di CI: build dulu, lalu test); tanpa hasil build ia dilewati.
 */
const manifestPath = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  '.next',
  'prerender-manifest.json',
);

/**
 * Hasil `next build` selalu memprerender setidaknya "/" (halaman marketing statis). Manifest milik
 * server `next dev` (yang menimpa .next) kosong, jadi itu dianggap BUKAN hasil build dan tes dilewati.
 */
function readPrerenderedRoutes(): string[] {
  if (!existsSync(manifestPath)) return [];
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    routes?: Record<string, unknown>;
  };
  return Object.keys(manifest.routes ?? {});
}

const prerendered = readPrerenderedRoutes();
const hasBuild = prerendered.length > 0;

describe.skipIf(!hasBuild)('hasil build: rute bersesi bersifat dinamis', () => {
  it.each([
    '/beranda',
    '/asesmen',
    '/asesmen/phq9',
    '/jurnal',
    '/privasi',
    '/profil',
    '/profil/unduh',
    '/admin',
    '/admin/keamanan',
    '/admin/verifikasi',
    '/psikolog',
    '/psikolog/klien',
    '/psikolog/keamanan',
    '/psikolog/verifikasi',
    '/pendamping',
    '/psikolog/jadwal',
    '/teman-cerita',
    '/konsultasi',
    '/faskes/kunci-api',
    '/faskes/peta',
    '/faskes/laporan',
    '/faskes/keamanan',
    '/faskes/verifikasi',
    '/faskes',
    '/masuk',
    '/dev/ui',
    '/dev/shell',
    '/dev/asesmen',
    '/dev/hasil',
    '/dev/beranda',
    '/dev/jurnal',
    '/dev/psikolog',
    '/dev/klien',
    '/dev/privasi',
    '/dev/pendamping',
    '/dev/pendamping-detail',
    '/dev/kunci-api',
    '/dev/profil',
    '/dev/admin',
    '/dev/layanan-terdekat',
    '/layanan-terdekat',
    '/dev/faskes',
    '/dev/faskes-peta',
    '/dev/faskes-laporan',
    '/dev/teman-cerita',
    '/dev/konsultasi',
    '/dev/konsultasi-detail',
    '/dev/jadwal',
    '/api/v1/instruments',
    '/api/v1/assessments',
    '/api/v1/mood-entries',
    '/api/v1/sleep-entries',
    '/api/v1/insights/weekly',
    '/api/v1/fhir/Observation',
    '/api/v1/satusehat/sync',
    '/api/v1/companion/chat',
    '/api/v1/psychologists',
    '/api/v1/consultations',
    '/api/v1/openapi.json',
    '/api/health',
  ])('%s tidak diprerender', (route) => {
    expect(prerendered).not.toContain(route);
  });

  it.each(['/', '/tentang', '/bantuan', '/kebijakan-privasi', '/syarat-penggunaan', '/developers'])(
    'halaman marketing %s tetap statis (CDN)',
    (route) => {
      expect(prerendered).toContain(route);
    },
  );

  it('robots.txt dan sitemap.xml dibangkitkan saat build', () => {
    expect(prerendered).toContain('/robots.txt');
    expect(prerendered).toContain('/sitemap.xml');
  });
});
