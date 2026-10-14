import { describe, expect, it } from 'vitest';
import { COMPANION_WINDOW_DAYS, parseCompanionActivity } from './companion';

const row = {
  conversations: 3,
  messages: 10,
  active_days: 2,
  crisis_conversations: 1,
  last_activity: '2026-10-12T04:00:00+00:00',
};

describe('parseCompanionActivity', () => {
  it('baris sah dipetakan ke camelCase dengan jendela bawaan 30 hari', () => {
    expect(COMPANION_WINDOW_DAYS).toBe(30);
    expect(parseCompanionActivity([row])).toEqual({
      conversations: 3,
      messages: 10,
      activeDays: 2,
      crisisConversations: 1,
      lastActivity: '2026-10-12T04:00:00+00:00',
      windowDays: 30,
    });
  });

  it('menerima satu objek (bukan larik) dan jendela lain', () => {
    expect(parseCompanionActivity(row, 90)).toMatchObject({ conversations: 3, windowDays: 90 });
  });

  it('hitungan berupa teks angka dari Postgres diterima; teks bukan angka ditolak', () => {
    expect(
      parseCompanionActivity([{ ...row, conversations: '3', messages: '10', active_days: '2' }]),
    ).toMatchObject({ conversations: 3, messages: 10, activeDays: 2 });
    expect(parseCompanionActivity([{ ...row, conversations: 'tiga' }])).toBeNull();
    // Teks kosong bukan nol: Number('') = 0 tidak boleh lolos sebagai hitungan.
    expect(parseCompanionActivity([{ ...row, messages: '' }])).toBeNull();
    expect(parseCompanionActivity([{ ...row, messages: '  ' }])).toBeNull();
    expect(parseCompanionActivity([{ ...row, conversations: '' }])).toBeNull();
  });

  it('tanpa percakapan: nol semua dan waktu terakhir kosong', () => {
    expect(
      parseCompanionActivity([
        {
          conversations: 0,
          messages: 0,
          active_days: 0,
          crisis_conversations: 0,
          last_activity: null,
        },
      ]),
    ).toEqual({
      conversations: 0,
      messages: 0,
      activeDays: 0,
      crisisConversations: 0,
      lastActivity: null,
      windowDays: 30,
    });
  });

  it.each([
    ['bukan objek', 'x'],
    ['larik kosong', []],
    ['null', null],
    ['undefined', undefined],
    ['angka', 42],
    ['hitungan negatif', [{ ...row, messages: -1 }]],
    ['hitungan pecahan', [{ ...row, messages: 1.5 }]],
    ['hitungan hilang', [{ ...row, active_days: undefined }]],
    ['hitungan null', [{ ...row, crisis_conversations: null }]],
    ['percakapan krisis melebihi percakapan', [{ ...row, crisis_conversations: 4 }]],
    ['hari aktif melebihi percakapan', [{ ...row, active_days: 4 }]],
    ['waktu terakhir bukan tanggal', [{ ...row, last_activity: 'kemarin' }]],
    ['waktu terakhir bukan teks', [{ ...row, last_activity: 1760000000000 }]],
    [
      'waktu ada tetapi percakapan nol',
      [{ ...row, conversations: 0, active_days: 0, crisis_conversations: 0 }],
    ],
  ])('%s → null (tidak menampilkan angka yang mungkin salah)', (_name, input) => {
    expect(parseCompanionActivity(input)).toBeNull();
  });

  it('batas: krisis sama dengan jumlah percakapan dan hari aktif sama dengan jumlah percakapan masih sah', () => {
    expect(
      parseCompanionActivity([{ ...row, crisis_conversations: 3, active_days: 3 }]),
    ).toMatchObject({ crisisConversations: 3, activeDays: 3 });
  });

  it('hanya mengambil baris pertama dan mengabaikan kolom asing (isi percakapan tidak ikut terbawa)', () => {
    const result = parseCompanionActivity([
      { ...row, messages_text: 'RAHASIA', content: 'RAHASIA' },
      row,
    ]);
    expect(JSON.stringify(result)).not.toContain('RAHASIA');
    expect(Object.keys(result!).sort()).toEqual([
      'activeDays',
      'conversations',
      'crisisConversations',
      'lastActivity',
      'messages',
      'windowDays',
    ]);
  });
});
