/**
 * Regenerasi lib/supabase/database.types.ts dari proyek Supabase (CLAUDE.md: setelah migrasi berubah).
 *
 *   pnpm db:types
 *
 * Butuh di .env.local:
 *   SUPABASE_PROJECT_ID     ref proyek (bagian awal URL Supabase)
 *   SUPABASE_ACCESS_TOKEN   token pribadi dari https://supabase.com/dashboard/account/tokens (RAHASIA)
 *
 * Memakai Management API langsung, jadi tidak perlu memasang Supabase CLI.
 *
 * Ditulis sebagai fungsi `main()`, BUKAN `await` tingkat atas: tsx menjalankan berkas ini sebagai
 * CommonJS (package.json tanpa "type": "module"), yang tidak mendukung top-level await.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const fail = (message: string): never => {
  console.error(`[db:types] ${message}`);
  process.exit(1);
};

async function main() {
  const projectId = process.env.SUPABASE_PROJECT_ID;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!projectId || !token) {
    fail('Isi SUPABASE_PROJECT_ID dan SUPABASE_ACCESS_TOKEN di .env.local (lihat .env.example).');
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(projectId as string)}/types/typescript?included_schemas=public`,
    { headers: { Authorization: `Bearer ${token as string}` } },
  );
  if (!response.ok) {
    // Jangan cetak isi respons: bisa memuat detail akun. Status saja sudah cukup untuk diagnosis.
    fail(`Management API menjawab ${response.status}. Periksa token dan project id.`);
  }

  const { types } = (await response.json()) as { types?: string };
  if (!types || !types.includes('export type Database')) {
    fail('Respons tidak berisi tipe Database; berkas tidak diubah.');
  }

  const target = path.resolve(process.cwd(), 'lib', 'supabase', 'database.types.ts');
  writeFileSync(target, types as string, 'utf8');
  console.log(`[db:types] Tersimpan: ${path.relative(process.cwd(), target)}`);
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
