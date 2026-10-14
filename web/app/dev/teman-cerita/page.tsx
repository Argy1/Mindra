import {
  ScriptedCompanionChat,
  type ScriptMode,
} from '@/components/features/companion/ScriptedCompanionChat';
import { AppShell } from '@/components/layout/AppShell';
import type { UiMessage } from '@/lib/companion/state';
import type { ConversationSummary } from '@/lib/server/companion-store';

const MODES: readonly ScriptMode[] = ['normal', 'gagal', 'lambat', 'batas'];

const HISTORY: UiMessage[] = [
  {
    id: 'h1',
    role: 'assistant',
    content: 'Hai. Aku di sini. Apa yang sedang paling memenuhi pikiranmu malam ini?',
  },
  {
    id: 'h2',
    role: 'user',
    content:
      'Capek banget. Tugas numpuk, lomba juga deadline-nya akhir bulan. Rasanya kayak nggak ada waktu buat napas.',
  },
  {
    id: 'h3',
    role: 'assistant',
    content:
      'Kedengarannya kamu sedang memikul banyak hal sekaligus, dan semuanya terasa mendesak. Wajar kalau capek. Boleh aku tanya, dari semua yang menumpuk itu, mana yang paling bikin dadamu sesak kalau kamu memikirkannya?',
  },
];

const CONVERSATIONS: ConversationSummary[] = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    preview: 'Capek banget. Tugas numpuk, lomba juga deadline-nya akhir bulan.',
    updatedAt: '2026-10-13T13:33:00.000Z',
    messageCount: 3,
    crisisDetected: false,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    preview: 'Susah tidur beberapa hari ini',
    updatedAt: '2026-10-10T15:10:00.000Z',
    messageCount: 8,
    crisisDetected: false,
  },
];

/**
 * Pratinjau Teman cerita dengan transport berskrip (tanpa model, tanpa database).
 * `?mode=` normal | gagal | lambat | batas. `?riwayat=1` memuat percakapan contoh. `?nonaktif=1` meniru kunci model belum diatur.
 */
export default async function CompanionPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; riwayat?: string; nonaktif?: string }>;
}) {
  const params = await searchParams;
  const mode = MODES.find((candidate) => candidate === params.mode) ?? 'normal';

  return (
    <AppShell
      role="user"
      user={{ name: 'Argy Fadillah', roleLabel: 'Pengguna' }}
      currentPath="/teman-cerita"
      topbarStart={<p>Selasa, 13 Oktober</p>}
    >
      <ScriptedCompanionChat
        mode={mode}
        initialMessages={params.riwayat === '1' ? HISTORY : []}
        conversations={CONVERSATIONS}
        disabledReason={
          params.nonaktif === '1'
            ? 'Teman cerita belum diaktifkan di server ini. Fitur lain di Mindra tetap bisa kamu pakai.'
            : undefined
        }
      />
    </AppShell>
  );
}
