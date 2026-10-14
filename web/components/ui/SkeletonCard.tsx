import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils/cn';

interface SkeletonCardProps {
  /** Jumlah baris teks. */
  lines?: number;
  className?: string;
}

/**
 * Kartu kerangka untuk `loading.tsx` — dipakai menggantikan spinner layar penuh (docs/DESIGN.md).
 */
export function SkeletonCard({ lines = 3, className }: SkeletonCardProps) {
  return (
    <Card role="status" aria-busy="true" className={cn('grid gap-3', className)}>
      <span className="sr-only">Memuat…</span>
      <Skeleton className="h-5 w-2/5" />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn('h-4', index === lines - 1 ? 'w-3/5' : 'w-full')} />
      ))}
    </Card>
  );
}
