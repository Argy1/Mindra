import { isMoodType, MOOD_LABEL } from '@/lib/domain/journal/mood';
import { cn } from '@/lib/utils/cn';

interface MoodDotsProps {
  /** Perasaan per hari (lama → baru); null = belum check-in. */
  days: readonly (string | null)[];
  /** Awalan kalimat untuk pembaca layar, mis. "Mood 7 hari terakhir". */
  label?: string;
  className?: string;
}

/**
 * Titik mood per hari (design/psikolog-dashboard.html `.dots`). Warna HANYA pelengkap: seluruh deret
 * dibaca sebagai satu gambar dengan kalimat lengkap ("cemas, sedih, belum diisi, ..."), dan hari
 * kosong berupa lingkaran putus-putus, bukan titik berwarna.
 */
export function MoodDots({ days, label = 'Mood 7 hari terakhir', className }: MoodDotsProps) {
  const names = days.map((day) => (day !== null && isMoodType(day) ? MOOD_LABEL[day] : null));
  const summary = names.map((name) => (name ? name.toLowerCase() : 'belum diisi')).join(', ');

  return (
    <div role="img" aria-label={`${label}: ${summary}`} className={cn('flex gap-1', className)}>
      {days.map((day, index) =>
        day !== null && isMoodType(day) ? (
          <span
            key={index}
            className="size-3 rounded-full"
            style={{ backgroundColor: `var(--mood-${day})` }}
          />
        ) : (
          <span
            key={index}
            className="size-3 rounded-full border-[1.5px] border-dashed border-line-control"
          />
        ),
      )}
    </div>
  );
}
