// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

type RpcResult = { data: unknown; error: { code: string; message: string } | null };

const state = vi.hoisted(() => ({
  calls: [] as string[],
  results: {} as Record<string, RpcResult>,
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    rpc: async (name: string) => {
      state.calls.push(name);
      return state.results[name] ?? { data: null, error: { code: 'PGRST202', message: 'x' } };
    },
  }),
}));

import { getPendingPsychologists } from './admin';

const withStr = {
  id: 'a',
  name: 'Calon Satu',
  email: 'satu@t.test',
  created_at: '2026-10-15T01:00:00Z',
  str_number: 'STR-1234',
};
const withoutStr = {
  id: 'b',
  name: 'Calon Dua',
  email: 'dua@t.test',
  created_at: '2026-10-15T02:00:00Z',
};

beforeEach(() => {
  state.calls = [];
  state.results = {};
});

describe('getPendingPsychologists', () => {
  it('memakai antrean baru dan memetakan nomor STR dari pemohon', async () => {
    state.results.admin_pending_psychologist_applications = { data: [withStr], error: null };
    expect(await getPendingPsychologists()).toEqual([
      {
        id: 'a',
        name: 'Calon Satu',
        email: 'satu@t.test',
        createdAt: '2026-10-15T01:00:00Z',
        strNumber: 'STR-1234',
      },
    ]);
    expect(state.calls).toEqual(['admin_pending_psychologist_applications']);
  });

  it('pemohon tanpa STR: strNumber null (bukan string kosong)', async () => {
    state.results.admin_pending_psychologist_applications = {
      data: [{ ...withStr, str_number: null }],
      error: null,
    };
    expect((await getPendingPsychologists())[0]?.strNumber).toBeNull();
  });

  it.each(['PGRST202', '42883'])(
    'migrasi STR belum diterapkan (%s): jatuh ke antrean lama tanpa STR, tidak menggagalkan halaman',
    async (code) => {
      state.results.admin_pending_psychologist_applications = {
        data: null,
        error: { code, message: 'function does not exist' },
      };
      state.results.admin_pending_psychologists = { data: [withoutStr], error: null };
      expect(await getPendingPsychologists()).toEqual([
        {
          id: 'b',
          name: 'Calon Dua',
          email: 'dua@t.test',
          createdAt: '2026-10-15T02:00:00Z',
          strNumber: null,
        },
      ]);
      expect(state.calls).toEqual([
        'admin_pending_psychologist_applications',
        'admin_pending_psychologists',
      ]);
    },
  );

  it('galat lain (mis. 42501 bukan admin) TIDAK ditutupi dengan antrean lama', async () => {
    state.results.admin_pending_psychologist_applications = {
      data: null,
      error: { code: '42501', message: 'Tidak berwenang.' },
    };
    state.results.admin_pending_psychologists = { data: [withoutStr], error: null };
    await expect(getPendingPsychologists()).rejects.toThrow('Antrean tidak bisa dibaca.');
    expect(state.calls).toEqual(['admin_pending_psychologist_applications']);
  });

  it('antrean lama pun gagal: galat yang sama, tanpa membocorkan detail database', async () => {
    state.results.admin_pending_psychologists = {
      data: null,
      error: { code: '42501', message: 'rahasia internal' },
    };
    await expect(getPendingPsychologists()).rejects.toThrow('Antrean tidak bisa dibaca.');
  });
});
