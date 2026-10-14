'use client';

import { useActionState, useState } from 'react';
import { UserPlus } from '@phosphor-icons/react/ssr';
import { FormMessage } from '@/components/features/auth/FormMessage';
import { useFocusFirstError } from '@/components/features/auth/use-focus-first-error';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { initialFormState } from '@/lib/auth/form-state';
import { inviteCaregiverAction } from '@/lib/privacy/actions';

/** Berapa hari kode berlaku; sama dengan batas di `accept_caregiver_invite` (migrasi 20261014000100). */
const INVITE_VALID_DAYS = 14;

/**
 * Mengundang pendamping lewat nomor ponsel. Server membuat kode acak; pendamping memasukkannya di
 * portalnya. Izin awal hanya mood harian dan peringatan darurat, dan bisa diubah setelah diterima.
 */
export function InviteCaregiver() {
  const [state, formAction, pending] = useActionState(inviteCaregiverAction, initialFormState);
  const formRef = useFocusFirstError(state);
  const [copied, setCopied] = useState(false);
  const code = state.status === 'success' ? state.values?.inviteCode : undefined;

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard bisa ditolak (izin/HTTP); kodenya tetap terlihat dan bisa disalin manual.
      setCopied(false);
    }
  }

  return (
    <details className="rounded-lg bg-sunken px-5 py-4" open={Boolean(code) || undefined}>
      <summary className="inline-flex cursor-pointer items-center gap-2 font-semibold text-fg-1">
        <UserPlus aria-hidden className="size-5" />
        Undang pendamping
      </summary>
      <div className="mt-3 grid gap-4">
        <p className="body-m">
          Pendamping bisa orang yang kamu percaya, misalnya keluarga atau sahabat. Ia hanya melihat
          mood harian dan peringatan darurat sampai kamu mengubah izinnya.
        </p>
        <form ref={formRef} action={formAction} noValidate className="grid max-w-md gap-4">
          {/* Keberhasilan ditampilkan oleh panel kode di bawah, jadi hanya galat yang dipakai di sini. */}
          <FormMessage state={state.status === 'error' ? state : initialFormState} />
          <Input
            name="phone"
            type="tel"
            label="Nomor ponsel pendamping"
            helper="Contoh: 0812 3456 7890"
            autoComplete="off"
            inputMode="tel"
            defaultValue={state.values?.phone ?? ''}
            error={state.fieldErrors?.phone}
          />
          <div>
            <Button type="submit" variant="secondary" loading={pending}>
              Buat undangan
            </Button>
          </div>
        </form>

        {code ? (
          <Alert tone="success" compact>
            <p className="text-sm">
              Kirim kode ini ke pendampingmu. Kode berlaku {INVITE_VALID_DAYS} hari.
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-3">
              <strong
                data-testid="invite-code"
                className="font-mono text-xl tracking-widest text-fg-1"
              >
                {code}
              </strong>
              <Button size="sm" variant="secondary" onClick={copy}>
                {copied ? 'Tersalin' : 'Salin kode'}
              </Button>
            </p>
          </Alert>
        ) : null}
      </div>
    </details>
  );
}
