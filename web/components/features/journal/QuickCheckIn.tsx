'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { FormMessage } from '@/components/features/auth/FormMessage';
import { MoodGlyph } from '@/components/features/journal/MoodGlyph';
import { initialFormState } from '@/lib/auth/form-state';
import { saveMoodAction } from '@/lib/journal/actions';
import { MOOD_LABEL, MOOD_TYPES, isMoodType, type MoodType } from '@/lib/domain/journal/mood';
import { cn } from '@/lib/utils/cn';

function MoodButton({ mood, pressed }: { mood: MoodType; pressed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="moodType"
      value={mood}
      aria-pressed={pressed}
      disabled={pending}
      className={cn(
        'touch-target grid w-[5.25rem] shrink-0 cursor-pointer justify-items-center gap-1.5 rounded-lg border-[1.5px] border-transparent',
        'bg-raised px-1 pt-3 pb-2.5 text-[0.8125rem] font-semibold text-fg-2 shadow-xs',
        'transition-transform duration-(--dur-fast) hover:-translate-y-0.5 motion-reduce:hover:transform-none',
        'disabled:cursor-progress disabled:opacity-60 aria-pressed:border-biru-400 aria-pressed:bg-biru-50',
        'max-sm:w-[4.75rem] max-sm:snap-start',
      )}
    >
      <MoodGlyph mood={mood} />
      {MOOD_LABEL[mood]}
    </button>
  );
}

interface QuickCheckInProps {
  /** Perasaan check-in pertama hari ini, bila sudah. */
  todayMood?: string | null;
}

/**
 * Check-in cepat di beranda (design/app-beranda.html `.moods`): satu ketukan menyimpan perasaan dengan
 * energi bawaan 3 dan tanpa catatan. Ingin menambah pemicu atau catatan? Tautan ke /jurnal.
 */
export function QuickCheckIn({ todayMood }: QuickCheckInProps) {
  const [state, formAction] = useActionState(saveMoodAction, initialFormState);
  const chosen = todayMood && isMoodType(todayMood) ? todayMood : null;

  return (
    <form action={formAction} className="grid gap-3">
      <div
        role="group"
        aria-label="Pilih perasaanmu"
        className="-mx-gutter flex snap-x snap-mandatory gap-2 overflow-x-auto px-gutter pt-1 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {MOOD_TYPES.map((mood) => (
          <MoodButton
            key={mood}
            mood={mood}
            pressed={chosen === mood && state.status !== 'success'}
          />
        ))}
      </div>

      <FormMessage state={state} />
      {chosen && state.status === 'idle' ? (
        <p className="body-m">
          Kamu sudah check-in hari ini ({MOOD_LABEL[chosen].toLowerCase()}). Mau mencatat lagi?
          Pilih perasaan di atas.
        </p>
      ) : null}
      <p className="text-sm">
        <Link
          href="/jurnal"
          className="font-semibold text-biru-600 underline-offset-4 hover:underline"
        >
          Tambah pemicu dan catatan di jurnal
        </Link>
      </p>
    </form>
  );
}
