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
}

export interface ReviewRecord {
  id: number;
  action: 'approve_psychologist' | 'reject_psychologist';
  targetName: string;
  createdAt: string;
}

export async function getPendingPsychologists(): Promise<PendingPsychologist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_pending_psychologists');
  if (error) throw new Error('Antrean tidak bisa dibaca.');
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
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
