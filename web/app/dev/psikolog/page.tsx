import { LiveCrisisPreview } from '@/app/dev/psikolog/LiveCrisisPreview';
import { NADIA, SAMPLE_NOW, sampleDashboard } from '@/app/dev/_data/fase2';
import { DashboardView } from '@/components/features/psychologist/DashboardView';
import { AppShell } from '@/components/layout/AppShell';
import { isClientFilter, type ClientFilter } from '@/lib/domain/psychologist/summary';

/**
 * Pratinjau dasbor psikolog dengan data contoh (Selasa 13 Okt 2026): tampilan sama dengan /psikolog
 * sungguhan, tanpa login. Panel krisis memakai klien realtime palsu; tombol simulasi mengirim peringatan
 * baru untuk Nadia. Filter tabel bekerja karena tautannya diarahkan ke halaman ini.
 */
export default async function PsychologistPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const filter: ClientFilter = isClientFilter(raw) ? raw : 'semua';
  const data = sampleDashboard();

  return (
    <AppShell
      role="psychologist"
      user={{ name: 'Rina Sari, M.Psi.', roleLabel: 'Psikolog klinis' }}
      currentPath="/psikolog"
      topbarStart={<p>Selasa, 13 Oktober</p>}
    >
      <DashboardView
        data={data}
        name="Rina"
        filter={filter}
        now={SAMPLE_NOW}
        basePath="/dev/psikolog"
        livePanel={
          <LiveCrisisPreview
            alerts={data.alerts}
            watchedClients={data.clients
              .filter((client) => client.permissions.crisis_alerts)
              .map(({ patientId, name }) => ({ patientId, name }))}
            today={data.today}
            simulateFor={{ patientId: NADIA, name: 'Nadia Azzahra' }}
          />
        }
      />
    </AppShell>
  );
}
