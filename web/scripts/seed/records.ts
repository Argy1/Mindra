import {
  buildAnswers,
  categoryFor,
  maxScore,
  totalFromAnswers,
  type InstrumentType,
  type StoredAnswer,
} from './instruments';
import { approxNormal, chance, clamp, int, pick, pickWeighted, type Rng } from './rng';

/** Riwayat yang dihasilkan per pengguna: 8 minggu ke belakang dari "sekarang". */
export const HISTORY_DAYS = 56;

export const MOOD_TYPES = [
  'tenang',
  'syukur',
  'bahagia',
  'hangat',
  'lelah',
  'sedih',
  'cemas',
] as const;
export type MoodType = (typeof MOOD_TYPES)[number];

const NEGATIVE: readonly MoodType[] = ['lelah', 'sedih', 'cemas'];
const TRIGGERS = [
  'tugas',
  'ujian',
  'keluarga',
  'pertemanan',
  'keuangan',
  'kesehatan',
  'tidur',
] as const;

export interface MoodRow {
  user_id: string;
  mood_type: MoodType;
  note: string;
  energy_level: number;
  triggers: string[];
  created_at: string;
}

export interface SleepRow {
  user_id: string;
  bedtime: string;
  wake_time: string;
  quality: number;
  notes: string;
}

export interface AssessmentRow {
  user_id: string;
  type: InstrumentType;
  answers: StoredAnswer[];
  total_score: number;
  category: string;
  completed_at: string;
}

const DAY_MS = 86_400_000;
const WIB_OFFSET_HOURS = 7;

/** Waktu lokal WIB (jam, menit) pada hari ke-`daysAgo` → ISO UTC. */
export function wibToIso(now: Date, daysAgo: number, hour: number, minute = 0): string {
  const day = new Date(now.getTime() - daysAgo * DAY_MS);
  const utc = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    hour - WIB_OFFSET_HOURS,
    minute,
  );
  return new Date(utc).toISOString();
}

/**
 * Buang catatan yang bertanggal setelah `now`. Hari ini jam acaknya bisa belum tiba (mis. seed dijalankan pukul
 * 10.00 WIB, catatan pukul 20.15 WIB), dan catatan masa depan membuat dasbor tampak salah. Pemanggilan acak sudah
 * terjadi sebelum penyaringan, jadi urutan angka acak tidak berubah.
 */
function notAfter<T>(rows: T[], now: Date, timestampOf: (row: T) => string): T[] {
  return rows.filter((row) => Date.parse(timestampOf(row)) <= now.getTime());
}

/** Kunci tanggal WIB (YYYY-MM-DD) dari waktu ISO. */
export function wibDateKey(iso: string): string {
  return new Date(Date.parse(iso) + WIB_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
}

/** Tekanan tambahan di pekan ke-5 sampai ke-7 (masa ujian, sama seperti pita "UTS" di dasbor faskes). */
function examPressure(daysAgo: number): number {
  const week = Math.floor((HISTORY_DAYS - 1 - daysAgo) / 7);
  return week >= 4 && week <= 6 ? 0.12 : 0;
}

export function generateMood(rng: Rng, userId: string, distress: number, now: Date): MoodRow[] {
  const rows: MoodRow[] = [];
  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    if (!chance(rng, 0.72)) continue; // tidak setiap hari mengisi
    const load = clamp(distress + examPressure(daysAgo) + approxNormal(rng, 0, 0.12), 0, 1);
    const moodType = chance(rng, load)
      ? pick(rng, NEGATIVE)
      : pickWeighted(rng, [
          ['tenang', 4],
          ['syukur', 2],
          ['bahagia', 2],
          ['hangat', 1],
        ] as const);
    rows.push({
      user_id: userId,
      mood_type: moodType,
      note: '',
      energy_level: clamp(Math.round(approxNormal(rng, 4 - load * 2.5, 0.9)), 1, 5),
      triggers: NEGATIVE.includes(moodType) && chance(rng, 0.6) ? [pick(rng, TRIGGERS)] : [],
      created_at: wibToIso(now, daysAgo, int(rng, 7, 22), int(rng, 0, 59)),
    });
  }
  return notAfter(rows, now, (row) => row.created_at);
}

export function generateSleep(rng: Rng, userId: string, distress: number, now: Date): SleepRow[] {
  const rows: SleepRow[] = [];
  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    if (!chance(rng, 0.62)) continue;
    const hours = clamp(
      approxNormal(rng, 7.2 - distress * 1.6 - examPressure(daysAgo) * 2, 0.9),
      3.5,
      10,
    );
    // Berangkat tidur 22.00–01.00 WIB pada malam sebelum hari ke-`daysAgo`.
    const bed = new Date(wibToIso(now, daysAgo + 1, 22, 0)).getTime() + int(rng, 0, 180) * 60_000;
    rows.push({
      user_id: userId,
      bedtime: new Date(bed).toISOString(),
      wake_time: new Date(bed + Math.round(hours * 3_600_000)).toISOString(),
      quality: clamp(
        Math.round(approxNormal(rng, 4 - distress * 2 + (hours - 6.5) * 0.3, 0.8)),
        1,
        5,
      ),
      notes: '',
    });
  }
  return notAfter(rows, now, (row) => row.wake_time);
}

/** Skor target untuk instrumen pada tingkat distress tertentu (0…max). */
function targetScore(rng: Rng, type: InstrumentType, load: number): number {
  return clamp(
    Math.round(approxNormal(rng, load * maxScore(type) * 0.75, maxScore(type) * 0.12)),
    0,
    maxScore(type),
  );
}

export function generateAssessments(
  rng: Rng,
  userId: string,
  distress: number,
  now: Date,
  options: { ideation: boolean },
): AssessmentRow[] {
  const rows: AssessmentRow[] = [];
  const schedule: Array<[InstrumentType, number]> = [
    ['phq9', 14 + int(rng, 0, 6)],
    ['gad7', 21 + int(rng, 0, 6)],
    ['pss10', 28 + int(rng, 0, 10)],
  ];

  let ideationPlaced = false;
  for (const [type, every] of schedule) {
    for (let daysAgo = int(rng, 1, every); daysAgo < HISTORY_DAYS; daysAgo += every) {
      const load = clamp(distress + examPressure(daysAgo) + approxNormal(rng, 0, 0.08), 0, 1);
      // Pikiran menyakiti diri dicatat SEKALI, pada PHQ-9 dalam 3 minggu terakhir.
      const ideation = options.ideation && type === 'phq9' && daysAgo <= 21 && !ideationPlaced;
      if (ideation) ideationPlaced = true;

      const answers = buildAnswers(rng, type, targetScore(rng, type, load), { ideation });
      const total = totalFromAnswers(type, answers); // sumber kebenaran skor
      rows.push({
        user_id: userId,
        type,
        answers,
        total_score: total,
        category: categoryFor(type, total),
        completed_at: wibToIso(now, daysAgo, int(rng, 19, 22), int(rng, 0, 59)),
      });
    }
  }
  // Pastikan pengguna bertanda ideasi benar-benar punya satu PHQ-9 dengan butir 9 > 0.
  if (options.ideation && !ideationPlaced) {
    const answers = buildAnswers(rng, 'phq9', 14, { ideation: true });
    const total = totalFromAnswers('phq9', answers);
    rows.push({
      user_id: userId,
      type: 'phq9',
      answers,
      total_score: total,
      category: categoryFor('phq9', total),
      completed_at: wibToIso(now, int(rng, 2, 14), 21, 10),
    });
  }
  return notAfter(rows, now, (row) => row.completed_at);
}

// ─── Akun demo "pengguna": data tetap yang meniru design/app-beranda.html ──────────────────
const DEMO_USER_MOODS: ReadonlyArray<[daysAgo: number, mood: MoodType]> = [
  [6, 'tenang'],
  [5, 'lelah'],
  [4, 'cemas'],
  [3, 'bahagia'],
  [2, 'syukur'],
  [1, 'lelah'],
];
/** Jam tidur 7 hari (Rabu … Selasa) persis seperti grafik di mockup beranda. */
const DEMO_USER_SLEEP_HOURS = [7.5, 5, 4.5, 8, 8.5, 6, 6.5] as const;
/** Tren PHQ-9 di mockup: 16, 14, 14, 11 (turun 3 poin dari bulan lalu). */
const DEMO_USER_PHQ9: ReadonlyArray<[daysAgo: number, total: number]> = [
  [49, 16],
  [35, 14],
  [21, 14],
  [7, 11],
];

export function generateDemoUserRecords(rng: Rng, userId: string, now: Date) {
  const mood: MoodRow[] = DEMO_USER_MOODS.map(([daysAgo, moodType]) => ({
    user_id: userId,
    mood_type: moodType,
    note: '',
    energy_level: NEGATIVE.includes(moodType) ? 2 : 4,
    triggers: [],
    created_at: wibToIso(now, daysAgo, 20, 15),
  }));

  const sleep: SleepRow[] = DEMO_USER_SLEEP_HOURS.map((hours, index) => {
    const daysAgo = 6 - index;
    const bed = new Date(wibToIso(now, daysAgo + 1, 23, 0)).getTime();
    return {
      user_id: userId,
      bedtime: new Date(bed).toISOString(),
      wake_time: new Date(bed + hours * 3_600_000).toISOString(),
      quality: hours >= 7 ? 4 : 2,
      notes: '',
    };
  });

  const assessments: AssessmentRow[] = DEMO_USER_PHQ9.map(([daysAgo, total]) => {
    const answers = buildAnswers(rng, 'phq9', total);
    return {
      user_id: userId,
      type: 'phq9' as const,
      answers,
      total_score: totalFromAnswers('phq9', answers),
      category: categoryFor('phq9', total),
      completed_at: wibToIso(now, daysAgo, 20, 30),
    };
  });

  return { mood, sleep, assessments };
}

/**
 * Pengisian celah 7 hari terakhir untuk akun demo "pengguna" pada penyegaran data. HANYA menambah catatan pada hari
 * (WIB) yang belum punya catatan sama sekali; tidak pernah menghapus atau mengubah catatan yang ada, jadi catatan
 * yang dibuat orang saat mencoba aplikasi aman. Menjalankannya dua kali pada hari yang sama tidak menambah apa pun.
 */
export function planDemoUserFill(
  userId: string,
  now: Date,
  existing: { moodDays: ReadonlySet<string>; sleepDays: ReadonlySet<string> },
): { mood: MoodRow[]; sleep: SleepRow[] } {
  const mood: MoodRow[] = [];
  const sleep: SleepRow[] = [];
  for (let daysAgo = 6; daysAgo >= 0; daysAgo -= 1) {
    const moodAt = wibToIso(now, daysAgo, 20, 15);
    if (!existing.moodDays.has(wibDateKey(moodAt)) && Date.parse(moodAt) <= now.getTime()) {
      const moodType = DEMO_USER_MOODS.find(([day]) => day === daysAgo)?.[1] ?? 'tenang';
      mood.push({
        user_id: userId,
        mood_type: moodType,
        note: '',
        energy_level: NEGATIVE.includes(moodType) ? 2 : 4,
        triggers: [],
        created_at: moodAt,
      });
    }

    const hours = DEMO_USER_SLEEP_HOURS[6 - daysAgo] as number;
    const bed = new Date(wibToIso(now, daysAgo + 1, 23, 0)).getTime();
    const wake = new Date(bed + hours * 3_600_000);
    if (
      !existing.sleepDays.has(wibDateKey(wake.toISOString())) &&
      wake.getTime() <= now.getTime()
    ) {
      sleep.push({
        user_id: userId,
        bedtime: new Date(bed).toISOString(),
        wake_time: wake.toISOString(),
        quality: hours >= 7 ? 4 : 2,
        notes: '',
      });
    }
  }
  return { mood, sleep };
}
