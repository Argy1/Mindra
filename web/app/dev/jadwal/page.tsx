import { SAMPLE_NOW, SAMPLE_SCHEDULE } from '@/app/dev/_data/fase4-konsultasi';
import { ScheduleView } from '@/components/features/psychologist/ScheduleView';
import { AppShell } from '@/components/layout/AppShell';

/** Pratinjau jadwal psikolog dengan data contoh. `?kosong=1` = belum ada sesi. */
export default async function SchedulePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ kosong?: string }>;
}) {
  const { kosong } = await searchParams;
  return (
    <AppShell
      role="psychologist"
      user={{ name: 'Rina Sari, M.Psi.', roleLabel: 'Psikolog klinis' }}
      currentPath="/psikolog/jadwal"
      topbarStart={<p>Rabu, 14 Oktober</p>}
    >
      <ScheduleView items={kosong === '1' ? [] : SAMPLE_SCHEDULE} now={SAMPLE_NOW} />
    </AppShell>
  );
}
