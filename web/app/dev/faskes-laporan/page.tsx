import { SAMPLE_FACILITIES, SAMPLE_FACILITY, sampleReport } from '@/app/dev/_data/fase4';
import { ReportView } from '@/components/features/faskes/ReportView';
import { AppShell } from '@/components/layout/AppShell';

/** Pratinjau laporan bulanan dengan data contoh. Tombol unduh mengarah ke rute asli (butuh masuk sebagai admin faskes). */
export default async function ReportPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string | string[] }>;
}) {
  const { bulan } = await searchParams;
  const { months, month, rows } = sampleReport(Array.isArray(bulan) ? bulan[0] : bulan);

  return (
    <AppShell
      role="facility_admin"
      user={{ name: SAMPLE_FACILITY.name, roleLabel: 'Admin faskes' }}
      currentPath="/faskes/laporan"
      topbarStart={<p>Rabu, 14 Oktober</p>}
    >
      <ReportView
        facility={SAMPLE_FACILITY}
        facilities={SAMPLE_FACILITIES}
        months={months}
        month={month}
        rows={rows}
        basePath="/dev/faskes-laporan"
      />
    </AppShell>
  );
}
