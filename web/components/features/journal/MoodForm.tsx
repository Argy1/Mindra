'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/features/auth/FormMessage';
import { SubmitButton } from '@/components/features/auth/SubmitButton';
import { useFocusFirstError } from '@/components/features/auth/use-focus-first-error';
import { MoodGlyph } from '@/components/features/journal/MoodGlyph';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { Textarea } from '@/components/ui/Textarea';
import { initialFormState } from '@/lib/auth/form-state';
import { saveMoodAction } from '@/lib/journal/actions';
import { ENERGY_LABELS, MOOD_LABEL, MOOD_TRIGGERS, MOOD_TYPES } from '@/lib/domain/journal/mood';
import { MOOD_NOTE_MAX } from '@/lib/validation/journal';
import { cn } from '@/lib/utils/cn';

const choiceFocus =
  'has-[:focus-visible]:shadow-glow-biru has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-biru-500';

/**
 * Check-in perasaan lengkap: perasaan (wajib), energi, pemicu, dan catatan. Semua kontrol adalah
 * input native (radio/checkbox) sehingga keyboard dan pembaca layar bekerja tanpa kode tambahan.
 * Nilai yang sudah diisi dipertahankan saat ada galat (state.values), karena React 19 mengosongkan
 * formulir setelah setiap aksi selesai.
 */
export function MoodForm() {
  const [state, formAction] = useActionState(saveMoodAction, initialFormState);
  const formRef = useFocusFirstError(state);

  const selectedMood = state.values?.moodType ?? '';
  const energy = state.values?.energyLevel || '3';
  const selectedTriggers = new Set((state.values?.triggers ?? '').split(',').filter(Boolean));

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-7">
      <FormMessage state={state} />

      <RadioGroup legend="Bagaimana perasaanmu sekarang?" error={state.fieldErrors?.moodType}>
        <div className="flex flex-wrap gap-2">
          {MOOD_TYPES.map((mood) => (
            <label
              key={mood}
              className={cn(
                'grid w-[5.25rem] cursor-pointer justify-items-center gap-1.5 rounded-lg border-[1.5px] border-line-soft',
                'bg-raised px-1 pt-3 pb-2.5 text-[0.8125rem] font-semibold text-fg-2 shadow-xs',
                'transition-transform duration-(--dur-fast) hover:-translate-y-0.5 motion-reduce:hover:transform-none',
                'has-[:checked]:border-biru-400 has-[:checked]:bg-biru-50',
                choiceFocus,
              )}
            >
              <input
                type="radio"
                name="moodType"
                value={mood}
                defaultChecked={selectedMood === mood}
                className="peer sr-only"
              />
              <MoodGlyph mood={mood} />
              {MOOD_LABEL[mood]}
            </label>
          ))}
        </div>
      </RadioGroup>

      <RadioGroup legend="Seberapa bertenaga kamu?" error={state.fieldErrors?.energyLevel}>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <label
              key={level}
              className={cn(
                'grid min-h-12 cursor-pointer place-items-center rounded-md border-[1.5px] border-line-soft bg-raised',
                'font-semibold text-fg-2 transition-colors duration-(--dur-fast) hover:border-biru-300',
                'has-[:checked]:border-biru-500 has-[:checked]:bg-biru-50 has-[:checked]:text-biru-700',
                choiceFocus,
              )}
            >
              <input
                type="radio"
                name="energyLevel"
                value={level}
                defaultChecked={energy === String(level)}
                className="peer sr-only"
              />
              <span aria-hidden>{level}</span>
              <span className="sr-only">{ENERGY_LABELS[level]}</span>
            </label>
          ))}
        </div>
        <p className="meta">1 = sangat rendah, 5 = bertenaga</p>
      </RadioGroup>

      <fieldset className="grid gap-3 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold text-fg-1">
          Apa yang memengaruhi perasaanmu? <span className="font-normal text-fg-4">(opsional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {MOOD_TRIGGERS.map((trigger) => (
            <label
              key={trigger}
              className={cn(
                'touch-target inline-flex min-h-9 cursor-pointer items-center rounded-pill border border-line-soft',
                'bg-raised px-3.5 text-sm font-medium text-fg-2 transition-colors duration-(--dur-fast) hover:border-biru-200',
                'has-[:checked]:border-biru-300 has-[:checked]:bg-biru-50 has-[:checked]:text-biru-700',
                choiceFocus,
              )}
            >
              <input
                type="checkbox"
                name="triggers"
                value={trigger}
                defaultChecked={selectedTriggers.has(trigger)}
                className="peer sr-only"
              />
              {trigger}
            </label>
          ))}
        </div>
      </fieldset>

      <Textarea
        name="note"
        label="Catatan"
        optional
        maxLength={MOOD_NOTE_MAX}
        helper={`Tulis apa pun yang ingin kamu ingat. Maksimal ${MOOD_NOTE_MAX} karakter.`}
        defaultValue={state.values?.note ?? ''}
        error={state.fieldErrors?.note}
      />

      <SubmitButton>Simpan catatan</SubmitButton>
    </form>
  );
}
