import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@/lib/env/public';
import { getServerEnv } from '@/lib/env/server';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Klien SERVICE ROLE: melewati RLS. Hanya untuk kasus yang terdokumentasi (CLAUDE.md):
 *   - sinkronisasi SATUSEHAT oleh server,
 *   - agregat faskes untuk klien API ber-scope aggregates:read (setelah kunci divalidasi),
 *   - memperbarui api_clients.last_used_at.
 * Akses data PENGGUNA tidak boleh lewat sini; pakai lib/supabase/server.ts supaya RLS menjaga.
 * Aturan lint melarang impor berkas ini dari luar lib/server dan scripts.
 */
export function createServiceClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
