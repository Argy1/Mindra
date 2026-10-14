'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { GENERIC_ERROR, NETWORK_ERROR, NOT_CONFIGURED_ERROR } from '@/lib/auth/errors';
import type { FormState } from '@/lib/auth/form-state';
import { getSessionState } from '@/lib/auth/session';
import { BOOKING_ERROR_MESSAGE, bookConsultation, bookInputSchema } from '@/lib/consultation/book';
import { readPublicEnv } from '@/lib/env/public';
import { createClient } from '@/lib/supabase/server';

/**
 * Server Action konsultasi pengguna. Aturan pemesanan ditegakkan DATABASE (fungsi book_consultation + constraint
 * EXCLUDE); di sini hanya: validasi bentuk (Zod) → sesi dan peran → panggil inti → pesan Indonesia.
 * Pembatalan memakai RLS "Users can cancel own consultations" (hanya milik sendiri, hanya menjadi `cancelled`).
 */

const SESSION_ENDED = 'Sesimu sudah berakhir. Masuk lagi untuk mengatur sesi.';

async function userContext() {
  if (!readPublicEnv().ok) return { error: NOT_CONFIGURED_ERROR } as const;
  const session = await getSessionState();
  if (session.status !== 'ok' || session.profile.role !== 'user') {
    return { error: SESSION_ENDED } as const;
  }
  return { userId: session.profile.id, supabase: await createClient() } as const;
}

export async function bookConsultationAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = bookInputSchema.safeParse({
    psychologistId: formData.get('psychologistId'),
    startsAt: formData.get('startsAt'),
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }

  const ctx = await userContext();
  if ('error' in ctx) return { status: 'error', message: ctx.error };

  try {
    const result = await bookConsultation(ctx.supabase, parsed.data);
    if (!result.ok) return { status: 'error', message: BOOKING_ERROR_MESSAGE[result.code] };
    revalidatePath('/konsultasi');
    return {
      status: 'success',
      message: 'Sesimu sudah dipesan.',
      values: {
        consultationId: result.consultation.id,
        startsAt: result.consultation.scheduledAt,
        fee: String(result.consultation.bookingFee),
      },
    };
  } catch {
    return { status: 'error', message: NETWORK_ERROR };
  }
}

const idSchema = z.uuid({ error: 'Sesi tidak valid.' });

export async function cancelConsultationAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = idSchema.safeParse(formData.get('id'));
  if (!id.success)
    return { status: 'error', message: id.error.issues[0]?.message ?? GENERIC_ERROR };

  const ctx = await userContext();
  if ('error' in ctx) return { status: 'error', message: ctx.error };

  try {
    const { data, error } = await ctx.supabase
      .from('consultations')
      .update({ status: 'cancelled' })
      .eq('id', id.data)
      .eq('user_id', ctx.userId)
      .in('status', ['pending', 'confirmed'])
      .gt('scheduled_at', new Date().toISOString())
      .select('id');
    if (error) return { status: 'error', message: GENERIC_ERROR };
    if (!data || data.length === 0) {
      return {
        status: 'error',
        message:
          'Sesi ini tidak bisa dibatalkan lagi (sudah dimulai, selesai, atau sudah dibatalkan).',
      };
    }
  } catch {
    return { status: 'error', message: NETWORK_ERROR };
  }

  revalidatePath('/konsultasi');
  return { status: 'success', message: 'Sesi dibatalkan. Jamnya terbuka lagi untuk orang lain.' };
}
