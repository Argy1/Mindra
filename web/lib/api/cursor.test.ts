// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { decodeCursor, encodeCursor, olderThanCursor, toPage } from './cursor';

const ID = '11111111-1111-4111-8111-111111111111';
const T = '2026-10-13T08:30:00.123456+00:00';

const rejects = (raw: string) => {
  try {
    decodeCursor(raw);
    return null;
  } catch (error) {
    return error;
  }
};

describe('kursor', () => {
  it('bolak-balik tanpa kehilangan mikrodetik', () => {
    expect(decodeCursor(encodeCursor({ t: T, id: ID }))).toEqual({ t: T, id: ID });
  });

  it('tanpa kursor = halaman pertama', () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor('')).toBeNull();
  });

  it.each([
    ['bukan base64url', 'bukan kursor!!'],
    ['base64url dari teks biasa', Buffer.from('halo').toString('base64url')],
    ['JSON tanpa id', Buffer.from(JSON.stringify({ t: T })).toString('base64url')],
    ['id bukan UUID', Buffer.from(JSON.stringify({ t: T, id: 'x' })).toString('base64url')],
    [
      'waktu bukan stempel waktu',
      Buffer.from(JSON.stringify({ t: 'kemarin', id: ID })).toString('base64url'),
    ],
    [
      'kolom tambahan',
      Buffer.from(JSON.stringify({ t: T, id: ID, admin: true })).toString('base64url'),
    ],
  ])('menolak %s dengan 422 (bukan diabaikan)', (_name, raw) => {
    const error = rejects(raw);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).issues?.[0]?.path).toBe('cursor');
  });

  it('SUNTIKAN FILTER: waktu berisi sintaks PostgREST ditolak sebelum menyentuh ekspresi or()', () => {
    const attacks = [
      `2026-10-13T08:30:00Z),user_id.neq.${ID},and(id.eq.${ID}`,
      '2026-10-13T08:30:00Z,or(id.not.is.null)',
      `2026-10-13T08:30:00Z.${'9'.repeat(7)}`,
    ];
    for (const t of attacks) {
      const raw = Buffer.from(JSON.stringify({ t, id: ID })).toString('base64url');
      expect(rejects(raw), t).toBeInstanceOf(ApiError);
    }
  });
});

describe('olderThanCursor', () => {
  it('"lebih tua" pada pasangan (waktu, id) menurun', () => {
    expect(olderThanCursor('completed_at', { t: T, id: ID })).toBe(
      `completed_at.lt.${T},and(completed_at.eq.${T},id.lt.${ID})`,
    );
  });
});

describe('toPage', () => {
  const rows = [1, 2, 3, 4].map((n) => ({
    t: `2026-10-13T08:30:0${n}.000000+00:00`,
    id: `${n}${n}111111-1111-4111-8111-111111111111`,
  }));

  it('limit+1 baris: memotong ke limit dan memberi kursor dari baris TERAKHIR yang ditampilkan', () => {
    const page = toPage(rows, 3, (row) => row);
    expect(page.items).toHaveLength(3);
    expect(decodeCursor(page.nextCursor!)).toEqual(rows[2]);
  });

  it('tepat limit baris atau kurang: tanpa halaman berikutnya', () => {
    expect(toPage(rows.slice(0, 3), 3, (row) => row).nextCursor).toBeNull();
    expect(toPage([], 3, (row: (typeof rows)[number]) => row)).toEqual({
      items: [],
      nextCursor: null,
    });
  });
});
