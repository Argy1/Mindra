/**
 * Ringkasan PENGGUNAAN Teman cerita untuk psikolog yang diizinkan klien (izin `ai_summary`). Hanya hitungan: berapa
 * percakapan, berapa pesan, berapa hari aktif, berapa percakapan bertanda krisis, dan kapan terakhir. Isi percakapan tidak
 * pernah sampai ke sini (fungsi database `client_companion_activity` tidak mengembalikannya).
 */

export const COMPANION_WINDOW_DAYS = 30;

export interface CompanionActivity {
  conversations: number;
  messages: number;
  activeDays: number;
  crisisConversations: number;
  /** Waktu ISO percakapan terakhir dalam jendela; null bila tidak ada. */
  lastActivity: string | null;
  windowDays: number;
}

const count = (value: unknown): number | null => {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof number === 'number' && Number.isInteger(number) && number >= 0 ? number : null;
};

/**
 * Membaca jawaban RPC (larik satu baris, atau satu objek) menjadi bentuk aman. Bentuk tak terduga atau hitungan yang
 * tidak masuk akal (negatif, pecahan, bukan angka, percakapan krisis melebihi jumlah percakapan) menghasilkan null,
 * dan pemanggil memperlakukannya sebagai galat memuat, bukan menampilkan angka yang mungkin salah.
 */
export function parseCompanionActivity(
  data: unknown,
  windowDays: number = COMPANION_WINDOW_DAYS,
): CompanionActivity | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (typeof row !== 'object' || row === null) return null;
  const source = row as Record<string, unknown>;

  const conversations = count(source.conversations);
  const messages = count(source.messages);
  const activeDays = count(source.active_days);
  const crisisConversations = count(source.crisis_conversations);
  if (
    conversations === null ||
    messages === null ||
    activeDays === null ||
    crisisConversations === null
  ) {
    return null;
  }
  if (crisisConversations > conversations || activeDays > conversations) return null;

  const raw = source.last_activity;
  let lastActivity: string | null = null;
  if (raw !== null && raw !== undefined) {
    if (typeof raw !== 'string' || Number.isNaN(new Date(raw).getTime())) return null;
    lastActivity = raw;
  }
  if (conversations === 0 && lastActivity !== null) return null;

  return { conversations, messages, activeDays, crisisConversations, lastActivity, windowDays };
}
