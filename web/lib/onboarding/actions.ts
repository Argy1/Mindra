'use server';

import { revalidatePath } from 'next/cache';
import { GENERIC_ERROR, NETWORK_ERROR, NOT_CONFIGURED_ERROR } from '@/lib/auth/errors';
import type { FormState } from '@/lib/auth/form-state';
import { getSessionState } from '@/lib/auth/session';
import { ONBOARDING_METADATA_KEY } from '@/lib/domain/onboarding/steps';
import { readPublicEnv } from '@/lib/env/public';
import { createClient } from '@/lib/supabase/server';

/**
 * Menutup panduan awal di Beranda. Hanya menulis satu penanda waktu ke metadata akun milik sendiri
 * (`auth.updateUser`); tidak menyentuh tabel data kesehatan. Metadata yang sudah ada (nama, versi syarat yang disetujui)
 * dibaca lalu dipertahankan, supaya hasilnya tidak bergantung pada apakah server Auth menggabung atau mengganti.
 */

const SESSION_ENDED = 'Sesimu sudah berakhir. Masuk lagi untuk menutup panduan.';
const USER_ONLY = 'Panduan ini hanya untuk akun pengguna.';

const fail = (message: string): FormState => ({ status: 'error', message });

export async function dismissOnboardingAction(
  _previous: FormState,
  _formData: FormData,
): Promise<FormState> {
  if (!readPublicEnv().ok) return fail(NOT_CONFIGURED_ERROR);
  const session = await getSessionState();
  if (session.status !== 'ok') return fail(SESSION_ENDED);
  if (session.profile.role !== 'user') return fail(USER_ONLY);

  try {
    const supabase = await createClient();
    const { data, error: readError } = await supabase.auth.getUser();
    if (readError || !data.user) return fail(SESSION_ENDED);

    const { error } = await supabase.auth.updateUser({
      data: { ...data.user.user_metadata, [ONBOARDING_METADATA_KEY]: new Date().toISOString() },
    });
    if (error) return fail(GENERIC_ERROR);
  } catch {
    return fail(NETWORK_ERROR);
  }

  revalidatePath('/beranda');
  return { status: 'success' };
}
