'use server';

import { createClient as createAnonClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  GENERIC_ERROR,
  NETWORK_ERROR,
  NOT_CONFIGURED_ERROR,
  mapAuthError,
} from '@/lib/auth/errors';
import type { FormState } from '@/lib/auth/form-state';
import { getSessionState } from '@/lib/auth/session';
import { getPublicEnv, readPublicEnv } from '@/lib/env/public';
import { createClient } from '@/lib/supabase/server';
import { firstErrors, pickFields } from '@/lib/validation/auth';
import { deleteAccountSchema, fontSizeSchema, profileSchema } from '@/lib/validation/profile';

/**
 * Server Action halaman Profil. Semuanya hanya untuk pemilik akun (peran `user`): id sesi dipakai di setiap
 * kueri selain RLS, dan database menolak yang lain. Isi profil tidak dicatat ke log.
 */

const SESSION_ENDED = 'Sesimu sudah berakhir. Masuk lagi untuk mengubah profil.';

type Context =
  | { ok: false; error: string }
  | {
      ok: true;
      userId: string;
      email: string;
      supabase: Awaited<ReturnType<typeof createClient>>;
    };

async function context(): Promise<Context> {
  if (!readPublicEnv().ok) return { ok: false, error: NOT_CONFIGURED_ERROR };
  const session = await getSessionState();
  if (session.status !== 'ok' || session.profile.role !== 'user') {
    return { ok: false, error: SESSION_ENDED };
  }
  return {
    ok: true,
    userId: session.profile.id,
    email: session.profile.email,
    supabase: await createClient(),
  };
}

const fail = (message: string, values?: Record<string, string>): FormState => ({
  status: 'error',
  message,
  ...(values ? { values } : {}),
});

// ─── Simpan profil ────────────────────────────────────────────────────────────
export async function updateProfileAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = pickFields(formData, ['name', 'city', 'province', 'shareRegionStats']);
  const values = {
    name: raw.name ?? '',
    city: raw.city ?? '',
    province: raw.province ?? '',
    shareRegionStats: raw.shareRegionStats === 'on' ? 'on' : '',
  };

  const parsed = profileSchema.safeParse({
    ...raw,
    city: raw.city ?? '',
    province: raw.province ?? '',
  });
  if (!parsed.success) return { status: 'error', fieldErrors: firstErrors(parsed.error), values };

  const ctx = await context();
  if (!ctx.ok) return fail(ctx.error, values);

  try {
    const { error } = await ctx.supabase
      .from('profiles')
      .update({
        name: parsed.data.name,
        city: parsed.data.city === '' ? null : parsed.data.city,
        domicile_province: parsed.data.province === '' ? null : parsed.data.province,
        share_region_stats: parsed.data.shareRegionStats,
      })
      .eq('id', ctx.userId);
    if (error) return fail(GENERIC_ERROR, values);
  } catch {
    return fail(NETWORK_ERROR, values);
  }

  revalidatePath('/profil');
  revalidatePath('/beranda');
  return { status: 'success', message: 'Profilmu sudah diperbarui.', values };
}

// ─── Ukuran teks ──────────────────────────────────────────────────────────────
export type FontSizeResult = { status: 'ok' } | { status: 'error'; message: string };

export async function updateFontSizeAction(input: unknown): Promise<FontSizeResult> {
  const parsed = fontSizeSchema.safeParse(input);
  if (!parsed.success) return { status: 'error', message: 'Pilih salah satu ukuran teks.' };

  const ctx = await context();
  if (!ctx.ok) return { status: 'error', message: ctx.error };

  try {
    const { error } = await ctx.supabase
      .from('profiles')
      .update({ font_size_preference: parsed.data })
      .eq('id', ctx.userId);
    if (error) return { status: 'error', message: GENERIC_ERROR };
  } catch {
    return { status: 'error', message: NETWORK_ERROR };
  }

  revalidatePath('/profil');
  return { status: 'ok' };
}

// ─── Hapus akun ───────────────────────────────────────────────────────────────
/**
 * Menghapus akun beserta seluruh datanya (fungsi database `delete_my_account`, ON DELETE CASCADE). Dua
 * penjagaan sebelum itu: kata penegas diketik sendiri dan kata sandi diperiksa ULANG lewat klien terpisah
 * tanpa cookie (sesi yang sedang berjalan tidak tersentuh, dan sesi yang dicuri saja tidak cukup).
 */
export async function deleteAccountAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = pickFields(formData, ['password', 'confirm']);
  const parsed = deleteAccountSchema.safeParse(raw);
  // Kata sandi tidak pernah dikembalikan ke formulir; kata penegas boleh.
  const values = { confirm: raw.confirm ?? '' };
  if (!parsed.success) return { status: 'error', fieldErrors: firstErrors(parsed.error), values };

  const ctx = await context();
  if (!ctx.ok) return fail(ctx.error, values);

  const env = getPublicEnv();
  const verifier = createAnonClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
  try {
    const { error } = await verifier.auth.signInWithPassword({
      email: ctx.email,
      password: parsed.data.password,
    });
    if (error) {
      if (error.code === 'invalid_credentials') {
        return {
          status: 'error',
          fieldErrors: { password: 'Kata sandi belum benar. Periksa lagi lalu coba kirim.' },
          values,
        };
      }
      return fail(mapAuthError(error), values);
    }
  } catch {
    return fail(NETWORK_ERROR, values);
  }

  try {
    const { error } = await ctx.supabase.rpc('delete_my_account');
    if (error) {
      return fail(
        error.message === 'role_not_deletable'
          ? 'Akun jenis ini tidak bisa dihapus sendiri. Hubungi pengelola Mindra.'
          : GENERIC_ERROR,
        values,
      );
    }
  } catch {
    return fail(NETWORK_ERROR, values);
  }

  // Akunnya sudah tidak ada; sesi lokal tinggal dibersihkan. Galat di sini tidak boleh menahan pengguna.
  try {
    await ctx.supabase.auth.signOut();
  } catch {
    // cookie sesi tetap dibersihkan klien Supabase
  }
  redirect('/masuk?galat=akun_dihapus'); // redirect() melempar; harus di luar try/catch
}
