import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PsychologistDetail } from '@/components/features/consultation/PsychologistDetail';
import { requireRole } from '@/lib/auth/session';
import { getSlots } from '@/lib/server/consultation';

export const metadata: Metadata = { title: 'Pesan sesi' };

const SLOT_DAYS = 14;

/** Satu psikolog: profil dan jam yang bisa dipesan 14 hari ke depan. Id yang bukan UUID atau tidak aktif: 404. */
export default async function PsikologPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('user');
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const result = await getSlots(id.data, new Date(), SLOT_DAYS);
  if (!result) notFound();

  return <PsychologistDetail psychologist={result.psychologist} days={result.days} />;
}
