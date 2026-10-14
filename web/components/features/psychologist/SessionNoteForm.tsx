'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/features/auth/FormMessage';
import { useFocusFirstError } from '@/components/features/auth/use-focus-first-error';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { initialFormState } from '@/lib/auth/form-state';
import { saveSessionNoteAction } from '@/lib/psychologist/actions';
import { NOTES_FOR_PATIENT_MAX, SESSION_SUMMARY_MAX } from '@/lib/validation/psychologist';

interface SessionNoteFormProps {
  consultationId: string;
  summary: string;
  notesForPatient: string;
}

/**
 * Catatan satu sesi. Dua kolom dengan pembaca berbeda dan dijelaskan terang: catatan klinis hanya
 * untuk psikolog, catatan untuk klien bisa dibaca klien di aplikasinya. Nilai yang diketik
 * dipertahankan saat ada galat (React 19 mengosongkan form setelah aksi).
 */
export function SessionNoteForm({
  consultationId,
  summary,
  notesForPatient,
}: SessionNoteFormProps) {
  const [state, formAction, pending] = useActionState(saveSessionNoteAction, initialFormState);
  const formRef = useFocusFirstError(state);

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="consultationId" value={consultationId} />
      <Textarea
        name="summary"
        label="Catatan sesi"
        helper="Hanya kamu yang bisa membaca catatan ini."
        maxLength={SESSION_SUMMARY_MAX}
        defaultValue={state.values?.summary ?? summary}
        error={state.fieldErrors?.summary}
      />
      <Textarea
        name="notesForPatient"
        label="Catatan untuk klien"
        optional
        helper="Klien bisa membaca catatan ini di aplikasinya. Tulis dengan bahasa yang hangat dan jelas."
        maxLength={NOTES_FOR_PATIENT_MAX}
        defaultValue={state.values?.notesForPatient ?? notesForPatient}
        error={state.fieldErrors?.notesForPatient}
      />
      <div>
        <Button type="submit" loading={pending}>
          Simpan catatan sesi
        </Button>
      </div>
    </form>
  );
}
