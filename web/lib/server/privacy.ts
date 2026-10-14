import 'server-only';
import type { AccessLogEntry } from '@/lib/domain/privacy/access-log';
import {
  readPermissions,
  type CaregiverPermissions,
  type PsychologistPermissions,
} from '@/lib/domain/privacy/permissions';
import { createClient } from '@/lib/supabase/server';

/** Data untuk halaman /privasi. Semua lewat klien sesi dan RPC milik pemanggil (tidak ada data orang lain). */

export interface PsychologistLink {
  id: string;
  psychologistId: string;
  /** Nama lengkap dengan gelar; null bila psikolognya tidak aktif lagi. */
  name: string | null;
  consentedAt: string;
  permissions: PsychologistPermissions;
}

export interface CaregiverLink {
  id: string;
  status: 'active' | 'pending';
  /** null untuk undangan yang belum diterima. */
  name: string | null;
  phone: string | null;
  inviteCode: string | null;
  createdAt: string;
  permissions: CaregiverPermissions;
}

export interface PrivacyOverview {
  psychologists: PsychologistLink[];
  caregivers: CaregiverLink[];
  accessLog: AccessLogEntry[];
  satusehatConsent: boolean;
}

export async function getAccessLog(limit = 50): Promise<AccessLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('my_access_log', { p_limit: limit });
  if (error) throw new Error('Gagal memuat riwayat akses.');
  return (data ?? []).map((row) => ({
    id: row.id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    resource: row.resource,
    action: row.action,
    createdAt: row.created_at,
  }));
}

export async function getPrivacyOverview(userId: string): Promise<PrivacyOverview> {
  const supabase = await createClient();
  const [links, caregivers, accessLog, profile] = await Promise.all([
    supabase
      .from('care_links')
      .select('id, psychologist_id, consented_at, permissions, psychologists(full_name, title)')
      .eq('patient_id', userId)
      .eq('status', 'active')
      .order('consented_at', { ascending: false }),
    supabase.rpc('patient_caregivers'),
    getAccessLog(50),
    supabase.from('profiles').select('satusehat_consent').eq('id', userId).maybeSingle(),
  ]);
  if (links.error || caregivers.error || profile.error) {
    throw new Error('Gagal memuat pengaturan privasi.');
  }

  return {
    psychologists: (links.data ?? []).map((row) => ({
      id: row.id,
      psychologistId: row.psychologist_id,
      name: row.psychologists?.full_name ?? null,
      consentedAt: row.consented_at,
      permissions: readPermissions('psychologist', row.permissions),
    })),
    caregivers: (caregivers.data ?? []).flatMap((row) =>
      row.status === 'active' || row.status === 'pending'
        ? [
            {
              id: row.id,
              status: row.status,
              name: row.caregiver_name,
              phone: row.caregiver_phone,
              inviteCode: row.invite_code,
              createdAt: row.created_at,
              permissions: readPermissions('caregiver', row.permissions),
            } satisfies CaregiverLink,
          ]
        : [],
    ),
    accessLog,
    satusehatConsent: profile.data?.satusehat_consent ?? false,
  };
}

export interface ConnectablePsychologist {
  id: string;
  name: string;
  specializations: string[];
}

/** Psikolog aktif yang belum terhubung dengan pengguna ini. */
export async function getConnectablePsychologists(
  linkedIds: readonly string[],
): Promise<ConnectablePsychologist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('psychologists')
    .select('id, full_name, specializations')
    .eq('is_active', true)
    .order('full_name')
    .limit(50);
  if (error) throw new Error('Gagal memuat daftar psikolog.');
  const linked = new Set(linkedIds);
  return (data ?? [])
    .filter((row) => !linked.has(row.id))
    .map((row) => ({ id: row.id, name: row.full_name, specializations: row.specializations }));
}
