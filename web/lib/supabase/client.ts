import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env/public';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Klien Supabase untuk BROWSER (komponen "use client"): dipakai untuk Realtime (alert krisis).
 * Membawa sesi pengguna dari cookie, jadi RLS tetap berlaku. Tidak pernah memegang secret.
 */
export function createClient() {
  const env = getPublicEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
