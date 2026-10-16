'use server';

import { redirect } from 'next/navigation';
import {
  GENERIC_ERROR,
  NETWORK_ERROR,
  NOT_CONFIGURED_ERROR,
  mapAuthError,
} from '@/lib/auth/errors';
import type { FormState } from '@/lib/auth/form-state';
import { safeNextPath } from '@/lib/auth/next-path';
import { ROLE_HOME, isUserRole } from '@/lib/auth/roles';
import { getPublicEnv, readPublicEnv } from '@/lib/env/public';
import { LEGAL_VERSION } from '@/lib/legal/version';
import { createClient } from '@/lib/supabase/server';
import {
  firstErrors,
  forgotPasswordSchema,
  loginSchema,
  pickFields,
  registerSchema,
  resetPasswordSchema,
} from '@/lib/validation/auth';

/**
 * Server Actions autentikasi. Urutan di tiap aksi: validasi Zod → (Supabase) → respons.
 * Tidak ada data pengguna yang dicatat ke log. Galat Supabase dipetakan ke pesan ramah
 * (lib/auth/errors.ts); pesan asli server tidak pernah sampai ke pengguna.
 */

const failure = (message: string, values?: Record<string, string>): FormState => ({
  status: 'error',
  message,
  ...(values ? { values } : {}),
});

const notConfigured = (values?: Record<string, string>): FormState =>
  failure(
    process.env.NODE_ENV === 'production'
      ? NOT_CONFIGURED_ERROR
      : `${NOT_CONFIGURED_ERROR} (Pengembang: isi .env.local, lihat .env.example.)`,
    values,
  );

// ─── Masuk ────────────────────────────────────────────────────────────────────
export async function signInAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = pickFields(formData, ['email', 'password']);
  const values = { email: raw.email ?? '' };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { status: 'error', fieldErrors: firstErrors(parsed.error), values };
  if (!readPublicEnv().ok) return notConfigured(values);

  const supabase = await createClient();
  let result;
  try {
    result = await supabase.auth.signInWithPassword(parsed.data);
  } catch {
    return failure(NETWORK_ERROR, values);
  }
  if (result.error || !result.data.user) return failure(mapAuthError(result.error), values);

  // Peran dibaca dari database (sumber kebenaran), bukan dari token yang baru saja terbit.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', result.data.user.id)
    .maybeSingle();
  const home = ROLE_HOME[isUserRole(profile?.role) ? profile.role : 'user'];

  const requestedNext =
    typeof formData.get('next') === 'string' ? (formData.get('next') as string) : '';
  redirect(safeNextPath(requestedNext, home)); // redirect() melempar; harus di luar try/catch
}

// ─── Daftar ───────────────────────────────────────────────────────────────────
const SIGNUP_CONFIRMATION =
  'Hampir selesai. Kalau emailmu belum terdaftar, kami kirim tautan konfirmasi. Cek kotak masuk dan folder spam. Kalau sudah pernah mendaftar, coba masuk atau atur ulang kata sandi.';

export async function signUpAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = pickFields(formData, [
    'name',
    'email',
    'password',
    'accountType',
    'strNumber',
    'ageConfirmed',
    'consent',
  ]);
  const values = {
    name: raw.name ?? '',
    email: raw.email ?? '',
    accountType: raw.accountType === 'psychologist' ? 'psychologist' : 'self',
    strNumber: raw.accountType === 'psychologist' ? (raw.strNumber ?? '') : '',
    ageConfirmed: raw.ageConfirmed === 'on' ? 'on' : '',
    consent: raw.consent === 'on' ? 'on' : '',
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { status: 'error', fieldErrors: firstErrors(parsed.error), values };
  if (!readPublicEnv().ok) return notConfigured(values);

  const { NEXT_PUBLIC_SITE_URL } = getPublicEnv();
  const supabase = await createClient();
  let result;
  try {
    result = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent('/beranda')}`,
        // `requested_role` hanyalah PERMINTAAN verifikasi. Database tidak pernah memberi peran dari
        // metadata (lihat handle_new_user); admin yang menyetujui lewat profiles.role.
        data: {
          full_name: parsed.data.name,
          // Bukti persetujuan: versi naskah dan waktunya (metadata akun; tidak pernah dipercaya untuk keputusan akses).
          terms_version: LEGAL_VERSION,
          terms_accepted_at: new Date().toISOString(),
          ...(parsed.data.accountType === 'psychologist'
            ? { requested_role: 'psychologist', requested_str: parsed.data.strNumber }
            : {}),
        },
      },
    });
  } catch {
    return failure(NETWORK_ERROR, values);
  }

  // Email sudah terdaftar (konfirmasi email dimatikan) → jawaban yang sama dengan sukses,
  // supaya formulir ini tidak bisa dipakai menebak siapa saja yang punya akun.
  if (result.error?.code === 'user_already_exists') {
    return { status: 'success', message: SIGNUP_CONFIRMATION };
  }
  if (result.error) return failure(mapAuthError(result.error), values);

  if (result.data.session) redirect(ROLE_HOME.user); // konfirmasi email dimatikan: langsung masuk
  return { status: 'success', message: SIGNUP_CONFIRMATION };
}

// ─── Lupa kata sandi ──────────────────────────────────────────────────────────
const RESET_CONFIRMATION =
  'Kalau emailmu terdaftar, tautan untuk membuat kata sandi baru sudah kami kirim. Cek kotak masuk dan folder spam.';

export async function forgotPasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = pickFields(formData, ['email']);
  const values = { email: raw.email ?? '' };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) return { status: 'error', fieldErrors: firstErrors(parsed.error), values };
  if (!readPublicEnv().ok) return notConfigured(values);

  const { NEXT_PUBLIC_SITE_URL } = getPublicEnv();
  const supabase = await createClient();
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent('/atur-sandi')}`,
    });
    // Hanya pembatasan laju yang diberitahukan; selebihnya jawabannya selalu sama
    // (mencegah penebakan akun).
    if (error && (error.status === 429 || error.code?.startsWith('over_'))) {
      return failure(mapAuthError(error), values);
    }
  } catch {
    return failure(NETWORK_ERROR, values);
  }
  return { status: 'success', message: RESET_CONFIRMATION };
}

// ─── Atur kata sandi baru (setelah klik tautan pemulihan) ─────────────────────
export async function resetPasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(pickFields(formData, ['password', 'confirm']));
  if (!parsed.success) return { status: 'error', fieldErrors: firstErrors(parsed.error) };
  if (!readPublicEnv().ok) return notConfigured();

  const supabase = await createClient();
  let home: string;
  try {
    const { data: current } = await supabase.auth.getUser();
    if (!current.user) {
      return failure(
        'Tautan pemulihanmu sudah tidak berlaku. Minta tautan baru di halaman lupa kata sandi.',
      );
    }
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return failure(mapAuthError(error));

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', current.user.id)
      .maybeSingle();
    home = ROLE_HOME[isUserRole(profile?.role) ? profile.role : 'user'];
  } catch {
    return failure(GENERIC_ERROR);
  }
  redirect(home); // di luar try: redirect() bekerja dengan melempar
}

// ─── Keluar ───────────────────────────────────────────────────────────────────
export async function signOutAction(): Promise<void> {
  if (readPublicEnv().ok) {
    const supabase = await createClient();
    try {
      await supabase.auth.signOut();
    } catch {
      // Tetap kirim pengguna ke halaman masuk; cookie sesi dibersihkan klien Supabase.
    }
  }
  redirect('/masuk');
}
