'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage } from '@/components/features/auth/FormMessage';
import { SubmitButton } from '@/components/features/auth/SubmitButton';
import { useFocusFirstError } from '@/components/features/auth/use-focus-first-error';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { RadioCard } from '@/components/ui/RadioCard';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { signUpAction } from '@/lib/auth/actions';
import { initialFormState } from '@/lib/auth/form-state';
import { MIN_AGE } from '@/lib/legal/version';

export function RegisterForm() {
  const [state, formAction] = useActionState(signUpAction, initialFormState);
  const formRef = useFocusFirstError(state);

  // Setelah berhasil, formulir diganti pesan konfirmasi (bukan dibiarkan terisi ulang).
  if (state.status === 'success') {
    return <FormMessage state={state} />;
  }

  const accountType = state.values?.accountType === 'psychologist' ? 'psychologist' : 'self';

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-5">
      <FormMessage state={state} />

      <Input
        name="name"
        label="Nama panggilan"
        autoComplete="name"
        required
        defaultValue={state.values?.name}
        error={state.fieldErrors?.name}
      />
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
        autoComplete="new-password"
        required
        helper="Minimal 8 karakter."
        error={state.fieldErrors?.password}
      />

      <RadioGroup legend="Kamu mendaftar sebagai" error={state.fieldErrors?.accountType}>
        <RadioCard
          name="accountType"
          value="self"
          label="Untuk diriku sendiri"
          defaultChecked={accountType === 'self'}
        />
        <RadioCard
          name="accountType"
          value="psychologist"
          label="Saya psikolog"
          description="Akunmu ditinjau dulu sebelum bisa melihat klien."
          defaultChecked={accountType === 'psychologist'}
        />
      </RadioGroup>

      <Checkbox
        name="ageConfirmed"
        required
        defaultChecked={state.values?.ageConfirmed === 'on'}
        label={`Saya berusia ${MIN_AGE} tahun ke atas.`}
        error={state.fieldErrors?.ageConfirmed}
      />

      <Checkbox
        name="consent"
        required
        defaultChecked={state.values?.consent === 'on'}
        label={
          <>
            Saya setuju dengan <Link href="/syarat-penggunaan">ketentuan layanan</Link> dan{' '}
            <Link href="/kebijakan-privasi">kebijakan privasi</Link> Mindra.
          </>
        }
        error={state.fieldErrors?.consent}
      />

      <SubmitButton>Buat akun</SubmitButton>
    </form>
  );
}
