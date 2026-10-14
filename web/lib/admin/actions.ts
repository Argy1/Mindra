'use server';

import { revalidatePath } from 'next/cache';
import { GENERIC_ERROR, NETWORK_ERROR, NOT_CONFIGURED_ERROR } from '@/lib/auth/errors';
import type { FormState } from '@/lib/auth/form-state';
import { currentMfaDecision } from '@/lib/auth/mfa-server';
import { getSessionState } from '@/lib/auth/session';
import { reviewErrorMessage, reviewFieldsFromForm, reviewSchema } from '@/lib/domain/admin/review';
import { readPublicEnv } from '@/lib/env/public';
import { createClient } from '@/lib/supabase/server';
import { firstErrors } from '@/lib/validation/auth';

/**
 * Server Action peninjauan akun psikolog. Tiga penjaga berlapis: peran admin dari database, sesi aal2 (kecuali sakelar
 * demo), dan fungsi database `admin_review_psychologist` yang memeriksa keduanya LAGI dan menjalankan seluruh
 * perubahan dalam satu transaksi. Isi keputusan tidak dicatat ke log aplikasi; jejaknya ada di `admin_actions`.
 */

const SESSION_ENDED = 'Sesimu sudah berakhir. Masuk lagi untuk meninjau akun.';
const NEEDS_MFA = 'Selesaikan verifikasi dua langkah dulu, lalu coba lagi.';

const fail = (message: string, values?: Record<string, string>): FormState => ({
  status: 'error',
  message,
  ...(values ? { values } : {}),
});

/**
 * Isian untuk mengisi ulang formulir setelah galat: React 19 mengosongkan kolom tak-terkendali setelah setiap aksi,
 * jadi tanpa ini admin kehilangan semua yang sudah diketik. Hari praktik dikirim sebagai "1,3,5".
 */
function valuesFrom(formData: FormData): Record<string, string> {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value : '';
  };
  return {
    fullName: text('fullName'),
    title: text('title'),
    strNumber: text('strNumber'),
    specializations: text('specializations'),
    fee: text('fee'),
    verified: text('verified') === 'on' ? 'on' : '',
    days: formData
      .getAll('days')
      .filter((day): day is string => typeof day === 'string')
      .join(','),
    start: text('start'),
    end: text('end'),
  };
}

export async function reviewPsychologistAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = valuesFrom(formData);
  const parsed = reviewSchema.safeParse(reviewFieldsFromForm(formData));
  if (!parsed.success) {
    return { status: 'error', fieldErrors: firstErrors(parsed.error), values };
  }
  const input = parsed.data;

  if (!readPublicEnv().ok) return fail(NOT_CONFIGURED_ERROR, values);
  const session = await getSessionState();
  if (session.status !== 'ok' || session.profile.role !== 'admin') {
    return fail(SESSION_ENDED, values);
  }
  if ((await currentMfaDecision('admin')) !== 'ok') return fail(NEEDS_MFA, values);

  const supabase = await createClient();
  try {
    const { error } =
      input.decision === 'approve'
        ? await supabase.rpc('admin_review_psychologist', {
            p_profile: input.profileId,
            p_decision: 'approve',
            p_full_name: input.fullName,
            p_title: input.title,
            p_str_number: input.strNumber,
            p_specializations: input.specializations,
            p_fee: input.fee,
            p_verified: input.verified,
            p_days: input.days,
            ...(input.days.length > 0 ? { p_start: input.start, p_end: input.end } : {}),
          })
        : await supabase.rpc('admin_review_psychologist', {
            p_profile: input.profileId,
            p_decision: 'reject',
          });
    if (error) {
      return fail(reviewErrorMessage(error.message, error.code) ?? GENERIC_ERROR, values);
    }
  } catch {
    return fail(NETWORK_ERROR, values);
  }

  revalidatePath('/admin');
  return {
    status: 'success',
    message:
      input.decision === 'approve'
        ? 'Akun psikolog disetujui. Pemohon perlu keluar lalu masuk lagi untuk berpindah ke portal psikolog.'
        : 'Permintaan ditolak. Pemohon tetap memakai akun pengguna biasa.',
  };
}
