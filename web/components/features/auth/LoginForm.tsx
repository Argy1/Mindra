'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage } from '@/components/features/auth/FormMessage';
import { SubmitButton } from '@/components/features/auth/SubmitButton';
import { useFocusFirstError } from '@/components/features/auth/use-focus-first-error';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { signInAction } from '@/lib/auth/actions';
import { initialFormState } from '@/lib/auth/form-state';

interface LoginFormProps {
  /** Tujuan setelah masuk (sudah disaring safeNextPath di server). */
  next?: string | undefined;
  /** Pemberitahuan dari tautan email yang gagal (?galat=…). */
  notice?: string | undefined;
}

export function LoginForm({ next, notice }: LoginFormProps) {
  const [state, formAction] = useActionState(signInAction, initialFormState);
  const formRef = useFocusFirstError(state);

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-5">
      {notice && state.status === 'idle' ? (
        <Alert tone="info" role="status" compact>
          <p className="text-sm">{notice}</p>
        </Alert>
      ) : null}
      <FormMessage state={state} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

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
      <PasswordInput
        name="password"
        label="Kata sandi"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />

      <SubmitButton>Masuk</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/lupa-sandi">Lupa kata sandi?</Link>
      </p>
    </form>
  );
}
