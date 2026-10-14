// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from '@/tests/helpers/fake-supabase';

const state = vi.hoisted(() => ({
  supabase: null as ReturnType<typeof createFakeSupabase> | null,
  auditFailure: false,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => state.supabase!.client,
}));

vi.mock('@/lib/server/audit', () => {
  class AuditError extends Error {}
  return {
    AuditError,
    auditAccess: async (subject: string, resource: string, action = 'read') => {
      state.supabase!.log.push(`audit:${resource}:${action}:${subject}`);
      if (state.auditFailure) throw new AuditError();
    },
    auditAccessMany: async (subjects: readonly string[], resource: string, action = 'read') => {
      if (subjects.length === 0) return;
      state.supabase!.log.push(`audit:${resource}:${action}:${[...new Set(subjects)].join(',')}`);
      if (state.auditFailure) throw new AuditError();
    },
  };
});

import {
  getClientDetail,
  getClientList,
  getOpenAlerts,
  getPsychologistDashboard,
} from './psychologist';

const ALL = { assessments: true, mood: true, sleep: true, crisis_alerts: true, ai_summary: false };
const NONE = {
  assessments: false,
  mood: false,
  sleep: false,
  crisis_alerts: false,
  ai_summary: false,
};

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; // membagikan semuanya
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; // hanya mood
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'; // tidak membagikan apa pun

const clientRows = [
  { patient_id: A, name: 'Klien A', linked_at: '2026-09-01T00:00:00Z', permissions: ALL },
  {
    patient_id: B,
    name: 'Klien B',
    linked_at: '2026-09-01T00:00:00Z',
    permissions: { ...NONE, mood: true },
  },
  { patient_id: C, name: 'Klien C', linked_at: '2026-09-01T00:00:00Z', permissions: NONE },
];

const NOW = new Date('2026-10-13T02:30:00Z');

function setup(tables: Record<string, unknown[]> = {}) {
  state.auditFailure = false;
  state.supabase = createFakeSupabase({ rpcs: { psychologist_clients: clientRows }, tables });
  return state.supabase;
}

beforeEach(() => {
  state.supabase = null;
  state.auditFailure = false;
});

const idsFilter = (queries: ReturnType<typeof setup>['queries'], table: string) =>
  queries.find((query) => query.table === table)?.filters.find((f) => f.op === 'in')?.value;

describe('getPsychologistDashboard', () => {
  it('hanya meminta skrining dan mood milik klien yang mengizinkannya', async () => {
    const fake = setup();
    await getPsychologistDashboard(NOW);

    expect(idsFilter(fake.queries, 'assessments')).toEqual([A]);
    expect(idsFilter(fake.queries, 'mood_entries')).toEqual([A, B]);
    // Sesi adalah jadwal psikolog sendiri; semua klien termasuk.
    expect(idsFilter(fake.queries, 'consultations')).toEqual([A, B, C]);
  });

  it('mencatat akses SEBELUM membaca tiap jenis data, hanya untuk klien yang berizin', async () => {
    const fake = setup();
    await getPsychologistDashboard(NOW);

    const at = (entry: string) => fake.log.indexOf(entry);
    expect(at(`audit:assessments:read:${A}`)).toBeGreaterThanOrEqual(0);
    expect(at(`audit:mood:read:${A},${B}`)).toBeGreaterThanOrEqual(0);
    expect(at(`audit:assessments:read:${A}`)).toBeLessThan(at('from:assessments'));
    expect(at(`audit:mood:read:${A},${B}`)).toBeLessThan(at('from:mood_entries'));
    // Klien C tidak membagikan apa pun: namanya tidak pernah masuk catatan akses data.
    expect(fake.log.filter((entry) => entry.startsWith('audit:') && entry.includes(C))).toEqual([]);
  });

  it('gagal mencatat akses = tidak membaca data klien sama sekali', async () => {
    const fake = setup();
    state.auditFailure = true;
    await expect(getPsychologistDashboard(NOW)).rejects.toBeInstanceOf(Error);
    expect(fake.tablesQueried()).not.toContain('assessments');
    expect(fake.tablesQueried()).not.toContain('mood_entries');
    expect(fake.tablesQueried()).not.toContain('crisis_alerts');
  });

  it('tanpa klien: tidak ada kueri data dan tidak ada catatan akses', async () => {
    state.auditFailure = false;
    state.supabase = createFakeSupabase({ rpcs: { psychologist_clients: [] } });
    const data = await getPsychologistDashboard(NOW);
    expect(data.summaries).toEqual([]);
    expect(state.supabase.tablesQueried()).toEqual([]);
    expect(state.supabase.log.filter((entry) => entry.startsWith('audit:'))).toEqual([]);
  });

  it('galat database ditolak, bukan ditampilkan sebagai daftar kosong', async () => {
    setup();
    state.supabase = createFakeSupabase({
      rpcs: { psychologist_clients: clientRows },
      failTables: ['assessments'],
    });
    await expect(getPsychologistDashboard(NOW)).rejects.toThrow('Gagal memuat daftar klien.');
  });
});

describe('getClientList', () => {
  it('tidak membaca atau mencatat peringatan krisis (hanya dasbor yang menampilkannya)', async () => {
    const fake = setup();
    await getClientList(NOW);
    expect(fake.tablesQueried()).not.toContain('crisis_alerts');
    expect(fake.log.some((entry) => entry.startsWith('audit:crisis_alerts'))).toBe(false);
  });
});

describe('getOpenAlerts', () => {
  const refs = clientRows.map((row) => ({
    patientId: row.patient_id,
    name: row.name,
    linkedAt: row.linked_at,
    permissions: row.permissions,
  }));

  it('hanya klien yang mengizinkan peringatan krisis; skor skrining hanya bila skriningnya juga dibagikan', async () => {
    const fake = setup({
      crisis_alerts: [
        {
          id: 'a1',
          user_id: A,
          source: 'assessment',
          source_id: 'x1',
          severity: 'critical',
          created_at: '2026-10-13T00:48:00Z',
        },
      ],
      assessments: [{ id: 'x1', type: 'phq9', total_score: 17 }],
    });
    const alerts = await getOpenAlerts(refs);

    expect(idsFilter(fake.queries, 'crisis_alerts')).toEqual([A]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.reason).toContain('PHQ-9 skor 17');
    expect(fake.log.indexOf(`audit:crisis_alerts:read:${A}`)).toBeLessThan(
      fake.log.indexOf('from:crisis_alerts'),
    );
  });

  it('klien yang mengizinkan peringatan tetapi tidak skrining: skornya tidak diminta dan tidak tampil', async () => {
    const fake = setup({
      crisis_alerts: [
        {
          id: 'a2',
          user_id: B,
          source: 'assessment',
          source_id: 'x2',
          severity: 'high',
          created_at: '2026-10-13T00:48:00Z',
        },
      ],
      assessments: [{ id: 'x2', type: 'phq9', total_score: 21 }],
    });
    const only = [{ ...refs[1]!, permissions: { ...NONE, crisis_alerts: true } }];
    const alerts = await getOpenAlerts(only);

    expect(fake.tablesQueried()).not.toContain('assessments');
    expect(alerts[0]!.reason).not.toMatch(/21|PHQ/);
  });

  it('tanpa klien berizin: tidak ada kueri dan tidak ada catatan akses', async () => {
    const fake = setup();
    expect(await getOpenAlerts([refs[2]!])).toEqual([]);
    expect(fake.queries).toEqual([]);
    expect(fake.log.filter((entry) => entry.startsWith('audit:'))).toEqual([]);
  });

  it('tingkat di luar high/critical dibuang', async () => {
    setup({
      crisis_alerts: [
        {
          id: 'a3',
          user_id: A,
          source: 'mood',
          source_id: null,
          severity: 'low',
          created_at: '2026-10-13T00:48:00Z',
        },
      ],
    });
    expect(await getOpenAlerts([refs[0]!])).toEqual([]);
  });
});

describe('getClientDetail', () => {
  it('orang yang bukan klien: null, tanpa membaca data apa pun dan tanpa catatan akses', async () => {
    const fake = setup();
    expect(await getClientDetail('dddddddd-dddd-4ddd-8ddd-dddddddddddd', NOW)).toBeNull();
    expect(fake.tablesQueried()).toEqual([]);
    expect(fake.log.filter((entry) => entry.startsWith('audit:'))).toEqual([]);
  });

  it('klien tanpa izin apa pun: bagian null, hanya jadwal sesi yang dibaca', async () => {
    const fake = setup();
    const detail = await getClientDetail(C, NOW);
    expect(detail).toMatchObject({
      assessments: null,
      moods: null,
      sleeps: null,
      alerts: null,
      consultations: [],
    });
    expect(fake.tablesQueried()).toEqual(['consultations']);
    expect(fake.log.some((entry) => entry.startsWith('audit:'))).toBe(false);
  });

  it('klien yang hanya membagikan mood: hanya mood yang dicatat dan dibaca', async () => {
    const fake = setup({
      mood_entries: [{ user_id: B, mood_type: 'tenang', created_at: '2026-10-12T01:00:00Z' }],
    });
    const detail = await getClientDetail(B, NOW);
    expect(detail!.moods).toHaveLength(1);
    expect(detail!.assessments).toBeNull();
    expect(fake.tablesQueried().sort()).toEqual(['consultations', 'mood_entries']);
    const audits = fake.log.filter((entry) => entry.startsWith('audit:'));
    expect(audits).toEqual([`audit:mood:read:${B}`]);
    expect(fake.log.indexOf(`audit:mood:read:${B}`)).toBeLessThan(
      fake.log.indexOf('from:mood_entries'),
    );
  });

  it('klien yang membagikan semuanya: setiap jenis dicatat sebelum dibaca', async () => {
    const fake = setup();
    await getClientDetail(A, NOW);
    for (const [resource, table] of [
      ['assessments', 'assessments'],
      ['mood', 'mood_entries'],
      ['sleep', 'sleep_entries'],
      ['crisis_alerts', 'crisis_alerts'],
    ] as const) {
      const audit = fake.log.indexOf(`audit:${resource}:read:${A}`);
      expect(audit, resource).toBeGreaterThanOrEqual(0);
      expect(audit, resource).toBeLessThan(fake.log.indexOf(`from:${table}`));
    }
  });

  it('gagal mencatat akses = tidak membaca data klien', async () => {
    const fake = setup();
    state.auditFailure = true;
    await expect(getClientDetail(A, NOW)).rejects.toBeInstanceOf(Error);
    expect(fake.tablesQueried()).toEqual([]);
  });

  it('kueri selalu dibatasi pada id klien yang diminta', async () => {
    const fake = setup();
    await getClientDetail(A, NOW);
    for (const query of fake.queries) {
      expect(query.filters.find((f) => f.column === 'user_id')?.value, query.table).toBe(A);
    }
  });
});
