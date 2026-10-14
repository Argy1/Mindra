'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/features/auth/FormMessage';
import { SubmitButton } from '@/components/features/auth/SubmitButton';
import { useFocusFirstError } from '@/components/features/auth/use-focus-first-error';
import { Input } from '@/components/ui/Input';
import { forgotPasswordAction } from '@/lib/auth/actions';
import { initialFormState } from '@/lib/auth/form-state';

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialFormState);
  const formRef = useFocusFirstError(state);

  if (state.status === 'success') return <FormMessage state={state} />;

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-5">
      <FormMessage state={state} />
      <Input
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <SubmitButton>Kirim tautan</SubmitButton>
    </form>
  );
}
