import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';

/**
 * Kursor halaman berbasis keyset (waktu, id): stabil walau ada baris baru, dan tidak menumpuk biaya
 * seperti OFFSET. Kursor buram bagi klien (base64url dari JSON), tetapi TIDAK dipercaya: dibongkar,
 * divalidasi ketat (bentuk waktu dan UUID), baru disisipkan ke filter PostgREST. Itu penting karena nilainya
 * masuk ke ekspresi `or(...)`; hanya karakter waktu dan UUID yang lolos validasi, jadi tidak ada penyisipan filter.
 *
 * Waktu disimpan SEBAGAIMANA dikembalikan database (mikrodetik), bukan dibulatkan ke milidetik, supaya dua
 * baris dalam milidetik yang sama tidak terlewat atau terulang antar halaman.
 */

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;

const cursorSchema = z
  .object({
    t: z.string().regex(TIMESTAMP),
    id: z.uuid(),
  })
  .strict();

export type Cursor = z.infer<typeof cursorSchema>;

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify({ t: cursor.t, id: cursor.id }), 'utf8').toString('base64url');
}

const invalidCursor = () =>
  new ApiError('validation_failed', undefined, {
    issues: [
      { path: 'cursor', message: 'Kursor tidak valid. Pakai nilai meta.nextCursor apa adanya.' },
    ],
  });

/** null = tanpa kursor (halaman pertama). Kursor yang rusak melempar 422, bukan diabaikan diam-diam. */
export function decodeCursor(raw: string | undefined): Cursor | null {
  if (raw === undefined || raw === '') return null;
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) throw invalidCursor();
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw invalidCursor();
  }
  const result = cursorSchema.safeParse(parsed);
  if (!result.success) throw invalidCursor();
  return result.data;
}

/** Ekspresi `or` PostgREST untuk "lebih tua dari kursor" pada urutan (kolom waktu menurun, id menurun). */
export function olderThanCursor(column: string, cursor: Cursor): string {
  return `${column}.lt.${cursor.t},and(${column}.eq.${cursor.t},id.lt.${cursor.id})`;
}

/** Memotong hasil `limit + 1` baris menjadi satu halaman dan kursor berikutnya. */
export function toPage<T>(
  rows: readonly T[],
  limit: number,
  cursorOf: (row: T) => Cursor,
): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const last = items[items.length - 1];
  return { items, nextCursor: hasMore && last ? encodeCursor(cursorOf(last)) : null };
}
