import { Fire, Leaf, MoonStars, NotePencil, ClipboardText } from '@phosphor-icons/react/ssr';
import type { ComponentType } from 'react';
import { WeekChart } from '@/components/features/home/WeekChart';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { BADGE_LABEL, type BadgeId } from '@/lib/domain/insight/engine';
import type { WeeklyInsight } from '@/lib/domain/insight/weekly';
import { MOOD_LABEL, isMoodType } from '@/lib/domain/journal/mood';
import { formatDecimalId } from '@/lib/utils/date';

const BADGE_ICON: Record<BadgeId, ComponentType<{ weight?: 'duotone' }>> = {
  streak3: Fire,
  goodSleep: MoonStars,
  exercise3: Leaf,
  assessmentDone: ClipboardText,
  reflectionComplete: NotePencil,
};

function Stat({ value, caption }: { value: string; caption: string }) {
  return (
    <div className="rounded-md bg-canvas px-4 py-3.5">
      <b className="block text-[1.375rem] text-fg-1 num">{value}</b>
      <span className="text-[0.8125rem] text-fg-3">{caption}</span>
    </div>
  );
}

/**
 * Kartu "Minggu ini" di beranda: narasi, grafik 7 hari, tiga angka ringkas, pola, rekomendasi, dan lencana.
 * Semua teks datang dari lib/domain/insight (aturan yang sama dengan aplikasi mobile).
 */
export function InsightCard({ insight }: { insight: WeeklyInsight }) {
  const { days, checkInDays, avgSleepHours, hardestDay } = insight;
  const hardestMood =
    hardestDay && isMoodType(hardestDay.moodType) ? MOOD_LABEL[hardestDay.moodType] : null;

  return (
    <Card as="section" hero aria-labelledby="judul-minggu-ini">
      <h2 id="judul-minggu-ini" className="h3">
        Minggu ini
      </h2>
      <p className="mt-3 max-w-[46ch] font-display text-[1.375rem] leading-[1.3] text-fg-1 sm:text-[1.625rem]">
        {insight.narrative}
      </p>

      <WeekChart days={days} />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat value={`${checkInDays} dari 7`} caption="hari kamu check-in" />
        <Stat
          value={avgSleepHours === null ? '–' : `${formatDecimalId(avgSleepHours)} jam`}
          caption={avgSleepHours === null ? 'belum ada catatan tidur' : 'rata-rata tidur'}
        />
        <Stat
          value={hardestDay ? hardestDay.dayName : '–'}
          caption={
            hardestDay && hardestMood
              ? `hari paling berat (${hardestMood.toLowerCase()})`
              : 'hari paling berat'
          }
        />
      </div>

      {insight.patterns.length > 0 ? (
        <ul className="mt-6 grid gap-2 border-t border-line-soft pt-5 body-m">
          {insight.patterns.map((pattern) => (
            <li key={pattern} className="flex gap-2.5">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-sage-500" />
              {pattern}
            </li>
          ))}
        </ul>
      ) : null}

      {insight.recommendation ? (
        <Alert tone="info" compact className="mt-5">
          <p className="body-m">{insight.recommendation}</p>
        </Alert>
      ) : null}

      {insight.badges.length > 0 ? (
        <ul aria-label="Pencapaian minggu ini" className="mt-5 flex flex-wrap gap-2">
          {insight.badges.map((badge) => {
            const Icon = BADGE_ICON[badge];
            return (
              <li key={badge}>
                <Badge tone="sage" dot={false}>
                  <span aria-hidden className="[&>svg]:size-4">
                    <Icon weight="duotone" />
                  </span>
                  {BADGE_LABEL[badge]}
                </Badge>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}
