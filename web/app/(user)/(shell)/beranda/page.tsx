import type { Metadata } from 'next';
import { InsightCard } from '@/components/features/home/InsightCard';
import { LastAssessmentCard } from '@/components/features/home/LastAssessmentCard';
import { QuickCheckIn } from '@/components/features/journal/QuickCheckIn';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { requireRole } from '@/lib/auth/session';
import { getHomeData } from '@/lib/server/home';
import { getRequestedRole } from '@/lib/server/profile';
import { greetingForHour, hourWib } from '@/lib/utils/date';

export const metadata: Metadata = { title: 'Beranda' };

/** Nama panggilan: kata pertama dari nama profil. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

export default async function BerandaPage() {
  const profile = await requireRole('user');
  const [home, requestedRole] = await Promise.all([
    getHomeData(profile.id),
    getRequestedRole(profile.id),
  ]);
  const greeting = greetingForHour(hourWib(new Date()));
  const name = firstName(profile.name);

  return (
    <>
      {requestedRole === 'psychologist' ? (
        <Alert
          tone="info"
          title="Permintaan akun psikologmu sedang ditinjau"
          titleAs="h2"
          className="mt-4"
        >
          <p className="mt-1 text-sm">
            Sampai disetujui, akunmu berfungsi seperti akun pengguna biasa. Setelah disetujui,
            keluar lalu masuk lagi supaya akunmu berpindah ke portal psikolog.
          </p>
        </Alert>
      ) : null}

      <section aria-labelledby="sapa" className="pt-4 pb-7">
        <h1 id="sapa" className="display-3">
          {name ? `Selamat ${greeting}, ${name}.` : `Selamat ${greeting}.`}
        </h1>
        <p className="mt-1.5 lead">Bagaimana perasaanmu sekarang?</p>
        <div className="mt-5">
          <QuickCheckIn todayMood={home.todayMood} />
        </div>
      </section>

      <div className="grid items-start gap-5 wide:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <InsightCard insight={home.insight} />

        <div className="grid gap-5">
          <LastAssessmentCard
            summary={home.lastAssessment?.summary ?? null}
            history={home.lastAssessment?.history ?? []}
          />

          {home.insight.avgSleepHours === null ? (
            <Card as="section" aria-labelledby="judul-tidur">
              <h2 id="judul-tidur" className="mb-2 h3">
                Catat tidurmu
              </h2>
              <p className="body-m">
                Belum ada catatan tidur minggu ini. Dengan catatan tidur, kamu bisa melihat apakah
                tidur dan perasaanmu saling berkaitan.
              </p>
              <Button className="mt-4" size="sm" variant="secondary" href="/jurnal#tidur">
                Catat tidur
              </Button>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
