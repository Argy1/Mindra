import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

/** Kerangka saat halaman pengguna memuat data. Diumumkan sekali lewat role="status". */
export default function UserShellLoading() {
  return (
    <div role="status" aria-label="Memuat halaman" className="pt-4">
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="mt-3 h-5 w-56 max-w-full" />
      <div className="mt-8 grid gap-5 wide:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card hero className="grid gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-16 w-full max-w-md" />
          <Skeleton className="h-40 w-full" />
        </Card>
        <Card className="grid gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-14 w-32" />
          <Skeleton className="h-14 w-full" />
        </Card>
      </div>
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
