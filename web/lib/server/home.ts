import 'server-only';
import { loadWeeklyInsight } from '@/lib/data/weekly-insight';
import type { WeeklyInsight } from '@/lib/domain/insight/weekly';
import { dateKeyWib } from '@/lib/utils/date';
import {
  getAssessmentHistory,
  getLatestPerInstrument,
  type AssessmentSummary,
} from '@/lib/server/assessments';
import { createClient } from '@/lib/supabase/server';

export interface HomeData {
  /** Kunci tanggal WIB hari ini. */
  today: string;
  insight: WeeklyInsight;
  /** Jenis perasaan check-in pertama HARI INI (WIB), bila sudah check-in. */
  todayMood: string | null;
  /** Skrining terbaru dari instrumen apa pun, dengan riwayat instrumen itu (lama → baru). */
  lastAssessment: { summary: AssessmentSummary; history: AssessmentSummary[] } | null;
}

/**
 * Semua data beranda dalam satu putaran paralel. Dibaca lewat klien sesi (RLS). Bila salah satu
 * kueri gagal, fungsi MELEMPAR: beranda tidak boleh menampilkan "belum ada data" padahal sebenarnya
 * gagal memuat (menyesatkan untuk aplikasi kesehatan). Halaman menangkapnya di error.tsx.
 */
export async function getHomeData(userId: string, now: Date = new Date()): Promise<HomeData> {
  const today = dateKeyWib(now);
  const supabase = await createClient();

  const [insight, latest] = await Promise.all([
    loadWeeklyInsight(supabase, userId, now),
    getLatestPerInstrument(),
  ]);

  const newest = Object.values(latest).sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  )[0];
  const lastAssessment = newest
    ? { summary: newest, history: await getAssessmentHistory(newest.type, 10) }
    : null;

  return {
    today,
    insight,
    todayMood: insight.days.find((day) => day.isToday)?.moodType ?? null,
    lastAssessment,
  };
}
