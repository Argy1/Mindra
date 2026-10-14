import { AdminQueueView } from '@/components/features/admin/AdminQueueView';
import { AppShell } from '@/components/layout/AppShell';
import type { PendingPsychologist, ReviewRecord } from '@/lib/server/admin';

/**
 * Pratinjau antrean admin dengan data contoh. Dialog setujui dan tolak memakai Server Action asli, jadi di sini
 * menjawab "sesimu sudah berakhir" (belum masuk): itu cara memeriksa tampilan galat. `?kosong=1` menampilkan
 * keadaan kosong.
 */
const PENDING: PendingPsychologist[] = [
  {
    id: '00000000-0000-4000-8000-0000000000b1',
    name: 'Calon Psikolog Demo',
    email: 'calon.psikolog@demo.mindra.test',
    createdAt: '2026-10-12T03:20:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-0000000000b2',
    name: 'Dr. Sinta Wulandari',
    email: 'sinta@praktik.example',
    createdAt: '2026-10-13T08:05:00.000Z',
  },
];

const HISTORY: ReviewRecord[] = [
  {
    id: 3,
    action: 'approve_psychologist',
    targetName: 'Rina Sari',
    createdAt: '2026-10-10T02:00:00.000Z',
  },
  {
    id: 2,
    action: 'reject_psychologist',
    targetName: 'Akun Uji Satu',
    createdAt: '2026-10-09T05:30:00.000Z',
  },
];

export default async function AdminPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ kosong?: string | string[] }>;
}) {
  const params = await searchParams;
  const empty = (Array.isArray(params.kosong) ? params.kosong[0] : params.kosong) === '1';

  return (
    <AppShell
      role="admin"
      user={{ name: 'Admin Mindra Demo', roleLabel: 'Admin' }}
      currentPath="/admin"
      topbarStart={<p>Rabu, 14 Oktober</p>}
    >
      <AdminQueueView pending={empty ? [] : PENDING} history={empty ? [] : HISTORY} />
    </AppShell>
  );
}
