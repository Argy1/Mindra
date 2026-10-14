'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { GENERIC_ERROR, NETWORK_ERROR, NOT_CONFIGURED_ERROR } from '@/lib/auth/errors';
import type { FormState } from '@/lib/auth/form-state';
import { getSessionState } from '@/lib/auth/session';
import { readPublicEnv } from '@/lib/env/public';
import { AuditError, auditAccess } from '@/lib/server/audit';
import { createClient } from '@/lib/supabase/server';
import { firstFieldErrors } from '@/lib/validation/journal';
import { sessionNoteFieldsFromForm, sessionNoteSchema } from '@/lib/validation/psychologist';

/**
 * Server Action portal psikolog. Peran dicek dari database, lalu database menegakkan sisanya:
 * RLS + `can_view()` (butuh sesi aal2) menentukan baris mana yang bisa disentuh, dan penjaga trigger
 * membatasi kolom yang boleh diubah (alert: hanya status; konsultasi: hanya catatan sesi).
 */

const SESSION_ENDED = 'Sesimu sudah berakhir. Masuk lagi untuk melanjutkan.';
const NOT_ALLOWED = 'Kamu tidak punya izin untuk data ini. Klien mungkin sudah mencabut aksesnya.';

const alertIdSchema = z.uuid({ error: 'Peringatan tidak ditemukan.' });

async function psychologistContext() {
  if (!readPublicEnv().ok) return { error: NOT_CONFIGURED_ERROR } as const;
  const session = await getSessionState();
  if (session.status !== 'ok' || session.profile.role !== 'psychologist') {
    return { error: SESSION_ENDED } as const;
  }
  return { supabase: await createClient() } as const;
}

// ─── Tandai alert krisis sudah ditangani ──────────────────────────────────────
export async function acknowledgeAlertAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = alertIdSchema.safeParse(formData.get('id'));
  if (!id.success) return { status: 'error', message: id.error.issues[0]!.message };

  const ctx = await psychologistContext();
  if ('error' in ctx) return { status: 'error', message: ctx.error };

  try {
    // Baca dulu: RLS hanya mengembalikan alert milik klien yang berizin (dan sesi aal2).
    const { data: alert, error } = await ctx.supabase
      .from('crisis_alerts')
      .select('user_id, status')
      .eq('id', id.data)
      .maybeSingle();
    if (error) return { status: 'error', message: GENERIC_ERROR };
    if (!alert) return { status: 'error', message: NOT_ALLOWED };
    if (alert.status !== 'open') {
      return { status: 'success', message: 'Peringatan ini sudah ditandai ditangani.' };
    }

    // Catat dulu (gagal tertutup), baru ubah.
    await auditAccess(alert.user_id, 'crisis_alerts', 'acknowledge');
    const { data: updated, error: updateError } = await ctx.supabase
      .from('crisis_alerts')
      .update({ status: 'resolved' })
      .eq('id', id.data)
      .eq('status', 'open')
      .select('id');
    if (updateError) return { status: 'error', message: GENERIC_ERROR };
    if (!updated || updated.length === 0) return { status: 'error', message: NOT_ALLOWED };
  } catch (error) {
    if (error instanceof AuditError) return { status: 'error', message: GENERIC_ERROR };
    return { status: 'error', message: NETWORK_ERROR };
  }

  revalidatePath('/psikolog');
  return { status: 'success', message: 'Peringatan ditandai sudah ditangani.' };
}

// ─── Catatan sesi ─────────────────────────────────────────────────────────────
export async function saveSessionNoteAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = sessionNoteFieldsFromForm(formData);
  const values = {
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    notesForPatient: typeof raw.notesForPatient === 'string' ? raw.notesForPatient : '',
  };
  const parsed = sessionNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', fieldErrors: firstFieldErrors(parsed.error), values };
  }

  const ctx = await psychologistContext();
  if ('error' in ctx) return { status: 'error', message: ctx.error, values };

  try {
    // Hanya dua kolom ini yang dikirim; penjaga trigger di database menolak kolom lain.
    const { data, error } = await ctx.supabase
      .from('consultations')
      .update({
        session_summary: parsed.data.summary,
        notes_for_patient: parsed.data.notesForPatient,
      })
      .eq('id', parsed.data.consultationId)
      .select('id');
    if (error) return { status: 'error', message: GENERIC_ERROR, values };
    if (!data || data.length === 0) return { status: 'error', message: NOT_ALLOWED, values };
  } catch {
    return { status: 'error', message: NETWORK_ERROR, values };
  }

  revalidatePath('/psikolog/klien');
  return { status: 'success', message: 'Catatan sesi tersimpan.' };
}
