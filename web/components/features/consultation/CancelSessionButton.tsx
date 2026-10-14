'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { initialFormState } from '@/lib/auth/form-state';
import { cancelConsultationAction } from '@/lib/consultation/actions';

/** Batalkan sesi dengan konfirmasi dua langkah (jam yang dilepas langsung bisa dipesan orang lain). */
export function CancelSessionButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(cancelConsultationAction, initialFormState);
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {confirming ? (
        <>
          <span className="text-sm text-fg-2">Batalkan sesi ini?</span>
          <Button type="submit" size="sm" variant="secondary" loading={pending}>
            Ya, batalkan
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Tidak jadi
          </Button>
        </>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-danger-700"
          onClick={() => setConfirming(true)}
        >
          Batalkan
        </Button>
      )}
      {state.status === 'error' && state.message ? (
        <p role="alert" className="w-full text-sm font-medium text-danger-700">
          {state.message}
        </p>
      ) : null}
      {state.status === 'success' && state.message ? (
        <p role="status" className="w-full text-sm font-medium text-success-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
