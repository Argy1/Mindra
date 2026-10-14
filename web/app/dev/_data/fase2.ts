import type { ConnectOption } from '@/components/features/privacy/ConnectPsychologist';
import type { AccessLogEntry } from '@/lib/domain/privacy/access-log';
import {
  DEFAULT_CAREGIVER_PERMISSIONS,
  DEFAULT_PSYCHOLOGIST_PERMISSIONS,
} from '@/lib/domain/privacy/permissions';
import { describeAlertReason, type AlertItem } from '@/lib/domain/psychologist/alerts';
import {
  buildClientSummaries,
  summarizeDashboard,
  type AssessmentRow,
  type ClientRef,
  type MoodRow,
  type SessionRow,
} from '@/lib/domain/psychologist/summary';
import { buildCaregiverPatientView } from '@/lib/domain/caregiver/view';
import type { CaregiverPatient, CaregiverPatientDetail } from '@/lib/server/caregiver';
import type { PrivacyOverview } from '@/lib/server/privacy';
import type { ClientDetail, DashboardData } from '@/lib/server/psychologist';
import { addDaysToKey, lastDaysKeys } from '@/lib/utils/date';

/**
 * Data contoh untuk pratinjau Fase 2 (/dev/psikolog, /dev/klien, /dev/privasi, /dev/pendamping).
 * 100% sintetis; tidak menyentuh database. "Sekarang" dibuat tetap (Selasa 13 Okt 2026, 09.30 WIB)
 * supaya tangkapan layar dan tes e2e stabil.
 */
export const SAMPLE_TODAY = '2026-10-13';
export const SAMPLE_NOW = new Date('2026-10-13T09:30:00+07:00');

const wib = (date: string, time: string) => `${date}T${time}:00+07:00`;

export const DIMAS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const ARGY = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const NADIA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
export const BAGAS = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
export const SARI = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const ALL_SHARED = { ...DEFAULT_PSYCHOLOGIST_PERMISSIONS, ai_summary: false };

export const SAMPLE_CLIENTS: ClientRef[] = [
  {
    patientId: DIMAS,
    name: 'Dimas Pratama',
    linkedAt: wib('2026-09-02', '10:00'),
    permissions: ALL_SHARED,
  },
  {
    patientId: ARGY,
    name: 'Argy F.',
    linkedAt: wib('2026-09-02', '10:00'),
    permissions: ALL_SHARED,
  },
  {
    patientId: NADIA,
    name: 'Nadia Azzahra',
    linkedAt: wib('2026-09-10', '10:00'),
    permissions: ALL_SHARED,
  },
  {
    patientId: BAGAS,
    name: 'Bagas H.',
    linkedAt: wib('2026-09-12', '10:00'),
    permissions: ALL_SHARED,
  },
  {
    patientId: SARI,
    name: 'Sari W.',
    linkedAt: wib('2026-09-20', '10:00'),
    // Sari hanya membagikan mood dan tidur: skrining dan peringatan krisis tidak.
    permissions: {
      assessments: false,
      mood: true,
      sleep: true,
      crisis_alerts: false,
      ai_summary: false,
    },
  },
];

const assessment = (
  user_id: string,
  type: string,
  total_score: number,
  category: string,
  day: string,
  time = '08:00',
): AssessmentRow => ({ user_id, type, total_score, category, completed_at: wib(day, time) });

const SAMPLE_ASSESSMENTS: AssessmentRow[] = [
  assessment(DIMAS, 'phq9', 12, 'moderate', '2026-09-15'),
  assessment(DIMAS, 'phq9', 14, 'moderate', '2026-09-29'),
  assessment(DIMAS, 'phq9', 17, 'severe', '2026-10-13', '07:48'),
  assessment(ARGY, 'phq9', 16, 'severe', '2026-09-01'),
  assessment(ARGY, 'phq9', 14, 'moderate', '2026-09-15'),
  assessment(ARGY, 'phq9', 14, 'moderate', '2026-09-29'),
  assessment(ARGY, 'phq9', 11, 'moderate', '2026-10-12'),
  assessment(NADIA, 'gad7', 7, 'mild', '2026-09-15'),
  assessment(NADIA, 'gad7', 6, 'mild', '2026-09-29'),
  assessment(NADIA, 'gad7', 6, 'mild', '2026-10-08'),
  assessment(BAGAS, 'pss10', 20, 'moderate', '2026-09-22'),
  assessment(BAGAS, 'pss10', 22, 'moderate', '2026-10-08'),
];

/** Deret mood 7 hari berakhir hari ini (lama → baru); null = belum check-in. */
function weekMoods(userId: string, days: (string | null)[]): MoodRow[] {
  const keys = lastDaysKeys(SAMPLE_TODAY, 7);
  return days.flatMap((mood, index) =>
    mood === null
      ? []
      : [{ user_id: userId, mood_type: mood, created_at: wib(keys[index]!, '08:30') }],
  );
}

const SAMPLE_MOODS: MoodRow[] = [
  ...weekMoods(DIMAS, ['cemas', 'sedih', 'lelah', 'sedih', 'cemas', 'sedih', null]),
  ...weekMoods(ARGY, ['tenang', 'lelah', 'cemas', 'bahagia', 'syukur', 'lelah', null]),
  ...weekMoods(NADIA, ['tenang', 'syukur', 'tenang', 'hangat', 'cemas', 'tenang', 'bahagia']),
  // Bagas tidak check-in sejak 10 Oktober.
  ...weekMoods(BAGAS, ['lelah', 'cemas', 'lelah', 'sedih', null, null, null]),
  ...weekMoods(SARI, ['tenang', null, 'tenang', 'lelah', 'tenang', null, 'syukur']),
];

export const SAMPLE_SESSIONS: (SessionRow & {
  id: string;
  duration_minutes: number;
})[] = [
  {
    id: 's1',
    user_id: NADIA,
    scheduled_at: wib('2026-10-13', '09:00'),
    status: 'confirmed',
    duration_minutes: 50,
  },
  {
    id: 's2',
    user_id: BAGAS,
    scheduled_at: wib('2026-10-13', '11:00'),
    status: 'confirmed',
    duration_minutes: 50,
  },
  {
    id: 's3',
    user_id: SARI,
    scheduled_at: wib('2026-10-13', '16:00'),
    status: 'pending',
    duration_minutes: 50,
  },
  {
    id: 's4',
    user_id: DIMAS,
    scheduled_at: wib('2026-10-15', '15:00'),
    status: 'confirmed',
    duration_minutes: 50,
  },
  {
    id: 's5',
    user_id: ARGY,
    scheduled_at: wib('2026-10-16', '10:00'),
    status: 'confirmed',
    duration_minutes: 50,
  },
  {
    id: 's6',
    user_id: NADIA,
    scheduled_at: wib('2026-10-20', '09:00'),
    status: 'confirmed',
    duration_minutes: 50,
  },
];

export function sampleDashboard(): DashboardData {
  const summaries = buildClientSummaries({
    today: SAMPLE_TODAY,
    now: SAMPLE_NOW,
    clients: SAMPLE_CLIENTS,
    assessments: SAMPLE_ASSESSMENTS,
    moods: SAMPLE_MOODS,
    sessions: SAMPLE_SESSIONS,
  });

  const alerts: AlertItem[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      patientId: DIMAS,
      patientName: 'Dimas Pratama',
      severity: 'critical',
      source: 'assessment',
      reason: describeAlertReason('critical', {
        source: 'assessment',
        assessment: { type: 'phq9', score: 17 },
      }),
      createdAt: wib('2026-10-13', '07:48'),
    },
  ];

  const names = new Map(SAMPLE_CLIENTS.map((client) => [client.patientId, client.name]));
  return {
    today: SAMPLE_TODAY,
    clients: SAMPLE_CLIENTS,
    summaries,
    stats: summarizeDashboard(summaries, SAMPLE_ASSESSMENTS, alerts.length, SAMPLE_TODAY),
    alerts,
    sessionsToday: SAMPLE_SESSIONS.filter((row) => row.scheduled_at.startsWith(SAMPLE_TODAY)).map(
      (row) => ({
        id: row.id,
        patientId: row.user_id,
        patientName: names.get(row.user_id) ?? 'Klien',
        scheduledAt: row.scheduled_at,
        durationMinutes: row.duration_minutes,
        status: row.status,
      }),
    ),
  };
}

// ─── Detail klien ──────────────────────────────────────────────────────────────

const SLEEP_HOURS = [7.5, 5, 4.5, 6, 8.5, 5.5, 6.5, 7, 4, 5, 6, 7.5, 5.5, 6];

function sampleSleeps() {
  return lastDaysKeys(SAMPLE_TODAY, 14).map((day, index) => {
    const wake = new Date(wib(day, '06:00'));
    const hours = SLEEP_HOURS[index]!;
    return {
      bedtime: new Date(wake.getTime() - hours * 3_600_000).toISOString(),
      wake_time: wake.toISOString(),
      quality: hours >= 7 ? 4 : 2,
    };
  });
}

function sampleMoodsFor(userId: string): MoodRow[] {
  const sequence = [
    'cemas',
    'sedih',
    'lelah',
    'sedih',
    'cemas',
    'sedih',
    'lelah',
    'tenang',
    null,
    'cemas',
    'sedih',
    'lelah',
    'sedih',
    null,
  ];
  return lastDaysKeys(SAMPLE_TODAY, 14).flatMap((day, index) => {
    const mood = sequence[index];
    return mood ? [{ user_id: userId, mood_type: mood, created_at: wib(day, '08:30') }] : [];
  });
}

/** Detail klien contoh. `sebagian` = klien yang hanya membagikan mood dan tidur (Sari). */
export function sampleClientDetail(variant: 'lengkap' | 'sebagian'): ClientDetail {
  if (variant === 'sebagian') {
    return {
      client: SAMPLE_CLIENTS[4]!,
      assessments: null,
      moods: sampleMoodsFor(SARI),
      sleeps: sampleSleeps(),
      alerts: null,
      consultations: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          scheduledAt: wib('2026-10-13', '16:00'),
          status: 'pending',
          durationMinutes: 50,
          summary: '',
          notesForPatient: '',
        },
      ],
    };
  }

  return {
    client: SAMPLE_CLIENTS[0]!,
    assessments: SAMPLE_ASSESSMENTS.filter((row) => row.user_id === DIMAS).reverse(),
    moods: sampleMoodsFor(DIMAS),
    sleeps: sampleSleeps(),
    alerts: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        severity: 'critical',
        status: 'open',
        createdAt: wib('2026-10-13', '07:48'),
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        severity: 'high',
        status: 'resolved',
        createdAt: wib('2026-09-29', '21:15'),
      },
    ],
    consultations: [
      {
        id: '44444444-4444-4444-8444-444444444444',
        scheduledAt: wib('2026-10-15', '15:00'),
        status: 'confirmed',
        durationMinutes: 50,
        summary: '',
        notesForPatient: '',
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        scheduledAt: wib('2026-09-29', '15:00'),
        status: 'completed',
        durationMinutes: 50,
        summary: 'Tidur terganggu sejak awal bulan. Mulai latihan napas 4-7-8 sebelum tidur.',
        notesForPatient:
          'Coba latihan napas sebelum tidur selama seminggu, lalu ceritakan hasilnya.',
      },
    ],
  };
}

// ─── Privasi ───────────────────────────────────────────────────────────────────

export const SAMPLE_ACCESS_LOG: AccessLogEntry[] = [
  {
    id: 1,
    actorName: 'Rina Sari, M.Psi.',
    actorRole: 'psychologist',
    resource: 'assessments',
    action: 'read',
    createdAt: wib('2026-10-13', '09:12'),
  },
  {
    id: 2,
    actorName: 'Rina Sari, M.Psi.',
    actorRole: 'psychologist',
    resource: 'sleep',
    action: 'read',
    createdAt: wib('2026-10-13', '09:10'),
  },
  {
    id: 3,
    actorName: 'Ibu',
    actorRole: 'caregiver',
    resource: 'mood',
    action: 'read',
    createdAt: wib('2026-10-12', '20:40'),
  },
  {
    id: 4,
    actorName: 'Rina Sari, M.Psi.',
    actorRole: 'psychologist',
    resource: 'crisis_alerts',
    action: 'acknowledge',
    createdAt: wib('2026-10-12', '08:05'),
  },
];

export function samplePrivacy(): PrivacyOverview {
  return {
    psychologists: [
      {
        id: '66666666-6666-4666-8666-666666666666',
        psychologistId: '77777777-7777-4777-8777-777777777777',
        name: 'Rina Sari, M.Psi.',
        consentedAt: wib('2026-09-02', '10:00'),
        permissions: { ...DEFAULT_PSYCHOLOGIST_PERMISSIONS },
      },
    ],
    caregivers: [
      {
        id: '88888888-8888-4888-8888-888888888888',
        status: 'active',
        name: 'Ibu',
        phone: '081234567890',
        inviteCode: null,
        createdAt: wib('2026-08-20', '19:00'),
        permissions: { ...DEFAULT_CAREGIVER_PERMISSIONS },
      },
      {
        id: '99999999-9999-4999-8999-999999999999',
        status: 'pending',
        name: null,
        phone: '081298765432',
        inviteCode: 'K7M2QX9R',
        createdAt: wib('2026-10-12', '18:00'),
        permissions: { ...DEFAULT_CAREGIVER_PERMISSIONS },
      },
    ],
    accessLog: SAMPLE_ACCESS_LOG,
    satusehatConsent: false,
  };
}

export const SAMPLE_CONNECTABLE: ConnectOption[] = [
  {
    id: 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1',
    name: 'Budi Hartono, M.Psi.',
    specializations: ['Kecemasan', 'Stres kerja'],
  },
  {
    id: 'b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2',
    name: 'Maya Lestari, M.Psi.',
    specializations: ['Depresi', 'Remaja'],
  },
];

// ─── Pendamping ────────────────────────────────────────────────────────────────

export const SAMPLE_CAREGIVER_PEOPLE: CaregiverPatient[] = [
  {
    relationshipId: '88888888-8888-4888-8888-888888888888',
    patientId: ARGY,
    name: 'Argy F.',
    permissions: { ...DEFAULT_CAREGIVER_PERMISSIONS },
    since: wib('2026-08-20', '19:00'),
  },
  {
    relationshipId: '99999999-9999-4999-8999-999999999999',
    patientId: NADIA,
    name: 'Nadia Azzahra',
    permissions: {
      mood_daily: false,
      assessment_results: false,
      app_activity: false,
      emergency_alerts: false,
    },
    since: wib('2026-09-14', '12:00'),
  },
];

export function sampleCaregiverDetail(): CaregiverPatientDetail {
  const patient = SAMPLE_CAREGIVER_PEOPLE[0]!;
  const keys = lastDaysKeys(SAMPLE_TODAY, 7);
  const moods = ['tenang', 'lelah', 'cemas', 'sedih', 'cemas', 'sedih', null].flatMap(
    (mood, index) =>
      mood === null ? [] : [{ mood_type: mood, created_at: wib(keys[index]!, '08:30') }],
  );
  return {
    patient,
    view: buildCaregiverPatientView({
      permissions: patient.permissions,
      today: SAMPLE_TODAY,
      moods,
      latestAssessment: {
        type: 'phq9',
        category: 'moderate',
        completed_at: wib(addDaysToKey(SAMPLE_TODAY, -1), '08:00'),
      },
      openAlerts: [{ severity: 'high', created_at: wib(SAMPLE_TODAY, '07:48') }],
    }),
  };
}
