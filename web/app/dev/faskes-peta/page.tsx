import { SAMPLE_FACILITIES, SAMPLE_FACILITY, sampleMap } from '@/app/dev/_data/fase4';
import { FaskesMapView } from '@/components/features/faskes/FaskesMapView';
import { AppShell } from '@/components/layout/AppShell';

/** Pratinjau peta layanan dengan data contoh (ubin peta tetap diambil dari OpenStreetMap). */
export default async function FaskesMapPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string | string[] }>;
}) {
  const { periode } = await searchParams;
  const { period, model } = sampleMap(periode);

  return (
    <AppShell
      role="facility_admin"
      user={{ name: SAMPLE_FACILITY.name, roleLabel: 'Admin faskes' }}
      currentPath="/faskes/peta"
      topbarStart={<p>Rabu, 14 Oktober</p>}
    >
      <FaskesMapView
        facility={SAMPLE_FACILITY}
        facilities={SAMPLE_FACILITIES}
        period={period}
        model={model}
        basePath="/dev/faskes-peta"
      />
    </AppShell>
  );
}
