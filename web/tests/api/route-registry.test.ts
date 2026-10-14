// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { API_ROUTES } from '@/lib/api/routes';

/**
 * Penjaga drift: endpoint tidak boleh ada tanpa dokumentasi, dan dokumentasi tidak boleh menjanjikan
 * endpoint yang tidak ada. Sumber yang dibandingkan: berkas `app/api/v1/**\/route.ts` (apa yang benar-benar
 * dipasang Next.js) versus `API_ROUTES` (apa yang dibaca OpenAPI dan halaman /developers).
 */
const ROOT = path.resolve(import.meta.dirname, '../../app/api/v1');
const METHOD =
  /export\s+(?:const|async function|function)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === 'route.ts' ? [full] : [];
  });
}

/** `app/api/v1/facilities/[id]/aggregates/route.ts` → `/api/v1/facilities/{id}/aggregates`. */
function pathOf(file: string): string {
  const relative = path.relative(
    path.resolve(import.meta.dirname, '../../app'),
    path.dirname(file),
  );
  return `/${relative.split(path.sep).join('/')}`.replace(/\[([^\]]+)\]/g, '{$1}');
}

const mounted = routeFiles(ROOT).flatMap((file) => {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(METHOD)].map((match) => ({
    key: `${match[1]} ${pathOf(file)}`,
    file: path.relative(ROOT, file).split(path.sep).join('/'),
    source,
  }));
});

const documented = API_ROUTES.map((route) => `${route.config.method} ${route.config.path}`);

describe('registri rute API', () => {
  it('berkas rute yang dipasang = operasi yang didokumentasikan (dua arah)', () => {
    expect(mounted.map((m) => m.key).sort()).toEqual([...documented].sort());
  });

  it('tidak ada operasi ganda dan operationId unik', () => {
    expect(new Set(documented).size).toBe(documented.length);
    const ids = API_ROUTES.map((route) => route.config.operationId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('semua rute memakai defineRoute (validasi, autentikasi, batas laju) dan tidak ditulis ulang tangan', () => {
    for (const { file, source } of mounted) {
      // Dipasang lewat mount(route) atau route.handle(...): tidak pernah handler yang ditulis tangan.
      expect(source, file).toMatch(/\bmount\(|\.handle\(/);
      expect(source, file).not.toMatch(/NextResponse|request\.json\(|createClient\(/);
    }
  });

  it('semua rute dipaksa dinamis: data per kredensial tidak boleh diprerender', () => {
    for (const { file, source } of mounted) {
      expect(source, file).toContain("export const dynamic = 'force-dynamic'");
    }
  });

  it('lokasi berkas sama dengan path di konfigurasi, termasuk parameter jalur', () => {
    for (const route of API_ROUTES) {
      const match = mounted.find((m) => m.key === `${route.config.method} ${route.config.path}`);
      expect(match, route.config.path).toBeDefined();
    }
  });
});
