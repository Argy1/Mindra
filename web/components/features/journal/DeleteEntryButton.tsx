'use client';

import { useActionState, useState } from 'react';
import { Trash } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/Button';
import { initialFormState, type FormState } from '@/lib/auth/form-state';

interface DeleteEntryButtonProps {
  id: string;
  /** Server Action penghapus (deleteMoodEntryAction / deleteSleepEntryAction). */
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  /** Nama catatan untuk pembaca layar, mis. "catatan perasaan 13 Okt 08.15". */
  label: string;
}

/**
 * Hapus satu catatan dengan konfirmasi dua langkah (menghapus tidak bisa dibatalkan). Konfirmasi
 * memakai tombol, bukan window.confirm, supaya bisa dioperasikan dan diumumkan dengan baik.
 */
export function DeleteEntryButton({ id, action, label }: DeleteEntryButtonProps) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {confirming ? (
        <>
          <span className="text-sm text-fg-2">Hapus catatan ini?</span>
          <Button type="submit" size="sm" variant="secondary" loading={pending}>
            Ya, hapus
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Batal
          </Button>
        </>
      ) : (
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(true)}>
          <Trash aria-hidden />
          <span className="sr-only">Hapus {label}</span>
          <span aria-hidden>Hapus</span>
        </Button>
      )}
      {state.status === 'error' && state.message ? (
        <p role="alert" className="w-full text-sm font-medium text-danger-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
