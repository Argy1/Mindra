import { SAMPLE_CONNECTABLE, SAMPLE_NOW, samplePrivacy } from '@/app/dev/_data/fase2';
import { PrivacyOverviewView } from '@/components/features/privacy/PrivacyOverviewView';
import { AppShell } from '@/components/layout/AppShell';

/**
 * Pratinjau halaman Privasi dan izin dengan data contoh. Saklar, tombol cabut akses, dan formulir
 * undangan memakai Server Action asli, jadi di sini menjawab "sesimu sudah berakhir" (belum masuk):
 * itu cara memeriksa tampilan galat dan pengembalian saklar. `?kosong=1` menampilkan keadaan kosong.
 */
export default async function PrivacyPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ kosong?: string | string[] }>;
}) {
  const params = await searchParams;
  const empty = (Array.isArray(params.kosong) ? params.kosong[0] : params.kosong) === '1';
  const overview = empty
    ? { psychologists: [], caregivers: [], accessLog: [], satusehatConsent: false }
    : samplePrivacy();

  return (
    <AppShell
      role="user"
      user={{ name: 'Argy', roleLabel: 'Pengguna' }}
      currentPath="/privasi"
      topbarStart={<p>Selasa, 13 Oktober</p>}
    >
      <PrivacyOverviewView overview={overview} connectable={SAMPLE_CONNECTABLE} now={SAMPLE_NOW} />
    </AppShell>
  );
}
