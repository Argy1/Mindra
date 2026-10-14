import 'server-only';
import { buildCaregiverPatientView, type CaregiverPatientView } from '@/lib/domain/caregiver/view';
import { readPermissions, type CaregiverPermissions } from '@/lib/domain/privacy/permissions';
import { auditAccess } from '@/lib/server/audit';
import { createClient } from '@/lib/supabase/server';
import { addDaysToKey, dateKeyWib } from '@/lib/utils/date';

/**
 * Pembacaan data pasien untuk pendamping. Relasi dibaca lewat RLS (pendamping hanya melihat barisnya
 * sendiri, lihat migrasi pengerasan), nama pasien lewat RPC `caregiver_patient_names` (tidak pernah
 * baris profil), dan tiap jenis data dicatat ke jejak akses sebelum dibaca.
 */

export interface CaregiverPatient {
  relationshipId: string;
  patientId: string;
  name: string;
  permissions: CaregiverPermissions;
  /** ISO. */
  since: string;
}

export async function getCaregiverPatients(caregiverId: string): Promise<CaregiverPatient[]> {
  const supabase = await createClient();
  const [relationships, names] = await Promise.all([
    supabase
      .from('caregiver_relationships')
      .select('id, patient_id, permissions, created_at')
      .eq('caregiver_id', caregiverId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase.rpc('caregiver_patient_names'),
  ]);
  if (relationships.error || names.error)
    throw new Error('Gagal memuat daftar orang yang kamu dampingi.');

  const nameById = new Map((names.data ?? []).map((row) => [row.patient_id, row.name]));
  return (relationships.data ?? []).map((row) => ({
    relationshipId: row.id,
    patientId: row.patient_id,
    name: nameById.get(row.patient_id) ?? 'Pengguna Mindra',
    permissions: readPermissions('caregiver', row.permissions),
    since: row.created_at,
  }));
}

export interface CaregiverPatientDetail {
  patient: CaregiverPatient;
  view: CaregiverPatientView;
}

/** Tampilan satu pasien, atau null bila bukan pasien aktif pendamping ini (halaman menampilkan 404). */
export async function getCaregiverPatientDetail(
  caregiverId: string,
  patientId: string,
  now: Date = new Date(),
): Promise<CaregiverPatientDetail | null> {
  const patients = await getCaregiverPatients(caregiverId);
  const patient = patients.find((candidate) => candidate.patientId === patientId);
  if (!patient) return null;
  const { permissions } = patient;

  // Catat dulu, hanya jenis data yang diizinkan (sama dengan pemetaan `can_view` untuk pendamping).
  if (permissions.mood_daily) await auditAccess(patientId, 'mood');
  if (permissions.assessment_results) await auditAccess(patientId, 'assessments');
  if (permissions.emergency_alerts) await auditAccess(patientId, 'crisis_alerts');

  const today = dateKeyWib(now);
  const since = `${addDaysToKey(today, -7)}T00:00:00+07:00`;
  const supabase = await createClient();

  const [moods, assessment, alerts] = await Promise.all([
    permissions.mood_daily
      ? supabase
          .from('mood_entries')
          .select('mood_type, created_at')
          .eq('user_id', patientId)
          .gte('created_at', since)
          .order('created_at', { ascending: true })
          .limit(200)
      : null,
    permissions.assessment_results
      ? supabase
          .from('assessments')
          .select('type, category, completed_at')
          .eq('user_id', patientId)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : null,
    permissions.emergency_alerts
      ? supabase
          .from('crisis_alerts')
          .select('severity, created_at')
          .eq('user_id', patientId)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(10)
      : null,
  ]);
  for (const result of [moods, assessment, alerts]) {
    if (result?.error) throw new Error('Gagal memuat data orang yang kamu dampingi.');
  }

  return {
    patient,
    view: buildCaregiverPatientView({
      permissions,
      today,
      moods: moods?.data ?? [],
      latestAssessment: assessment?.data ?? null,
      openAlerts: alerts?.data ?? [],
    }),
  };
}
