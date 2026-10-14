import 'server-only';
import { isApiScope, type ApiScope } from '@/lib/api/keys';
import type { ApiClientRecord } from '@/lib/api/auth';
import { createServiceClient } from '@/lib/server/supabase-service';

/**
 * Pencarian klien API berdasarkan hash kunci. Memakai service role karena pemanggilnya belum punya sesi
 * pengguna (sistem mitra) dan RLS `api_clients` hanya membuka baris milik pemiliknya. Ini salah satu
 * kasus service role yang terdokumentasi (lihat supabase-service.ts). Yang dibaca HANYA kolom yang
 * dibutuhkan untuk keputusan akses, dan kunci yang sudah dicabut diperlakukan seperti tidak ada.
 */

/** Perbarui `last_used_at` paling sering sekali per menit per kunci (hemat tulisan). */
const TOUCH_INTERVAL_MS = 60_000;
const lastTouched = new Map<string, number>();

export async function findApiClientByHash(hash: string): Promise<ApiClientRecord | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('api_clients')
    .select('id, facility_id, scopes, key_prefix, revoked_at')
    .eq('key_hash', hash)
    .maybeSingle();
  if (error) throw new Error('api_client_lookup_failed');
  if (!data || data.revoked_at) return null;

  const scopes: ApiScope[] = (data.scopes ?? []).filter(isApiScope);
  return { id: data.id, facilityId: data.facility_id, scopes, keyPrefix: data.key_prefix };
}

export async function touchApiClient(id: string, now: number = Date.now()): Promise<void> {
  const previous = lastTouched.get(id);
  if (previous !== undefined && now - previous < TOUCH_INTERVAL_MS) return;
  lastTouched.set(id, now);

  const supabase = createServiceClient();
  await supabase
    .from('api_clients')
    .update({ last_used_at: new Date(now).toISOString() })
    .eq('id', id);
}
