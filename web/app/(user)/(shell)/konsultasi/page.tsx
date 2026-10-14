import type { Metadata } from 'next';
import { ConsultationHome } from '@/components/features/consultation/ConsultationHome';
import { requireRole } from '@/lib/auth/session';
import {
  collectFacets,
  filterPsychologists,
  parseFilters,
} from '@/lib/domain/consultation/directory';
import { splitSessions } from '@/lib/domain/consultation/sessions';
import { listMySessions, listPsychologists } from '@/lib/server/consultation';

export const metadata: Metadata = { title: 'Konsultasi' };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Konsultasi: sesi milikmu dan direktori psikolog. Filter hidup di URL (formulir GET). */
export default async function KonsultasiPage({ searchParams }: PageProps) {
  const profile = await requireRole('user');
  const filters = parseFilters(await searchParams);
  const now = new Date();

  const [psychologists, sessions] = await Promise.all([
    listPsychologists(),
    listMySessions(profile.id),
  ]);
  const { upcoming, past } = splitSessions(sessions, now);

  return (
    <ConsultationHome
      upcoming={upcoming}
      past={past}
      now={now}
      results={filterPsychologists(psychologists, filters)}
      total={psychologists.length}
      filters={filters}
      facets={collectFacets(psychologists)}
    />
  );
}
