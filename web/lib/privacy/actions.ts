'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { GENERIC_ERROR, NETWORK_ERROR, NOT_CONFIGURED_ERROR } from '@/lib/auth/errors';
import type { FormState } from '@/lib/auth/form-state';
import { getSessionState } from '@/lib/auth/session';
import {
  DEFAULT_CAREGIVER_PERMISSIONS,
  DEFAULT_PSYCHOLOGIST_PERMISSIONS,
  readPermissions,
  setPermissionSchema,
} from '@/lib/domain/privacy/permissions';
import { readPublicEnv } from '@/lib/env/public';
import { createClient } from '@/lib/supabase/server';
import { firstFieldErrors } from '@/lib/validation/journal';
import { generateInviteCode, phoneSchema } from '@/lib/validation/privacy';

/**
 * Server Action halaman /privasi. Semua tindakan hanya untuk PASIEN pemilik data: id sesi dipakai di
 * setiap kueri (selain RLS), dan database menolak yang lain. Perubahan izin berlaku seketika karena
 * `can_view()` membaca `permissions` di setiap kueri. Tidak ada isi data kesehatan yang dicatat ke log.
 */

export type PrivacyResult =
  { status: 'ok'; message?: string } | { status: 'error'; message: string };

const SESSION_ENDED = 'Sesimu sudah berakhir. Masuk lagi untuk mengubah izin.';
const ok = (message?: string): PrivacyResult =>
  message ? { status: 'ok', message } : { status: 'ok' };
const fail = (message: string): PrivacyResult => ({ status: 'error', message });

type Context =
  | { ok: false; error: string }
  | { ok: true; userId: string; supabase: Awaited<ReturnType<typeof createClient>> };

async function context(): Promise<Context> {
  if (!readPublicEnv().ok) return { ok: false, error: NOT_CONFIGURED_ERROR };
  const session = await getSessionState();
  if (session.status !== 'ok') return { ok: false, error: SESSION_ENDED };
  return { ok: true, userId: session.profile.id, supabase: await createClient() };
}

function revalidatePrivacy() {
  revalidatePath('/privasi');
  revalidatePath('/beranda');
}

// ─── Ubah satu izin ───────────────────────────────────────────────────────────
export async function setPermissionAction(input: unknown): Promise<PrivacyResult> {
  const parsed = setPermissionSchema.safeParse(input);
  if (!parsed.success) return fail('Permintaan tidak valid. Muat ulang halaman lalu coba lagi.');
  const { kind, id, key, enabled } = parsed.data;

  const ctx = await context();
  if (!ctx.ok) return fail(ctx.error);

  try {
    if (kind === 'psychologist') {
      const { data: row, error } = await ctx.supabase
        .from('care_links')
        .select('permissions')
        .eq('id', id)
        .eq('patient_id', ctx.userId)
        .eq('status', 'active')
        .maybeSingle();
      if (error) return fail(GENERIC_ERROR);
      if (!row) return fail('Izin ini tidak ditemukan atau sudah dicabut.');
      // Tulis ulang SELURUH objek izin (kunci lain tidak hilang, nilai aneh dinormalkan).
      const next = { ...readPermissions('psychologist', row.permissions), [key]: enabled };
      const { error: updateError } = await ctx.supabase
        .from('care_links')
        .update({ permissions: next })
        .eq('id', id)
        .eq('patient_id', ctx.userId);
      if (updateError) return fail(GENERIC_ERROR);
    } else {
      const { data: row, error } = await ctx.supabase
        .from('caregiver_relationships')
        .select('permissions')
        .eq('id', id)
        .eq('patient_id', ctx.userId)
        .in('status', ['active', 'pending'])
        .maybeSingle();
      if (error) return fail(GENERIC_ERROR);
      if (!row) return fail('Izin ini tidak ditemukan atau sudah dicabut.');
      const next = { ...readPermissions('caregiver', row.permissions), [key]: enabled };
      const { error: updateError } = await ctx.supabase
        .from('caregiver_relationships')
        .update({ permissions: next })
        .eq('id', id)
        .eq('patient_id', ctx.userId);
      if (updateError) return fail(GENERIC_ERROR);
    }
  } catch {
    return fail(NETWORK_ERROR);
  }

  revalidatePrivacy();
  return ok();
}

const idSchema = z.uuid({ error: 'Permintaan tidak valid.' });

// ─── Cabut akses ──────────────────────────────────────────────────────────────
export async function revokeCareLinkAction(rawId: unknown): Promise<PrivacyResult> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return fail(id.error.issues[0]!.message);
  const ctx = await context();
  if (!ctx.ok) return fail(ctx.error);
  try {
    const { data, error } = await ctx.supabase
      .from('care_links')
      .update({ status: 'revoked' })
      .eq('id', id.data)
      .eq('patient_id', ctx.userId)
      .eq('status', 'active')
      .select('id');
    if (error) return fail(GENERIC_ERROR);
    if (!data || data.length === 0) return fail('Izin ini tidak ditemukan atau sudah dicabut.');
  } catch {
    return fail(NETWORK_ERROR);
  }
  revalidatePrivacy();
  return ok('Akses psikolog dicabut. Mulai sekarang ia tidak bisa membuka datamu.');
}

export async function revokeCaregiverAction(rawId: unknown): Promise<PrivacyResult> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return fail(id.error.issues[0]!.message);
  const ctx = await context();
  if (!ctx.ok) return fail(ctx.error);
  try {
    const { data: row } = await ctx.supabase
      .from('caregiver_relationships')
      .select('status')
      .eq('id', id.data)
      .eq('patient_id', ctx.userId)
      .maybeSingle();
    if (!row) return fail('Pendamping ini tidak ditemukan.');
    // Undangan yang belum diterima dihapus; pendamping aktif dicabut (riwayat tetap ada).
    const result =
      row.status === 'pending'
        ? await ctx.supabase
            .from('caregiver_relationships')
            .delete()
            .eq('id', id.data)
            .eq('patient_id', ctx.userId)
        : await ctx.supabase
            .from('caregiver_relationships')
            .update({ status: 'revoked' })
            .eq('id', id.data)
            .eq('patient_id', ctx.userId);
    if (result.error) return fail(GENERIC_ERROR);
  } catch {
    return fail(NETWORK_ERROR);
  }
  revalidatePrivacy();
  return ok('Pendamping dihapus. Mulai sekarang ia tidak bisa melihat datamu.');
}

// ─── Hubungkan psikolog ───────────────────────────────────────────────────────
export async function connectPsychologistAction(rawId: unknown): Promise<PrivacyResult> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return fail(id.error.issues[0]!.message);
  const ctx = await context();
  if (!ctx.ok) return fail(ctx.error);

  try {
    const { error } = await ctx.supabase.from('care_links').insert({
      patient_id: ctx.userId,
      psychologist_id: id.data,
      permissions: DEFAULT_PSYCHOLOGIST_PERMISSIONS,
      status: 'active',
    });
    if (error?.code === '23505') {
      // Sudah pernah terhubung lalu dicabut: aktifkan lagi dengan izin awal (persetujuan baru).
      const { data, error: reactivateError } = await ctx.supabase
        .from('care_links')
        .update({ status: 'active', permissions: DEFAULT_PSYCHOLOGIST_PERMISSIONS })
        .eq('patient_id', ctx.userId)
        .eq('psychologist_id', id.data)
        .eq('status', 'revoked')
        .select('id');
      if (reactivateError) return fail(GENERIC_ERROR);
      if (!data || data.length === 0) return fail('Kamu sudah terhubung dengan psikolog ini.');
    } else if (error) {
      return fail(
        error.code === '42501' ? 'Psikolog ini tidak tersedia untuk dihubungkan.' : GENERIC_ERROR,
      );
    }
  } catch {
    return fail(NETWORK_ERROR);
  }
  revalidatePrivacy();
  return ok('Psikolog terhubung. Atur data apa saja yang ia boleh lihat di bawah ini.');
}

// ─── Undang pendamping ────────────────────────────────────────────────────────
export async function inviteCaregiverAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const rawPhone = formData.get('phone');
  const phone = phoneSchema.safeParse(typeof rawPhone === 'string' ? rawPhone : '');
  if (!phone.success) {
    return {
      status: 'error',
      fieldErrors: firstFieldErrors(
        new z.ZodError(phone.error.issues.map((issue) => ({ ...issue, path: ['phone'] }))),
      ),
      values: { phone: typeof rawPhone === 'string' ? rawPhone : '' },
    };
  }

  const ctx = await context();
  if (!ctx.ok) return { status: 'error', message: ctx.error };

  try {
    // Server database menimpa kode ini dengan kodenya sendiri (trigger); dibaca balik di bawah.
    const { data, error } = await ctx.supabase
      .from('caregiver_relationships')
      .insert({
        patient_id: ctx.userId,
        caregiver_phone: phone.data,
        invite_code: generateInviteCode(),
        status: 'pending',
        permissions: DEFAULT_CAREGIVER_PERMISSIONS,
      })
      .select('invite_code')
      .single();
    if (error || !data) return { status: 'error', message: GENERIC_ERROR };
    revalidatePrivacy();
    return {
      status: 'success',
      message: 'Undangan dibuat. Kirim kode ini ke pendampingmu.',
      values: { inviteCode: data.invite_code },
    };
  } catch {
    return { status: 'error', message: NETWORK_ERROR };
  }
}

// ─── SATUSEHAT ────────────────────────────────────────────────────────────────
export async function setSatusehatConsentAction(enabled: unknown): Promise<PrivacyResult> {
  if (typeof enabled !== 'boolean') return fail('Permintaan tidak valid.');
  const ctx = await context();
  if (!ctx.ok) return fail(ctx.error);
  try {
    const { error } = await ctx.supabase
      .from('profiles')
      .update({ satusehat_consent: enabled })
      .eq('id', ctx.userId);
    if (error) return fail(GENERIC_ERROR);
  } catch {
    return fail(NETWORK_ERROR);
  }
  revalidatePrivacy();
  return ok(
    enabled
      ? 'Sinkronisasi SATUSEHAT diizinkan. Tidak ada yang dikirim sebelum kamu memilih hasilnya.'
      : 'Sinkronisasi SATUSEHAT dimatikan.',
  );
}
