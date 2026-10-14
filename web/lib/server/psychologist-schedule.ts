import 'server-only';
import { scheduleWindow, type ScheduleItem } from '@/lib/domain/psychologist/schedule';
import { createClient } from '@/lib/supabase/server';

/**
 * Jadwal psikolog yang masuk, dari RPC `psychologist_schedule` (security definer; wajib sesi aal2 dan hanya
 * sesi milik psikolog pemanggil). Nama klien hanya terisi untuk klien yang menautkan akunnya, dan itu sama
 * dengan nama yang sudah diberikan `psychologist_clients()` untuk daftar klien, jadi tidak ada data baru yang
 * terbuka dan tidak ada data kesehatan sama sekali yang dibaca di sini.
 */

export class ScheduleError extends Error {
  constructor() {
    super('Jadwal belum bisa dimuat.');
    this.name = 'ScheduleError';
  }
}

export async function getMySchedule(now: Date = new Date()): Promise<ScheduleItem[]> {
  const window = scheduleWindow(now);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('psychologist_schedule', {
    p_from: window.from,
    p_to: window.to,
  });
  if (error) throw new ScheduleError();
  return (data ?? []).map((row) => ({
    id: row.id,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    status: row.status,
    clientName: row.client_name,
  }));
}
