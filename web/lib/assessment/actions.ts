'use server';

import { revalidatePath } from 'next/cache';
import { prepareAssessment } from '@/lib/assessment/prepare';
import type { SubmitAssessmentResult } from '@/lib/assessment/result';
import { insertAssessment } from '@/lib/assessment/submit';
import { GENERIC_ERROR, NETWORK_ERROR, NOT_CONFIGURED_ERROR } from '@/lib/auth/errors';
import { getSessionState } from '@/lib/auth/session';
import { readPublicEnv } from '@/lib/env/public';
import { createClient } from '@/lib/supabase/server';

const SESSION_ENDED = 'Sesimu sudah berakhir. Masuk lagi untuk menyimpan hasilnya.';
const TOO_MANY =
  'Kamu sudah mengisi cukup banyak skrining dalam satu jam terakhir. Coba lagi nanti.';

/**
 * Menyimpan hasil asesmen. Urutan: validasi + skoring di server (lib/assessment/prepare) → sesi →
 * batas laju → simpan lewat klien sesi pengguna (RLS). Skor/kategori dari klien tidak pernah dipakai;
 * database pun menghitung ulang dan menolak jawaban tidak lengkap (migrasi assessment_integrity).
 * Alert krisis dibuat trigger database dari jawaban yang tersimpan, bukan dari kode ini.
 *
 * Tidak ada data jawaban/skor yang dicatat ke log.
 */
export async function submitAssessmentAction(input: unknown): Promise<SubmitAssessmentResult> {
  const prepared = prepareAssessment(input);
  if (!prepared.ok) return { status: 'error', message: prepared.message };
  if (!readPublicEnv().ok) return { status: 'error', message: NOT_CONFIGURED_ERROR };

  const session = await getSessionState();
  if (session.status !== 'ok') return { status: 'error', message: SESSION_ENDED };

  try {
    const supabase = await createClient();
    const outcome = await insertAssessment(supabase, session.profile.id, prepared.row);
    if (!outcome.ok) {
      return {
        status: 'error',
        message: outcome.reason === 'too_many' ? TOO_MANY : GENERIC_ERROR,
      };
    }

    revalidatePath('/beranda');
    revalidatePath('/asesmen');
    return { status: 'ok', id: outcome.id };
  } catch {
    return { status: 'error', message: NETWORK_ERROR };
  }
}
