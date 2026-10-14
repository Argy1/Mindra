import { Clock, ListNumbers } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import type { AssessmentCategory } from '@/lib/domain/assessment/category';
import type { Instrument } from '@/lib/domain/assessment/instruments';
import { maxScoreFor } from '@/lib/domain/assessment/scoring';
import { formatDateId } from '@/lib/utils/date';

export interface InstrumentLastResult {
  id: string;
  score: number;
  category: AssessmentCategory;
  /** ISO. */
  completedAt: string;
}

interface InstrumentCardProps {
  instrument: Instrument;
  last?: InstrumentLastResult | undefined;
}

/** Kartu pilihan instrumen di /asesmen: deskripsi, perkiraan waktu, dan hasil terakhir bila ada. */
export function InstrumentCard({ instrument, last }: InstrumentCardProps) {
  const titleId = `instrumen-${instrument.id}`;
  return (
    <Card as="article" aria-labelledby={titleId} className="flex flex-col gap-4">
      <div>
        <h2 id={titleId} className="h3">
          {instrument.title}
        </h2>
        <p className="mt-2 body-m">{instrument.description}</p>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-3">
        <li className="flex items-center gap-1.5">
          <Clock aria-hidden className="size-4" />
          {instrument.duration}
        </li>
        <li className="flex items-center gap-1.5">
          <ListNumbers aria-hidden className="size-4" />
          {instrument.questions.length} pertanyaan
        </li>
      </ul>

      {last ? (
        <div className="rounded-md bg-canvas px-4 py-3">
          <p className="meta">
            Terakhir diisi{' '}
            {formatDateId(new Date(last.completedAt), {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-fg-1 num">
              {last.score}
              <span className="font-normal text-fg-4"> / {maxScoreFor(instrument.id)}</span>
            </span>
            <CategoryBadge category={last.category} />
          </p>
          <Button
            className="mt-2 -ml-3"
            size="sm"
            variant="ghost"
            href={`/asesmen/hasil/${last.id}`}
          >
            Lihat hasilnya
          </Button>
        </div>
      ) : null}

      <div className="mt-auto pt-2">
        <Button href={`/asesmen/${instrument.id}`} variant={last ? 'secondary' : 'primary'}>
          {last ? 'Ulangi skrining' : 'Mulai skrining'}
        </Button>
      </div>
    </Card>
  );
}
