import { SAMPLE_PHQ9_HISTORY, sampleInsight } from '@/app/dev/_data/fase1';
import { InsightCard } from '@/components/features/home/InsightCard';
import { LastAssessmentCard } from '@/components/features/home/LastAssessmentCard';
import { QuickCheckIn } from '@/components/features/journal/QuickCheckIn';
import { OnboardingCard } from '@/components/features/onboarding/OnboardingCard';
import { AppShell } from '@/components/layout/AppShell';
import type { AssessmentSummary } from '@/lib/server/assessments';

/**
 * Pratinjau beranda dengan data contoh (Selasa 13 Okt 2026): tampilan sama dengan /beranda sungguhan
 * tetapi tanpa login. Check-in cepat tetap memakai Server Action asli, jadi di sini menjawab
 * "sesimu sudah berakhir" (belum masuk). Itu memang cara memeriksa tampilan galatnya.
 */
export default async function HomePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ panduan?: string | string[] }>;
}) {
  const { panduan } = await searchParams;
  const history: AssessmentSummary[] = SAMPLE_PHQ9_HISTORY.map((point, index) => ({
    id: `contoh-${index}`,
    type: 'phq9',
    score: point.score,
    category: point.score >= 15 ? 'severe' : point.score >= 10 ? 'moderate' : 'mild',
    completedAt: point.completedAt,
  }));

  return (
    <AppShell
      role="user"
      user={{ name: 'Argy', roleLabel: 'Pengguna' }}
      currentPath="/beranda"
      topbarStart={<p>Selasa, 13 Oktober</p>}
    >
      <section aria-labelledby="sapa" className="pt-4 pb-7">
        <h1 id="sapa" className="display-3">
          Selamat sore, Argy.
        </h1>
        <p className="mt-1.5 lead">Bagaimana perasaanmu sekarang?</p>
        <div className="mt-5">
          <QuickCheckIn todayMood={null} />
        </div>
      </section>

      {panduan ? <OnboardingCard /> : null}

      <div className="grid items-start gap-5 wide:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <InsightCard insight={sampleInsight()} />
        <LastAssessmentCard summary={history[history.length - 1]!} history={history} />
      </div>
    </AppShell>
  );
}
