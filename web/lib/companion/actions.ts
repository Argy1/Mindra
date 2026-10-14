'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { GENERIC_ERROR, NETWORK_ERROR, NOT_CONFIGURED_ERROR } from '@/lib/auth/errors';
import type { FormState } from '@/lib/auth/form-state';
import { getSessionState } from '@/lib/auth/session';
import { readPublicEnv } from '@/lib/env/public';
import { createClient } from '@/lib/supabase/server';

/**
 * Hapus satu percakapan Teman cerita milik sendiri. Hak pengguna atas datanya: penghapusan benar-benar
 * menghapus baris (bukan menandainya). RLS dan penyaring `user_id` memastikan hanya milik pemanggil.
 * Peringatan krisis yang sempat dibuat TIDAK ikut dihapus: itu catatan keselamatan, bukan isi percakapan.
 */

const conversationIdSchema = z.uuid({ error: 'Percakapan tidak valid.' });
const SESSION_ENDED = 'Sesimu sudah berakhir. Masuk lagi untuk menghapus percakapan.';

export async function deleteConversationAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = conversationIdSchema.safeParse(formData.get('id'));
  if (!id.success)
    return { status: 'error', message: id.error.issues[0]?.message ?? GENERIC_ERROR };

  if (!readPublicEnv().ok) return { status: 'error', message: NOT_CONFIGURED_ERROR };
  const session = await getSessionState();
  if (session.status !== 'ok' || session.profile.role !== 'user') {
    return { status: 'error', message: SESSION_ENDED };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', id.data)
      .eq('user_id', session.profile.id)
      .select('id');
    if (error) return { status: 'error', message: GENERIC_ERROR };
    if (!data || data.length === 0) {
      return { status: 'error', message: 'Percakapan itu sudah tidak ada.' };
    }
  } catch {
    return { status: 'error', message: NETWORK_ERROR };
  }

  revalidatePath('/teman-cerita');
  redirect('/teman-cerita');
}
