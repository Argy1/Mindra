import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isUserRole, type UserRole } from '@/lib/auth/roles';
import { readPublicEnv } from '@/lib/env/public';
import type { Database } from '@/lib/supabase/database.types';

export interface MiddlewareSession {
  userId: string;
  email: string | undefined;
  /** Dari klaim JWT app_metadata.role; undefined untuk sesi lama sebelum migrasi. */
  role: UserRole | undefined;
}

export interface SessionUpdate {
  /** Respons yang membawa cookie sesi yang sudah disegarkan; WAJIB diteruskan/disalin. */
  response: NextResponse;
  session: MiddlewareSession | null;
  /** false bila variabel lingkungan Supabase belum diisi (situs publik tetap jalan). */
  configured: boolean;
}

/**
 * Menyegarkan sesi Supabase di setiap permintaan dan membaca identitas dari klaim JWT yang
 * DIVERIFIKASI (getClaims), bukan dari cookie mentah yang bisa dipalsukan.
 * Kegagalan jaringan ke Supabase diperlakukan sebagai "belum masuk"; situs tidak ikut tumbang.
 */
export async function updateSession(request: NextRequest): Promise<SessionUpdate> {
  let response = NextResponse.next({ request });

  const env = readPublicEnv();
  if (!env.ok) return { response, session: null, configured: false };

  const supabase = createServerClient<Database>(
    env.env.NEXT_PUBLIC_SUPABASE_URL,
    env.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: { sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet)
            response.cookies.set(name, value, options);
        },
      },
    },
  );

  try {
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) return { response, session: null, configured: true };

    const role = (claims.app_metadata as { role?: unknown } | undefined)?.role;
    return {
      response,
      configured: true,
      session: {
        userId: claims.sub,
        email: typeof claims.email === 'string' ? claims.email : undefined,
        role: isUserRole(role) ? role : undefined,
      },
    };
  } catch {
    return { response, session: null, configured: true };
  }
}

/** Alihkan sambil membawa cookie sesi yang baru disegarkan (kalau tidak, pengguna bisa "keluar" sendiri). */
export function redirectWithCookies(
  request: NextRequest,
  to: string,
  from: NextResponse,
): NextResponse {
  const redirect = NextResponse.redirect(new URL(to, request.url));
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}
