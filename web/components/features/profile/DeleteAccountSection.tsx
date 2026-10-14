'use client';

import { useActionState, useState } from 'react';
import { FormMessage } from '@/components/features/auth/FormMessage';
import { SubmitButton } from '@/components/features/auth/SubmitButton';
import { useFocusFirstError } from '@/components/features/auth/use-focus-first-error';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { initialFormState } from '@/lib/auth/form-state';
import { deleteAccountAction } from '@/lib/profile/actions';
import { DELETE_CONFIRM_WORD } from '@/lib/validation/profile';

/**
 * Hapus akun. Sengaja dua langkah: tombol membuka dialog, dan di dalamnya pengguna mengetik kata penegas serta
 * kata sandinya lagi. Tombol kirimnya berwarna bahaya (bukan warna krisis, yang hanya untuk keselamatan).
 * Dialog tidak bisa ditutup tanpa sengaja saat sedang memproses.
 */
export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(deleteAccountAction, initialFormState);
  const formRef = useFocusFirstError(state);

  return (
    <>
      <Button variant="secondary" className="text-danger-700" onClick={() => setOpen(true)}>
        Hapus akun
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Hapus akunmu?"
        description="Seluruh datamu ikut terhapus dan tidak bisa dikembalikan."
      >
        <form ref={formRef} action={formAction} noValidate className="grid gap-4">
          <FormMessage state={state} />

          <ul className="grid list-disc gap-1.5 pl-5 text-sm text-fg-2">
            <li>Skrining, jurnal mood dan tidur, percakapan, dan konsultasimu.</li>
            <li>Izin ke psikolog dan pendamping, serta riwayat akses datamu.</li>
            <li>
              Data yang sudah dikirim ke SATUSEHAT berada di luar kendali kami. Unduh salinan datamu
              dulu bila perlu.
            </li>
          </ul>

          <Input
            name="confirm"
            label={`Ketik ${DELETE_CONFIRM_WORD} untuk melanjutkan`}
            autoComplete="off"
            autoCapitalize="characters"
            defaultValue={state.values?.confirm ?? ''}
            error={state.fieldErrors?.confirm}
          />
          <PasswordInput
            name="password"
            label="Kata sandimu"
            autoComplete="current-password"
            error={state.fieldErrors?.password}
          />

          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <div className="min-w-44">
              <SubmitButton>Hapus akun saya</SubmitButton>
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
}
