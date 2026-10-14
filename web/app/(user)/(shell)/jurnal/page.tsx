import type { Metadata } from 'next';
import { MoodEntryList } from '@/components/features/journal/MoodEntryList';
import { MoodForm } from '@/components/features/journal/MoodForm';
import { SleepEntryList } from '@/components/features/journal/SleepEntryList';
import { SleepForm } from '@/components/features/journal/SleepForm';
import { Card } from '@/components/ui/Card';
import { getRecentMoodEntries, getRecentSleepEntries } from '@/lib/server/journal';
import { dateKeyWib } from '@/lib/utils/date';

export const metadata: Metadata = { title: 'Jurnal' };

export default async function JournalPage() {
  const [moods, sleeps] = await Promise.all([getRecentMoodEntries(20), getRecentSleepEntries(20)]);
  const today = dateKeyWib(new Date());

  return (
    <div className="pt-4">
      <h1 className="display-3">Jurnal</h1>
      <p className="mt-1.5 lead max-w-[60ch]">
        Catat perasaan dan tidurmu. Catatan kecil yang konsisten membantumu melihat pola dari minggu
        ke minggu.
      </p>

      <div className="mt-7 grid items-start gap-5 wide:grid-cols-2">
        <Card as="section" aria-labelledby="judul-perasaan">
          <h2 id="judul-perasaan" className="mb-5 h2">
            Catat perasaanmu
          </h2>
          <MoodForm />
        </Card>

        <Card as="section" id="tidur" aria-labelledby="judul-tidur" className="scroll-mt-24">
          <h2 id="judul-tidur" className="mb-5 h2">
            Catat tidurmu
          </h2>
          <SleepForm today={today} />
        </Card>

        <Card as="section" aria-labelledby="judul-riwayat-perasaan">
          <h2 id="judul-riwayat-perasaan" className="mb-4 h3">
            Catatan perasaan terakhir
          </h2>
          <MoodEntryList entries={moods} />
        </Card>

        <Card as="section" aria-labelledby="judul-riwayat-tidur">
          <h2 id="judul-riwayat-tidur" className="mb-4 h3">
            Catatan tidur terakhir
          </h2>
          <SleepEntryList entries={sleeps} />
        </Card>
      </div>
    </div>
  );
}
