'use server';

import { revalidatePath } from 'next/cache';
import { GENERIC_ERROR, NETWORK_ERROR, NOT_CONFIGURED_ERROR } from '@/lib/auth/errors';
import type { FormState } from '@/lib/auth/form-state';
import { getSessionState } from '@/lib/auth/session';
import { readPublicEnv } from '@/lib/env/public';
import { createClient } from '@/lib/supabase/server';
import { inviteCodeInputSchema } from '@/lib/validation/privacy';

/**
 * Server Action portal pendamping. Menerima undangan HANYA lewat RPC `accept_caregiver_invite`
 * (kode tepat, belum kedaluwarsa, bukan milik sendiri, dibatasi 5 percobaan gagal per 15 menit).
 * Pesan galat sengaja sama untuk "kode salah", "kedaluwarsa", dan "undangan milik sendiri".
 */

const INVALID_CODE =
  'Kode tidak valid atau sudah kedaluwarsa. Minta orang yang mengundangmu membuat undangan baru bila perlu.';

export async function acceptInviteAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const rawCode = formData.get('code');
  const code = inviteCodeInputSchema.safeParse(typeof rawCode === 'string' ? rawCode : '');
  if (!code.success) {
    return {
      status: 'error',
      fieldErrors: { code: code.error.issues[0]!.message },
      values: { code: typeof rawCode === 'string' ? rawCode : '' },
    };
  }

  if (!readPublicEnv().ok) return { status: 'error', message: NOT_CONFIGURED_ERROR };
  const session = await getSessionState();
  if (session.status !== 'ok' || session.profile.role !== 'caregiver') {
    return {
      status: 'error',
      message: 'Sesimu sudah berakhir. Masuk lagi untuk menerima undangan.',
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('accept_caregiver_invite', { p_code: code.data });
    if (error) {
      // Pesan pembatasan percobaan dari database sudah berbahasa Indonesia dan perlu sampai ke pengguna.
      if (error.message.startsWith('Terlalu banyak')) {
        return { status: 'error', message: error.message, values: { code: code.data } };
      }
      return { status: 'error', message: GENERIC_ERROR, values: { code: code.data } };
    }
    if (data === null) {
      return {
        status: 'error',
        fieldErrors: { code: INVALID_CODE },
        values: { code: code.data },
      };
    }
  } catch {
    return { status: 'error', message: NETWORK_ERROR, values: { code: code.data } };
  }

  revalidatePath('/pendamping');
  return {
    status: 'success',
    message: 'Undangan diterima. Orang yang kamu dampingi sudah muncul di daftarmu.',
  };
}
