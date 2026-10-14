import { INSTRUMENTS, isInstrumentId } from '@/lib/domain/assessment/instruments';
import { z } from 'zod';
import { dateKeyWib, formatDateId, formatTimeId } from '@/lib/utils/date';

/**
 * Teks untuk alert krisis di dasbor psikolog (design/psikolog-dashboard.html `.crisis-item`).
 * Isi alert hanya memuat yang perlu untuk bertindak: tingkat, sumber, dan (bila klien membagikan
 * skriningnya) skor. Jawaban per butir tidak pernah ditampilkan.
 */

export const ALERT_SEVERITIES = ['high', 'critical'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export function isAlertSeverity(value: unknown): value is AlertSeverity {
  return value === 'high' || value === 'critical';
}

export const ALERT_STATUSES = ['open', 'acknowledged', 'resolved'] as const;

export const ALERT_STATUS_LABEL: Readonly<Record<string, string>> = {
  open: 'Terbuka',
  acknowledged: 'Sudah dilihat',
  resolved: 'Sudah ditangani',
};

export interface AlertSource {
  source: string;
  /** Skrining pemicu, bila klien membagikan hasil skrining (izin `assessments`). */
  assessment?: { type: string; score: number } | null;
}

const SOURCE_LABEL: Readonly<Record<string, string>> = {
  assessment: 'Diisi lewat skrining Mindra',
  ai_chat: 'Terdeteksi dari percakapan di teman cerita',
  mood: 'Terdeteksi dari catatan mood',
  manual: 'Ditambahkan manual',
};

export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? 'Sumber tidak diketahui';
}

/** Kalimat alasan, mis. "PHQ-9 skor 17. Menjawab positif pada pertanyaan tentang pikiran menyakiti diri." */
export function describeAlertReason(severity: AlertSeverity, alert: AlertSource): string {
  const parts: string[] = [];
  const assessment = alert.assessment;
  if (assessment && isInstrumentId(assessment.type)) {
    parts.push(`${INSTRUMENTS[assessment.type].name} skor ${assessment.score}.`);
  }
  parts.push(
    severity === 'critical'
      ? 'Menjawab positif pada pertanyaan tentang pikiran lebih baik mati atau menyakiti diri.'
      : 'Hasil skrining masuk kategori berat.',
  );
  return parts.join(' ');
}

/** "masuk 2 menit lalu", "masuk 3 jam lalu", atau tanggal bila lebih dari sehari. */
export function relativeTimeId(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return formatDateId(new Date(iso), { day: 'numeric', month: 'long' });
}

/** Satu peringatan krisis terbuka di dasbor psikolog. */
export interface AlertItem {
  id: string;
  patientId: string;
  patientName: string;
  severity: AlertSeverity;
  source: string;
  reason: string;
  /** ISO. */
  createdAt: string;
  /** true = baru tiba lewat realtime dan rinciannya (skor skrining) belum dimuat dari server. */
  pending?: boolean;
}

/**
 * Bentuk baris `crisis_alerts` pada payload Supabase Realtime. Payload adalah batas kepercayaan
 * (datang dari jaringan), jadi dibaca lewat skema; yang tidak cocok diabaikan, bukan ditebak.
 */
export const realtimeAlertSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  severity: z.string(),
  status: z.string(),
  source: z.string().nullish(),
  created_at: z.string(),
});
export type RealtimeAlertRow = z.infer<typeof realtimeAlertSchema>;

const realtimePayloadSchema = z.object({ eventType: z.string(), new: realtimeAlertSchema });

/** Membaca satu payload `postgres_changes` utuh; null bila bentuknya tidak dikenal (mis. DELETE, null, atau rusak). */
export function parseRealtimePayload(
  payload: unknown,
): { eventType: string; row: RealtimeAlertRow } | null {
  const parsed = realtimePayloadSchema.safeParse(payload);
  return parsed.success ? { eventType: parsed.data.eventType, row: parsed.data.new } : null;
}

/**
 * Kartu sementara dari payload realtime, supaya psikolog melihat peringatan seketika. Hanya memuat
 * yang ada di payload; rincian (skor skrining) menyusul dari server setelah akses dicatat.
 * null bila bukan peringatan terbuka yang berhak ditampilkan (tingkat rendah, sudah ditangani, klien tak dikenal).
 */
export function pendingAlertFromRow(
  row: RealtimeAlertRow,
  nameById: ReadonlyMap<string, string>,
): AlertItem | null {
  if (row.status !== 'open' || !isAlertSeverity(row.severity)) return null;
  const name = nameById.get(row.user_id);
  if (name === undefined) return null;
  return {
    id: row.id,
    patientId: row.user_id,
    patientName: name,
    severity: row.severity,
    source: row.source ?? 'assessment',
    reason: 'Rincian sedang dimuat.',
    createdAt: row.created_at,
    pending: true,
  };
}

/** Waktu masuk di kartu: "07.48 WIB" bila hari ini, "12 Okt, 07.48 WIB" bila lebih lama. */
export function formatAlertTime(iso: string, today: string): string {
  const time = `${formatTimeId(iso)} WIB`;
  if (dateKeyWib(iso) === today) return time;
  return `${formatDateId(new Date(iso), { day: 'numeric', month: 'short' })}, ${time}`;
}
