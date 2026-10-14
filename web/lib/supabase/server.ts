import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPublicEnv } from '@/lib/env/public';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Klien Supabase untuk Server Component, Server Action, dan Route Handler. Membawa sesi
 * pengguna dari cookie, jadi RLS yang menjaga data (bukan kode kita). Semua akses data
 * pengguna HARUS lewat klien ini; service role hanya di lib/server (lihat supabase-service.ts).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: { sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet)
              cookieStore.set(name, value, options);
          } catch {
            // Dipanggil dari Server Component (cookie tidak bisa ditulis saat render). Aman: middleware
            // yang menyegarkan sesi dan menulis cookie.
          }
        },
      },
    },
  );
}
