import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/auth/next-path';
import { readPublicEnv } from '@/lib/env/public';
import { createClient } from '@/lib/supabase/server';

const OTP_TYPES: readonly EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
];

/**
 * Tujuan tautan di email Supabase (konfirmasi daftar, pemulihan sandi). Menukar `code` (PKCE) atau
 * `token_hash` dengan sesi, lalu mengalihkan ke `next`, yang disaring supaya tidak bisa dipakai
 * mengirim pengguna ke situs lain. Gagal → kembali ke /masuk dengan pesan ramah.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const target = (path: string) => NextResponse.redirect(new URL(path, origin));
  const failed = () => target('/masuk?galat=tautan');

  if (!readPublicEnv().ok) return failed();

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const supabase = await createClient();

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return failed();
    } else if (tokenHash && type && OTP_TYPES.includes(type)) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (error) return failed();
    } else {
      return failed();
    }
  } catch {
    return failed();
  }

  // Tautan pemulihan selalu berakhir di halaman membuat sandi baru.
  const fallback = type === 'recovery' ? '/atur-sandi' : '/beranda';
  return target(safeNextPath(searchParams.get('next'), fallback));
}
