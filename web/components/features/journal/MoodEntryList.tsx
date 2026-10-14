import { DeleteEntryButton } from '@/components/features/journal/DeleteEntryButton';
import { MoodGlyph } from '@/components/features/journal/MoodGlyph';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notebook } from '@phosphor-icons/react/ssr';
import { deleteMoodEntryAction } from '@/lib/journal/actions';
import { ENERGY_LABELS, MOOD_LABEL } from '@/lib/domain/journal/mood';
import type { MoodEntry } from '@/lib/server/journal';
import { formatDateId } from '@/lib/utils/date';

const WHEN: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};

/** Catatan perasaan terbaru, lengkap dengan pemicu, catatan, dan tombol hapus. */
export function MoodEntryList({ entries }: { entries: readonly MoodEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Notebook />}
        title="Belum ada catatan perasaan"
        description="Mulai dengan satu check-in. Cukup pilih perasaan yang paling dekat denganmu."
      />
    );
  }

  return (
    <ul className="grid">
      {entries.map((entry) => {
        const when = formatDateId(new Date(entry.createdAt), WHEN);
        return (
          <li
            key={entry.id}
            className="flex gap-4 border-t border-line-soft py-4 first:border-t-0 first:pt-0"
          >
            <MoodGlyph mood={entry.moodType} className="w-10 shrink-0 self-start" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <strong className="text-fg-1">{MOOD_LABEL[entry.moodType]}</strong>
                <time dateTime={entry.createdAt} className="meta">
                  {when}
                </time>
              </p>
              {entry.energyLevel ? (
                <p className="meta">
                  Energi: {ENERGY_LABELS[entry.energyLevel] ?? entry.energyLevel}
                </p>
              ) : null}
              {entry.triggers.length > 0 ? (
                <p className="mt-1 text-sm text-fg-3">Pemicu: {entry.triggers.join(', ')}</p>
              ) : null}
              {entry.note ? (
                <p className="mt-1 text-sm break-words whitespace-pre-line text-fg-2">
                  {entry.note}
                </p>
              ) : null}
              <div className="mt-1 -ml-3">
                <DeleteEntryButton
                  id={entry.id}
                  action={deleteMoodEntryAction}
                  label={`catatan perasaan ${when}`}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
