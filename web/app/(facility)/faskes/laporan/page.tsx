import type { Metadata } from 'next';
import { DataError, NoFacility } from '@/components/features/faskes/FaskesStates';
import { ReportView } from '@/components/features/faskes/ReportView';
import { requireMfaFacilityAdmin } from '@/lib/auth/mfa-server';
import { FaskesDataError, getReportPage } from '@/lib/server/faskes-dashboard';

export const metadata: Metadata = { title: 'Laporan bulanan' };

interface PageProps {
  searchParams: Promise<{ bulan?: string | string[]; faskes?: string | string[] }>;
}

export default async function LaporanPage({ searchParams }: PageProps) {
  const profile = await requireMfaFacilityAdmin();
  const params = await searchParams;

  try {
    const data = await getReportPage(profile.id, params);
    if (!data) return <NoFacility />;
    return (
      <ReportView
        facility={data.facility}
        facilities={data.facilities}
        months={data.months}
        month={data.month}
        rows={data.rows}
      />
    );
  } catch (error) {
    if (error instanceof FaskesDataError) return <DataError />;
    throw error;
  }
}
