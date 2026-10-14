import type { Metadata } from 'next';
import { PrivacyOverviewView } from '@/components/features/privacy/PrivacyOverviewView';
import { requireRole } from '@/lib/auth/session';
import { getConnectablePsychologists, getPrivacyOverview } from '@/lib/server/privacy';

export const metadata: Metadata = { title: 'Privasi dan izin' };

export default async function PrivasiPage() {
  const profile = await requireRole('user');
  const overview = await getPrivacyOverview(profile.id);
  const connectable = await getConnectablePsychologists(
    overview.psychologists.map((link) => link.psychologistId),
  );

  return <PrivacyOverviewView overview={overview} connectable={connectable} now={new Date()} />;
}
