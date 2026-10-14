import 'server-only';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';
import { ROLE_HOME, isUserRole, type UserRole } from '@/lib/auth/roles';
import { readPublicEnv } from '@/lib/env/public';
import { createClient } from '@/lib/supabase/server';

export interface SessionProfile {
  id: string;
  email: string;
  name: string;
  /** Dari tabel profiles, SUMBER KEBENARAN peran (bukan klaim JWT). */
  role: UserRole;
}

export type SessionState =
  { status: 'signed-out' } | { status: 'no-profile' } | { status: 'ok'; profile: SessionProfile };

/**
 * Sesi pengguna saat ini, divalidasi ke server Auth (`getUser`, bukan membaca cookie mentah) lalu
 * dilengkapi baris profiles. Di-cache per permintaan supaya layout + halaman tidak mengulang.
 */
export const getSessionState = cache(async (): Promise<SessionState> => {
  // Jaring pengaman: apa pun yang memanggil ini otomatis dinamis, walau env belum diisi dan
  // cookies() belum tersentuh. Tanpa ini halaman bisa terprerender dengan hasil "belum masuk".
  await connection();
  if (!readPublicEnv().ok) return { status: 'signed-out' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { status: 'signed-out' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, name, role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || !isUserRole(profile.role)) return { status: 'no-profile' };
  return { status: 'ok', profile: { ...profile, role: profile.role } };
});

/**
 * Pagar server untuk layout portal: pastikan sudah masuk DAN berperan yang tepat, memakai peran
 * dari database. Ini lapisan kedua setelah middleware (yang hanya membaca klaim JWT dan bisa
 * basi sampai token diperbarui).
 */
export async function requireRole(
  allowed: UserRole | readonly UserRole[],
): Promise<SessionProfile> {
  const state = await getSessionState();
  if (state.status === 'signed-out') redirect('/masuk');
  // Akun ada tetapi barisnya di profiles hilang: jangan memutar-mutar antara /masuk dan beranda.
  if (state.status === 'no-profile') redirect('/akun-bermasalah');

  const roles: readonly UserRole[] = Array.isArray(allowed) ? allowed : [allowed as UserRole];
  if (!roles.includes(state.profile.role)) redirect(ROLE_HOME[state.profile.role]);
  return state.profile;
}
