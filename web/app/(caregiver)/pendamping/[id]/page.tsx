import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { CaregiverDetailView } from '@/components/features/caregiver/CaregiverDetailView';
import { requireRole } from '@/lib/auth/session';
import { getCaregiverPatientDetail } from '@/lib/server/caregiver';

export const metadata: Metadata = { title: 'Orang yang kamu dampingi' };

const uuid = z.uuid();

export default async function PendampingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole('caregiver');
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();

  const detail = await getCaregiverPatientDetail(profile.id, id);
  if (!detail) notFound();

  return <CaregiverDetailView detail={detail} />;
}
