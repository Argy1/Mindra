import { CalendarBlank } from '@phosphor-icons/react/ssr';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ANONYMOUS_CLIENT,
  groupByDay,
  relativeDayLabel,
  scheduleStatusLabel,
  splitSchedule,
  type ScheduleItem,
} from '@/lib/domain/psychologist/schedule';
import { dateKeyWib, formatDateId, formatTimeId } from '@/lib/utils/date';

function DayList({ items, today }: { items: readonly ScheduleItem[]; today: string }) {
  return (
    <div className="grid gap-5">
      {groupByDay(items).map((day) => {
        const relative = relativeDayLabel(day.date, today);
        const heading = formatDateId(new Date(`${day.date}T12:00:00+07:00`), {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
        return (
          <section key={day.date} aria-label={heading}>
            <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-fg-2">
              {heading}
              {relative ? <span className="font-normal text-fg-3">{relative}</span> : null}
            </h3>
            <ul>
              {day.items.map((item) => {
                const start = new Date(item.scheduledAt);
                const end = new Date(start.getTime() + item.durationMinutes * 60_000);
                return (
                  <li
                    key={item.id}
                    className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-line-soft py-3 first:border-t-0"
                  >
                    <span className="font-semibold text-fg-1 num">
                      {formatTimeId(start)}–{formatTimeId(end)}
                    </span>
                    <span className={item.clientName ? 'text-fg-1' : 'text-fg-3'}>
                      {item.clientName ?? ANONYMOUS_CLIENT}
                    </span>
                    <Badge tone={item.status === 'completed' ? 'neutral' : 'sage'}>
                      {scheduleStatusLabel(item.status)}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** Jadwal sesi psikolog: akan datang, lalu yang baru lewat. Dipakai juga oleh pratinjau /dev. */
export function ScheduleView({ items, now }: { items: readonly ScheduleItem[]; now: Date }) {
  const { upcoming, recent } = splitSchedule(items, now);
  const today = dateKeyWib(now);

  return (
    <>
      <section aria-labelledby="judul" className="pt-4 pb-6">
        <h1 id="judul" className="display-3">
          Jadwal
        </h1>
        <p className="mt-1.5 lead max-w-[60ch]">
          Sesi yang dipesan klien, 60 hari ke depan. Nama klien muncul bila ia menautkan akunnya
          kepadamu; memesan saja tidak membuka identitasnya.
        </p>
      </section>

      <div className="grid gap-5">
        <Card as="section" aria-labelledby="h-akan">
          <CardHeader title="Akan datang" titleId="h-akan" />
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarBlank />}
              title="Belum ada sesi terjadwal"
              description="Sesi muncul di sini begitu klien memesan jam di jadwal praktikmu."
              headingLevel="h3"
            />
          ) : (
            <DayList items={upcoming} today={today} />
          )}
        </Card>

        {recent.length > 0 ? (
          <Card as="section" aria-labelledby="h-lalu">
            <CardHeader title="Baru lewat" titleId="h-lalu" />
            <DayList items={[...recent].reverse()} today={today} />
          </Card>
        ) : null}
      </div>
    </>
  );
}
