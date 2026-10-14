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
  };
});

import { getCaregiverPatientDetail, getCaregiverPatients } from './caregiver';

const CAREGIVER = '11111111-1111-4111-8111-111111111111';
const OTHER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NOW = new Date('2026-10-13T02:30:00Z');

const relationship = (permissions: Record<string, unknown>) => ({
  id: 'rel-1',
  patient_id: OTHER,
  permissions,
  created_at: '2026-08-20T00:00:00Z',
});

function setup(permissions: Record<string, unknown>, tables: Record<string, unknown[]> = {}) {
  state.auditFailure = false;
  state.supabase = createFakeSupabase({
    tables: { caregiver_relationships: [relationship(permissions)], ...tables },
    rpcs: { caregiver_patient_names: [{ patient_id: OTHER, name: 'Argy F.' }] },
  });
  return state.supabase;
}

beforeEach(() => {
  state.supabase = null;
  state.auditFailure = false;
});

describe('getCaregiverPatients', () => {
  it('nama dari RPC, bukan dari baris profil; hanya hubungan aktif milik pendamping ini', async () => {
    const fake = setup({ mood_daily: true });
    const people = await getCaregiverPatients(CAREGIVER);

    expect(people).toEqual([expect.objectContaining({ patientId: OTHER, name: 'Argy F.' })]);
    expect(fake.tablesQueried()).toEqual(['caregiver_relationships']);
    const filters = fake.queries[0]!.filters;
    expect(filters).toContainEqual({ op: 'eq', column: 'caregiver_id', value: CAREGIVER });
    expect(filters).toContainEqual({ op: 'eq', column: 'status', value: 'active' });
    expect(fake.log).toContain('rpc:caregiver_patient_names');
  });

  it('izin dibaca seperti SQL: hanya true yang berarti diizinkan', async () => {
    setup({ mood_daily: 'false', assessment_results: 1, emergency_alerts: 'true' });
    const [person] = await getCaregiverPatients(CAREGIVER);
    expect(person!.permissions).toEqual({
      mood_daily: false,
      assessment_results: false,
      app_activity: false,
      emergency_alerts: true,
    });
  });
});

describe('getCaregiverPatientDetail', () => {
  it('orang yang bukan tanggungan pendamping ini: null, tanpa membaca data dan tanpa catatan akses', async () => {
    const fake = setup({ mood_daily: true, assessment_results: true, emergency_alerts: true });
    expect(
      await getCaregiverPatientDetail(CAREGIVER, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', NOW),
    ).toBeNull();
    expect(fake.tablesQueried()).toEqual(['caregiver_relationships']);
    expect(fake.log.filter((entry) => entry.startsWith('audit:'))).toEqual([]);
  });

  it('tanpa izin assessment_results: tabel skrining TIDAK diminta dan bagiannya ditandai tidak diizinkan', async () => {
    const fake = setup(
      { mood_daily: true, assessment_results: false, emergency_alerts: true },
      { assessments: [{ type: 'phq9', category: 'severe', completed_at: '2026-10-12T01:00:00Z' }] },
    );
    const detail = await getCaregiverPatientDetail(CAREGIVER, OTHER, NOW);

    expect(fake.tablesQueried()).not.toContain('assessments');
    expect(detail!.view.assessment).toEqual({ allowed: false });
    expect(JSON.stringify(detail!.view)).not.toMatch(/severe|phq9/);
    expect(fake.log.some((entry) => entry.startsWith('audit:assessments'))).toBe(false);
  });

  it('dengan izin: kategori terbaru tampil, tanpa skor, dan akses dicatat sebelum dibaca', async () => {
    const fake = setup(
      { mood_daily: false, assessment_results: true, emergency_alerts: false },
      {
        assessments: [
          {
            type: 'phq9',
            category: 'moderate',
            completed_at: '2026-10-12T01:00:00Z',
            total_score: 14,
          },
        ],
      },
    );
    const detail = await getCaregiverPatientDetail(CAREGIVER, OTHER, NOW);

    expect(detail!.view.assessment).toMatchObject({
      allowed: true,
      latest: { type: 'phq9', category: 'moderate' },
    });
    expect(JSON.stringify(detail)).not.toContain('14');
    expect(fake.log.indexOf(`audit:assessments:read:${OTHER}`)).toBeLessThan(
      fake.log.indexOf('from:assessments'),
    );
    // Hanya jenis yang diizinkan yang dicatat dan dibaca.
    expect(fake.tablesQueried()).not.toContain('mood_entries');
    expect(fake.tablesQueried()).not.toContain('crisis_alerts');
  });

  it('tanpa izin apa pun: tidak ada data klien yang dibaca atau dicatat', async () => {
    const fake = setup({});
    const detail = await getCaregiverPatientDetail(CAREGIVER, OTHER, NOW);
    expect(detail!.view).toEqual({
      mood: { allowed: false },
      assessment: { allowed: false },
      alerts: { allowed: false },
    });
    expect(fake.tablesQueried()).toEqual(['caregiver_relationships']);
    expect(fake.log.some((entry) => entry.startsWith('audit:'))).toBe(false);
  });

  it('gagal mencatat akses = tidak membaca data', async () => {
    const fake = setup({ mood_daily: true });
    state.auditFailure = true;
    await expect(getCaregiverPatientDetail(CAREGIVER, OTHER, NOW)).rejects.toBeInstanceOf(Error);
    expect(fake.tablesQueried()).toEqual(['caregiver_relationships']);
  });
});
