import { ResultView } from '@/components/features/assessment/ResultView';
import { isInstrumentId, type InstrumentId } from '@/lib/domain/assessment/instruments';
import { maxScoreFor } from '@/lib/domain/assessment/scoring';
import { SAMPLE_PHQ9_HISTORY } from '@/app/dev/_data/fase1';

/**
 * Pratinjau halaman hasil skrining dengan skor tertentu.
 *   /dev/hasil?tipe=phq9&skor=11            hasil biasa dengan tren
 *   /dev/hasil?tipe=phq9&skor=14&krisis=1   dengan banner krisis (PHQ-9 butir 9 > 0)
 *   /dev/hasil?tipe=gad7&skor=4&riwayat=0   skrining pertama (tanpa tren)
 */
export default async function ResultPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ tipe?: string; skor?: string; krisis?: string; riwayat?: string }>;
}) {
  const query = await searchParams;
  const id: InstrumentId = isInstrumentId(query.tipe) ? query.tipe : 'phq9';
  const requested = Number.parseInt(query.skor ?? '11', 10);
  const score = Number.isNaN(requested) ? 11 : Math.min(Math.max(requested, 0), maxScoreFor(id));

  const history =
    query.riwayat === '0'
      ? [{ score, completedAt: '2026-10-13T10:00:00+07:00' }]
      : [...SAMPLE_PHQ9_HISTORY.slice(0, -1), { score, completedAt: '2026-10-13T10:00:00+07:00' }];

  return (
    <main id="isi" className="mx-auto max-w-content px-gutter pt-4 pb-16">
      <ResultView
        instrumentId={id}
        score={score}
        completedAt="2026-10-13T10:00:00+07:00"
        crisis={query.krisis === '1'}
        history={history}
      />
    </main>
  );
}
