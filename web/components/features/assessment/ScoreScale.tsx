import { scaleSegments } from '@/lib/domain/assessment/scoring';
import type { InstrumentId } from '@/lib/domain/assessment/instruments';
import type { Tier } from '@/lib/domain/assessment/scoring';
import { cn } from '@/lib/utils/cn';

interface ScoreScaleProps {
  instrumentId: InstrumentId;
  tier: Tier;
  className?: string;
}

/**
 * Bilah skala tingkat keparahan (design/app-asesmen.html `.scale`). Dekoratif: makna yang sama sudah
 * dibacakan oleh judul hasil, jadi bilah dan labelnya disembunyikan dari pembaca layar. Tingkat
 * tidak hanya dibedakan lewat warna: segmen aktif juga diberi tebal pada labelnya.
 */
export function ScoreScale({ instrumentId, tier, className }: ScoreScaleProps) {
  const segments = scaleSegments(instrumentId);
  const columns = { gridTemplateColumns: `repeat(${segments.length}, 1fr)` };

  return (
    <div aria-hidden className={className}>
      <div className="grid gap-1" style={columns}>
        {segments.map((segment) => (
          <div
            key={segment.category}
            className={cn(
              'h-2.5 rounded-pill',
              segment.tier <= tier ? 'bg-warning-500' : 'bg-neutral-100',
            )}
          />
        ))}
      </div>
      <div className="mt-2 grid gap-1 text-[0.78rem] text-fg-4" style={columns}>
        {segments.map((segment) => (
          <span
            key={segment.category}
            className={cn(segment.tier === tier && 'font-bold text-warning-700')}
          >
            {segment.label}
          </span>
        ))}
      </div>
    </div>
  );
}
