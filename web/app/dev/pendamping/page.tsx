import { SAMPLE_CAREGIVER_PEOPLE } from '@/app/dev/_data/fase2';
import { CaregiverHomeView } from '@/components/features/caregiver/CaregiverHomeView';
import { AppShell } from '@/components/layout/AppShell';

/**
 * Pratinjau beranda pendamping. `?kosong=1` menampilkan keadaan belum mendampingi siapa pun. Formulir
 * terima undangan memakai Server Action asli (menjawab "sesimu sudah berakhir" bila belum masuk).
 */
export default async function CaregiverPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ kosong?: string | string[] }>;
}) {
  const params = await searchParams;
  const empty = (Array.isArray(params.kosong) ? params.kosong[0] : params.kosong) === '1';

  return (
    <AppShell
      role="caregiver"
      user={{ name: 'Ibu Sari', roleLabel: 'Pendamping' }}
      currentPath="/pendamping"
      topbarStart={<p>Selasa, 13 Oktober</p>}
    >
      <CaregiverHomeView name="Sari" people={empty ? [] : SAMPLE_CAREGIVER_PEOPLE} />
    </AppShell>
  );
}
