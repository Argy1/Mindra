import 'server-only';
import { redirect } from 'next/navigation';
import {
  decideMfa,
  MFA_ROUTES_BY_ROLE,
  normalizeMfaLevel,
  readMfaEnforcement,
  type AalInfo,
  type MfaDecision,
  type MfaRole,
} from '@/lib/auth/mfa';
import { requireRole, type SessionProfile } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

/** Tingkat jaminan sesi saat ini dari Supabase Auth, atau null bila tidak terbaca. */
export async function getAalInfo(): Promise<AalInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return null;
  return {
    currentLevel: normalizeMfaLevel(data.currentLevel),
    nextLevel: normalizeMfaLevel(data.nextLevel),
  };
}

/** Keputusan MFA untuk sesi saat ini (tanpa redirect), mis. untuk menolak Server Action dengan pesan. */
export async function currentMfaDecision(role: MfaRole): Promise<MfaDecision> {
  return decideMfa(role, await getAalInfo(), readMfaEnforcement(process.env.MFA_ENFORCEMENT));
}

/**
 * Pagar portal berMFA: bawa ke halaman daftar TOTP atau verifikasi bila sesi belum aal2.
 * `MFA_ENFORCEMENT=off` hanya melonggarkan pagar ini; database tetap menolak data untuk sesi aal1
 * kecuali `app.psychologist_mfa = 'off'` juga diatur (migrasi 20261014000300 dan 20261014000500).
 */
async function requireMfaFor(role: MfaRole): Promise<void> {
  const decision = await currentMfaDecision(role);
  const routes = MFA_ROUTES_BY_ROLE[role];
  if (decision === 'enroll') redirect(`${routes.enroll}?wajib=1`);
  if (decision === 'challenge') redirect(routes.challenge);
}

export const requirePsychologistMfa = () => requireMfaFor('psychologist');

/**
 * Pagar halaman portal psikolog: peran dari database, lalu MFA. Setiap halaman (bukan hanya layout)
 * memanggil ini PERTAMA, karena layout dan halaman dirender bersamaan: tanpa ini halaman bisa mulai
 * membaca data klien sebelum redirect dari layout berlaku.
 */
export async function requireMfaPsychologist(): Promise<SessionProfile> {
  const profile = await requireRole('psychologist');
  await requirePsychologistMfa();
  return profile;
}

/**
 * Pagar halaman portal admin yang memuat data (antrean peninjauan): peran dari database, lalu MFA. Halaman
 * keamanan dan verifikasi sengaja TIDAK memanggilnya.
 */
export async function requireMfaAdmin(): Promise<SessionProfile> {
  const profile = await requireRole('admin');
  await requireMfaFor('admin');
  return profile;
}

/**
 * Pagar halaman portal faskes yang memuat data (agregat, kunci API): peran dari database, lalu MFA.
 * Halaman keamanan dan verifikasi sengaja TIDAK memanggilnya (itulah tujuan redirect).
 */
export async function requireMfaFacilityAdmin(): Promise<SessionProfile> {
  const profile = await requireRole('facility_admin');
  await requireMfaFor('facility_admin');
  return profile;
}
