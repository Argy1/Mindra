import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Kerangka saat halaman portal (psikolog, faskes, admin) memuat data. Dipakai oleh `loading.tsx` tiap portal supaya
 * perpindahan halaman langsung memberi tanda, bukan layar yang tampak macet. Diumumkan sekali lewat role="status";
 * blok kerangkanya dekoratif.
 */
export function PortalSkeleton({ stats = 3 }: { stats?: number }) {
  return (
    <div role="status" aria-label="Memuat halaman" aria-busy="true" className="pt-4">
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="mt-3 h-5 w-64 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: stats }, (_, index) => (
          <Card key={index} className="grid gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-16" />
          </Card>
        ))}
      </div>
      <Card className="mt-6 grid gap-4">
        <Skeleton className="h-6 w-44" />
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </Card>
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
