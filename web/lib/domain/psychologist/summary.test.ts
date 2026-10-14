import { describe, expect, it } from 'vitest';
import { DEFAULT_PSYCHOLOGIST_PERMISSIONS } from '@/lib/domain/privacy/permissions';
import {
  buildClientSummaries,
  filterClients,
  isClientFilter,
  summarizeDashboard,
  type AssessmentRow,
  type ClientRef,
  type MoodRow,
  type SessionRow,
} from './summary';

const TODAY = '2026-10-13';
const NOW = new Date('2026-10-13T09:00:00+07:00');
const wib = (date: string, time = '08:00') => `${date}T${time}:00+07:00`;

const client = (id: string, name: string, permissions = {}): ClientRef => ({
  patientId: id,
  name,
  linkedAt: wib('2026-09-02'),
  permissions: { ...DEFAULT_PSYCHOLOGIST_PERMISSIONS, ...permissions },
});
const phq = (user: string, score: number, date: string): AssessmentRow => ({
  user_id: user,
  type: 'phq9',
  total_score: score,
  category: score >= 15 ? 'severe' : score >= 10 ? 'moderate' : 'mild',
  completed_at: wib(date),
});
const mood = (user: string, type: string, date: string): MoodRow => ({
  user_id: user,
  mood_type: type,
  created_at: wib(date),
});

const build = (
  overrides: Partial<{
    clients: ClientRef[];
    assessments: AssessmentRow[];
    moods: MoodRow[];
    sessions: SessionRow[];
  }> = {},
) =>
  buildClientSummaries({
    today: TODAY,
    now: NOW,
    clients: [client('a', 'Alice')],
    assessments: [],
    moods: [],
    sessions: [],
    ...overrides,
  });

describe('skrining dan tren', () => {
  it('skor terbaru, kategori, dan tren dari instrumen yang sama (lama → baru, maks 4)', () => {
    const [summary] = build({
      assessments: [
        phq('a', 12, '2026-07-06'),
        phq('a', 14, '2026-08-06'),
        phq('a', 14, '2026-09-06'),
        phq('a', 17, '2026-10-06'),
        phq('a', 20, '2026-10-12'),
      ],
    });
    expect(summary!.assessment).toMatchObject({
      shared: true,
      latest: { type: 'phq9', score: 20, category: 'severe' },
      scores: [14, 14, 17, 20],
      trend: 'worse',
      worsened: true,
    });
  });

  it('memburuk hanya bila naik ≥ 3 poin; naik 2 = stabil; turun ≥ 3 = membaik', () => {
    const trendFor = (scores: number[]) =>
      (
        build({
          assessments: scores.map((score, i) => phq('a', score, `2026-10-0${i + 1}`)),
        })[0]!.assessment as { trend: string }
      ).trend;
    expect(trendFor([10, 13])).toBe('worse');
    expect(trendFor([10, 12])).toBe('stable');
    expect(trendFor([16, 13])).toBe('better');
    expect(trendFor([10])).toBe('none');
  });

  it('instrumen berbeda tidak dibandingkan satu sama lain', () => {
    const [summary] = build({
      assessments: [
        phq('a', 4, '2026-10-01'),
        { ...phq('a', 18, '2026-10-02'), type: 'gad7', total_score: 18, category: 'severe' },
      ],
    });
    expect(summary!.assessment).toMatchObject({
      latest: { type: 'gad7' },
      scores: [18],
      trend: 'none',
    });
  });

  it('baris dengan jenis instrumen asing dilewati, kategori rusak jatuh ke minimal', () => {
    const [summary] = build({
      assessments: [
        { ...phq('a', 99, '2026-10-12'), type: 'dass21' },
        { ...phq('a', 5, '2026-10-10'), category: 'aneh' },
      ],
    });
    expect(summary!.assessment).toMatchObject({ latest: { score: 5, category: 'minimal' } });
  });

  it('klien tanpa skrining: shared true tetapi latest null', () => {
    expect(build()[0]!.assessment).toEqual({
      shared: true,
      latest: null,
      scores: [],
      trend: 'none',
      worsened: false,
    });
  });

  it('IZIN MATI: skrining tidak dihitung dan ditandai tidak dibagikan, bukan "kosong"', () => {
    const [summary] = build({
      clients: [client('a', 'Alice', { assessments: false })],
      assessments: [phq('a', 25, '2026-10-12')],
    });
    expect(summary!.assessment).toEqual({ shared: false });
  });
});

describe('mood dan check-in', () => {
  it('mood 7 hari berakhir hari ini; catatan pertama tiap hari', () => {
    const [summary] = build({
      moods: [
        mood('a', 'sedih', '2026-10-13'),
        { ...mood('a', 'bahagia', '2026-10-13'), created_at: wib('2026-10-13', '21:00') },
        mood('a', 'cemas', '2026-10-11'),
      ],
    });
    const m = summary!.mood as { days: (string | null)[]; missedCheckIn: boolean };
    expect(m.days).toEqual([null, null, null, null, 'cemas', null, 'sedih']);
    expect(m.missedCheckIn).toBe(false);
  });

  it('belum check-in 3 hari: tidak ada catatan hari ini maupun dua hari sebelumnya', () => {
    const missed = (date: string) =>
      (build({ moods: [mood('a', 'tenang', date)] })[0]!.mood as { missedCheckIn: boolean })
        .missedCheckIn;
    expect(missed('2026-10-13')).toBe(false);
    expect(missed('2026-10-11')).toBe(false);
    expect(missed('2026-10-10')).toBe(true);
    expect((build()[0]!.mood as { missedCheckIn: boolean }).missedCheckIn).toBe(true);
  });

  it('hari dihitung menurut WIB: 00.30 WIB tanggal 13 = hari ini walau masih tanggal 12 di UTC', () => {
    const [summary] = build({
      moods: [{ user_id: 'a', mood_type: 'tenang', created_at: '2026-10-12T17:30:00Z' }],
    });
    expect((summary!.mood as { days: (string | null)[] }).days.at(-1)).toBe('tenang');
  });

  it('IZIN MATI: mood tidak dihitung dan tidak dianggap "belum check-in"', () => {
    const [summary] = build({ clients: [client('a', 'Alice', { mood: false })] });
    expect(summary!.mood).toEqual({ shared: false });
    expect(filterClients([summary!], 'belum-checkin')).toEqual([]);
  });
});

describe('sesi berikutnya', () => {
  it('sesi terdekat yang akan datang dan belum dibatalkan', () => {
    const [summary] = build({
      sessions: [
        { user_id: 'a', scheduled_at: wib('2026-10-12', '10:00'), status: 'confirmed' }, // lewat
        { user_id: 'a', scheduled_at: wib('2026-10-20', '10:00'), status: 'confirmed' },
        { user_id: 'a', scheduled_at: wib('2026-10-15', '15:00'), status: 'confirmed' },
        { user_id: 'a', scheduled_at: wib('2026-10-14', '09:00'), status: 'cancelled' },
        { user_id: 'b', scheduled_at: wib('2026-10-14', '08:00'), status: 'confirmed' }, // klien lain
      ],
    });
    expect(summary!.nextSession).toBe(wib('2026-10-15', '15:00'));
  });
  it('tanpa sesi → null', () => {
    expect(build()[0]!.nextSession).toBeNull();
  });
});

describe('urutan, filter, dan angka ringkasan', () => {
  const clients = [
    client('a', 'Alice'),
    client('b', 'Bagas'),
    client('c', 'Citra', { assessments: false }),
  ];
  const data = {
    clients,
    assessments: [phq('a', 5, '2026-10-01'), phq('a', 9, '2026-10-12'), phq('b', 18, '2026-10-12')],
    moods: [mood('a', 'tenang', '2026-10-13'), mood('c', 'sedih', '2026-10-05')],
  };

  it('yang paling berat lebih dulu, klien yang tidak membagikan skrining di akhir', () => {
    expect(build(data).map((s) => s.name)).toEqual(['Bagas', 'Alice', 'Citra']);
  });

  it('filter memburuk dan belum check-in; "semua" mengembalikan salinan', () => {
    const summaries = build(data);
    expect(filterClients(summaries, 'memburuk').map((s) => s.name)).toEqual(['Alice']);
    expect(filterClients(summaries, 'belum-checkin').map((s) => s.name)).toEqual([
      'Bagas',
      'Citra',
    ]);
    const all = filterClients(summaries, 'semua');
    expect(all).toEqual(summaries);
    expect(all).not.toBe(summaries);
  });

  it('angka ringkasan: klien aktif, peringatan, skrining baru 7 hari (hanya yang dibagikan), memburuk', () => {
    const summaries = build(data);
    const stats = summarizeDashboard(
      summaries,
      [...data.assessments, phq('c', 30, '2026-10-12'), phq('a', 4, '2026-09-01')],
      2,
      TODAY,
    );
    expect(stats).toEqual({
      activeClients: 3,
      openAlerts: 2,
      newAssessmentsThisWeek: 2, // Alice 12 Okt dan Bagas 12 Okt; 1 Okt di luar jendela, Citra tidak dibagikan
      worsened: 1,
    });
  });

  it('isClientFilter menolak nilai asing', () => {
    expect(isClientFilter('memburuk')).toBe(true);
    for (const bad of ['semua ', 'MEMBURUK', '', null, undefined, 1])
      expect(isClientFilter(bad)).toBe(false);
  });

  it('tanpa klien → hasil kosong', () => {
    expect(build({ clients: [] })).toEqual([]);
    expect(summarizeDashboard([], [], 0, TODAY)).toEqual({
      activeClients: 0,
      openAlerts: 0,
      newAssessmentsThisWeek: 0,
      worsened: 0,
    });
  });
});
