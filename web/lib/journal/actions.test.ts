// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialFormState } from '@/lib/auth/form-state';

const revalidatePath = vi.fn();
const readPublicEnv = vi.fn();
const getSessionState = vi.fn();
const createClient = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: (path: string) => revalidatePath(path) }));
vi.mock('@/lib/env/public', () => ({ readPublicEnv: () => readPublicEnv() }));
vi.mock('@/lib/auth/session', () => ({ getSessionState: () => getSessionState() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: () => createClient() }));

import {
  deleteMoodEntryAction,
  deleteSleepEntryAction,
  saveMoodAction,
  saveSleepAction,
} from './actions';

function fakeClient(options: { error?: boolean } = {}) {
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  const deletes: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
  const client = {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        inserts.push({ table, row });
        // Kode produksi membaca balik id dan waktu baris yang disimpan: insert(...).select(...).single().
        return {
          select: () => ({
            single: async () =>
              options.error
                ? { data: null, error: { message: 'boom' } }
                : { data: { id: 'baru-1', created_at: '2026-10-13T01:00:00Z' }, error: null },
          }),
        };
      },
      delete: () => {
        const filters: Array<[string, unknown]> = [];
        deletes.push({ table, filters });
        const chain = {
          eq: (column: string, value: unknown) => {
            filters.push([column, value]);
            return filters.length >= 2
              ? Promise.resolve({ error: options.error ? { message: 'boom' } : null })
              : chain;
          },
        };
        return chain;
      },
    }),
  };
  return { client, inserts, deletes };
}

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  readPublicEnv.mockReturnValue({ ok: true });
  getSessionState.mockResolvedValue({
    status: 'ok',
    profile: { id: 'user-sesi', email: 'a@t.test', name: 'A', role: 'user' },
  });
});

describe('saveMoodAction', () => {
  it('menyimpan check-in cepat: energi bawaan 3, tanpa pemicu dan catatan; user dari SESI', async () => {
    const { client, inserts } = fakeClient();
    createClient.mockResolvedValue(client);

    const state = await saveMoodAction(initialFormState, form({ moodType: 'tenang' }));

    expect(state.status).toBe('success');
    expect(inserts).toEqual([
      {
        table: 'mood_entries',
        row: { user_id: 'user-sesi', mood_type: 'tenang', energy_level: 3, triggers: [], note: '' },
      },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith('/jurnal');
    expect(revalidatePath).toHaveBeenCalledWith('/beranda');
  });

  it('check-in lengkap: pemicu dideduplikasi, catatan dipangkas', async () => {
    const { client, inserts } = fakeClient();
    createClient.mockResolvedValue(client);

    await saveMoodAction(
      initialFormState,
      form({
        moodType: 'lelah',
        energyLevel: '2',
        triggers: ['Pekerjaan', 'Tidur', 'Pekerjaan'],
        note: '  Capek sekali hari ini.  ',
      }),
    );

    expect(inserts[0]!.row).toMatchObject({
      mood_type: 'lelah',
      energy_level: 2,
      triggers: ['Pekerjaan', 'Tidur'],
      note: 'Capek sekali hari ini.',
    });
  });

  it('SERANGAN: user_id atau kolom lain di formulir diabaikan; yang dipakai id sesi', async () => {
    const { client, inserts } = fakeClient();
    createClient.mockResolvedValue(client);
    await saveMoodAction(
      initialFormState,
      form({ moodType: 'tenang', user_id: 'korban', id: 'x', created_at: '2020-01-01' }),
    );
    expect(Object.keys(inserts[0]!.row).sort()).toEqual([
      'energy_level',
      'mood_type',
      'note',
      'triggers',
      'user_id',
    ]);
    expect(inserts[0]!.row.user_id).toBe('user-sesi');
  });

  it.each([
    ['perasaan kosong', {}, 'moodType', 'Pilih salah satu perasaan.'],
    ['perasaan tak dikenal', { moodType: 'marah' }, 'moodType', 'Pilih salah satu perasaan.'],
    ['energi 6', { moodType: 'tenang', energyLevel: '6' }, 'energyLevel', undefined],
    ['energi pecahan', { moodType: 'tenang', energyLevel: '2.5' }, 'energyLevel', undefined],
    ['energi bukan angka', { moodType: 'tenang', energyLevel: 'abc' }, 'energyLevel', undefined],
    ['pemicu tak dikenal', { moodType: 'tenang', triggers: ['Politik'] }, 'triggers', undefined],
    [
      'catatan terlalu panjang',
      { moodType: 'tenang', note: 'a'.repeat(501) },
      'note',
      'Catatan maksimal 500 karakter.',
    ],
  ] as const)(
    'menolak %s dengan galat per kolom, tanpa menyentuh database',
    async (_name, fields, field, message) => {
      const state = await saveMoodAction(
        initialFormState,
        form(fields as Record<string, string | string[]>),
      );
      expect(state.status).toBe('error');
      expect(state.fieldErrors?.[field]).toBeTruthy();
      if (message) expect(state.fieldErrors?.[field]).toBe(message);
      expect(createClient).not.toHaveBeenCalled();
      expect(getSessionState).not.toHaveBeenCalled();
    },
  );

  it('galat tetap mengembalikan nilai yang sudah diisi supaya formulir tidak kosong', async () => {
    const state = await saveMoodAction(
      initialFormState,
      form({ moodType: 'tenang', energyLevel: '9', note: 'Catatan saya', triggers: ['Cuaca'] }),
    );
    expect(state.values).toMatchObject({
      moodType: 'tenang',
      note: 'Catatan saya',
      triggers: 'Cuaca',
    });
  });

  it('sesi berakhir → pesan; galat database → pesan umum tanpa detail', async () => {
    getSessionState.mockResolvedValueOnce({ status: 'signed-out' });
    const expired = await saveMoodAction(initialFormState, form({ moodType: 'tenang' }));
    expect(expired.status).toBe('error');
    expect(expired.message).toMatch(/Sesimu sudah berakhir/);

    createClient.mockResolvedValue(fakeClient({ error: true }).client);
    const failed = await saveMoodAction(initialFormState, form({ moodType: 'tenang' }));
    expect(failed.status).toBe('error');
    expect(failed.message).not.toMatch(/boom/);

    createClient.mockRejectedValue(new Error('ECONNRESET'));
    const offline = await saveMoodAction(initialFormState, form({ moodType: 'tenang' }));
    expect(offline.message).toMatch(/Koneksi terputus/);
  });
});

describe('saveSleepAction', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-13T09:00:00+07:00'));
  });
  afterEach(() => vi.useRealTimers());

  const valid = () => ({
    wakeDate: '2026-10-13',
    bedtime: '22:30',
    wakeTime: '06:00',
    quality: '4',
    notes: 'Nyenyak',
  });

  it('menyimpan jendela tidur dalam UTC dari isian WIB, user dari SESI', async () => {
    const { client, inserts } = fakeClient();
    createClient.mockResolvedValue(client);

    const state = await saveSleepAction(initialFormState, form(valid()));

    expect(state.status).toBe('success');
    expect(inserts).toEqual([
      {
        table: 'sleep_entries',
        row: {
          user_id: 'user-sesi',
          bedtime: '2026-10-12T15:30:00.000Z',
          wake_time: '2026-10-12T23:00:00.000Z',
          quality: 4,
          notes: 'Nyenyak',
        },
      },
    ]);
  });

  it.each([
    ['kualitas kosong', { quality: '' }, 'quality'],
    ['kualitas 6', { quality: '6' }, 'quality'],
    ['tanggal kosong', { wakeDate: '' }, 'wakeDate'],
    ['tanggal tidak nyata', { wakeDate: '2026-02-30' }, 'wakeDate'],
    ['jam tidur kosong', { bedtime: '' }, 'bedtime'],
    ['jam tidur = jam bangun', { bedtime: '06:00' }, 'bedtime'],
    ['durasi di bawah 30 menit', { bedtime: '05:45', wakeTime: '06:00' }, 'bedtime'],
    ['jam bangun di masa depan', { wakeDate: '2026-10-14' }, 'wakeTime'],
    ['tanggal terlalu lama', { wakeDate: '2026-01-01' }, 'wakeDate'],
    ['catatan terlalu panjang', { notes: 'x'.repeat(501) }, 'notes'],
  ] as const)('menolak %s dengan galat di kolom yang tepat', async (_name, override, field) => {
    const state = await saveSleepAction(initialFormState, form({ ...valid(), ...override }));
    expect(state.status).toBe('error');
    expect(state.fieldErrors?.[field]).toBeTruthy();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('galat mempertahankan nilai isian', async () => {
    const state = await saveSleepAction(initialFormState, form({ ...valid(), quality: '' }));
    expect(state.values).toMatchObject({
      wakeDate: '2026-10-13',
      bedtime: '22:30',
      wakeTime: '06:00',
    });
  });
});

describe('hapus catatan', () => {
  const ID = '8f5e0d86-1b2c-4a53-9c1e-6a1b5a0f3c7d';

  it.each([
    ['mood_entries', deleteMoodEntryAction],
    ['sleep_entries', deleteSleepEntryAction],
  ] as const)('%s: menghapus berdasarkan id DAN user dari sesi', async (table, action) => {
    const { client, deletes } = fakeClient();
    createClient.mockResolvedValue(client);

    const state = await action(initialFormState, form({ id: ID }));

    expect(state.status).toBe('success');
    expect(deletes).toEqual([
      {
        table,
        filters: [
          ['id', ID],
          ['user_id', 'user-sesi'],
        ],
      },
    ]);
  });

  it('id yang bukan UUID ditolak tanpa menyentuh database', async () => {
    for (const id of ['', 'abc', "1' or '1'='1", '../../x']) {
      const state = await deleteMoodEntryAction(initialFormState, form({ id }));
      expect(state.status).toBe('error');
    }
    expect(createClient).not.toHaveBeenCalled();
  });

  it('sesi berakhir → pesan', async () => {
    getSessionState.mockResolvedValueOnce({ status: 'signed-out' });
    const state = await deleteSleepEntryAction(initialFormState, form({ id: ID }));
    expect(state.status).toBe('error');
  });
});
