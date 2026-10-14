import { isAssessmentCategory, type AssessmentCategory } from '@/lib/domain/assessment/category';
import { isInstrumentId, type InstrumentId } from '@/lib/domain/assessment/instruments';
import { computeMoodTrend, type MoodTrend } from '@/lib/domain/insight/engine';
import { moodTypeToScore } from '@/lib/domain/journal/mood';
import type { CaregiverPermissions } from '@/lib/domain/privacy/permissions';
import { dateKeyWib, lastDaysKeys } from '@/lib/utils/date';

/**
 * Apa yang boleh dilihat pendamping tentang seorang pasien. Satu-satunya tempat aturan tampilan
 * pendamping ditulis (port dari `getPatientSummary` di Flutter, dengan perbedaan di bawah).
 *
 * Perbedaan dari Flutter, semuanya ke arah lebih sedikit data:
 *   * Hanya KATEGORI skrining terakhir yang ditampilkan, tidak pernah skor atau jawaban.
 *   * Tidak ada "terakhir aktif" tersendiri: itu turunan dari mood, jadi mengikuti izin mood.
 *   * Setiap bagian hanya ada bila izinnya menyala; bagian tanpa izin ditandai `allowed: false`
 *     (bukan "tidak ada data") supaya layar bisa menjelaskan bahwa pasien memilih tidak membagikannya.
 */

export interface CaregiverViewInput {
  permissions: CaregiverPermissions;
  /** Kunci tanggal WIB hari ini. */
  today: string;
  moods: readonly { mood_type: string; created_at: string }[];
  latestAssessment: { type: string; category: string | null; completed_at: string } | null;
  openAlerts: readonly { severity: string; created_at: string }[];
}

export type Gated<T> = { allowed: false } | ({ allowed: true } & T);

export interface CaregiverPatientView {
  mood: Gated<{
    /** 7 hari berakhir hari ini; null = belum check-in. */
    days: (string | null)[];
    checkInDays: number;
    trend: MoodTrend;
    /** Dua hari atau lebih dengan perasaan rendah (sedih/cemas) dalam 3 hari terakhir. */
    lowRecently: boolean;
  }>;
  assessment: Gated<{
    latest: { type: InstrumentId; category: AssessmentCategory; completedAt: string } | null;
  }>;
  alerts: Gated<{ open: { severity: 'high' | 'critical'; createdAt: string }[] }>;
}

export function buildCaregiverPatientView(input: CaregiverViewInput): CaregiverPatientView {
  const { permissions, today } = input;

  let mood: CaregiverPatientView['mood'] = { allowed: false };
  if (permissions.mood_daily) {
    const week = lastDaysKeys(today, 7);
    const first = new Map<string, string>();
    for (const row of [...input.moods].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      const key = dateKeyWib(row.created_at);
      if (!first.has(key)) first.set(key, row.mood_type);
    }
    const days = week.map((key) => first.get(key) ?? null);
    const scores = days.map((day) => (day === null ? null : moodTypeToScore(day)));
    mood = {
      allowed: true,
      days,
      checkInDays: days.filter((day) => day !== null).length,
      trend: computeMoodTrend(scores.map((score) => ({ score }))),
      lowRecently: scores.slice(4).filter((score) => score !== null && score <= 2).length >= 2,
    };
  }

  let assessment: CaregiverPatientView['assessment'] = { allowed: false };
  if (permissions.assessment_results) {
    const row = input.latestAssessment;
    assessment = {
      allowed: true,
      latest:
        row && isInstrumentId(row.type)
          ? {
              type: row.type,
              category: isAssessmentCategory(row.category) ? row.category : 'minimal',
              completedAt: row.completed_at,
            }
          : null,
    };
  }

  let alerts: CaregiverPatientView['alerts'] = { allowed: false };
  if (permissions.emergency_alerts) {
    alerts = {
      allowed: true,
      open: input.openAlerts.flatMap((alert) =>
        alert.severity === 'high' || alert.severity === 'critical'
          ? [{ severity: alert.severity, createdAt: alert.created_at }]
          : [],
      ),
    };
  }

  return { mood, assessment, alerts };
}
