import type { Metadata } from 'next';
import { ScheduleView } from '@/components/features/psychologist/ScheduleView';
import { EmptyState } from '@/components/ui/EmptyState';
import { requireMfaPsychologist } from '@/lib/auth/mfa-server';
import { getMySchedule, ScheduleError } from '@/lib/server/psychologist-schedule';

export const metadata: Metadata = { title: 'Jadwal' };

/** Jadwal sesi psikolog. Gerbang peran + MFA dipanggil pertama (layout dan halaman dirender bersamaan). */
export default async function JadwalPage() {
  await requireMfaPsychologist();
  const now = new Date();
  try {
    return <ScheduleView items={await getMySchedule(now)} now={now} />;
  } catch (error) {
    if (!(error instanceof ScheduleError)) throw error;
    return (
      <div className="pt-6" role="alert">
        <EmptyState
          title="Jadwal belum bisa dimuat"
          description="Muat ulang halaman sebentar lagi. Bila terus begini, pastikan verifikasi dua langkah sudah selesai."
          headingLevel="h1"
        />
      </div>
    );
  }
}
