import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api/errors';
import { toAssessmentItem } from '@/lib/api/services/assessments';
import { observationFromAssessment } from '@/lib/domain/fhir/observation';
import type { SatusehatClient } from '@/lib/server/satusehat-client';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Sinkronisasi hasil skrining ke SATUSEHAT atas PERSETUJUAN dan PILIHAN pengguna.
 *
 * Aturan yang ditegakkan di sini (urutannya penting):
 *   1. Persetujuan (`profiles.satusehat_consent`) harus menyala; bila tidak, tidak ada yang dikirim.
 *   2. Hanya hasil skrining YANG DIPILIH pengguna (maks. 10) dan HANYA milik pengguna itu (`user_id` eksplisit).
 *   3. Yang sudah terkirim tidak dikirim ulang (idempoten).
 *   4. Yang dikirim hanya skor total dan kategori (pemeta FHIR), tidak pernah jawaban per butir.
 *   5. Tiap percobaan dicatat di `satusehat_sync_log`; galat disimpan sebagai pesan umum, bukan isi respons.
 *
 * Pembacaan memakai klien pengguna (RLS). Penulisan log dan penanda `sent_to_satusehat` lewat `store`
 * (service role, lihat satusehat-store.ts) karena tabel log tidak punya policy tulis untuk pengguna.
 */

export type SyncStatus = 'synced' | 'already_synced' | 'failed' | 'not_found';

export interface SyncItemResult {
  assessmentId: string;
  status: SyncStatus;
  satusehatId: string | null;
  message: string | null;
}

export interface SyncStore {
  /** id hasil skrining milik `userId` yang sudah tercatat `synced`. */
  findSynced(userId: string, assessmentIds: readonly string[]): Promise<Map<string, string>>;
  recordSynced(entry: { userId: string; assessmentId: string; satusehatId: string }): Promise<void>;
  recordFailure(entry: {
    userId: string;
    assessmentId: string;
    message: string;
    retryable: boolean;
    retryAfterSeconds?: number;
  }): Promise<void>;
}

export interface SyncInput {
  supabase: SupabaseClient<Database>;
  userId: string;
  assessmentIds: readonly string[];
  client: SatusehatClient;
  store: SyncStore;
  now?: Date;
}

/** Referensi pasien. Mock memakai pseudonim lokal; staging butuh nomor IHS yang belum bisa kita peroleh. */
function patientRefFor(client: SatusehatClient, userId: string): string | null {
  if (client.mode === 'mock') return `Patient/mock-${userId.slice(0, 8)}`;
  // Staging butuh id Patient SATUSEHAT (nomor IHS dari pencarian NIK). Mindra belum menyimpan NIK dalam
  // bentuk yang bisa dipakai server web (aplikasi Flutter menyimpannya terenkripsi di sisi aplikasi).
  return null;
}

export async function syncAssessmentsToSatusehat(input: SyncInput): Promise<SyncItemResult[]> {
  const { supabase, userId, client, store } = input;
  const ids = [...new Set(input.assessmentIds)];

  // 1. Persetujuan.
  const consent = await supabase
    .from('profiles')
    .select('satusehat_consent')
    .eq('id', userId)
    .maybeSingle();
  if (consent.error) throw new ApiError('internal_error');
  if (consent.data?.satusehat_consent !== true) {
    throw new ApiError(
      'forbidden',
      'Sinkronisasi SATUSEHAT belum kamu izinkan. Nyalakan di halaman Privasi dan izin.',
    );
  }

  // 2. Hanya milik pengguna ini.
  const { data, error } = await supabase
    .from('assessments')
    .select('id, type, total_score, category, completed_at')
    .eq('user_id', userId)
    .in('id', ids);
  if (error) throw new ApiError('internal_error');
  const owned = new Map((data ?? []).map((row) => [row.id, row]));

  // 3. Idempotensi.
  const alreadySynced = await store.findSynced(userId, ids);

  const issuedAt = (input.now ?? new Date()).toISOString();
  const patientRef = patientRefFor(client, userId);
  const results: SyncItemResult[] = [];

  for (const assessmentId of ids) {
    const row = owned.get(assessmentId);
    const item = row ? toAssessmentItem(row) : null;
    if (!row || !item) {
      results.push({
        assessmentId,
        status: 'not_found',
        satusehatId: null,
        message: 'Hasil skrining tidak ditemukan.',
      });
      continue;
    }

    const existing = alreadySynced.get(assessmentId);
    if (existing) {
      results.push({
        assessmentId,
        status: 'already_synced',
        satusehatId: existing,
        message: null,
      });
      continue;
    }

    if (!patientRef) {
      const message =
        'Nomor IHS belum tersedia, jadi hasil ini belum bisa dikirim ke SATUSEHAT staging.';
      await store.recordFailure({ userId, assessmentId, message, retryable: false });
      results.push({ assessmentId, status: 'failed', satusehatId: null, message });
      continue;
    }

    const observation = observationFromAssessment(
      {
        id: item.id,
        type: item.type,
        score: item.totalScore,
        category: item.category,
        completedAt: item.completedAt,
      },
      {
        patientRef,
        issuedAt,
        mode: 'create',
        ...(client.organizationId ? { organizationId: client.organizationId } : {}),
      },
    );

    const outcome = await client.createObservation(observation);
    if (outcome.ok) {
      await store.recordSynced({ userId, assessmentId, satusehatId: outcome.id });
      results.push({ assessmentId, status: 'synced', satusehatId: outcome.id, message: null });
    } else {
      const retryable = outcome.kind === 'transient';
      await store.recordFailure({
        userId,
        assessmentId,
        message: outcome.message,
        retryable,
        ...(outcome.retryAfterSeconds ? { retryAfterSeconds: outcome.retryAfterSeconds } : {}),
      });
      results.push({ assessmentId, status: 'failed', satusehatId: null, message: outcome.message });
    }
  }

  return results;
}
