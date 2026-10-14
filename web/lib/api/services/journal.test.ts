// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createFakeSupabase } from '@/tests/helpers/fake-supabase';
import { ApiError } from '@/lib/api/errors';
import { createMood, createSleep, listMood, listSleep } from './journal';

const USER = '11111111-1111-4111-8111-111111111111';
const asClient = (fake: ReturnType<typeof createFakeSupabase>) => fake.client as never;
const NOW = new Date('2026-10-13T03:00:00Z');

describe('createMood', () => {
  it('menyimpan atas nama pemilik token dengan kolom yang sama seperti web', async () => {
    const fake = createFakeSupabase({
      results: {
        'mood_entries:insert': {
          data: [{ id: 'm1', created_at: '2026-10-13T03:00:00Z' }],
          error: null,
        },
      },
    });
    const saved = await createMood(asClient(fake), USER, {
      moodType: 'cemas',
      energyLevel: 2,
      triggers: ['Pekerjaan'],
      note: 'Tenggat menumpuk.',
    });
    expect(saved).toEqual({ id: 'm1', createdAt: '2026-10-13T03:00:00Z' });
    expect(fake.writes()[0]!.payload).toEqual({
      user_id: USER,
      mood_type: 'cemas',
      energy_level: 2,
      triggers: ['Pekerjaan'],
      note: 'Tenggat menumpuk.',
    });
  });

  it('galat database → 500 generik', async () => {
    const fake = createFakeSupabase({
      results: { 'mood_entries:insert': { data: null, error: { message: 'x' } } },
    });
    const error = await createMood(asClient(fake), USER, {
      moodType: 'tenang',
      energyLevel: 3,
      triggers: [],
      note: '',
    }).catch((e) => e);
    expect(error.status).toBe(500);
  });
});

describe('listMood', () => {
  it('dibatasi user_id, urut menurun, dan melewati jenis perasaan yang tak dikenal', async () => {
    const fake = createFakeSupabase({
      tables: {
        mood_entries: [
          {
            id: 'a',
            mood_type: 'tenang',
            energy_level: 4,
            triggers: [],
            note: '',
            created_at: '2026-10-13T01:00:00.000000+00:00',
          },
          {
            id: 'b',
            mood_type: 'marah-besar',
            energy_level: 1,
            triggers: [],
            note: '',
            created_at: '2026-10-12T01:00:00.000000+00:00',
          },
        ],
      },
    });
    const page = await listMood(asClient(fake), USER, { limit: 20 });
    expect(fake.queries[0]!.filters).toContainEqual({ op: 'eq', column: 'user_id', value: USER });
    expect(fake.queries[0]!.orders[0]).toEqual({ column: 'created_at', ascending: false });
    expect(page.items.map((item) => item.id)).toEqual(['a']);
    expect(page.nextCursor).toBeNull();
  });
});

describe('createSleep', () => {
  const body = {
    wakeDate: '2026-10-13',
    bedtime: '22:30',
    wakeTime: '06:00',
    quality: 4,
    notes: '',
  };

  it('mengubah isian WIB menjadi jendela UTC dan menyimpannya atas nama pemilik token', async () => {
    const fake = createFakeSupabase({
      results: { 'sleep_entries:insert': { data: [{ id: 's1' }], error: null } },
    });
    expect(await createSleep(asClient(fake), USER, body, NOW)).toEqual({ id: 's1' });
    expect(fake.writes()[0]!.payload).toMatchObject({
      user_id: USER,
      bedtime: '2026-10-12T15:30:00.000Z',
      wake_time: '2026-10-12T23:00:00.000Z',
      quality: 4,
    });
  });

  it.each([
    ['jam sama', { ...body, bedtime: '06:00', wakeTime: '06:00' }, 'bedtime'],
    ['terlalu singkat', { ...body, bedtime: '05:50', wakeTime: '06:00' }, 'bedtime'],
    ['bangun di masa depan', { ...body, wakeDate: '2026-10-14' }, 'wakeTime'],
    ['terlalu lama lalu', { ...body, wakeDate: '2026-01-01' }, 'wakeDate'],
    ['tanggal tidak nyata', { ...body, wakeDate: '2026-02-31' }, 'wakeDate'],
  ])(
    '422 untuk %s, dengan lokasi yang tepat dan tanpa menyentuh database',
    async (_name, input, path) => {
      const fake = createFakeSupabase();
      const error = await createSleep(asClient(fake), USER, input, NOW).catch((e) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(422);
      expect(error.issues[0].path).toBe(path);
      expect(fake.queries).toEqual([]);
    },
  );
});

describe('listSleep', () => {
  it('dibatasi user_id dan diurutkan menurut jam bangun', async () => {
    const fake = createFakeSupabase({
      tables: {
        sleep_entries: [
          {
            id: 's',
            bedtime: '2026-10-12T15:30:00.000000+00:00',
            wake_time: '2026-10-12T23:00:00.000000+00:00',
            quality: 4,
            notes: '',
          },
        ],
      },
    });
    const page = await listSleep(asClient(fake), USER, { limit: 20 });
    expect(fake.queries[0]!.filters).toContainEqual({ op: 'eq', column: 'user_id', value: USER });
    expect(fake.queries[0]!.orders[0]).toEqual({ column: 'wake_time', ascending: false });
    expect(page.items[0]).toMatchObject({ id: 's', quality: 4 });
  });
});
