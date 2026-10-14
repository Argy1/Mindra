import type { Metadata } from 'next';
import Link from 'next/link';
import { FacilityDirectory } from '@/components/features/faskes/FacilityDirectory';
import { Container } from '@/components/layout/Container';
import { FACILITY_DIRECTORY_VERIFIED } from '@/lib/domain/faskes/nearest';
import { listFacilityDirectory } from '@/lib/server/facility-directory';

export const metadata: Metadata = {
  title: 'Layanan kesehatan terdekat',
  description:
    'Puskesmas, rumah sakit, klinik, dan biro psikologi dengan layanan kesehatan jiwa. Terbuka tanpa masuk akun; lokasimu tidak dikirim ke server.',
  alternates: { canonical: '/layanan-terdekat' },
};

// Daftar dibaca per permintaan lewat klien Supabase berbasis cookie, jadi tidak boleh diprerender saat build.
export const dynamic = 'force-dynamic';

export default async function NearestFacilitiesPage() {
  const result = await listFacilityDirectory();

  return (
    <Container className="pt-12 pb-24">
      <div className="max-w-reading">
        <p className="meta">Layanan</p>
        <h1 className="mt-1 display-3">Layanan kesehatan terdekat</h1>
        <p className="mt-4 lead">
          Puskesmas, rumah sakit, klinik, dan biro psikologi dengan layanan kesehatan jiwa. Halaman
          ini terbuka tanpa masuk akun. Kalau kamu butuh bantuan sekarang, lihat{' '}
          <Link href="/bantuan">halaman bantuan</Link>.
        </p>
      </div>
      <div className="mt-8 max-w-3xl">
        <FacilityDirectory
          facilities={result.ok ? result.facilities : []}
          verified={FACILITY_DIRECTORY_VERIFIED}
          loadFailed={!result.ok}
        />
      </div>
    </Container>
  );
}
