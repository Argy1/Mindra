import type { Metadata } from 'next';
import { DataError, NoFacility } from '@/components/features/faskes/FaskesStates';
import { FaskesMapView } from '@/components/features/faskes/FaskesMapView';
import { requireMfaFacilityAdmin } from '@/lib/auth/mfa-server';
import { buildMapModel } from '@/lib/domain/faskes/map';
import { FaskesDataError, getMapPage } from '@/lib/server/faskes-dashboard';

export const metadata: Metadata = { title: 'Peta layanan' };

interface PageProps {
  searchParams: Promise<{ periode?: string | string[]; faskes?: string | string[] }>;
}

/** Peta sebaran. Angka dari `facility_aggregate()`; koordinat dari direktori faskes publik. */
export default async function PetaPage({ searchParams }: PageProps) {
  const profile = await requireMfaFacilityAdmin();
  const params = await searchParams;

  try {
    const data = await getMapPage(profile.id, params);
    if (!data) return <NoFacility />;
    const model = buildMapModel({
      rows: data.rows,
      pins: data.pins,
      facilityId: data.facility.id,
      facilityCity: data.facility.city,
    });
    return (
      <FaskesMapView
        facility={data.facility}
        facilities={data.facilities}
        period={data.period}
        model={model}
      />
    );
  } catch (error) {
    if (error instanceof FaskesDataError) return <DataError />;
    throw error;
  }
}
