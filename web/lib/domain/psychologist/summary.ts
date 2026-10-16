import { isAssessmentCategory, type AssessmentCategory } from '@/lib/domain/assessment/category';
import { isInstrumentId, type InstrumentId } from '@/lib/domain/assessment/instruments';
import type { PsychologistPermissions } from '@/lib/domain/privacy/permissions';
import { addDaysToKey, dateKeyWib, lastDaysKeys } from '@/lib/utils/date';

/**
 * Ringkasan klien untuk dasbor psikolog (design/psikolog-dashboard.html). Fungsi murni: menerima baris
 * mentah yang SUDAH disaring RLS dan izin, lalu menyusun tabel klien dan angka ringkasan.
 *
 * Aturan yang bisa dipertanggungjawabkan di tanya jawab:
 *   * "Skor memburuk" = skrining terbaru dibanding skrining sebelumnya pada instrumen yang sama (skor lebih
 *     tinggi = lebih berat) NAIK ≥ 3 poin ATAU pindah ke kategori yang lebih berat. Syarat kedua penting:
 *     naik 2 poin dari 13 ke 15 hanya "stabil" bila dilihat dari selisih, padahal klien baru saja masuk
 *     kategori Berat. Arah sebaliknya ("membaik") memakai aturan yang sama.
 *   * "Belum check-in 3 hari" = tidak ada catatan mood hari ini maupun dua hari sebelumnya (WIB).
 *   * Data yang TIDAK dibagikan klien (izin mati) tidak pernah dihitung dan ditandai `shared: false`,
 *     bukan ditampilkan sebagai "tidak ada data".
 */

export const WORSENED_DELTA = 3;
export const MISSED_CHECK_IN_DAYS = 3;

export interface ClientRef {
  patientId: string;
  name: string;
  /** ISO. */
  linkedAt: string;
  permissions: PsychologistPermissions;
}

export interface AssessmentRow {
  user_id: string;
  type: string;
  total_score: number;
  category: string | null;
  completed_at: string;
}

export interface MoodRow {
  user_id: string;
  mood_type: string;
  created_at: string;
}

export interface SessionRow {
  user_id: string;
  scheduled_at: string;
  status: string;
}

export type ScoreTrend = 'worse' | 'better' | 'stable' | 'none';

export interface ClientSummary {
  patientId: string;
  name: string;
  assessment:
    | { shared: false }
    | {
        shared: true;
        latest: {
          type: InstrumentId;
          score: number;
          category: AssessmentCategory;
          completedAt: string;
        } | null;
        /** Skor instrumen terbaru, LAMA → BARU, maksimal 4 titik. */
        scores: number[];
        trend: ScoreTrend;
        worsened: boolean;
      };
  mood:
    | { shared: false }
    | {
        shared: true;
        /** 7 hari berakhir hari ini (lama → baru); null = belum check-in. */
        days: (string | null)[];
        missedCheckIn: boolean;
      };
  /** ISO jadwal sesi terdekat yang akan datang. */
  nextSession: string | null;
}

interface BuildInput {
  /** Kunci tanggal WIB hari ini. */
  today: string;
  now: Date;
  clients: readonly ClientRef[];
  assessments: readonly AssessmentRow[];
  moods: readonly MoodRow[];
  sessions: readonly SessionRow[];
}

const CATEGORY_RANK: Record<AssessmentCategory, number> = {
  minimal: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
};

function groupBy<T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

interface ScorePoint {
  score: number;
  /** null = kategori tersimpan rusak/tidak ada: hanya selisih skor yang dipakai. */
  category: AssessmentCategory | null;
}

/** Tren dari dua titik terakhir (lama → baru): selisih skor ≥ 3 poin, atau pindah kategori. */
export function trendOf(points: readonly ScorePoint[]): ScoreTrend {
  if (points.length < 2) return 'none';
  const latest = points[points.length - 1]!;
  const previous = points[points.length - 2]!;
  const delta = latest.score - previous.score;
  const shift =
    latest.category && previous.category
      ? CATEGORY_RANK[latest.category] - CATEGORY_RANK[previous.category]
      : 0;
  if (delta >= WORSENED_DELTA || shift > 0) return 'worse';
  if (delta <= -WORSENED_DELTA || shift < 0) return 'better';
  return 'stable';
}

export function buildClientSummaries(input: BuildInput): ClientSummary[] {
  const { today, now } = input;
  const week = lastDaysKeys(today, 7);
  const checkInWindow = new Set(lastDaysKeys(today, MISSED_CHECK_IN_DAYS));
  const byAssessments = groupBy(input.assessments, (row) => row.user_id);
  const byMoods = groupBy(input.moods, (row) => row.user_id);
  const bySessions = groupBy(input.sessions, (row) => row.user_id);

  const summaries = input.clients.map((client): ClientSummary => {
    let assessment: ClientSummary['assessment'] = { shared: false };
    if (client.permissions.assessments) {
      const rows = [...(byAssessments.get(client.patientId) ?? [])]
        .filter((row) => isInstrumentId(row.type))
        .sort((a, b) => a.completed_at.localeCompare(b.completed_at));
      const newest = rows[rows.length - 1];
      if (!newest) {
        assessment = { shared: true, latest: null, scores: [], trend: 'none', worsened: false };
      } else {
        const sameType = rows.filter((row) => row.type === newest.type);
        const recent = sameType.slice(-4);
        const scores = recent.map((row) => row.total_score);
        const trend = trendOf(
          recent.map((row) => ({
            score: row.total_score,
            category: isAssessmentCategory(row.category) ? row.category : null,
          })),
        );
        assessment = {
          shared: true,
          latest: {
            type: newest.type as InstrumentId,
            score: newest.total_score,
            category: isAssessmentCategory(newest.category) ? newest.category : 'minimal',
            completedAt: newest.completed_at,
          },
          scores,
          trend,
          worsened: trend === 'worse',
        };
      }
    }

    let mood: ClientSummary['mood'] = { shared: false };
    if (client.permissions.mood) {
      const first = new Map<string, string>();
      for (const row of [...(byMoods.get(client.patientId) ?? [])].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      )) {
        const key = dateKeyWib(row.created_at);
        if (!first.has(key)) first.set(key, row.mood_type);
      }
      mood = {
        shared: true,
        days: week.map((key) => first.get(key) ?? null),
        missedCheckIn: ![...first.keys()].some((key) => checkInWindow.has(key)),
      };
    }

    const upcoming = (bySessions.get(client.patientId) ?? [])
      .filter(
        (row) =>
          (row.status === 'pending' || row.status === 'confirmed') &&
          new Date(row.scheduled_at).getTime() >= now.getTime(),
      )
      .map((row) => row.scheduled_at)
      .sort()[0];

    return {
      patientId: client.patientId,
      name: client.name,
      assessment,
      mood,
      nextSession: upcoming ?? null,
    };
  });

  // Yang paling perlu perhatian lebih dulu: kategori terbaru paling berat, lalu nama.
  const rank = (summary: ClientSummary) =>
    summary.assessment.shared && summary.assessment.latest
      ? CATEGORY_RANK[summary.assessment.latest.category]
      : -1;
  return summaries.sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, 'id'));
}

export const CLIENT_FILTERS = ['semua', 'memburuk', 'belum-checkin'] as const;
export type ClientFilter = (typeof CLIENT_FILTERS)[number];

export function isClientFilter(value: unknown): value is ClientFilter {
  return typeof value === 'string' && (CLIENT_FILTERS as readonly string[]).includes(value);
}

export function filterClients(
  summaries: readonly ClientSummary[],
  filter: ClientFilter,
): ClientSummary[] {
  if (filter === 'memburuk') {
    return summaries.filter((s) => s.assessment.shared && s.assessment.worsened);
  }
  if (filter === 'belum-checkin') {
    return summaries.filter((s) => s.mood.shared && s.mood.missedCheckIn);
  }
  return [...summaries];
}

export interface DashboardStats {
  activeClients: number;
  openAlerts: number;
  newAssessmentsThisWeek: number;
  worsened: number;
}

export function summarizeDashboard(
  summaries: readonly ClientSummary[],
  assessments: readonly AssessmentRow[],
  openAlerts: number,
  today: string,
): DashboardStats {
  const weekStart = addDaysToKey(today, -6);
  const shared = new Set(
    summaries.filter((s) => s.assessment.shared).map((summary) => summary.patientId),
  );
  return {
    activeClients: summaries.length,
    openAlerts,
    newAssessmentsThisWeek: assessments.filter(
      (row) => shared.has(row.user_id) && dateKeyWib(row.completed_at) >= weekStart,
    ).length,
    worsened: summaries.filter((s) => s.assessment.shared && s.assessment.worsened).length,
  };
}
