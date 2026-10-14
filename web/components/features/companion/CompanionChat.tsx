'use client';

import Link from 'next/link';
import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { ClockCounterClockwise, Info, PaperPlaneRight, Stop } from '@phosphor-icons/react/ssr';
import { DeleteConversationButton } from '@/components/features/companion/DeleteConversationButton';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { CrisisBanner } from '@/components/ui/CrisisBanner';
import { Dialog } from '@/components/ui/Dialog';
import type { ChatTransport, ChatTurnEvent } from '@/lib/companion/client';
import {
  chatReducer,
  initialChatState,
  type ChatState,
  type UiMessage,
} from '@/lib/companion/state';
import { MAX_MESSAGE_CHARS } from '@/lib/domain/companion/messages';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import type { ConversationSummary } from '@/lib/server/companion-store';
import { cn } from '@/lib/utils/cn';
import { formatDateId, formatTimeId } from '@/lib/utils/date';

export const SUGGESTIONS = [
  'Aku lagi capek banget',
  'Ada yang mengganjal di pikiranku',
  'Aku cuma mau cerita dulu',
] as const;

const GREETING = 'Hai. Aku di sini. Apa yang sedang paling memenuhi pikiranmu sekarang?';
const COUNTER_FROM = Math.floor(MAX_MESSAGE_CHARS * 0.9);

interface CompanionChatProps {
  initialConversationId?: string | undefined;
  initialMessages: UiMessage[];
  conversations: readonly ConversationSummary[];
  transport: ChatTransport;
  /** Alasan fitur nonaktif (mis. kunci model belum diatur). Kolom tulis dimatikan dan alasannya ditampilkan. */
  disabledReason?: string | undefined;
  /** Dasar tautan riwayat. Pratinjau memakai alamat pratinjau. */
  basePath?: string;
  /** Salin id percakapan ke URL setelah pesan pertama (bukan di pratinjau). */
  syncUrl?: boolean;
  /** Tampilkan tombol hapus percakapan (butuh Server Action dan sesi sungguhan). */
  canDelete?: boolean;
}

function Bubble({ message }: { message: UiMessage }) {
  const mine = message.role === 'user';
  return (
    <div
      className={cn(
        'max-w-[88%] rounded-[1.375rem] px-4.5 py-3.5 text-[0.96875rem] leading-relaxed whitespace-pre-wrap max-sm:max-w-[92%]',
        mine
          ? 'justify-self-end rounded-br-lg bg-biru-600 text-white'
          : 'justify-self-start rounded-bl-lg bg-raised text-fg-1 shadow-xs',
        message.crisis && !mine && 'border-[1.5px] border-danger-200 bg-danger-50 text-danger-900',
      )}
    >
      {mine ? (
        <span className="sr-only">Kamu: </span>
      ) : (
        <span className="sr-only">Teman cerita: </span>
      )}
      {message.content}
    </div>
  );
}

/** Obrolan Teman cerita. Seluruh logika keadaan ada di lib/companion/state.ts; ini hanya tampilan dan penghubung. */
export function CompanionChat({
  initialConversationId,
  initialMessages,
  conversations,
  transport,
  disabledReason,
  basePath = '/teman-cerita',
  syncUrl = true,
  canDelete = true,
}: CompanionChatProps) {
  const [state, dispatch] = useReducer(chatReducer, undefined, (): ChatState =>
    initialChatState(initialConversationId, initialMessages),
  );
  const [text, setText] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const conversationRef = useRef<string | undefined>(initialConversationId);
  const threadEnd = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const busy = state.status !== 'idle';
  const disabled = Boolean(disabledReason);

  useEffect(() => {
    conversationRef.current = state.conversationId;
    if (syncUrl && state.conversationId && state.conversationId !== initialConversationId) {
      window.history.replaceState(null, '', `${basePath}?c=${state.conversationId}`);
    }
  }, [state.conversationId, initialConversationId, basePath, syncUrl]);

  // Teks yang gagal terkirim dikembalikan ke kolom tulis supaya tidak hilang.
  useEffect(() => {
    if (state.restoreText !== null) {
      setText(state.restoreText);
      textarea.current?.focus();
    }
  }, [state.restoreText]);

  // Gulir ke pesan terbaru. `block: 'end'` mengikuti aliran; gerakan dimatikan oleh preferensi sistem lewat CSS.
  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: 'end' });
  }, [state.messages.length, state.streaming, state.pending]);

  // Tinggi kolom tulis mengikuti isi, maksimal 160px.
  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [text]);

  async function submit(raw: string) {
    const message = raw.trim();
    if (!message || busy || disabled) return;

    setText('');
    const controller = new AbortController();
    abortRef.current = controller;
    const localId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `lokal-${Date.now()}`;
    dispatch({ type: 'send', text: message, localId });

    let finished = false;
    try {
      for await (const event of transport({
        message,
        conversationId: conversationRef.current,
        signal: controller.signal,
      })) {
        if (event.type === 'done' || event.type === 'error') finished = true;
        dispatch({ type: 'turn', event });
      }
    } catch {
      // Transport mengubah galat jaringan menjadi peristiwa `error`; yang lolos ke sini tak terduga.
    } finally {
      abortRef.current = null;
    }

    if (controller.signal.aborted) {
      dispatch({ type: 'aborted' });
    } else if (!finished) {
      const cut: ChatTurnEvent = {
        type: 'error',
        code: 'interrupted',
        message: 'Balasannya terputus di tengah jalan. Coba kirim lagi.',
      };
      dispatch({ type: 'turn', event: cut });
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(text);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter mengirim; Shift+Enter baris baru. Saat IME (mis. papan ketik ponsel) menyusun kata, Enter bukan kirim.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit(text);
    }
  }

  const empty = state.messages.length === 0 && !state.pending;
  const remaining = MAX_MESSAGE_CHARS - text.length;

  return (
    <div className="mx-auto grid max-w-[45rem] gap-4">
      <header className="flex items-center gap-3.5 rounded-lg bg-raised px-5 py-4 shadow-xs">
        <span
          aria-hidden
          className="size-11 flex-none rounded-full bg-[radial-gradient(circle_at_35%_35%,var(--sage-200),var(--sage-500))] motion-safe:animate-breathe"
        />
        <div className="min-w-0 flex-1">
          <h1 className="h3">Teman cerita</h1>
          <p className="meta">Ruang untuk menumpahkan isi kepala. Bukan psikolog.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setHistoryOpen(true)}>
          <ClockCounterClockwise aria-hidden />
          Riwayat
        </Button>
      </header>

      {state.crisis ? (
        <CrisisBanner
          title="Kamu tidak sendirian"
          footnote="Psikolog atau pendamping yang kamu beri izin menerima peringatan, tanpa isi percakapanmu."
        >
          <p>
            Bila kamu merasa tidak aman sekarang, hubungi {state.crisis.name} di{' '}
            {state.crisis.displayNumber}. Layanan ini terhubung langsung dengan orang yang terlatih
            mendengarkan.
          </p>
        </CrisisBanner>
      ) : null}

      <section
        aria-label="Percakapan"
        className="flex h-[min(34rem,calc(100dvh-17rem))] min-h-[22rem] flex-col rounded-lg bg-sunken"
      >
        <div
          role="log"
          aria-label="Percakapan dengan Teman cerita"
          aria-relevant="additions"
          // Bisa digulir: harus bisa difokus supaya pengguna keyboard dapat menggulirnya.
          tabIndex={0}
          className="grid flex-1 content-start gap-3.5 overflow-y-auto px-4 py-5 sm:px-6"
        >
          <p className="flex items-start gap-2.5 rounded-md bg-raised px-3.5 py-3 text-[0.84375rem] text-fg-3">
            <Info aria-hidden className="mt-0.5 size-[1.125rem] flex-none" />
            <span>
              Teman cerita adalah AI yang membantumu merapikan pikiran. Ia tidak menggantikan
              psikolog. Kalau kamu dalam bahaya, tekan <strong>Butuh bantuan sekarang</strong> atau
              hubungi {PRIMARY_CRISIS_RESOURCE.displayNumber}.
            </span>
          </p>

          {empty ? (
            <Bubble message={{ id: 'sapaan', role: 'assistant', content: GREETING }} />
          ) : null}
          {state.messages.map((message) => (
            <Bubble key={message.id} message={message} />
          ))}
          {state.pending ? <Bubble message={state.pending} /> : null}

          {state.status !== 'idle' && state.streaming === null ? (
            <div className="justify-self-start rounded-[1.375rem] rounded-bl-lg bg-raised px-4.5 py-3.5 shadow-xs">
              <span role="status" className="sr-only">
                Teman cerita sedang menulis balasan
              </span>
              <span aria-hidden className="inline-flex gap-1.5">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="size-[0.4375rem] rounded-full bg-sage-400 motion-safe:animate-blink"
                    style={{ animationDelay: `${dot * 0.2}s` }}
                  />
                ))}
              </span>
            </div>
          ) : null}

          {state.streaming !== null ? (
            // Disembunyikan dari pembaca layar selama mengalir (supaya tidak dibacakan per potongan);
            // setelah selesai, balasan utuh masuk daftar dan diumumkan sekali.
            <div
              aria-hidden
              className="max-w-[88%] justify-self-start rounded-[1.375rem] rounded-bl-lg bg-raised px-4.5 py-3.5 text-[0.96875rem] leading-relaxed whitespace-pre-wrap text-fg-1 shadow-xs max-sm:max-w-[92%]"
            >
              {state.streaming}
            </div>
          ) : null}

          {empty && !disabled ? (
            <div role="group" aria-label="Saran pembuka" className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <Chip key={suggestion} disabled={busy} onClick={() => void submit(suggestion)}>
                  {suggestion}
                </Chip>
              ))}
            </div>
          ) : null}
          <div ref={threadEnd} />
        </div>
      </section>

      {state.error ? (
        <Alert tone="error" role="alert" compact>
          <p className="text-sm">{state.error}</p>
        </Alert>
      ) : null}
      {state.unsaved ? (
        <Alert tone="note" role="status" compact>
          <p className="text-sm">
            Balasan ini tampil tetapi belum tersimpan di riwayat. Salin dulu bila kamu ingin
            menyimpannya.
          </p>
        </Alert>
      ) : null}
      {disabledReason ? (
        <Alert tone="info" compact>
          <p className="text-sm">{disabledReason}</p>
        </Alert>
      ) : null}

      <form onSubmit={onSubmit} aria-label="Kirim pesan" className="grid gap-2">
        <div className="flex items-end gap-2.5 rounded-[1.75rem] border-[1.5px] border-line-soft bg-raised py-1.5 pr-1.5 pl-5 shadow-sm focus-within:border-biru-400 focus-within:shadow-[var(--glow-biru)]">
          <label htmlFor={fieldId} className="sr-only">
            Tulis pesan
          </label>
          <textarea
            id={fieldId}
            ref={textarea}
            rows={1}
            value={text}
            maxLength={MAX_MESSAGE_CHARS}
            disabled={disabled}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tulis apa saja yang kamu rasakan…"
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-3 text-fg-1 outline-none placeholder:text-fg-4"
          />
          {busy ? (
            <button
              type="button"
              aria-label="Berhenti"
              onClick={() => abortRef.current?.abort()}
              className="touch-target grid size-11 flex-none cursor-pointer place-items-center rounded-full border-[1.5px] border-line-medium bg-raised text-fg-2 hover:border-biru-300"
            >
              <Stop aria-hidden weight="fill" className="size-5" />
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Kirim"
              disabled={disabled || text.trim() === ''}
              className="touch-target grid size-11 flex-none cursor-pointer place-items-center rounded-full bg-biru-600 text-white hover:bg-biru-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PaperPlaneRight aria-hidden className="size-5" />
            </button>
          )}
        </div>
        <p className="text-center meta">
          {remaining <= MAX_MESSAGE_CHARS - COUNTER_FROM ? (
            <span aria-live="polite">{remaining} karakter tersisa. </span>
          ) : null}
          Percakapan ini hanya bisa kamu lihat. Bila kamu menuliskan sesuatu yang menandakan bahaya,
          psikolog yang kamu beri izin menerima peringatan, tanpa isi percakapan.
        </p>
      </form>

      {canDelete && state.conversationId && !busy ? (
        <div className="flex justify-center">
          <DeleteConversationButton id={state.conversationId} />
        </div>
      ) : null}

      <Dialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title="Riwayat percakapan"
        description="Percakapan terakhirmu. Hanya kamu yang bisa melihatnya."
        footer={
          <Link
            href={basePath}
            className="inline-flex min-h-10 items-center rounded-pill bg-biru-600 px-4 text-sm font-semibold text-white no-underline hover:bg-biru-700"
          >
            Percakapan baru
          </Link>
        }
      >
        {conversations.length === 0 ? (
          <p className="body-m">Belum ada percakapan tersimpan.</p>
        ) : (
          <ul className="grid gap-1">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  href={`${basePath}?c=${conversation.id}`}
                  aria-current={conversation.id === state.conversationId ? 'true' : undefined}
                  className="block rounded-md px-3 py-2.5 text-fg-1 no-underline hover:bg-biru-50 aria-[current=true]:bg-biru-50"
                >
                  <span className="block font-medium">{conversation.preview}</span>
                  <span className="text-sm text-fg-3">
                    {formatDateId(new Date(conversation.updatedAt), {
                      day: 'numeric',
                      month: 'short',
                    })}
                    , {formatTimeId(conversation.updatedAt)} · {conversation.messageCount} pesan
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}
