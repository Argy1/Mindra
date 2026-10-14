import type { ChatTurnEvent } from '@/lib/companion/client';

/**
 * Keadaan layar Teman cerita sebagai reducer murni, supaya perilakunya (urutan peristiwa, apa yang terlihat,
 * apa yang dipulihkan ke kolom tulis saat gagal) bisa diuji tanpa DOM.
 */

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Pesan krisis (balasan tetap atau pesan pengguna yang memicunya). */
  crisis?: boolean;
}

export interface CrisisInfo {
  name: string;
  displayNumber: string;
  telHref: string;
}

export interface ChatState {
  conversationId: string | undefined;
  messages: UiMessage[];
  /** Balasan yang sedang mengalir; null bila tidak ada. */
  streaming: string | null;
  status: 'idle' | 'sending' | 'streaming';
  /** Galat terakhir untuk ditampilkan (peran `alert`). */
  error: string | null;
  /** Teks yang gagal terkirim, dipulihkan ke kolom tulis supaya tidak hilang. */
  restoreText: string | null;
  crisis: CrisisInfo | null;
  /** Balasan sudah tampil tetapi gagal tersimpan. */
  unsaved: boolean;
  /** Pesan pengguna yang sedang dikirim (belum dikonfirmasi server). */
  pending: UiMessage | null;
}

export type ChatAction =
  | { type: 'send'; text: string; localId: string }
  | { type: 'turn'; event: ChatTurnEvent }
  | { type: 'aborted' };

export const initialChatState = (
  conversationId?: string,
  messages: UiMessage[] = [],
): ChatState => ({
  conversationId,
  messages,
  streaming: null,
  status: 'idle',
  error: null,
  restoreText: null,
  crisis: null,
  unsaved: false,
  pending: null,
});

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'send':
      return {
        ...state,
        status: 'sending',
        error: null,
        restoreText: null,
        unsaved: false,
        streaming: null,
        pending: { id: action.localId, role: 'user', content: action.text },
      };

    case 'aborted': {
      // Pesan yang dihentikan tidak disimpan server: kembalikan teksnya ke kolom tulis.
      const restore = state.pending?.content ?? null;
      return { ...state, status: 'idle', streaming: null, pending: null, restoreText: restore };
    }

    case 'turn': {
      const { event } = action;
      switch (event.type) {
        case 'meta':
          return { ...state, conversationId: event.conversationId };

        case 'delta':
          return { ...state, status: 'streaming', streaming: (state.streaming ?? '') + event.text };

        case 'crisis': {
          const user = state.pending ? { ...state.pending, crisis: true } : null;
          return {
            ...state,
            messages: [
              ...state.messages,
              ...(user ? [user] : []),
              { id: event.messageId, role: 'assistant', content: event.message, crisis: true },
            ],
            pending: null,
            streaming: null,
            status: 'idle',
            crisis: event.resource,
          };
        }

        case 'done': {
          // Setelah `crisis`, `pending` sudah kosong dan tidak ada aliran: hanya konfirmasi penyimpanan.
          const added: UiMessage[] = [];
          if (state.pending) added.push(state.pending);
          if (state.streaming !== null && state.streaming.trim() !== '') {
            added.push({ id: event.messageId, role: 'assistant', content: state.streaming });
          }
          return {
            ...state,
            conversationId: event.conversationId,
            messages: [...state.messages, ...added],
            pending: null,
            streaming: null,
            status: 'idle',
            unsaved: !event.saved,
          };
        }

        case 'error': {
          // Tidak ada yang tersimpan di server pada galat: pesan dan balasan separuh jadi dibuang dari layar,
          // teks pengguna dikembalikan ke kolom tulis.
          const restore = state.pending?.content ?? null;
          return {
            ...state,
            status: 'idle',
            streaming: null,
            pending: null,
            error: event.message,
            restoreText: restore,
          };
        }
      }
    }
  }
}
