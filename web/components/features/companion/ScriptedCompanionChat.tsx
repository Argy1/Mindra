'use client';

import { useMemo } from 'react';
import { CompanionChat } from '@/components/features/companion/CompanionChat';
import type { ChatTransport, ChatTurnEvent } from '@/lib/companion/client';
import { buildCrisisReply } from '@/lib/domain/companion/crisis-reply';
import { detectCrisisText } from '@/lib/domain/crisis/detector';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import type { UiMessage } from '@/lib/companion/state';
import type { ConversationSummary } from '@/lib/server/companion-store';

/**
 * Teman cerita dengan transport BERSKRIP, hanya untuk halaman pratinjau /dev dan tes e2e. Tidak memanggil
 * model dan tidak menyentuh database. Meniru urutan peristiwa server (meta → delta → done, atau krisis) dengan
 * jeda kecil supaya animasi mengetik dan tombol berhenti bisa diperiksa. `?mode=` menguji jalur gagal.
 */
const CONVERSATION = '33333333-3333-4333-8333-333333333333';
const REPLY =
  'Kedengarannya kamu sedang memikul banyak hal sekaligus. Wajar kalau capek.\n\nBoleh aku tanya, dari semua yang menumpuk itu, mana yang paling bikin dadamu sesak kalau kamu memikirkannya?';

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });

export type ScriptMode = 'normal' | 'gagal' | 'lambat' | 'batas';

function scriptedTransport(mode: ScriptMode): ChatTransport {
  return async function* ({ message, signal }) {
    await wait(250, signal);
    if (signal.aborted) return;

    if (mode === 'batas') {
      yield {
        type: 'error',
        code: 'rate_limited',
        message:
          'Kamu sudah mengirim banyak pesan. Istirahat sebentar, lalu lanjutkan sekitar 25 menit lagi.',
      };
      return;
    }
    if (mode === 'gagal') {
      yield { type: 'meta', conversationId: CONVERSATION };
      yield { type: 'delta', text: 'Kedengarannya ' };
      await wait(200, signal);
      yield {
        type: 'error',
        code: 'model_unavailable',
        message: 'Teman cerita sedang tidak bisa menjawab. Coba lagi sebentar lagi.',
      };
      return;
    }

    yield { type: 'meta', conversationId: CONVERSATION };

    if (detectCrisisText(message)) {
      yield {
        type: 'crisis',
        messageId: 'krisis-1',
        message: buildCrisisReply(),
        resource: {
          name: PRIMARY_CRISIS_RESOURCE.name,
          displayNumber: PRIMARY_CRISIS_RESOURCE.displayNumber,
          telHref: PRIMARY_CRISIS_RESOURCE.telHref,
        },
      } satisfies ChatTurnEvent;
      yield { type: 'done', conversationId: CONVERSATION, messageId: 'krisis-1', saved: true };
      return;
    }

    const pieces = REPLY.match(/\S+\s*/g) ?? [];
    for (const piece of pieces) {
      if (signal.aborted) return;
      yield { type: 'delta', text: piece };
      await wait(mode === 'lambat' ? 400 : 40, signal);
    }
    if (signal.aborted) return;
    yield { type: 'done', conversationId: CONVERSATION, messageId: 'balasan-1', saved: true };
  };
}

export function ScriptedCompanionChat({
  mode,
  initialMessages,
  conversations,
  disabledReason,
}: {
  mode: ScriptMode;
  initialMessages: UiMessage[];
  conversations: ConversationSummary[];
  disabledReason?: string | undefined;
}) {
  const transport = useMemo(() => scriptedTransport(mode), [mode]);
  return (
    <CompanionChat
      initialMessages={initialMessages}
      conversations={conversations}
      transport={transport}
      disabledReason={disabledReason}
      basePath="/dev/teman-cerita"
      syncUrl={false}
      canDelete={false}
    />
  );
}
