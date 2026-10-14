import { buildWeeklyInsight, type WeeklyInsight } from '@/lib/domain/insight/weekly';
import type { MoodEntry, SleepEntry } from '@/lib/server/journal';

/**
 * Data contoh untuk halaman pratinjau Fase 1 (/dev/*). 100% sintetis; tidak menyentuh database.
 * "Hari ini" dibuat tetap (Selasa 13 Okt 2026, WIB) supaya tangkapan layar dan tes e2e stabil.
 */
export const SAMPLE_TODAY = '2026-10-13';

const wib = (date: string, time: string) => `${date}T${time}:00+07:00`;

const SAMPLE_MOODS = [
  ['2026-10-07', 'tenang'],
  ['2026-10-08', 'lelah'],
  ['2026-10-09', 'cemas'],
  ['2026-10-10', 'bahagia'],
  ['2026-10-11', 'syukur'],
  ['2026-10-12', 'lelah'],
] as const;

const SAMPLE_SLEEP_HOURS = [7.5, 5, 4.5, 8, 8.5, 6, 6.5];

function sampleSleeps() {
  return SAMPLE_SLEEP_HOURS.map((hours, index) => {
    const day = `2026-10-${String(7 + index).padStart(2, '0')}`;
    const wake = new Date(`${day}T06:00:00+07:00`);
    return {
      bedtime: new Date(wake.getTime() - hours * 3_600_000).toISOString(),
      wake_time: wake.toISOString(),
      quality: hours >= 7 ? 5 : 3,
    };
  });
}

export function sampleInsight(): WeeklyInsight {
  const moods = SAMPLE_MOODS.map(([date, mood_type]) => ({
    mood_type,
    created_at: wib(date, '08:30'),
  }));
  return buildWeeklyInsight({
    today: SAMPLE_TODAY,
    moods,
    sleeps: sampleSleeps(),
    assessmentsDone: 1,
    recentMoodTimestamps: moods.map((mood) => mood.created_at),
  });
}

export const SAMPLE_MOOD_ENTRIES: MoodEntry[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    moodType: 'lelah',
    energyLevel: 2,
    triggers: ['Pekerjaan', 'Tidur'],
    note: 'Tenggat tugas menumpuk. Mau tidur lebih awal malam ini.',
    createdAt: wib('2026-10-12', '21:10'),
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    moodType: 'syukur',
    energyLevel: 4,
    triggers: ['Keluarga'],
    note: '',
    createdAt: wib('2026-10-11', '19:45'),
  },
];

export const SAMPLE_SLEEP_ENTRIES: SleepEntry[] = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    bedtime: wib('2026-10-12', '23:30'),
    wakeTime: wib('2026-10-13', '06:00'),
    quality: 3,
    notes: 'Terbangun dua kali.',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    bedtime: wib('2026-10-11', '22:00'),
    wakeTime: wib('2026-10-12', '06:00'),
    quality: 5,
    notes: '',
  },
];

/** Riwayat skor PHQ-9 contoh (lama → baru), sama dengan angka di design/app-beranda.html. */
export const SAMPLE_PHQ9_HISTORY = [16, 14, 14, 11].map((score, index) => ({
  score,
  completedAt: wib(`2026-${String(7 + index).padStart(2, '0')}-06`, '10:00'),
}));
