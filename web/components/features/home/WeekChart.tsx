import { MoodGlyph } from '@/components/features/journal/MoodGlyph';
import { describeWeek, GOOD_SLEEP_HOURS, sleepBarPercent } from '@/lib/domain/insight/summary';
import type { DayPoint } from '@/lib/domain/insight/weekly';
import { isMoodType } from '@/lib/domain/journal/mood';
import { formatDecimalId } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';

/**
 * Grafik 7 hari: kerikil mood di atas, batang jam tidur di bawah (design/app-beranda.html `.week`).
 * Tampilan dibuat dari HTML/CSS biasa (tanpa pustaka grafik) supaya ringan dan setiap hari bisa
 * diringkas sebagai teks: seluruh grafik adalah satu `role="img"` dengan ringkasan lengkap per hari.
 * Warna batang (sage = tidur ≥ 7 jam) selalu diulang di teks jam di bawahnya.
 */
export function WeekChart({ days }: { days: readonly DayPoint[] }) {
  return (
    <div>
      <div
        role="img"
        aria-label={describeWeek(days)}
        className="mt-7 grid grid-cols-7 gap-1 sm:gap-2"
      >
        {days.map((day) => (
          <div key={day.date} className="grid justify-items-center gap-2">
            <div className="grid h-9 place-items-center">
              {day.moodType && isMoodType(day.moodType) ? (
                <MoodGlyph mood={day.moodType} className="w-[1.9rem] sm:w-[2.375rem]" />
              ) : (
                <span className="size-8 rounded-full border-[1.5px] border-dashed border-line-medium" />
              )}
            </div>
            <div className="flex h-24 w-full max-w-11 items-end overflow-hidden rounded-sm bg-neutral-100">
              {day.sleepHours !== null ? (
                <span
                  className={cn(
                    'block w-full rounded-sm',
                    day.sleepHours >= GOOD_SLEEP_HOURS ? 'bg-sage-400' : 'bg-biru-300',
                  )}
                  style={{ height: `${sleepBarPercent(day.sleepHours)}%` }}
                />
              ) : null}
            </div>
            <span className="text-xs text-fg-3 num">
              {day.sleepHours === null ? '–' : `${formatDecimalId(day.sleepHours)} j`}
            </span>
            <span
              className={cn(
                'text-[0.8125rem] font-semibold',
                day.isToday ? 'text-biru-600' : 'text-fg-2',
              )}
              title={day.isToday ? 'Hari ini' : undefined}
            >
              {day.dayLabel}
            </span>
          </div>
        ))}
      </div>

      <p aria-hidden className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-fg-4">
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
