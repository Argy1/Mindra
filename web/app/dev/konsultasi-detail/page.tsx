import { SAMPLE_PSYCHOLOGISTS, sampleDays } from '@/app/dev/_data/fase4-konsultasi';
import { PsychologistDetail } from '@/components/features/consultation/PsychologistDetail';
import { AppShell } from '@/components/layout/AppShell';

/**
 * Pratinjau halaman satu psikolog dengan slot contoh. Tombol "Pesan sesi" memakai Server Action asli, jadi di
 * sini menjawab "sesimu sudah berakhir" (belum masuk) dan memuat ulang slot, seperti saat slot direbut orang lain.
 */
export default function ConsultationDetailPreviewPage() {
  return (
    <AppShell
      role="user"
      user={{ name: 'Argy Fadillah', roleLabel: 'Pengguna' }}
      currentPath="/konsultasi"
      topbarStart={<p>Rabu, 14 Oktober</p>}
    >
      <PsychologistDetail
        psychologist={SAMPLE_PSYCHOLOGISTS[0]!}
        days={sampleDays()}
        backHref="/dev/konsultasi"
      />
    </AppShell>
  );
}
