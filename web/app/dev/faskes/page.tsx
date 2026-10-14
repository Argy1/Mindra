import { SAMPLE_FACILITIES, SAMPLE_FACILITY, sampleTrend } from '@/app/dev/_data/fase4';
import { FaskesDashboardView } from '@/components/features/faskes/FaskesDashboardView';
import { AppShell } from '@/components/layout/AppShell';

/** Pratinjau dasbor faskes dengan data contoh. `?periode=4|12|52` mengganti periode seperti di /faskes. */
export default async function FaskesPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string | string[] }>;
}) {
  const { periode } = await searchParams;
  const { period, view } = sampleTrend(periode);

  return (
    <AppShell
      role="facility_admin"
      user={{ name: SAMPLE_FACILITY.name, roleLabel: 'Admin faskes' }}
      currentPath="/faskes"
      topbarStart={<p>Rabu, 14 Oktober</p>}
    >
      <FaskesDashboardView
        facility={SAMPLE_FACILITY}
        facilities={SAMPLE_FACILITIES}
        period={period}
        view={view}
        activeKeyCount={1}
        basePath="/dev/faskes"
      />
    </AppShell>
  );
}
