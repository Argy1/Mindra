import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * Pembacaan untuk portal admin. Semuanya lewat SESI admin: antrean memakai fungsi database yang mensyaratkan peran
 * admin dan sesi aal2 (42501 bila tidak), dan jejak keputusan dibaca lewat RLS `admin_actions` (aal2 juga). Tidak ada
 * klien service role dan tidak ada pembacaan catatan kesehatan siapa pun.
 */

export interface PendingPsychologist {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  /** Nomor STR yang diisi pemohon saat mendaftar (klaim untuk dicocokkan admin); null bila tidak diisi. */
  strNumber: string | null;
}

export interface ReviewRecord {
  id: number;
  action: 'approve_psychologist' | 'reject_psychologist';
  targetName: string;
  createdAt: string;
}

/** Kode galat PostgREST/Postgres bila fungsi belum ada (migrasi belum diterapkan): PGRST202 dan 42883. */
const MISSING_FUNCTION_CODES = new Set(['PGRST202', '42883']);

export async function getPendingPsychologists(): Promise<PendingPsychologist[]> {
  const supabase = await createClient();
  const applications = await supabase.rpc('admin_pending_psychologist_applications');
  if (!applications.error) {
    return (applications.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at,
      strNumber: row.str_number,
    }));
  }

  // Migrasi 20261016000000 belum diterapkan di database ini: antrean lama tetap terbaca (tanpa kolom STR), jadi
  // kode web boleh lebih dulu di-deploy daripada SQL-nya. Galat lain (mis. 42501 bukan admin) tidak ditutupi.
  if (!MISSING_FUNCTION_CODES.has(applications.error.code))
    throw new Error('Antrean tidak bisa dibaca.');
  const { data, error } = await supabase.rpc('admin_pending_psychologists');
  if (error) throw new Error('Antrean tidak bisa dibaca.');
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
    strNumber: null,
  }));
}

export async function getReviewHistory(limit = 15): Promise<ReviewRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_actions')
    .select('id, action, target_name, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error('Riwayat keputusan tidak bisa dibaca.');
  return (data ?? []).flatMap((row) =>
    row.action === 'approve_psychologist' || row.action === 'reject_psychologist'
      ? [{ id: row.id, action: row.action, targetName: row.target_name, createdAt: row.created_at }]
      : [],
  );
}
