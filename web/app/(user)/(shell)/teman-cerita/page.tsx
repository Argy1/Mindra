import type { Metadata } from 'next';
import { CompanionChatConnected } from '@/components/features/companion/CompanionChatConnected';
import { requireRole } from '@/lib/auth/session';
import {
  getConversation,
  listConversations,
  type ConversationSummary,
} from '@/lib/server/companion-store';
import { isCompanionConfigured } from '@/lib/server/companion-model';
import { z } from 'zod';

export const metadata: Metadata = { title: 'Teman cerita' };

interface PageProps {
  searchParams: Promise<{ c?: string | string[] }>;
}

const NOT_CONFIGURED =
  'Teman cerita belum diaktifkan di server ini. Fitur lain di Mindra tetap bisa kamu pakai. Kalau kamu butuh bantuan sekarang, tekan Butuh bantuan sekarang.';

/**
 * Teman cerita. Halaman hanya memuat riwayat (klien sesi, RLS); pengiriman pesan dilakukan komponen klien lewat
 * `POST /api/v1/companion/chat` dengan token sesi sebagai Bearer, jadi web memakai API yang sama dengan klien lain.
 */
export default async function TemanCeritaPage({ searchParams }: PageProps) {
  const profile = await requireRole('user');
  const params = await searchParams;
  const raw = Array.isArray(params.c) ? params.c[0] : params.c;
  const requested = z.uuid().safeParse(raw);

  let conversations: ConversationSummary[] = [];
  try {
    conversations = await listConversations(profile.id);
  } catch {
    // Riwayat gagal dimuat: obrolan baru tetap bisa dipakai.
  }
  const current = requested.success
    ? await getConversation(profile.id, requested.data).catch(() => null)
    : null;

  return (
    <CompanionChatConnected
      key={current?.id ?? 'baru'}
      initialConversationId={current?.id}
      initialMessages={current?.messages ?? []}
      conversations={conversations}
      disabledReason={isCompanionConfigured() ? undefined : NOT_CONFIGURED}
    />
  );
}
