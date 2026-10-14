import { Buildings } from '@phosphor-icons/react/ssr';
import { Avatar } from '@/components/ui/Avatar';
import {
  describeAction,
  groupAccessLogByDay,
  roleLabel,
  type AccessLogEntry,
} from '@/lib/domain/privacy/access-log';
import { formatTimeId } from '@/lib/utils/date';

const ROLE_TONE = {
  psychologist: 'biru',
  caregiver: 'sage',
  facility_admin: 'matahari',
} as const;

interface AccessLogListProps {
  entries: readonly AccessLogEntry[];
  /** Waktu acuan "Hari ini"/"Kemarin"; diberikan dari server supaya render server dan klien sama. */
  now: Date;
}

/**
 * Riwayat "siapa membuka datamu", dikelompokkan per hari (design/app-privasi.html `.log-item`).
 * Tiap baris menyebut pelaku, perannya, dan data yang dibuka, sehingga warna avatar bukan satu-satunya petunjuk.
 */
export function AccessLogList({ entries, now }: AccessLogListProps) {
  if (entries.length === 0) {
    return (
      <p className="body-m">
        Belum ada yang membuka datamu. Saat itu terjadi, kamu akan melihatnya di sini.
      </p>
    );
  }

  return (
    <div>
      {groupAccessLogByDay(entries, now).map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h3 className="pt-4 pb-1 text-[0.8125rem] font-semibold text-fg-4 first:pt-0">
            {group.label}
          </h3>
          <ul>
            {group.entries.map((entry) => {
              const tone = ROLE_TONE[entry.actorRole as keyof typeof ROLE_TONE];
              return (
                <li
                  key={entry.id}
                  className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-t border-line-soft py-3.5 first:border-t-0 first:pt-0"
                >
                  <Avatar name={entry.actorName} size="sm" tone={tone}>
                    {entry.actorRole === 'facility_admin' ? <Buildings aria-hidden /> : undefined}
                  </Avatar>
                  <div>
                    <p className="text-sm leading-normal text-fg-2">
                      <strong className="font-semibold text-fg-1">{entry.actorName}</strong>{' '}
                      {describeAction(entry.resource, entry.action)}
                    </p>
                    <p className="mt-0.5 meta">
                      {roleLabel(entry.actorRole)} · {formatTimeId(entry.createdAt)} WIB
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
