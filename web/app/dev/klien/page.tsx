import { SAMPLE_NOW, sampleClientDetail } from '@/app/dev/_data/fase2';
import { ClientDetailView } from '@/components/features/psychologist/ClientDetailView';
import { AppShell } from '@/components/layout/AppShell';

/**
 * Pratinjau detail klien. `?bagikan=sebagian` menampilkan klien yang hanya membagikan mood dan tidur,
 * untuk memeriksa tulisan "tidak dibagikan". Formulir catatan sesi memakai Server Action asli, jadi di
 * sini menjawab "sesimu sudah berakhir" (belum masuk).
 */
export default async function ClientDetailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ bagikan?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.bagikan) ? params.bagikan[0] : params.bagikan;
  const detail = sampleClientDetail(raw === 'sebagian' ? 'sebagian' : 'lengkap');

  return (
    <AppShell
      role="psychologist"
      user={{ name: 'Rina Sari, M.Psi.', roleLabel: 'Psikolog klinis' }}
      currentPath="/psikolog/klien"
      topbarStart={<p>Selasa, 13 Oktober</p>}
    >
      <ClientDetailView detail={detail} now={SAMPLE_NOW} />
    </AppShell>
  );
}
