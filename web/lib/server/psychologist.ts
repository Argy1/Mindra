import 'server-only';
import {
  describeAlertReason,
  isAlertSeverity,
  type AlertItem,
} from '@/lib/domain/psychologist/alerts';
import {
  buildClientSummaries,
  summarizeDashboard,
  type AssessmentRow,
  type ClientRef,
  type ClientSummary,
  type DashboardStats,
  type MoodRow,
  type SessionRow,
} from '@/lib/domain/psychologist/summary';
import { readPermissions } from '@/lib/domain/privacy/permissions';
import { auditAccess, auditAccessMany } from '@/lib/server/audit';
import { createClient } from '@/lib/supabase/server';
import { addDaysToKey, dateKeyWib } from '@/lib/utils/date';

/**
 * Pembacaan data klien untuk psikolog. Semua lewat klien sesi pengguna, jadi RLS (`can_view`, yang di
 * database juga mensyaratkan sesi aal2) yang menentukan apa yang terbaca. Aturan tetap kode ini:
 *   1. Daftar klien hanya dari RPC `psychologist_clients()` (tautan aktif, izin terbaca apa adanya).
 *   2. Setiap jenis data yang AKAN dibaca dicatat dulu lewat audit.ts; gagal mencatat = tidak membaca.
 *   3. Jenis data yang tidak diizinkan klien tidak diminta sama sekali (bukan diminta lalu dibuang).
 */

export interface SessionItem {
  id: string;
  patientId: string;
  patientName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
}

export interface DashboardData {
  today: string;
  clients: ClientRef[];
  summaries: ClientSummary[];
  stats: DashboardStats;
  alerts: AlertItem[];
  sessionsToday: SessionItem[];
}

export async function getClientRefs(): Promise<ClientRef[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('psychologist_clients');
  if (error) throw new Error('Gagal memuat daftar klien.');
  return (data ?? []).map((row) => ({
    patientId: row.patient_id,
    name: row.name,
    linkedAt: row.linked_at,
    permissions: readPermissions('psychologist', row.permissions),
  }));
}

const idsWith = (clients: readonly ClientRef[], key: keyof ClientRef['permissions']) =>
  clients.filter((client) => client.permissions[key]).map((client) => client.patientId);

/** Alert terbuka milik klien yang mengizinkan peringatan krisis, lengkap alasan dan nama klien. */
export async function getOpenAlerts(clients: readonly ClientRef[]): Promise<AlertItem[]> {
  const alertIds = idsWith(clients, 'crisis_alerts');
  if (alertIds.length === 0) return [];
  await auditAccessMany(alertIds, 'crisis_alerts');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('crisis_alerts')
    .select('id, user_id, source, source_id, severity, created_at')
    .in('user_id', alertIds)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error('Gagal memuat peringatan krisis.');

  const alerts = data ?? [];
  // Skor skrining pemicu hanya diminta untuk klien yang juga mengizinkan hasil skrining.
  const sharesAssessments = new Set(idsWith(clients, 'assessments'));
  const sourceIds = alerts
    .filter(
      (alert) =>
        alert.source === 'assessment' && alert.source_id && sharesAssessments.has(alert.user_id),
    )
    .map((alert) => alert.source_id as string);
  const assessmentById = new Map<string, { type: string; score: number }>();
  if (sourceIds.length > 0) {
    const { data: rows, error: assessmentError } = await supabase
      .from('assessments')
      .select('id, type, total_score')
      .in('id', sourceIds);
    if (assessmentError) throw new Error('Gagal memuat skrining pemicu.');
    for (const row of rows ?? []) {
      assessmentById.set(row.id, { type: row.type, score: row.total_score });
    }
  }

  const nameById = new Map(clients.map((client) => [client.patientId, client.name]));
  return alerts.flatMap((alert) => {
    if (!isAlertSeverity(alert.severity)) return [];
    return [
      {
        id: alert.id,
        patientId: alert.user_id,
        patientName: nameById.get(alert.user_id) ?? 'Klien',
        severity: alert.severity,
        source: alert.source,
        reason: describeAlertReason(alert.severity, {
          source: alert.source,
          assessment: alert.source_id ? (assessmentById.get(alert.source_id) ?? null) : null,
        }),
        createdAt: alert.created_at,
      },
    ];
  });
}

interface ClientOverview {
  today: string;
  clients: ClientRef[];
  summaries: ClientSummary[];
  assessmentRows: AssessmentRow[];
  sessions: (SessionRow & { id: string; duration_minutes: number })[];
}

/**
 * Daftar klien beserta ringkasan skrining, mood, dan sesi. Dipakai dasbor DAN halaman Klien; peringatan
 * krisis sengaja tidak termasuk (hanya dasbor yang menampilkannya, jadi hanya dasbor yang mencatat aksesnya).
 */
async function loadClientOverview(now: Date, knownClients?: ClientRef[]): Promise<ClientOverview> {
  const today = dateKeyWib(now);
  const clients = knownClients ?? (await getClientRefs());
  const assessIds = idsWith(clients, 'assessments');
  const moodIds = idsWith(clients, 'mood');

  // Catat dulu, baru baca.
  await Promise.all([auditAccessMany(assessIds, 'assessments'), auditAccessMany(moodIds, 'mood')]);

  const supabase = await createClient();
  const clientIds = clients.map((client) => client.patientId);
  const moodSince = `${addDaysToKey(today, -7)}T00:00:00+07:00`;
  const assessmentSince = `${addDaysToKey(today, -120)}T00:00:00+07:00`;
  const sessionSince = `${addDaysToKey(today, -1)}T00:00:00+07:00`;

  const [assessments, moods, sessions] = await Promise.all([
    assessIds.length === 0
      ? Promise.resolve({ data: [] as AssessmentRow[], error: null })
      : supabase
          .from('assessments')
          .select('user_id, type, total_score, category, completed_at')
          .in('user_id', assessIds)
          .gte('completed_at', assessmentSince)
          .order('completed_at', { ascending: false })
          .limit(1000),
    moodIds.length === 0
      ? Promise.resolve({ data: [] as MoodRow[], error: null })
      : supabase
          .from('mood_entries')
          .select('user_id, mood_type, created_at')
          .in('user_id', moodIds)
          .gte('created_at', moodSince)
          .order('created_at', { ascending: true })
          .limit(2000),
    clientIds.length === 0
      ? Promise.resolve({
          data: [] as (SessionRow & { id: string; duration_minutes: number })[],
          error: null,
        })
      : supabase
          .from('consultations')
          .select('id, user_id, scheduled_at, status, duration_minutes')
          .in('user_id', clientIds)
          .gte('scheduled_at', sessionSince)
          .order('scheduled_at', { ascending: true })
          .limit(500),
  ]);
  for (const result of [assessments, moods, sessions]) {
    if (result.error) throw new Error('Gagal memuat daftar klien.');
  }

  const assessmentRows = assessments.data ?? [];
  const sessionRows = sessions.data ?? [];
  return {
    today,
    clients,
    assessmentRows,
    sessions: sessionRows,
    summaries: buildClientSummaries({
      today,
      now,
      clients,
      assessments: assessmentRows,
      moods: moods.data ?? [],
      sessions: sessionRows,
    }),
  };
}

export interface ClientListData {
  today: string;
  summaries: ClientSummary[];
}

export async function getClientList(now: Date = new Date()): Promise<ClientListData> {
  const { today, summaries } = await loadClientOverview(now);
  return { today, summaries };
}

export async function getPsychologistDashboard(now: Date = new Date()): Promise<DashboardData> {
  // Alert dibaca bersamaan dengan ringkasan klien; masing-masing mencatat aksesnya sendiri.
  const refs = await getClientRefs();
  const [overview, alerts] = await Promise.all([
    loadClientOverview(now, refs),
    getOpenAlerts(refs),
  ]);
  const { today, clients, summaries, assessmentRows } = overview;

  const nameById = new Map(clients.map((client) => [client.patientId, client.name]));
  const sessionsToday = overview.sessions
    .filter(
      (row) =>
        dateKeyWib(row.scheduled_at) === today &&
        ['pending', 'confirmed', 'ongoing'].includes(row.status),
    )
    .map((row) => ({
      id: row.id,
      patientId: row.user_id,
      patientName: nameById.get(row.user_id) ?? 'Klien',
      scheduledAt: row.scheduled_at,
      durationMinutes: row.duration_minutes,
      status: row.status,
    }));

  return {
    today,
    clients,
    summaries,
    stats: summarizeDashboard(summaries, assessmentRows, alerts.length, today),
    alerts,
    sessionsToday,
  };
}

export interface ConsultationNote {
  id: string;
  scheduledAt: string;
  status: string;
  durationMinutes: number;
  summary: string;
  notesForPatient: string;
}

export interface ClientDetail {
  client: ClientRef;
  /** null = klien tidak membagikan jenis data itu (bukan "tidak ada data"). */
  assessments: AssessmentRow[] | null;
  moods: MoodRow[] | null;
  sleeps: { bedtime: string; wake_time: string; quality: number }[] | null;
  alerts: { id: string; severity: string; status: string; createdAt: string }[] | null;
  consultations: ConsultationNote[];
}

/** Detail satu klien, atau null bila bukan klien aktif psikolog ini (halaman menampilkan 404). */
export async function getClientDetail(
  patientId: string,
  now: Date = new Date(),
): Promise<ClientDetail | null> {
  const clients = await getClientRefs();
  const client = clients.find((candidate) => candidate.patientId === patientId);
  if (!client) return null;
  const { permissions } = client;

  // Catat dulu, hanya jenis data yang diizinkan (dan akan dibaca).
  if (permissions.assessments) await auditAccess(patientId, 'assessments');
  if (permissions.mood) await auditAccess(patientId, 'mood');
  if (permissions.sleep) await auditAccess(patientId, 'sleep');
  if (permissions.crisis_alerts) await auditAccess(patientId, 'crisis_alerts');

  const supabase = await createClient();
  const since = `${addDaysToKey(dateKeyWib(now), -30)}T00:00:00+07:00`;

  const [assessments, moods, sleeps, alerts, consultations] = await Promise.all([
    permissions.assessments
      ? supabase
          .from('assessments')
          .select('user_id, type, total_score, category, completed_at')
          .eq('user_id', patientId)
          .order('completed_at', { ascending: false })
          .limit(60)
      : null,
    permissions.mood
      ? supabase
          .from('mood_entries')
          .select('user_id, mood_type, created_at')
          .eq('user_id', patientId)
          .gte('created_at', since)
          .order('created_at', { ascending: true })
          .limit(300)
      : null,
    permissions.sleep
      ? supabase
          .from('sleep_entries')
          .select('bedtime, wake_time, quality')
          .eq('user_id', patientId)
          .gte('wake_time', since)
          .order('bedtime', { ascending: true })
          .limit(100)
      : null,
    permissions.crisis_alerts
      ? supabase
          .from('crisis_alerts')
          .select('id, severity, status, created_at')
          .eq('user_id', patientId)
          .order('created_at', { ascending: false })
          .limit(20)
      : null,
    supabase
      .from('consultations')
      .select('id, scheduled_at, status, duration_minutes, session_summary, notes_for_patient')
      .eq('user_id', patientId)
      .order('scheduled_at', { ascending: false })
      .limit(20),
  ]);
  for (const result of [assessments, moods, sleeps, alerts, consultations]) {
    if (result?.error) throw new Error('Gagal memuat data klien.');
  }

  return {
    client,
    assessments: assessments ? (assessments.data ?? []) : null,
    moods: moods ? (moods.data ?? []) : null,
    sleeps: sleeps ? (sleeps.data ?? []) : null,
    alerts: alerts
      ? (alerts.data ?? []).map((row) => ({
          id: row.id,
          severity: row.severity,
          status: row.status,
          createdAt: row.created_at,
        }))
      : null,
    consultations: (consultations.data ?? []).map((row) => ({
      id: row.id,
      scheduledAt: row.scheduled_at,
      status: row.status,
      durationMinutes: row.duration_minutes,
      summary: row.session_summary ?? '',
      notesForPatient: row.notes_for_patient ?? '',
    })),
  };
}
