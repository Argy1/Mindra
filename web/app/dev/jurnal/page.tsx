import { SAMPLE_MOOD_ENTRIES, SAMPLE_SLEEP_ENTRIES, SAMPLE_TODAY } from '@/app/dev/_data/fase1';
import { MoodEntryList } from '@/components/features/journal/MoodEntryList';
import { MoodForm } from '@/components/features/journal/MoodForm';
import { SleepEntryList } from '@/components/features/journal/SleepEntryList';
import { SleepForm } from '@/components/features/journal/SleepForm';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';

/**
 * Pratinjau /jurnal dengan data contoh. Formulir memakai Server Action asli; tanpa login ia menjawab
 * "sesimu sudah berakhir", dan validasi (perasaan wajib, jam tidur, dst.) tetap bisa dicoba penuh.
 */
export default function JournalPreviewPage() {
  return (
    <AppShell
      role="user"
      user={{ name: 'Argy', roleLabel: 'Pengguna' }}
      currentPath="/jurnal"
      topbarStart={<p>Selasa, 13 Oktober</p>}
    >
      <div className="pt-4">
        <h1 className="display-3">Jurnal</h1>
        <p className="mt-1.5 lead max-w-[60ch]">
          Catat perasaan dan tidurmu. Catatan kecil yang konsisten membantumu melihat pola dari
          minggu ke minggu.
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
            <SleepForm today={SAMPLE_TODAY} />
          </Card>

          <Card as="section" aria-labelledby="judul-riwayat-perasaan">
            <h2 id="judul-riwayat-perasaan" className="mb-4 h3">
              Catatan perasaan terakhir
            </h2>
            <MoodEntryList entries={SAMPLE_MOOD_ENTRIES} />
          </Card>

          <Card as="section" aria-labelledby="judul-riwayat-tidur">
            <h2 id="judul-riwayat-tidur" className="mb-4 h3">
              Catatan tidur terakhir
            </h2>
            <SleepEntryList entries={SAMPLE_SLEEP_ENTRIES} />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
