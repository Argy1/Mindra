import Link from 'next/link';
import type { ManagedFacility } from '@/lib/server/faskes-dashboard';
import { cn } from '@/lib/utils/cn';

/** Pilihan faskes bagi admin yang mengelola lebih dari satu. Tidak ditampilkan bila hanya satu. */
export function FacilitySwitcher({
  facilities,
  currentId,
  basePath,
  extraQuery = '',
}: {
  facilities: readonly ManagedFacility[];
  currentId: string;
  basePath: string;
  /** Sisa query yang dipertahankan, mis. `periode=12`. */
  extraQuery?: string;
}) {
  if (facilities.length < 2) return null;
  return (
    <nav aria-label="Pilih faskes" className="mb-4 flex flex-wrap gap-2">
      {facilities.map((facility) => (
        <Link
          key={facility.id}
          href={`${basePath}?${extraQuery ? `${extraQuery}&` : ''}faskes=${facility.id}`}
          aria-current={facility.id === currentId ? 'true' : undefined}
          className={cn(
            'touch-target inline-flex min-h-9 items-center rounded-pill border border-line-soft bg-raised px-3.5',
            'text-sm font-medium text-fg-2 no-underline transition-colors duration-(--dur-fast) hover:border-biru-200',
            'aria-[current=true]:border-biru-300 aria-[current=true]:bg-biru-50 aria-[current=true]:text-biru-700',
          )}
        >
          {facility.name}
        </Link>
      ))}
    </nav>
  );
}
