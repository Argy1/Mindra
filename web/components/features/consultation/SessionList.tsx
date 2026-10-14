import Link from 'next/link';
import { CalendarBlank } from '@phosphor-icons/react/ssr';
import { CancelSessionButton } from '@/components/features/consultation/CancelSessionButton';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRupiah } from '@/lib/domain/consultation/directory';
import { isCancellable, statusLabel, type SessionItem } from '@/lib/domain/consultation/sessions';
import { formatDateId, formatTimeId } from '@/lib/utils/date';

const TONE = {
  pending: 'neutral',
  confirmed: 'sage',
  ongoing: 'sage',
  completed: 'neutral',
  cancelled: 'neutral',
} as const;

function When({ item }: { item: SessionItem }) {
  const start = new Date(item.scheduledAt);
  const end = new Date(start.getTime() + item.durationMinutes * 60_000);
  return (
    <>
      <span className="font-semibold text-fg-1">
        {formatDateId(start, { weekday: 'long', day: 'numeric', month: 'long' })}
      </span>
      <span className="text-fg-2 num">
        {formatTimeId(start)}–{formatTimeId(end)} WIB
      </span>
    </>
  );
}

/** Daftar sesi pengguna. `now` datang dari server supaya "bisa dibatalkan" konsisten dengan yang dirender. */
export function SessionList({
  items,
  now,
  emptyHint,
}: {
  items: readonly SessionItem[];
  now: Date;
  emptyHint?: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CalendarBlank />}
        title="Belum ada sesi"
        description={emptyHint ?? 'Pilih psikolog di bawah dan pesan jam yang cocok untukmu.'}
        headingLevel="h3"
      />
    );
  }
  return (
    <ul className="grid">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line-soft py-3.5 first:border-t-0 first:pt-0"
        >
          <div className="grid gap-0.5">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <When item={item} />
            </p>
            <p className="text-sm text-fg-3">
              <Link href={`/konsultasi/${item.psychologistId}`} className="font-medium">
                {item.psychologistName}
              </Link>
              {item.fee > 0 ? ` · ${formatRupiah(item.fee)}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone={TONE[item.status as keyof typeof TONE] ?? 'neutral'}>
              {statusLabel(item.status)}
            </Badge>
            {isCancellable(item, now) ? <CancelSessionButton id={item.id} /> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
