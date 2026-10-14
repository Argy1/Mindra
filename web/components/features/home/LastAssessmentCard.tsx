import { ScoreSparkline } from '@/components/features/assessment/ScoreSparkline';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClipboardText } from '@phosphor-icons/react/ssr';
import { getInstrument } from '@/lib/domain/assessment/instruments';
import { maxScoreFor } from '@/lib/domain/assessment/scoring';
import type { AssessmentSummary } from '@/lib/server/assessments';
import { formatDateId } from '@/lib/utils/date';

interface LastAssessmentCardProps {
  summary: AssessmentSummary | null;
  /** Riwayat instrumen yang sama, LAMA → BARU. */
  history: readonly AssessmentSummary[];
}

/** Kartu "Skrining terakhir" di beranda: skor, kategori, selisih dari sebelumnya, dan tren. */
export function LastAssessmentCard({ summary, history }: LastAssessmentCardProps) {
  if (!summary) {
    return (
      <Card as="section" aria-labelledby="judul-skrining">
        <h2 id="judul-skrining" className="mb-4 h3">
          Skrining terakhir
        </h2>
        <EmptyState
          icon={<ClipboardText />}
          title="Belum ada skrining"
          description="Skrining singkat membantumu mengenali kondisi emosionalmu dari waktu ke waktu."
          action={<Button href="/asesmen">Mulai skrining</Button>}
        />
      </Card>
    );
  }

  const instrument = getInstrument(summary.type);
  const previous = history.length >= 2 ? history[history.length - 2]! : null;
  const diff = previous ? summary.score - previous.score : null;
  const date = formatDateId(new Date(summary.completedAt), { day: 'numeric', month: 'short' });

  return (
    <Card as="section" aria-labelledby="judul-skrining">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="judul-skrining" className="h3">
          Skrining terakhir
        </h2>
        <span className="meta">
          {instrument.name}, {date}
        </span>
      </div>

      <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-display text-[3.5rem] leading-none font-normal text-fg-1">
          <span className="sr-only">Skor </span>
          <span className="num">{summary.score}</span>
        </span>
        <span className="text-sm text-fg-4">dari {maxScoreFor(summary.type)}</span>
        <CategoryBadge category={summary.category} />
      </p>

      {diff !== null ? (
        <p className="mt-3 body-m">
          {diff === 0
            ? 'Sama dengan skrining sebelumnya.'
            : `${diff < 0 ? 'Turun' : 'Naik'} ${Math.abs(diff)} poin dari skrining sebelumnya.`}
        </p>
      ) : null}

      <ScoreSparkline
        className="mt-4"
        scores={history.map((point) => point.score)}
        label={`Tren skor ${instrument.name}: ${history.map((point) => point.score).join(', ')}`}
      />

      <div className="mt-4 grid gap-2">
        <Button size="sm" variant="secondary" block href={`/asesmen/hasil/${summary.id}`}>
          Lihat hasilnya
        </Button>
        <Button size="sm" variant="ghost" block href="/asesmen">
          Lihat semua skrining
        </Button>
      </div>
    </Card>
  );
}
