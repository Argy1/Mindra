import { SAMPLE_DIRECTORY } from '@/app/dev/_data/gelombang3';
import { FacilityDirectory } from '@/components/features/faskes/FacilityDirectory';
import { Container } from '@/components/layout/Container';

/** Pratinjau daftar layanan terdekat dengan data contoh (tanpa database). */
export default async function NearestFacilitiesPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ gagal?: string | string[]; terverifikasi?: string | string[] }>;
}) {
  const { gagal, terverifikasi } = await searchParams;
  return (
    <main id="isi">
      <Container className="pt-12 pb-24">
        <h1 className="display-3">Layanan kesehatan terdekat</h1>
        <div className="mt-8 max-w-3xl">
          <FacilityDirectory
            facilities={gagal ? [] : SAMPLE_DIRECTORY}
            verified={Boolean(terverifikasi)}
            loadFailed={Boolean(gagal)}
          />
        </div>
      </Container>
    </main>
  );
}
