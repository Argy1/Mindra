import { ShieldCheck } from '@phosphor-icons/react/ssr';
import type { CompanionActivity } from '@/lib/domain/psychologist/companion';
import { formatDateId, formatTimeId } from '@/lib/utils/date';

/**
 * Gambaran penggunaan Teman cerita oleh klien (hanya hitungan; isi percakapan tidak pernah dibagikan). Angka krisis tampil
 * apa adanya tanpa warna peringatan berlebihan, karena peringatan krisis yang sebenarnya ada di bagian "Peringatan krisis".
 */
export function ClientCompanionSection({ activity }: { activity: CompanionActivity }) {
  if (activity.conversations === 0) {
    return (
      <p className="body-m">
        Belum ada percakapan Teman cerita dalam {activity.windowDays} hari terakhir.
      </p>
    );
  }

  const stats = [
    { label: 'Percakapan', value: activity.conversations },
    { label: 'Pesan', value: activity.messages },
    { label: 'Hari aktif', value: activity.activeDays },
    { label: 'Bertanda krisis', value: activity.crisisConversations },
  ];

  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg bg-sunken p-3">
            <dt className="text-xs text-fg-3">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-bold text-fg-1 num">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <p className="body-m">
        Dalam {activity.windowDays} hari terakhir
        {activity.lastActivity ? (
          <>
            , terakhir{' '}
            <time dateTime={activity.lastActivity}>
              {formatDateId(new Date(activity.lastActivity), { day: 'numeric', month: 'long' })},{' '}
              {formatTimeId(activity.lastActivity)} WIB
            </time>
          </>
        ) : null}
        .
      </p>
      <p className="flex items-start gap-2 text-sm text-fg-3">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        Hanya gambaran penggunaan. Isi percakapan tidak pernah dibagikan kepadamu.
      </p>
    </div>
  );
}
