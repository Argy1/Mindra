import 'server-only';
import type { SyncStore } from '@/lib/server/satusehat-sync';
import { createServiceClient } from '@/lib/server/supabase-service';

/**
 * Penyimpanan hasil sinkronisasi SATUSEHAT. Memakai service role karena `satusehat_sync_log` hanya punya
 * policy baca untuk pemilik (tulis hanya oleh sistem) dan penanda `assessments.sent_to_satusehat` diperbarui
 * setelah server mengonfirmasi. Ini kasus service role yang terdokumentasi (lihat supabase-service.ts).
 * Setiap kueri DIBATASI `user_id` yang sudah diautentikasi oleh pemanggil; id hasil skrining dari klien tidak
 * pernah dipercaya tanpa pasangan `user_id`.
 */

const RESOURCE_TYPE = 'Observation';
const MAX_ATTEMPTS = 5;

export const satusehatStore: SyncStore = {
  async findSynced(userId, assessmentIds) {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('satusehat_sync_log')
      .select('local_record_id, satusehat_id')
      .eq('user_id', userId)
      .eq('resource_type', RESOURCE_TYPE)
      .eq('sync_status', 'synced')
      .in('local_record_id', [...assessmentIds]);
    if (error) throw new Error('sync_log_read_failed');
    return new Map(
      (data ?? []).flatMap((row) =>
        row.satusehat_id ? [[row.local_record_id, row.satusehat_id] as const] : [],
      ),
    );
  },

  async recordSynced({ userId, assessmentId, satusehatId }) {
    const supabase = createServiceClient();
    await upsertLog(supabase, userId, assessmentId, {
      sync_status: 'synced',
      satusehat_id: satusehatId,
      synced_at: new Date().toISOString(),
      error_message: null,
      retry_after: null,
    });
    await supabase
      .from('assessments')
      .update({ sent_to_satusehat: true, satusehat_observation_id: satusehatId })
      .eq('id', assessmentId)
      .eq('user_id', userId);
  },

  async recordFailure({ userId, assessmentId, message, retryable, retryAfterSeconds }) {
    const supabase = createServiceClient();
    const retryAfter =
      retryable && retryAfterSeconds
        ? new Date(Date.now() + retryAfterSeconds * 1000).toISOString()
        : null;
    await upsertLog(supabase, userId, assessmentId, {
      sync_status: retryable ? 'pending' : 'failed',
      error_message: message,
      retry_after: retryAfter,
    });
  },
};

type ServiceClient = ReturnType<typeof createServiceClient>;

async function upsertLog(
  supabase: ServiceClient,
  userId: string,
  assessmentId: string,
  values: {
    sync_status: 'pending' | 'synced' | 'failed';
    satusehat_id?: string | null;
    synced_at?: string | null;
    error_message?: string | null;
    retry_after?: string | null;
  },
): Promise<void> {
  const existing = await supabase
    .from('satusehat_sync_log')
    .select('id, attempt_count')
    .eq('user_id', userId)
    .eq('resource_type', RESOURCE_TYPE)
    .eq('local_record_id', assessmentId)
    .maybeSingle();
  if (existing.error) throw new Error('sync_log_read_failed');

  if (existing.data) {
    const attempts = Math.min((existing.data.attempt_count ?? 0) + 1, MAX_ATTEMPTS);
    const { error } = await supabase
      .from('satusehat_sync_log')
      .update({ ...values, attempt_count: attempts })
      .eq('id', existing.data.id)
      .eq('user_id', userId);
    if (error) throw new Error('sync_log_write_failed');
    return;
  }

  const { error } = await supabase.from('satusehat_sync_log').insert({
    user_id: userId,
    resource_type: RESOURCE_TYPE,
    local_record_id: assessmentId,
    attempt_count: 1,
    ...values,
  });
  if (error) throw new Error('sync_log_write_failed');
}
