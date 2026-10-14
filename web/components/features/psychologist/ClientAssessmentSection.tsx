import { ScoreSparkline } from '@/components/features/assessment/ScoreSparkline';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { isAssessmentCategory } from '@/lib/domain/assessment/category';
import {
  INSTRUMENTS,
  isInstrumentId,
  type InstrumentId,
} from '@/lib/domain/assessment/instruments';
import type { AssessmentRow } from '@/lib/domain/psychologist/summary';
import { formatDateId } from '@/lib/utils/date';

const SPARK_POINTS = 8;

/**
 * Riwayat skrining klien, terbaru di atas, dengan tren instrumen terbaru. Hanya skor dan kategori:
 * jawaban per butir tidak pernah dibawa ke layar ini (lihat lib/server/psychologist.ts).
 */
export function ClientAssessmentSection({ rows }: { rows: readonly AssessmentRow[] }) {
  const known = rows.filter((row) => isInstrumentId(row.type));
  if (known.length === 0) {
    return <p className="body-m">Klien belum mengisi skrining.</p>;
  }

  const latestType = known[0]!.type as InstrumentId;
  const scores = known
    .filter((row) => row.type === latestType)
    .slice(0, SPARK_POINTS)
    .map((row) => row.total_score)
    .reverse();

  return (
    <div className="grid gap-5">
      {scores.length >= 2 ? (
        <div>
          <p className="mb-1 text-sm font-semibold text-fg-1">
            Tren {INSTRUMENTS[latestType].name}
          </p>
          <ScoreSparkline
            scores={scores}
            label={`Tren skor ${INSTRUMENTS[latestType].name}: ${scores.join(', ')}`}
            className="max-w-md"
          />
        </div>
      ) : null}

      <ol className="grid">
        {known.map((row) => (
          <li
            key={`${row.type}-${row.completed_at}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft py-3 first:border-t-0 first:pt-0"
          >
            <span className="min-w-20 font-semibold text-fg-1">
              {INSTRUMENTS[row.type as InstrumentId].name}
            </span>
            <span className="font-bold text-fg-1 num">{row.total_score}</span>
            <CategoryBadge
              category={isAssessmentCategory(row.category) ? row.category : 'minimal'}
            />
            <time dateTime={row.completed_at} className="ml-auto meta">
              {formatDateId(new Date(row.completed_at), {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
          </li>
        ))}
      </ol>
      <p className="meta">Skrining adalah gambaran awal, bukan diagnosis.</p>
    </div>
  );
}
