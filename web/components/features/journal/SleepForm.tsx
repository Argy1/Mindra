'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/features/auth/FormMessage';
import { SubmitButton } from '@/components/features/auth/SubmitButton';
import { useFocusFirstError } from '@/components/features/auth/use-focus-first-error';
import { Input } from '@/components/ui/Input';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { Textarea } from '@/components/ui/Textarea';
import { initialFormState } from '@/lib/auth/form-state';
import { saveSleepAction } from '@/lib/journal/actions';
import { SLEEP_QUALITY_LABELS } from '@/lib/domain/journal/mood';
import { SLEEP_MAX_AGE_DAYS } from '@/lib/domain/journal/sleep';
import { SLEEP_NOTE_MAX } from '@/lib/validation/journal';
import { addDaysToKey } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';

interface SleepFormProps {
  /** Hari ini (WIB), "YYYY-MM-DD". Dikirim dari server supaya server dan klien sepakat. */
  today: string;
}

/**
 * Catat tidur: tanggal bangun, jam tidur, jam bangun, dan kualitas. Semua jam dimengerti sebagai WIB.
 * Jam tidur yang lebih malam dari jam bangun otomatis dianggap malam sebelumnya (lihat composeSleepWindow).
 */
export function SleepForm({ today }: SleepFormProps) {
  const [state, formAction] = useActionState(saveSleepAction, initialFormState);
  const formRef = useFocusFirstError(state);
  const v = state.values;

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-6">
      <FormMessage state={state} />

      <Input
        name="wakeDate"
        type="date"
        label="Tanggal bangun"
        defaultValue={v?.wakeDate || today}
        min={addDaysToKey(today, -SLEEP_MAX_AGE_DAYS)}
        max={today}
        error={state.fieldErrors?.wakeDate}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          name="bedtime"
          type="time"
          label="Jam tidur"
          defaultValue={v?.bedtime || '22:30'}
          error={state.fieldErrors?.bedtime}
        />
        <Input
          name="wakeTime"
          type="time"
          label="Jam bangun"
          defaultValue={v?.wakeTime || '06:00'}
          error={state.fieldErrors?.wakeTime}
        />
      </div>

      <RadioGroup legend="Bagaimana kualitas tidurmu?" error={state.fieldErrors?.quality}>
        <div className="grid gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <label
              key={level}
              className={cn(
                'flex min-h-12 cursor-pointer items-center gap-3 rounded-md border-[1.5px] border-line-soft bg-raised px-4 py-2',
                'text-sm font-medium text-fg-2 transition-colors duration-(--dur-fast) hover:border-biru-300',
                'has-[:checked]:border-biru-500 has-[:checked]:bg-biru-50 has-[:checked]:text-biru-800',
                'has-[:focus-visible]:shadow-glow-biru has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-biru-500',
              )}
            >
              <input
                type="radio"
                name="quality"
                value={level}
                defaultChecked={v?.quality === String(level)}
                className="size-4 shrink-0 accent-biru-600"
              />
              <span className="font-semibold text-fg-1 num">{level}</span>
              <span>{SLEEP_QUALITY_LABELS[level]}</span>
            </label>
          ))}
        </div>
      </RadioGroup>

      <Textarea
        name="notes"
        label="Catatan"
        optional
        maxLength={SLEEP_NOTE_MAX}
        helper={`Mis. terbangun karena apa, atau mimpi yang kamu ingat. Maksimal ${SLEEP_NOTE_MAX} karakter.`}
        defaultValue={v?.notes ?? ''}
        error={state.fieldErrors?.notes}
      />

      <SubmitButton>Simpan catatan tidur</SubmitButton>
    </form>
  );
}
