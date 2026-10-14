import type { Metadata } from 'next';
import { CaregiverHomeView } from '@/components/features/caregiver/CaregiverHomeView';
import { requireRole } from '@/lib/auth/session';
import { getCaregiverPatients } from '@/lib/server/caregiver';

export const metadata: Metadata = { title: 'Ringkasan pendamping' };

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

export default async function PendampingPage() {
  const profile = await requireRole('caregiver');
  const people = await getCaregiverPatients(profile.id);
  return <CaregiverHomeView name={firstName(profile.name)} people={people} />;
}
