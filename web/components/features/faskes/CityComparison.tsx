import type { CityComparison as CityRow } from '@/lib/domain/faskes/dashboard';
import { cn } from '@/lib/utils/cn';
import { formatDecimalId } from '@/lib/utils/date';

/**
 * Perbandingan rata-rata PHQ-9 antar kota di provinsi (design/faskes-dashboard.html `.bars`). Kota yang
 * datanya kurang dari 10 pengguna ditulis "disembunyikan", tidak digambar sebagai batang nol: nol akan
 * dibaca "tidak ada masalah", padahal artinya "tidak cukup orang untuk ditampilkan".
 */
export function CityComparison({ cities }: { cities: readonly CityRow[] }) {
  const visible = cities.filter((city) => !city.hidden);
  const top = Math.max(...visible.map((city) => city.avgPhq9 ?? 0), 0);
  const scale = top > 0 ? top / 0.85 : 1;
  const hidden = cities.filter((city) => city.hidden);

  return (
    <div>
      <ul className="grid gap-3.5">
        {cities.map((city) => (
          <li
            key={city.city}
            className={cn(
              'grid grid-cols-[7.5rem_minmax(0,1fr)_2.75rem] items-center gap-3 text-sm',
              city.isOwn && 'font-bold text-fg-1',
              city.hidden && 'text-fg-4',
            )}
          >
            <span>
              {city.city}
              {city.isOwn ? <span className="sr-only"> (kotamu)</span> : null}
            </span>
            <span
              aria-hidden
              className={cn(
                'h-3 overflow-hidden rounded-pill',
                city.hidden
                  ? 'bg-[repeating-linear-gradient(45deg,var(--neutral-100)_0_6px,transparent_6px_12px)]'
                  : 'bg-neutral-100',
              )}
            >
              {city.avgPhq9 !== null ? (
                <span
                  className={cn(
                    'block h-full rounded-[inherit]',
                    city.isOwn ? 'bg-biru-600' : 'bg-biru-400',
                  )}
                  style={{ width: `${Math.max(2, (city.avgPhq9 / scale) * 100)}%` }}
                />
              ) : null}
            </span>
            <span className="text-right num">
              {city.avgPhq9 === null ? (
                <>
                  <span aria-hidden>—</span>
                  <span className="sr-only">disembunyikan, kurang dari 10 pengguna</span>
                </>
              ) : (
                formatDecimalId(city.avgPhq9)
              )}
            </span>
          </li>
        ))}
      </ul>
      {hidden.length > 0 ? (
        <p className="mt-3 meta">
          {hidden.map((city) => city.city).join(', ')} disembunyikan karena penggunanya kurang dari
          10.
        </p>
      ) : null}
    </div>
  );
}
