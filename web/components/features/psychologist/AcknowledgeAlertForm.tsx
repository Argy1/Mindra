'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { initialFormState, type FormState } from '@/lib/auth/form-state';
import { acknowledgeAlertAction } from '@/lib/psychologist/actions';

interface AcknowledgeAlertFormProps {
  id: string;
  patientName: string;
  /** Dipanggil begitu server mengonfirmasi, supaya kartu hilang tanpa menunggu refresh. */
  onHandled: (id: string) => void;
}

/**
 * "Tandai sudah ditangani". Server Action mencatat akses ke jejak audit dulu, baru mengubah status;
 * galatnya (mis. klien sudah mencabut akses) ditampilkan di sini, bukan ditelan.
 */
export function AcknowledgeAlertForm({ id, patientName, onHandled }: AcknowledgeAlertFormProps) {
  const [state, formAction, pending] = useActionState(
    async (previous: FormState, formData: FormData): Promise<FormState> => {
      const result = await acknowledgeAlertAction(previous, formData);
      if (result.status === 'success') onHandled(id);
      return result;
    },
    initialFormState,
  );

  return (
    <form action={formAction} className="grid justify-items-start gap-1.5">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="ghost" loading={pending}>
        Tandai sudah ditangani
        <span className="sr-only"> untuk {patientName}</span>
      </Button>
      {state.status === 'error' && state.message ? (
        <p role="alert" className="max-w-[28ch] text-sm font-medium text-danger-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
