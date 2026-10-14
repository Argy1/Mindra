import { MoonStars } from '@phosphor-icons/react/ssr';
import { DeleteEntryButton } from '@/components/features/journal/DeleteEntryButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { deleteSleepEntryAction } from '@/lib/journal/actions';
import { SLEEP_QUALITY_LABELS } from '@/lib/domain/journal/mood';
import { formatDuration } from '@/lib/domain/journal/sleep';
import type { SleepEntry } from '@/lib/server/journal';
import { formatDateId } from '@/lib/utils/date';

const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

/** Catatan tidur terbaru: tanggal bangun, rentang jam, durasi, dan kualitas. */
export function SleepEntryList({ entries }: { entries: readonly SleepEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<MoonStars />}
        title="Belum ada catatan tidur"
        description="Catat jam tidur dan jam bangunmu untuk melihat polanya dari minggu ke minggu."
      />
    );
  }

  return (
    <ul className="grid">
      {entries.map((entry) => {
        const wake = new Date(entry.wakeTime);
        const bed = new Date(entry.bedtime);
        const minutes = (wake.getTime() - bed.getTime()) / 60_000;
        const day = formatDateId(wake, { weekday: 'short', day: 'numeric', month: 'short' });
        return (
          <li key={entry.id} className="border-t border-line-soft py-4 first:border-t-0 first:pt-0">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <strong className="text-fg-1">{formatDuration(minutes)}</strong>
              <time dateTime={entry.wakeTime} className="meta">
                bangun {day}
              </time>
            </p>
            <p className="meta">
              {formatDateId(bed, TIME)} sampai {formatDateId(wake, TIME)} WIB
            </p>
            <p className="mt-1 text-sm text-fg-3">
              Kualitas {entry.quality} dari 5: {SLEEP_QUALITY_LABELS[entry.quality]}
            </p>
            {entry.notes ? (
              <p className="mt-1 text-sm break-words whitespace-pre-line text-fg-2">
                {entry.notes}
              </p>
            ) : null}
            <div className="mt-1 -ml-3">
              <DeleteEntryButton
                id={entry.id}
                action={deleteSleepEntryAction}
                label={`catatan tidur ${day}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
