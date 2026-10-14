import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ClientDetailView } from '@/components/features/psychologist/ClientDetailView';
import { requireMfaPsychologist } from '@/lib/auth/mfa-server';
import { getClientDetail } from '@/lib/server/psychologist';

// Judul statis: generateMetadata akan membaca data klien dua kali (dan mencatat akses dua kali).
export const metadata: Metadata = { title: 'Detail klien' };

const uuid = z.uuid();

export default async function KlienDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMfaPsychologist();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();

  const now = new Date();
  const detail = await getClientDetail(id, now);
  if (!detail) notFound();

  return <ClientDetailView detail={detail} now={now} />;
}
