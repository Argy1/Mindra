import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

/** Kerangka halaman detail psikolog di Konsultasi: identitas, profil singkat, dan kisi jam. */
export function PsychologistDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Memuat profil dan jadwal psikolog"
      aria-busy="true"
      className="pt-4"
    >
      <Skeleton className="h-5 w-32" />
      <div className="mt-6 flex items-center gap-4">
        <Skeleton className="size-16 flex-none rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-48 max-w-full" />
        </div>
      </div>
      <div className="mt-8 grid gap-5 wide:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="grid gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" />
        </Card>
        <Card className="grid gap-4">
          <Skeleton className="h-6 w-36" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        </Card>
      </div>
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
