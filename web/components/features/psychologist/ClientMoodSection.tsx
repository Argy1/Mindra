import { MoodGlyph } from '@/components/features/journal/MoodGlyph';
import { MOOD_LABEL } from '@/lib/domain/journal/mood';
import type { MoodOverview } from '@/lib/domain/psychologist/detail';
import { weekdayShortId } from '@/lib/utils/date';

/** Mood 14 hari terakhir: satu kerikil per hari, hari kosong berupa lingkaran putus-putus. */
export function ClientMoodSection({ overview }: { overview: MoodOverview }) {
  const total = overview.days.length;

  return (
    <div className="grid gap-4">
      <p className="body-m">
        Check-in {overview.checkInDays} dari {total} hari.
        {overview.top
          ? ` Perasaan yang paling sering dicatat: ${MOOD_LABEL[overview.top.mood].toLowerCase()} (${overview.top.count} kali).`
          : ' Belum ada catatan perasaan dalam rentang ini.'}
      </p>
      <ol className="grid grid-cols-7 gap-x-1.5 gap-y-4">
        {overview.days.map((day) => (
          <li key={day.key} className="grid justify-items-center gap-1.5">
            {day.mood ? (
              <MoodGlyph mood={day.mood} className="w-8" />
            ) : (
              <span className="size-8 rounded-full border-[1.5px] border-dashed border-line-control" />
            )}
            <span className="text-xs text-fg-3">
              {weekdayShortId(day.key)} {Number(day.key.slice(8))}
              <span className="sr-only">: {day.mood ? MOOD_LABEL[day.mood] : 'belum diisi'}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
