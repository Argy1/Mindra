'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { initialFormState } from '@/lib/auth/form-state';
import { revokeApiKeyAction } from '@/lib/faskes/actions';

/**
 * Cabut kunci dengan konfirmasi dua langkah. Beda dengan mencabut izin di /privasi (yang sengaja satu klik):
 * mencabut kunci langsung memutus sistem mitra yang memakainya dan TIDAK bisa dibatalkan (kunci yang
 * dicabut tidak bisa dihidupkan lagi), jadi tombol konfirmasi di sini wajar.
 */
export function RevokeKeyButton({ id, name }: { id: string; name: string }) {
  const [state, formAction, pending] = useActionState(revokeApiKeyAction, initialFormState);
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {confirming ? (
        <>
          <span className="text-sm text-fg-2">Cabut kunci ini? Tidak bisa dibatalkan.</span>
          <Button type="submit" size="sm" variant="secondary" loading={pending}>
            Ya, cabut
            <span className="sr-only"> kunci {name}</span>
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
          className="text-danger-700"
          onClick={() => setConfirming(true)}
        >
          Cabut
          <span className="sr-only"> kunci {name}</span>
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
