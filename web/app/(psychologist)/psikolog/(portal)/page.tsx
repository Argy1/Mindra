import type { Metadata } from 'next';
import { DashboardView } from '@/components/features/psychologist/DashboardView';
import { LiveCrisisPanel } from '@/components/features/psychologist/LiveCrisisPanel';
import { requireMfaPsychologist } from '@/lib/auth/mfa-server';
import { isClientFilter, type ClientFilter } from '@/lib/domain/psychologist/summary';
import { getPsychologistDashboard } from '@/lib/server/psychologist';

export const metadata: Metadata = { title: 'Ringkasan klien' };

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

interface PageProps {
  searchParams: Promise<{ filter?: string | string[] }>;
}

export default async function PsikologPage({ searchParams }: PageProps) {
  const profile = await requireMfaPsychologist();
  const params = await searchParams;
  const rawFilter = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const filter: ClientFilter = isClientFilter(rawFilter) ? rawFilter : 'semua';

  const now = new Date();
  const data = await getPsychologistDashboard(now);

  return (
    <DashboardView
      data={data}
      name={firstName(profile.name)}
      filter={filter}
      now={now}
      livePanel={
        <LiveCrisisPanel
          alerts={data.alerts}
          watchedClients={data.clients
            .filter((client) => client.permissions.crisis_alerts)
            .map(({ patientId, name }) => ({ patientId, name }))}
          today={data.today}
        />
      }
    />
  );
}
