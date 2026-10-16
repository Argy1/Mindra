import { CalendarBlank } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { statusLabel } from '@/lib/domain/consultation/sessions';
import { formatTimeId } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';

export interface TodaySession {
  id: string;
  patientId: string;
  patientName: string;
  /** ISO. */
  scheduledAt: string;
  durationMinutes: number;
  status: string;
}

/** Sesi dianggap "sekarang" bila sedang berjalan atau mulai dalam 30 menit. */
const UPCOMING_WINDOW_MS = 30 * 60_000;

function isNow(session: TodaySession, now: Date): boolean {
  const start = new Date(session.scheduledAt).getTime();
  const end = start + session.durationMinutes * 60_000;
  return (
    session.status === 'ongoing' ||
    (now.getTime() >= start - UPCOMING_WINDOW_MS && now.getTime() < end)
  );
}

interface TodaySessionsProps {
  sessions: readonly TodaySession[];
  now: Date;
}

/** Jadwal sesi hari ini (design/psikolog-dashboard.html `.slot`). Server Component: sorotan "sekarang" dihitung di server. */
export function TodaySessions({ sessions, now }: TodaySessionsProps) {
  return (
    <Card as="section" aria-labelledby="h-jadwal">
      <CardHeader title="Hari ini" titleId="h-jadwal" />
      {sessions.length === 0 ? (
        <p className="flex items-center gap-3 body-m">
          <CalendarBlank aria-hidden className="size-6 shrink-0 text-fg-4" />
          Tidak ada sesi terjadwal hari ini.
        </p>
      ) : (
        <ol>
          {sessions.map((session) => {
            const current = isNow(session, now);
            return (
              <li
                key={session.id}
                className={cn(
                  'grid grid-cols-[4rem_minmax(0,1fr)] gap-3 border-t border-line-soft py-3.5 first:border-t-0 first:pt-0',
                  current && '-mx-3 rounded-md border-t-0 bg-biru-50 px-3 py-3 first:pt-3',
                )}
              >
                <time dateTime={session.scheduledAt} className="font-bold text-fg-1 num">
                  {formatTimeId(session.scheduledAt)}
                </time>
                <p>
                  <strong className="block text-[0.9375rem] text-fg-1">
                    {session.patientName}
                  </strong>
                  <span className="meta">
                    {session.durationMinutes} menit · {statusLabel(session.status)}
                  </span>
                  {current ? (
                    <Button
                      size="sm"
                      href={`/psikolog/klien/${session.patientId}`}
                      className="mt-2.5"
                    >
                      Buka ringkasan klien
                      <span className="sr-only"> {session.patientName}</span>
                    </Button>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
