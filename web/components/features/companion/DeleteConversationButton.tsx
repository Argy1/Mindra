'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { initialFormState } from '@/lib/auth/form-state';
import { deleteConversationAction } from '@/lib/companion/actions';

/**
 * Hapus percakapan dengan konfirmasi dua langkah: penghapusan sungguhan dan tidak bisa dibatalkan, jadi
 * konfirmasinya wajar (berbeda dengan mencabut izin di /privasi yang bisa diulang).
 */
export function DeleteConversationButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(deleteConversationAction, initialFormState);
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={formAction} className="flex flex-wrap items-center justify-center gap-2">
      <input type="hidden" name="id" value={id} />
      {confirming ? (
        <>
          <span className="text-sm text-fg-2">Hapus percakapan ini? Tidak bisa dibatalkan.</span>
          <Button type="submit" size="sm" variant="secondary" loading={pending}>
            Ya, hapus
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Batal
          </Button>
        </>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-fg-3"
          onClick={() => setConfirming(true)}
        >
          Hapus percakapan ini
        </Button>
      )}
      {state.status === 'error' && state.message ? (
        <p role="alert" className="w-full text-center text-sm font-medium text-danger-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
