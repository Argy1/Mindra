import type { Metadata } from 'next';
import { FaskesDashboardView } from '@/components/features/faskes/FaskesDashboardView';
import { DataError, NoFacility } from '@/components/features/faskes/FaskesStates';
import { requireMfaFacilityAdmin } from '@/lib/auth/mfa-server';
import { getApiKeyOverview } from '@/lib/server/faskes';
import { FaskesDataError, getTrendPage } from '@/lib/server/faskes-dashboard';

export const metadata: Metadata = { title: 'Tren wilayah' };

interface PageProps {
  searchParams: Promise<{ periode?: string | string[]; faskes?: string | string[] }>;
}

/**
 * Dasbor faskes. Data kesehatan HANYA dari `facility_aggregate()` (k-anonymity ≥ 10); halaman ini tidak
 * punya jalan ke data perorangan. Gerbang peran + MFA dipanggil pertama di setiap halaman portal.
 */
export default async function TrenWilayahPage({ searchParams }: PageProps) {
  const profile = await requireMfaFacilityAdmin();
  const params = await searchParams;

  try {
    const [data, keys] = await Promise.all([
      getTrendPage(profile.id, params),
      getApiKeyOverview(profile.id).catch(() => null),
    ]);
    if (!data) return <NoFacility />;
    return (
      <FaskesDashboardView
        facility={data.facility}
        facilities={data.facilities}
        period={data.period}
        view={data.view}
        activeKeyCount={keys ? keys.keys.filter((key) => key.revokedAt === null).length : null}
      />
    );
  } catch (error) {
    if (error instanceof FaskesDataError) return <DataError />;
    throw error;
  }
}
