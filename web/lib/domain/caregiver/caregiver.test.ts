import { describe, expect, it } from 'vitest';
import { DEFAULT_CAREGIVER_PERMISSIONS } from '@/lib/domain/privacy/permissions';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import { CAREGIVER_TIPS } from './tips';
import { buildCaregiverPatientView, type CaregiverViewInput } from './view';

const TODAY = '2026-10-13';
const wib = (date: string) => `${date}T08:00:00+07:00`;

const input = (overrides: Partial<CaregiverViewInput> = {}): CaregiverViewInput => ({
  permissions: { ...DEFAULT_CAREGIVER_PERMISSIONS },
  today: TODAY,
  moods: [],
  latestAssessment: null,
  openAlerts: [],
  ...overrides,
});

describe('buildCaregiverPatientView: setiap bagian hanya ada bila izinnya menyala', () => {
  it('izin bawaan: mood dan peringatan terbuka, skrining tertutup', () => {
    const view = buildCaregiverPatientView(input());
    expect(view.mood.allowed).toBe(true);
    expect(view.alerts.allowed).toBe(true);
    expect(view.assessment).toEqual({ allowed: false });
  });

  it('semua izin mati: seluruh bagian ditandai tidak diizinkan, tanpa data apa pun', () => {
    const view = buildCaregiverPatientView(
      input({
        permissions: {
          mood_daily: false,
          assessment_results: false,
          app_activity: false,
          emergency_alerts: false,
        },
        moods: [{ mood_type: 'sedih', created_at: wib('2026-10-13') }],
        latestAssessment: { type: 'phq9', category: 'severe', completed_at: wib('2026-10-12') },
        openAlerts: [{ severity: 'critical', created_at: wib('2026-10-13') }],
      }),
    );
    expect(view).toEqual({
      mood: { allowed: false },
      assessment: { allowed: false },
      alerts: { allowed: false },
    });
  });

  it('SERANGAN: data yang terlanjur dikirim ke fungsi tidak bocor bila izinnya mati', () => {
    const view = buildCaregiverPatientView(
      input({
        permissions: { ...DEFAULT_CAREGIVER_PERMISSIONS, assessment_results: false },
        latestAssessment: { type: 'phq9', category: 'severe', completed_at: wib('2026-10-12') },
      }),
    );
    expect(JSON.stringify(view)).not.toContain('severe');
  });
});

describe('mood', () => {
  it('7 hari dengan hari kosong sebagai null, dan jumlah hari check-in', () => {
    const view = buildCaregiverPatientView(
      input({
        moods: [
          { mood_type: 'tenang', created_at: wib('2026-10-07') },
          { mood_type: 'lelah', created_at: wib('2026-10-13') },
        ],
      }),
    );
    expect(view.mood).toMatchObject({
      allowed: true,
      days: ['tenang', null, null, null, null, null, 'lelah'],
      checkInDays: 2,
    });
  });

  it('dua hari perasaan rendah dalam 3 hari terakhir → peringatan lembut (aturan Flutter)', () => {
    const low = buildCaregiverPatientView(
      input({
        moods: [
          { mood_type: 'sedih', created_at: wib('2026-10-11') },
          { mood_type: 'cemas', created_at: wib('2026-10-13') },
        ],
      }),
    );
    expect(low.mood).toMatchObject({ lowRecently: true });
    const one = buildCaregiverPatientView(
      input({ moods: [{ mood_type: 'sedih', created_at: wib('2026-10-13') }] }),
    );
    expect(one.mood).toMatchObject({ lowRecently: false });
    const old = buildCaregiverPatientView(
      input({
        moods: [
          { mood_type: 'sedih', created_at: wib('2026-10-07') },
          { mood_type: 'sedih', created_at: wib('2026-10-08') },
        ],
      }),
    );
    expect(old.mood).toMatchObject({ lowRecently: false });
  });

  it('tren memakai mesin insight yang sama (naik / turun / kurang data)', () => {
    const moods = (types: string[]) =>
      types.map((mood_type, i) => ({
        mood_type,
        created_at: wib(`2026-10-${String(7 + i).padStart(2, '0')}`),
      }));
    const rising = buildCaregiverPatientView(
      input({
        moods: moods(['sedih', 'sedih', 'cemas', 'tenang', 'bahagia', 'bahagia', 'bahagia']),
      }),
    );
    expect(rising.mood).toMatchObject({ trend: 'rising' });
    const sparse = buildCaregiverPatientView(input({ moods: moods(['sedih']) }));
    expect(sparse.mood).toMatchObject({ trend: 'insufficient' });
  });
});

describe('skrining dan peringatan', () => {
  it('hanya KATEGORI skrining terakhir, tidak ada skor atau jawaban', () => {
    const view = buildCaregiverPatientView(
      input({
        permissions: { ...DEFAULT_CAREGIVER_PERMISSIONS, assessment_results: true },
        latestAssessment: { type: 'phq9', category: 'moderate', completed_at: wib('2026-10-12') },
      }),
    );
    expect(view.assessment).toEqual({
      allowed: true,
      latest: { type: 'phq9', category: 'moderate', completedAt: wib('2026-10-12') },
    });
    expect(JSON.stringify(view)).not.toMatch(/score|answers|total/i);
  });

  it('jenis instrumen tak dikenal → null; kategori rusak → minimal', () => {
    const permissions = { ...DEFAULT_CAREGIVER_PERMISSIONS, assessment_results: true };
    expect(
      buildCaregiverPatientView(
        input({
          permissions,
          latestAssessment: { type: 'x', category: 'severe', completed_at: wib('2026-10-12') },
        }),
      ).assessment,
    ).toEqual({ allowed: true, latest: null });
    expect(
      buildCaregiverPatientView(
        input({
          permissions,
          latestAssessment: { type: 'gad7', category: 'aneh', completed_at: wib('2026-10-12') },
        }),
      ).assessment,
    ).toMatchObject({ latest: { category: 'minimal' } });
  });

  it('peringatan: hanya tingkat high/critical yang valid; jenis lain dibuang', () => {
    const view = buildCaregiverPatientView(
      input({
        openAlerts: [
          { severity: 'critical', created_at: wib('2026-10-13') },
          { severity: 'low', created_at: wib('2026-10-13') },
          { severity: 'high', created_at: wib('2026-10-12') },
        ],
      }),
    );
    expect(view.alerts).toEqual({
      allowed: true,
      open: [
        { severity: 'critical', createdAt: wib('2026-10-13') },
        { severity: 'high', createdAt: wib('2026-10-12') },
      ],
    });
  });
});

describe('panduan pendamping', () => {
  const all = JSON.stringify(CAREGIVER_TIPS);

  it('empat artikel dengan id unik, tanpa emoji dan tanda seru', () => {
    expect(CAREGIVER_TIPS).toHaveLength(4);
    expect(new Set(CAREGIVER_TIPS.map((tip) => tip.id)).size).toBe(4);
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(all).not.toContain('!');
  });

  it('nomor layanan krisis dari sumber tunggal, bukan "Into The Light"', () => {
    expect(all).toContain(PRIMARY_CRISIS_RESOURCE.displayNumber);
    expect(all).not.toMatch(/into the light/i);
  });

  it('tidak memakai kata "gangguan" atau "pasien" (copy sisi pengguna)', () => {
    expect(all).not.toMatch(/gangguan|pasien/i);
  });
});
