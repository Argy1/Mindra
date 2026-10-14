import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SseEvent } from '@/lib/api/sse';
import { buildCrisisReply } from '@/lib/domain/companion/crisis-reply';
import {
  makeMessage,
  MAX_STORED_MESSAGES,
  storedMessagesSchema,
  type StoredMessage,
} from '@/lib/domain/companion/messages';
import {
  buildSystemPrompt,
  needsAiReminder,
  toModelMessages,
  type ModelMessage,
} from '@/lib/domain/companion/prompt';
import { detectCrisisText } from '@/lib/domain/crisis/detector';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import type { Database, Json } from '@/lib/supabase/database.types';

/**
 * Satu giliran percakapan Teman cerita. URUTAN INI ADALAH KEPUTUSAN KEAMANAN (docs/ARCHITECTURE.md §7):
 *
 *   1. muat percakapan milik pemanggil (penyaring user_id eksplisit + RLS)
 *   2. deteksi krisis BERBASIS ATURAN pada teks pengguna, SEBELUM model disentuh
 *   3a. krisis: simpan percakapan, buat peringatan krisis, jawab dengan balasan TETAP; model TIDAK dipanggil
 *   3b. aman: alirkan balasan model, lalu simpan
 *
 * Jawaban krisis tidak bergantung pada model, kunci API, atau jaringan keluar. Isi percakapan tidak pernah
 * ditulis ke log. Kegagalan model menghasilkan peristiwa `error` generik dan TIDAK menyimpan pesan setengah jadi.
 */

export interface CompanionModel {
  /** Mengalirkan potongan teks balasan. Harus berhenti bila `signal` dibatalkan. */
  stream(input: {
    system: string;
    messages: ModelMessage[];
    signal?: AbortSignal;
  }): AsyncIterable<string>;
}

export interface CompanionDeps {
  /** null = kunci model belum dikonfigurasi; jalur krisis tetap bekerja. */
  model: CompanionModel | null;
  now: () => Date;
  newId: () => string;
  signal?: AbortSignal;
}

export interface CompanionInput {
  conversationId?: string | undefined;
  message: string;
}

/** Cadangan: batas panjang balasan yang diterima dari model (token sudah dibatasi adapter). */
export const MAX_REPLY_CHARS = 6000;
/** Peringatan krisis dari chat tidak diulang bila masih ada yang terbuka dalam jendela ini. */
export const ALERT_DEDUPE_HOURS = 6;

type Client = SupabaseClient<Database>;

const error = (code: string, message: string): SseEvent => ({
  event: 'error',
  data: { code, message },
});

const MESSAGES = {
  notFound: 'Percakapan itu tidak ditemukan. Mulai percakapan baru.',
  corrupt: 'Percakapan ini tidak bisa dibuka. Mulai percakapan baru.',
  full: 'Percakapan ini sudah panjang sekali. Mulai percakapan baru supaya aku bisa mengikutimu dengan baik.',
  conflict: 'Percakapan ini berubah dari tempat lain. Muat ulang halaman, lalu coba lagi.',
  loadFailed: 'Percakapan belum bisa dimuat. Coba lagi sebentar lagi.',
  unavailable: 'Teman cerita sedang tidak bisa menjawab. Coba lagi sebentar lagi.',
  notConfigured: 'Teman cerita belum diaktifkan di server ini.',
  empty: 'Balasannya kosong. Coba kirim lagi.',
} as const;

interface Loaded {
  id: string;
  existing: boolean;
  messages: StoredMessage[];
  crisisDetected: boolean;
  updatedAt: string | null;
}

async function loadConversation(
  supabase: Client,
  userId: string,
  conversationId: string,
): Promise<Loaded | { error: 'not_found' | 'corrupt' | 'load_failed' }> {
  const { data, error: queryError } = await supabase
    .from('ai_conversations')
    .select('id, messages, crisis_detected, updated_at')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (queryError) return { error: 'load_failed' };
  if (!data) return { error: 'not_found' };
  const parsed = storedMessagesSchema.safeParse(data.messages ?? []);
  if (!parsed.success) return { error: 'corrupt' };
  return {
    id: data.id,
    existing: true,
    messages: parsed.data,
    crisisDetected: data.crisis_detected,
    updatedAt: data.updated_at,
  };
}

/** Menyimpan percakapan. Pembaruan memakai `updated_at` sebelumnya sebagai penjaga (dua tab tidak saling menimpa). */
async function saveConversation(
  supabase: Client,
  userId: string,
  loaded: Loaded,
  messages: StoredMessage[],
  crisisDetected: boolean,
  now: Date,
): Promise<'saved' | 'conflict' | 'failed'> {
  const payload = messages as unknown as Json;
  if (!loaded.existing) {
    const { error: insertError } = await supabase.from('ai_conversations').insert({
      id: loaded.id,
      user_id: userId,
      messages: payload,
      crisis_detected: crisisDetected,
    });
    return insertError ? 'failed' : 'saved';
  }

  let request = supabase
    .from('ai_conversations')
    .update({ messages: payload, crisis_detected: crisisDetected, updated_at: now.toISOString() })
    .eq('id', loaded.id)
    .eq('user_id', userId);
  if (loaded.updatedAt) request = request.eq('updated_at', loaded.updatedAt);
  const { data, error: updateError } = await request.select('id');
  if (updateError) return 'failed';
  return data && data.length > 0 ? 'saved' : 'conflict';
}

/** Peringatan krisis untuk psikolog/pendamping yang berizin. Satu yang terbuka dalam jendela dedupe sudah cukup. */
async function raiseCrisisAlert(supabase: Client, userId: string, now: Date): Promise<void> {
  const since = new Date(now.getTime() - ALERT_DEDUPE_HOURS * 3_600_000).toISOString();
  const { data: open, error: lookupError } = await supabase
    .from('crisis_alerts')
    .select('id')
    .eq('user_id', userId)
    .eq('source', 'ai_chat')
    .eq('status', 'open')
    .gte('created_at', since)
    .limit(1);
  if (lookupError) return;
  if (open && open.length > 0) return;
  await supabase
    .from('crisis_alerts')
    .insert({ user_id: userId, source: 'ai_chat', severity: 'high' });
}

export async function* runCompanionTurn(
  supabase: Client,
  userId: string,
  input: CompanionInput,
  deps: CompanionDeps,
): AsyncGenerator<SseEvent, void, void> {
  // 1. Percakapan. Pesan krisis tidak boleh gagal hanya karena percakapannya hilang, rusak, atau penuh:
  //    dalam kasus itu ia dijawab di percakapan baru. Pesan biasa mendapat galat yang jelas.
  const crisis = detectCrisisText(input.message);
  const fresh = (): Loaded => ({
    id: deps.newId(),
    existing: false,
    messages: [],
    crisisDetected: false,
    updatedAt: null,
  });
  let loaded: Loaded;
  if (input.conversationId) {
    const result = await loadConversation(supabase, userId, input.conversationId);
    if ('error' in result && crisis) {
      loaded = fresh();
    } else if ('error' in result) {
      yield error(
        result.error === 'not_found'
          ? 'not_found'
          : result.error === 'corrupt'
            ? 'conversation_corrupt'
            : 'load_failed',
        result.error === 'not_found'
          ? MESSAGES.notFound
          : result.error === 'corrupt'
            ? MESSAGES.corrupt
            : MESSAGES.loadFailed,
      );
      return;
    } else {
      loaded = result;
    }
  } else {
    loaded = fresh();
  }
  if (loaded.messages.length >= MAX_STORED_MESSAGES) {
    if (!crisis) {
      yield error('conversation_full', MESSAGES.full);
      return;
    }
    loaded = fresh();
  }

  const userMessage = makeMessage({
    id: deps.newId(),
    role: 'user',
    content: input.message,
    now: deps.now(),
    crisis,
  });

  // 2 + 3a. Jalur krisis: tanpa model.
  if (userMessage.crisis_detected) {
    const reply = makeMessage({
      id: deps.newId(),
      role: 'assistant',
      content: buildCrisisReply(),
      now: deps.now(),
      crisis: true,
    });
    const [saved] = await Promise.allSettled([
      saveConversation(
        supabase,
        userId,
        loaded,
        [...loaded.messages, userMessage, reply],
        true,
        deps.now(),
      ),
      raiseCrisisAlert(supabase, userId, deps.now()),
    ]);
    const persisted = saved.status === 'fulfilled' && saved.value === 'saved';

    yield { event: 'meta', data: { conversationId: loaded.id } };
    yield {
      event: 'crisis',
      data: {
        messageId: reply.id,
        message: reply.content,
        resource: {
          name: PRIMARY_CRISIS_RESOURCE.name,
          displayNumber: PRIMARY_CRISIS_RESOURCE.displayNumber,
          telHref: PRIMARY_CRISIS_RESOURCE.telHref,
        },
      },
    };
    yield {
      event: 'done',
      data: { conversationId: loaded.id, messageId: reply.id, saved: persisted },
    };
    return;
  }

  // 3b. Jalur biasa: model.
  if (!deps.model) {
    yield error('not_configured', MESSAGES.notConfigured);
    return;
  }

  yield { event: 'meta', data: { conversationId: loaded.id } };

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  deps.signal?.addEventListener('abort', onAbort, { once: true });
  let reply = '';
  try {
    const modelStream = deps.model.stream({
      system: buildSystemPrompt({ reminder: needsAiReminder(loaded.messages) }),
      messages: toModelMessages(loaded.messages, input.message),
      signal: controller.signal,
    });
    for await (const piece of modelStream) {
      if (reply.length + piece.length > MAX_REPLY_CHARS) {
        reply += piece.slice(0, MAX_REPLY_CHARS - reply.length);
        break;
      }
      reply += piece;
      yield { event: 'delta', data: { text: piece } };
    }
  } catch {
    // Pesan galat model/jaringan bisa memuat potongan isi permintaan: tidak ditulis ke log maupun dikirim.
    yield error('model_unavailable', MESSAGES.unavailable);
    return;
  } finally {
    controller.abort();
    deps.signal?.removeEventListener('abort', onAbort);
  }

  const text = reply.trim();
  if (text.length === 0) {
    yield error('empty_reply', MESSAGES.empty);
    return;
  }

  const assistantMessage = makeMessage({
    id: deps.newId(),
    role: 'assistant',
    content: text,
    now: deps.now(),
  });
  const outcome = await saveConversation(
    supabase,
    userId,
    loaded,
    [...loaded.messages, userMessage, assistantMessage],
    loaded.crisisDetected,
    deps.now(),
  );
  if (outcome === 'conflict') {
    yield error('conflict', MESSAGES.conflict);
    return;
  }
  yield {
    event: 'done',
    data: { conversationId: loaded.id, messageId: assistantMessage.id, saved: outcome === 'saved' },
  };
}
