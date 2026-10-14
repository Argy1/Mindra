import Link from 'next/link';
import { PERIODS, type PeriodKey } from '@/lib/domain/faskes/dashboard';
import { cn } from '@/lib/utils/cn';

interface PeriodNavProps {
  basePath: string;
  period: PeriodKey;
  /** Disertakan di tautan hanya bila admin mengelola lebih dari satu faskes. */
  facilityId?: string;
}

/** Pilihan periode sebagai tautan (`?periode=`): bisa dibagikan, tombol kembali bekerja, tetap Server Component. */
export function PeriodNav({ basePath, period, facilityId }: PeriodNavProps) {
  const hrefFor = (key: PeriodKey) =>
    `${basePath}?periode=${key}${facilityId ? `&faskes=${facilityId}` : ''}`;

  return (
    <nav aria-label="Periode" className="flex gap-1 rounded-pill bg-sunken p-1">
      {PERIODS.map((option) => (
        <Link
          key={option.key}
          href={hrefFor(option.key)}
          aria-current={option.key === period ? 'true' : undefined}
          className={cn(
            'touch-target inline-flex min-h-9 items-center rounded-pill px-3.5 text-sm font-medium text-fg-2 no-underline',
            'transition-colors duration-(--dur-fast) hover:text-fg-1',
            'aria-[current=true]:bg-raised aria-[current=true]:font-semibold aria-[current=true]:text-biru-700 aria-[current=true]:shadow-xs',
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
