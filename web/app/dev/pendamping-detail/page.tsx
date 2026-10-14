import { sampleCaregiverDetail } from '@/app/dev/_data/fase2';
import { CaregiverDetailView } from '@/components/features/caregiver/CaregiverDetailView';
import { AppShell } from '@/components/layout/AppShell';

/**
 * Pratinjau halaman satu orang yang didampingi. Contoh ini sengaja memakai izin bawaan undangan:
 * mood dan peringatan darurat dibagikan, hasil skrining TIDAK. Ada satu peringatan darurat terbuka,
 * jadi banner krisis tampil.
 */
export default function CaregiverDetailPreviewPage() {
  return (
    <AppShell
      role="caregiver"
      user={{ name: 'Ibu Sari', roleLabel: 'Pendamping' }}
      currentPath="/pendamping"
      topbarStart={<p>Selasa, 13 Oktober</p>}
    >
      <CaregiverDetailView detail={sampleCaregiverDetail()} />
    </AppShell>
  );
}
