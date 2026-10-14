import type { SleepOverview } from '@/lib/domain/psychologist/detail';
import { GOOD_SLEEP_HOURS, sleepBarPercent } from '@/lib/domain/insight/summary';
import { formatDecimalId, weekdayShortId } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';

/** Tidur 14 hari terakhir: batang jam tidur per hari. Warna selalu diulang di teks jam. */
export function ClientSleepSection({ overview }: { overview: SleepOverview }) {
  if (overview.nights === 0) {
    return <p className="body-m">Belum ada catatan tidur dalam rentang ini.</p>;
  }

  return (
    <div className="grid gap-4">
      <p className="body-m">
        Rata-rata {formatDecimalId(overview.avgHours ?? 0)} jam per hari
        {overview.avgQuality !== null
          ? `, kualitas rata-rata ${formatDecimalId(overview.avgQuality)} dari 5`
          : ''}
        .{' '}
        {overview.shortNights > 0
          ? `${overview.shortNights} hari tidur kurang dari 6 jam.`
          : 'Tidak ada hari dengan tidur kurang dari 6 jam.'}
      </p>
      <ol className="grid grid-cols-7 gap-x-1.5 gap-y-4 sm:grid-cols-14">
        {overview.days.map((day) => (
          <li key={day.key} className="grid justify-items-center gap-1.5">
            <div className="flex h-20 w-full max-w-8 items-end overflow-hidden rounded-sm bg-neutral-100">
              {day.hours !== null ? (
                <span
                  className={cn(
                    'block w-full rounded-sm',
                    day.hours >= GOOD_SLEEP_HOURS ? 'bg-sage-400' : 'bg-biru-300',
                  )}
                  style={{ height: `${sleepBarPercent(day.hours)}%` }}
                />
              ) : null}
            </div>
            <span className="text-xs text-fg-3 num">
              {weekdayShortId(day.key)} {Number(day.key.slice(8))}
              <span className="sr-only">
                : {day.hours === null ? 'tidak ada catatan' : `${formatDecimalId(day.hours)} jam`}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p aria-hidden className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-fg-4">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-3 rounded-[4px] bg-sage-400" />
          Tidur 7 jam atau lebih
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-3 rounded-[4px] bg-biru-300" />
          Kurang dari 7 jam
        </span>
      </p>
    </div>
  );
}
