import {
  SAMPLE_NOW,
  SAMPLE_PSYCHOLOGISTS,
  SAMPLE_SESSIONS,
} from '@/app/dev/_data/fase4-konsultasi';
import { ConsultationHome } from '@/components/features/consultation/ConsultationHome';
import { AppShell } from '@/components/layout/AppShell';
import {
  collectFacets,
  filterPsychologists,
  parseFilters,
} from '@/lib/domain/consultation/directory';
import { splitSessions } from '@/lib/domain/consultation/sessions';

/** Pratinjau Konsultasi dengan data contoh. Filter bekerja lewat URL seperti di /konsultasi; `?kosong=1` = belum ada sesi. */
export default async function ConsultationPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const { upcoming, past } = splitSessions(
    params.kosong === '1' ? [] : SAMPLE_SESSIONS,
    SAMPLE_NOW,
  );

  return (
    <AppShell
      role="user"
      user={{ name: 'Argy Fadillah', roleLabel: 'Pengguna' }}
      currentPath="/konsultasi"
      topbarStart={<p>Rabu, 14 Oktober</p>}
    >
      <ConsultationHome
        upcoming={upcoming}
        past={past}
        now={SAMPLE_NOW}
        results={filterPsychologists(SAMPLE_PSYCHOLOGISTS, filters)}
        total={SAMPLE_PSYCHOLOGISTS.length}
        filters={filters}
        facets={collectFacets(SAMPLE_PSYCHOLOGISTS)}
        action="/dev/konsultasi"
      />
    </AppShell>
  );
}
