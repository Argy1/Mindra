import type { CategoryShare } from '@/lib/domain/faskes/dashboard';
import { cn } from '@/lib/utils/cn';

const SEGMENTS = [
  { key: 'minimal', label: 'Minimal', swatch: 'bg-success-200' },
  { key: 'mild', label: 'Ringan', swatch: 'bg-info-200' },
  { key: 'moderate', label: 'Sedang', swatch: 'bg-warning-200' },
  { key: 'severe', label: 'Berat', swatch: 'bg-danger-300' },
] as const;

function describe(share: CategoryShare): string {
  if (!share.percent) return `${share.city}: disembunyikan, kurang dari 10 pengguna`;
  const { percent } = share;
  return `${share.city}: ${SEGMENTS.map((segment) => `${segment.label.toLowerCase()} ${percent[segment.key]}%`).join(', ')}`;
}

/**
 * Sebaran kategori skrining per kota (stacked bar). Angka persen tertulis di dalam batang yang cukup lebar
 * dan selalu tersedia lewat label gambar, jadi tidak bergantung pada warna. Kota yang disembunyikan tidak
 * punya batang.
 */
export function CategoryDistribution({ distribution }: { distribution: readonly CategoryShare[] }) {
  return (
    <div>
      <ul className="grid gap-3">
        {distribution.map((share) => (
          <li
            key={share.city}
            className={cn(
              'grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 text-sm',
              share.isOwn && 'font-bold text-fg-1',
              share.hidden && 'text-fg-4',
            )}
          >
            <span>
              {share.city}
              {share.isOwn ? <span className="sr-only"> (kotamu)</span> : null}
            </span>
            {share.percent ? (
              <span
                role="img"
                aria-label={describe(share)}
                className="flex h-[1.375rem] overflow-hidden rounded-md"
              >
                {SEGMENTS.map((segment) => {
                  const value = share.percent![segment.key];
                  return (
                    <span
                      key={segment.key}
                      className={cn(
                        'grid h-full place-items-center text-[0.6875rem] font-semibold text-fg-1',
                        segment.swatch,
                      )}
                      style={{ width: `${value}%` }}
                    >
                      {value >= 12 ? `${value}%` : null}
                    </span>
                  );
                })}
              </span>
            ) : (
              <span>Disembunyikan</span>
            )}
          </li>
        ))}
      </ul>
      <ul
        className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-fg-3"
        aria-label="Keterangan warna"
      >
        {SEGMENTS.map((segment) => (
          <li key={segment.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn('size-3 rounded-[3px]', segment.swatch)} />
            {segment.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
