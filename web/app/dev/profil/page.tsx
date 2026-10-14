import { ProfileView } from '@/components/features/profile/ProfileView';
import { AppShell } from '@/components/layout/AppShell';
import type { ProfileDetails } from '@/lib/server/profile';

/**
 * Pratinjau halaman Profil dengan data contoh. Formulir memakai Server Action asli, jadi menyimpan di sini menjawab
 * "sesimu sudah berakhir" (belum masuk): itu cara memeriksa tampilan galat. `?menunggu=1` menampilkan pemberitahuan
 * permintaan akun psikolog yang sedang ditinjau.
 */
const SAMPLE: ProfileDetails = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Argy Demo',
  email: 'pengguna@demo.mindra.test',
  city: 'Kota Bogor',
  province: 'Jawa Barat',
  shareRegionStats: true,
  fontSize: 'normal',
  requestedRole: null,
};

const CITIES = ['Kab. Cianjur', 'Kota Bandung', 'Kota Bogor', 'Kota Depok', 'Kota Semarang'];

export default async function ProfilePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ menunggu?: string | string[] }>;
}) {
  const params = await searchParams;
  const waiting = (Array.isArray(params.menunggu) ? params.menunggu[0] : params.menunggu) === '1';

  return (
    <AppShell
      role="user"
      user={{ name: 'Argy', roleLabel: 'Pengguna' }}
      currentPath="/profil"
      topbarStart={<p>Rabu, 14 Oktober</p>}
    >
      <ProfileView
        details={{ ...SAMPLE, requestedRole: waiting ? 'psychologist' : null }}
        knownCities={CITIES}
      />
    </AppShell>
  );
}
