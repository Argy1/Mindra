'use server';

import { revalidatePath } from 'next/cache';
import { generateApiKey } from '@/lib/api/keys';
import { GENERIC_ERROR, NETWORK_ERROR, NOT_CONFIGURED_ERROR } from '@/lib/auth/errors';
import type { FormState } from '@/lib/auth/form-state';
import { currentMfaDecision } from '@/lib/auth/mfa-server';
import { getSessionState } from '@/lib/auth/session';
import { readPublicEnv } from '@/lib/env/public';
import { createClient } from '@/lib/supabase/server';
import { firstFieldErrors } from '@/lib/validation/journal';
import {
  apiKeyIdSchema,
  createApiKeyFieldsFromForm,
  createApiKeySchema,
  MAX_ACTIVE_API_KEYS,
} from '@/lib/validation/faskes';

/**
 * Server Action manajemen kunci API admin faskes. Peran dicek dari database; lalu RLS dan penjaga trigger
 * menegakkan sisanya: kunci hanya bisa dibuat untuk faskes yang dikelola pembuatnya, dan hanya bisa DICABUT
 * (tidak diubah, tidak dihidupkan lagi).
 *
 * Kunci utuh dibuat di sini, dikembalikan SEKALI ke pemanggil, dan tidak pernah disimpan atau dicatat:
 * yang disimpan hanya hash SHA-256 dan 8 karakter pengenal.
 */

const SESSION_ENDED = 'Sesimu sudah berakhir. Masuk lagi untuk mengelola kunci API.';
const NOT_ALLOWED = 'Kamu tidak berhak membuat kunci untuk faskes ini.';
const MFA_NEEDED =
  'Selesaikan verifikasi dua langkah dulu. Buka Keamanan akun untuk memasang atau memasukkan kodenya.';

async function facilityAdminContext() {
  if (!readPublicEnv().ok) return { error: NOT_CONFIGURED_ERROR } as const;
  const session = await getSessionState();
  if (session.status !== 'ok' || session.profile.role !== 'facility_admin') {
    return { error: SESSION_ENDED } as const;
  }
  // Lapis kedua setelah gerbang halaman; database juga menolak tulisan `api_clients` dari sesi aal1.
  if ((await currentMfaDecision('facility_admin')) !== 'ok') return { error: MFA_NEEDED } as const;
  return { userId: session.profile.id, supabase: await createClient() } as const;
}

// ─── Buat kunci ───────────────────────────────────────────────────────────────
export async function createApiKeyAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = createApiKeyFieldsFromForm(formData);
  const values = {
    name: typeof raw.name === 'string' ? raw.name : '',
    facilityId: typeof raw.facilityId === 'string' ? raw.facilityId : '',
  };
  const parsed = createApiKeySchema.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', fieldErrors: firstFieldErrors(parsed.error), values };
  }

  const ctx = await facilityAdminContext();
  if ('error' in ctx) return { status: 'error', message: ctx.error, values };

  try {
    const { count, error: countError } = await ctx.supabase
      .from('api_clients')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ctx.userId)
      .is('revoked_at', null);
    if (countError) return { status: 'error', message: GENERIC_ERROR, values };
    if ((count ?? 0) >= MAX_ACTIVE_API_KEYS) {
      return {
        status: 'error',
        message: `Kamu sudah punya ${MAX_ACTIVE_API_KEYS} kunci aktif. Cabut yang tidak dipakai dulu.`,
        values,
      };
    }

    const key = generateApiKey();
    const { error } = await ctx.supabase.from('api_clients').insert({
      name: parsed.data.name,
      owner_id: ctx.userId,
      facility_id: parsed.data.facilityId,
      key_prefix: key.prefix,
      key_hash: key.hash,
      scopes: ['aggregates:read'],
    });
    if (error) {
      return {
        status: 'error',
        message: error.code === '42501' ? NOT_ALLOWED : GENERIC_ERROR,
        values,
      };
    }

    revalidatePath('/faskes/kunci-api');
    return {
      status: 'success',
      message: 'Kunci dibuat. Salin dan simpan sekarang: kunci ini tidak akan ditampilkan lagi.',
      // Hanya `apiKey` yang dikembalikan; nama dan faskes sudah tersimpan di daftar.
      values: { apiKey: key.key },
    };
  } catch {
    return { status: 'error', message: NETWORK_ERROR, values };
  }
}

// ─── Cabut kunci ──────────────────────────────────────────────────────────────
export async function revokeApiKeyAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = apiKeyIdSchema.safeParse(formData.get('id'));
  if (!id.success)
    return { status: 'error', message: id.error.issues[0]?.message ?? GENERIC_ERROR };

  const ctx = await facilityAdminContext();
  if ('error' in ctx) return { status: 'error', message: ctx.error };

  try {
    const { data, error } = await ctx.supabase
      .from('api_clients')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id.data)
      .eq('owner_id', ctx.userId)
      .is('revoked_at', null)
      .select('id');
    if (error) return { status: 'error', message: GENERIC_ERROR };
    if (!data || data.length === 0) {
      return { status: 'error', message: 'Kunci tidak ditemukan atau sudah dicabut.' };
    }
  } catch {
    return { status: 'error', message: NETWORK_ERROR };
  }

  revalidatePath('/faskes/kunci-api');
  return { status: 'success', message: 'Kunci dicabut. Sistem yang memakainya langsung ditolak.' };
}
