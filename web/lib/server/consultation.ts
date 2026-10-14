import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PsychologistCard } from '@/lib/domain/consultation/directory';
import type { SessionItem } from '@/lib/domain/consultation/sessions';
import {
  generateSlots,
  type BookedRange,
  type ScheduleRow,
  type SlotDay,
} from '@/lib/domain/consultation/slots';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Pembacaan untuk /konsultasi (klien sesi pengguna, RLS). Hanya data publik psikolog dibaca (nama, gelar,
 * spesialisasi, bahasa, bio, tarif, penilaian); nomor lisensi dan STR tidak diminta. Jam yang terisi datang
 * dari fungsi `psychologist_booked_slots` (tanpa identitas pasien lain).
 */

type Client = SupabaseClient<Database>;

export class ConsultationDataError extends Error {
  constructor(message = 'Data konsultasi belum bisa dimuat.') {
    super(message);
    this.name = 'ConsultationDataError';
  }
}

const PSYCHOLOGIST_COLUMNS =
  'id, full_name, title, specializations, languages, bio, photo_url, rating_average, total_reviews, consultation_fee, himpsi_verified, is_available_now';

interface PsychologistRow {
  id: string;
  full_name: string;
  title: string;
  specializations: string[];
  languages: string[];
  bio: string | null;
  photo_url: string | null;
  rating_average: number;
  total_reviews: number;
  consultation_fee: number;
  himpsi_verified: boolean;
  is_available_now: boolean;
}

export function toCard(row: PsychologistRow): PsychologistCard {
  return {
    id: row.id,
    name: row.full_name,
    title: row.title,
    specializations: row.specializations ?? [],
    languages: row.languages ?? [],
    bio: row.bio,
    photoUrl: row.photo_url,
    rating: Number(row.rating_average) || 0,
    reviews: row.total_reviews ?? 0,
    fee: row.consultation_fee ?? 0,
    verified: row.himpsi_verified,
    availableNow: row.is_available_now,
  };
}

export async function listPsychologists(supabase?: Client): Promise<PsychologistCard[]> {
  const client = supabase ?? ((await createClient()) as Client);
  const { data, error } = await client
    .from('psychologists')
    .select(PSYCHOLOGIST_COLUMNS)
    .eq('is_active', true)
    .order('rating_average', { ascending: false })
    .limit(100);
  if (error) throw new ConsultationDataError();
  return (data ?? []).map((row) => toCard(row as PsychologistRow));
}

export async function getPsychologist(
  id: string,
  supabase?: Client,
): Promise<PsychologistCard | null> {
  const client = supabase ?? ((await createClient()) as Client);
  const { data, error } = await client
    .from('psychologists')
    .select(PSYCHOLOGIST_COLUMNS)
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new ConsultationDataError();
  return data ? toCard(data as PsychologistRow) : null;
}

/** "HH:MM:SS" dari kolom `time`. */
const scheduleRow = (row: {
  day_of_week: number;
  start_time: string;
  end_time: string;
}): ScheduleRow => ({
  dayOfWeek: row.day_of_week,
  start: row.start_time,
  end: row.end_time,
});

export interface SlotsResult {
  psychologist: PsychologistCard;
  days: SlotDay[];
}

/** null = psikolog tidak ada atau tidak aktif. */
export async function getSlots(
  psychologistId: string,
  now: Date = new Date(),
  days = 14,
  supabase?: Client,
): Promise<SlotsResult | null> {
  const client = supabase ?? ((await createClient()) as Client);
  const psychologist = await getPsychologist(psychologistId, client);
  if (!psychologist) return null;

  const until = new Date(now.getTime() + (days + 1) * 86_400_000);
  const [schedules, booked] = await Promise.all([
    client
      .from('psychologist_schedules')
      .select('day_of_week, start_time, end_time')
      .eq('psychologist_id', psychologistId),
    client.rpc('psychologist_booked_slots', {
      p_psychologist: psychologistId,
      p_from: now.toISOString(),
      p_to: until.toISOString(),
    }),
  ]);
  if (schedules.error || booked.error) throw new ConsultationDataError();

  const bookedRanges: BookedRange[] = (booked.data ?? []).map((row) => ({
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
  }));
  return {
    psychologist,
    days: generateSlots((schedules.data ?? []).map(scheduleRow), bookedRanges, now, days),
  };
}

/** Sesi milik pengguna (30 terakhir), lengkap dengan nama psikolognya. */
export async function listMySessions(userId: string, supabase?: Client): Promise<SessionItem[]> {
  const client = supabase ?? ((await createClient()) as Client);
  const { data, error } = await client
    .from('consultations')
    .select('id, psychologist_id, scheduled_at, duration_minutes, status, booking_fee')
    .eq('user_id', userId)
    .order('scheduled_at', { ascending: false })
    .limit(30);
  if (error) throw new ConsultationDataError();
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((row) => row.psychologist_id))];
  const names = await client.from('psychologists').select('id, full_name').in('id', ids);
  if (names.error) throw new ConsultationDataError();
  const nameById = new Map((names.data ?? []).map((row) => [row.id, row.full_name]));

  return rows.map((row) => ({
    id: row.id,
    psychologistId: row.psychologist_id,
    psychologistName: nameById.get(row.psychologist_id) ?? 'Psikolog',
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    status: row.status,
    fee: row.booking_fee,
  }));
}
