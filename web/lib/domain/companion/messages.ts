import { z } from 'zod';

/**
 * Pesan teman cerita. Bentuk simpanan SAMA dengan aplikasi Flutter (`ChatMessageModel.toJson`), karena kedua
 * aplikasi membaca dan menulis kolom `ai_conversations.messages` yang sama:
 *   { id, role: 'user' | 'assistant', content, timestamp (ISO 8601), crisis_detected? }
 * Kolom tak dikenal dipertahankan (`passthrough`) supaya menulis ulang percakapan tidak menghapus bidang
 * milik versi aplikasi lain.
 */

/** Panjang satu pesan pengguna. Cukup untuk curhat panjang, cukup kecil untuk menjaga biaya dan penyalahgunaan. */
export const MAX_MESSAGE_CHARS = 2000;
/** Batas pesan tersimpan per percakapan; lewat itu pengguna diminta memulai percakapan baru. */
export const MAX_STORED_MESSAGES = 200;
/** Pesan terakhir yang dikirim ke model (konteks), termasuk pesan baru. */
export const MODEL_HISTORY_LIMIT = 20;
/** Batas total karakter konteks yang dikirim ke model. Pesan tertua dibuang lebih dulu. */
export const MODEL_CONTEXT_CHARS = 12_000;
/** Setiap kelipatan ini, balasan menyertakan pengingat halus bahwa lawan bicara adalah AI. */
export const AI_REMINDER_EVERY = 5;

export const storedMessageSchema = z
  .object({
    id: z.string().min(1).max(64),
    role: z.enum(['user', 'assistant']),
    content: z.string().max(10_000),
    timestamp: z.string().min(1).max(64),
    crisis_detected: z.boolean().optional(),
  })
  .loose();

export const storedMessagesSchema = z.array(storedMessageSchema).max(2 * MAX_STORED_MESSAGES);

export type StoredMessage = z.infer<typeof storedMessageSchema>;

/** Karakter kontrol (selain baris baru dan tab) tidak boleh ada di pesan. */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/** Pesan pengguna: dipangkas, tidak kosong, panjang terbatas, tanpa karakter kontrol. */
export const userMessageSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, 'Tulis sesuatu dulu.')
      .max(MAX_MESSAGE_CHARS, `Pesan terlalu panjang. Maksimal ${MAX_MESSAGE_CHARS} karakter.`)
      .refine((value) => !CONTROL_CHARS.test(value), 'Pesan memuat karakter yang tidak didukung.'),
  );

export function makeMessage(input: {
  id: string;
  role: StoredMessage['role'];
  content: string;
  now: Date;
  crisis?: boolean;
}): StoredMessage {
  return {
    id: input.id,
    role: input.role,
    content: input.content,
    timestamp: input.now.toISOString(),
    ...(input.crisis ? { crisis_detected: true } : {}),
  };
}

/** Ringkasan satu baris untuk daftar riwayat: awal pesan pertama pengguna. */
export function conversationPreview(messages: readonly StoredMessage[], max = 70): string {
  const first = messages.find((message) => message.role === 'user')?.content ?? '';
  const flat = first.replace(/\s+/g, ' ').trim();
  if (flat.length === 0) return 'Percakapan baru';
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}
