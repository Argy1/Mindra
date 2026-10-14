'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/features/auth/FormMessage';
import { SubmitButton } from '@/components/features/auth/SubmitButton';
import { useFocusFirstError } from '@/components/features/auth/use-focus-first-error';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { resetPasswordAction } from '@/lib/auth/actions';
import { initialFormState } from '@/lib/auth/form-state';

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordAction, initialFormState);
  const formRef = useFocusFirstError(state);

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-5">
      <FormMessage state={state} />
      <PasswordInput
        name="password"
        label="Kata sandi baru"
        autoComplete="new-password"
        required
        helper="Minimal 8 karakter."
        error={state.fieldErrors?.password}
      />
      <PasswordInput
        name="confirm"
        label="Ketik ulang kata sandi baru"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirm}
      />
      <SubmitButton>Simpan kata sandi</SubmitButton>
    </form>
  );
}
