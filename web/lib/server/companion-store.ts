import 'server-only';
import {
  conversationPreview,
  storedMessagesSchema,
  type StoredMessage,
} from '@/lib/domain/companion/messages';
import type { UiMessage } from '@/lib/companion/state';
import { createClient } from '@/lib/supabase/server';

/**
 * Pembacaan riwayat Teman cerita untuk halaman (klien sesi pengguna; RLS "Users manage own AI conversations"
 * dan penyaring `user_id` eksplisit). Isi percakapan adalah data kesehatan: tidak ditulis ke log. Percakapan
 * yang isinya rusak dilewati di daftar dan ditolak saat dibuka (gagal tertutup), bukan ditampilkan separuh.
 */

export interface ConversationSummary {
  id: string;
  preview: string;
  updatedAt: string;
  messageCount: number;
  crisisDetected: boolean;
}

export interface ConversationView {
  id: string;
  messages: UiMessage[];
}

export class CompanionStoreError extends Error {
  constructor() {
    super('Riwayat belum bisa dimuat.');
    this.name = 'CompanionStoreError';
  }
}

export const toUiMessages = (messages: readonly StoredMessage[]): UiMessage[] =>
  messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    ...(message.crisis_detected ? { crisis: true } : {}),
  }));

const LIST_LIMIT = 15;

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, messages, crisis_detected, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(LIST_LIMIT);
  if (error) throw new CompanionStoreError();

  return (data ?? []).flatMap((row) => {
    const parsed = storedMessagesSchema.safeParse(row.messages ?? []);
    if (!parsed.success || parsed.data.length === 0) return [];
    return [
      {
        id: row.id,
        preview: conversationPreview(parsed.data),
        updatedAt: row.updated_at,
        messageCount: parsed.data.length,
        crisisDetected: row.crisis_detected,
      },
    ];
  });
}

export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, messages')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new CompanionStoreError();
  if (!data) return null;
  const parsed = storedMessagesSchema.safeParse(data.messages ?? []);
  if (!parsed.success) return null;
  return { id: data.id, messages: toUiMessages(parsed.data) };
}
