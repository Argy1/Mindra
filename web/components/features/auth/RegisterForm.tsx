'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
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
import { STR_MAX, type AccountType } from '@/lib/validation/auth';

export function RegisterForm() {
  const [state, formAction] = useActionState(signUpAction, initialFormState);
  const formRef = useFocusFirstError(state);
  // Pilihan yang dikembalikan server setelah galat. Radio TETAP tak-terkendali dengan `defaultChecked` dari nilai ini:
  // React 19 mereset formulir setelah tiap aksi, dan reset mengembalikan radio ke `defaultChecked`. Bila radio
  // dikendalikan state, tampilannya bisa kembali ke "diriku sendiri" sementara kolom STR masih tampil.
  const submitted: AccountType =
    state.values?.accountType === 'psychologist' ? 'psychologist' : 'self';
  // Cermin pilihan saat ini hanya untuk menampilkan/menyembunyikan kolom STR; disetel ulang tiap kali ada hasil
  // aksi baru (pola "sesuaikan state saat prop berubah", tanpa efek).
  const [choice, setChoice] = useState<AccountType>(submitted);
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    setChoice(submitted);
  }

  // Setelah berhasil, formulir diganti pesan konfirmasi (bukan dibiarkan terisi ulang).
  if (state.status === 'success') {
    return <FormMessage state={state} />;
  }

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
          defaultChecked={submitted === 'self'}
          onChange={() => setChoice('self')}
        />
        <RadioCard
          name="accountType"
          value="psychologist"
          label="Saya psikolog"
          description="Akunmu ditinjau dulu sebelum bisa melihat klien."
          defaultChecked={submitted === 'psychologist'}
          onChange={() => setChoice('psychologist')}
        />
      </RadioGroup>

      {choice === 'psychologist' ? (
        <Input
          name="strNumber"
          label="Nomor STR"
          autoComplete="off"
          required
          maxLength={STR_MAX}
          defaultValue={state.values?.strNumber}
          helper="Surat Tanda Registrasi psikologmu. Admin mencocokkannya dengan sumber resmi sebelum akunmu disetujui."
          error={state.fieldErrors?.strNumber}
        />
      ) : null}

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
