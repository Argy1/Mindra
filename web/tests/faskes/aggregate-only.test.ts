// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Penjaga aturan besi portal faskes: HANYA `public.facility_aggregate()` yang boleh memberi angka kesehatan.
 * Tes ini memindai kode portal (bukan hanya menjalankannya) supaya perubahan di masa depan yang menambah
 * kueri ke data perorangan langsung gagal di CI. Pembuktian dari sisi perilaku ada di
 * lib/server/faskes-dashboard.test.ts (klien Supabase tiruan mencatat tabel dan rpc yang dipanggil) dan
 * tests/db/facility-booking.test.ts (database sungguhan: admin faskes tidak bisa membaca tabel pengguna).
 */
const ROOT = path.resolve(import.meta.dirname, '../..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

/** Menghapus komentar supaya kata di dokumentasi (mis. "tabel profiles") tidak dihitung sebagai kode. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

const PORTAL_FILES = [
  ...walk(path.join(ROOT, 'app/(facility)')),
  ...walk(path.join(ROOT, 'components/features/faskes')),
  ...walk(path.join(ROOT, 'lib/domain/faskes')),
  path.join(ROOT, 'lib/server/faskes-dashboard.ts'),
  path.join(ROOT, 'app/dev/_data/fase4.ts'),
  ...['faskes', 'faskes-peta', 'faskes-laporan'].map((dir) =>
    path.join(ROOT, 'app/dev', dir, 'page.tsx'),
  ),
];

const ALLOWED_TABLES = new Set(['facility_admins', 'facilities']);
const ALLOWED_RPC = new Set(['facility_aggregate']);
const USER_DATA_TABLES = [
  'profiles',
  'assessments',
  'mood_entries',
  'sleep_entries',
  'crisis_alerts',
  'ai_conversations',
  'care_links',
  'consultations',
  'consultation_messages',
  'data_access_logs',
  'emergency_contacts',
  'caregiver_relationships',
  'satusehat_sync_log',
];

const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join('/');

describe('portal faskes: hanya agregat anonim', () => {
  it('memindai berkas yang benar (tidak kosong)', () => {
    expect(PORTAL_FILES.length).toBeGreaterThan(20);
    for (const required of [
      'lib/server/faskes-dashboard.ts',
      'app/(facility)/faskes/page.tsx',
      'app/(facility)/faskes/peta/page.tsx',
      'app/(facility)/faskes/laporan/page.tsx',
      'app/(facility)/faskes/unduh/laporan/route.ts',
      'components/features/faskes/FaskesDashboardView.tsx',
    ]) {
      expect(PORTAL_FILES.map(rel), required).toContain(required);
    }
  });

  it('tidak ada klien service role di portal faskes', () => {
    for (const file of PORTAL_FILES) {
      const code = stripComments(readFileSync(file, 'utf8'));
      expect(code, rel(file)).not.toMatch(/createServiceClient|supabase-service|SERVICE_ROLE/);
    }
  });

  it('kueri tabel hanya ke facility_admins dan facilities (keanggotaan dan direktori publik)', () => {
    for (const file of PORTAL_FILES) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const match of code.matchAll(/\.from\(\s*['"`]([^'"`]+)['"`]/g)) {
        expect(ALLOWED_TABLES.has(match[1]!), `${rel(file)} membaca tabel ${match[1]}`).toBe(true);
      }
    }
  });

  it('satu-satunya rpc adalah facility_aggregate', () => {
    for (const file of PORTAL_FILES) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const match of code.matchAll(/\.rpc\(\s*['"`]([^'"`]+)['"`]/g)) {
        expect(ALLOWED_RPC.has(match[1]!), `${rel(file)} memanggil rpc ${match[1]}`).toBe(true);
      }
    }
  });

  it('kode portal tidak menyebut tabel data pengguna sama sekali', () => {
    for (const file of PORTAL_FILES) {
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const table of USER_DATA_TABLES) {
        expect(code, `${rel(file)} menyebut ${table}`).not.toMatch(new RegExp(`\\b${table}\\b`));
      }
    }
  });

  it('pemindai sendiri bekerja: mendeteksi pelanggaran buatan', () => {
    const violating = `
      const a = await supabase.from('assessments').select('*');
      const b = await supabase.rpc('psychologist_clients');
      // supabase.from('profiles') hanya komentar
    `;
    const code = stripComments(violating);
    const tables = [...code.matchAll(/\.from\(\s*['"`]([^'"`]+)['"`]/g)].map((match) => match[1]);
    const rpcs = [...code.matchAll(/\.rpc\(\s*['"`]([^'"`]+)['"`]/g)].map((match) => match[1]);
    expect(tables).toEqual(['assessments']);
    expect(rpcs).toEqual(['psychologist_clients']);
    expect(code).not.toMatch(/\bprofiles\b/);
  });
});
