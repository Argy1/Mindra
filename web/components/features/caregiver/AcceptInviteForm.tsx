'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/features/auth/FormMessage';
import { useFocusFirstError } from '@/components/features/auth/use-focus-first-error';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { initialFormState } from '@/lib/auth/form-state';
import { acceptInviteAction } from '@/lib/caregiver/actions';

/**
 * Menerima undangan dari kode. Server menjawab sama untuk kode salah, kedaluwarsa, atau undangan
 * milik sendiri (supaya kode tidak bisa ditebak), dan membatasi percobaan gagal.
 */
export function AcceptInviteForm() {
  const [state, formAction, pending] = useActionState(acceptInviteAction, initialFormState);
  const formRef = useFocusFirstError(state);

  return (
    <form ref={formRef} action={formAction} noValidate className="grid max-w-md gap-4">
      <FormMessage state={state} />
      <Input
        name="code"
        label="Kode undangan"
        helper="Kode 8 huruf dan angka dari orang yang mengundangmu."
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        defaultValue={state.values?.code ?? ''}
        error={state.fieldErrors?.code}
        className="font-mono tracking-wider uppercase"
      />
      <div>
        <Button type="submit" loading={pending}>
          Terima undangan
        </Button>
      </div>
    </form>
  );
}
