'use client';

import { useEffect, useRef } from 'react';
import type { FormState } from '@/lib/auth/form-state';

/** Kontrol pertama yang bermasalah: input/textarea/select bertanda, atau pilihan pertama di kelompok (fieldset) bertanda. */
const FIRST_INVALID =
  'input[aria-invalid="true"], textarea[aria-invalid="true"], select[aria-invalid="true"], fieldset[aria-invalid="true"] input';

/**
 * Setelah pengiriman gagal, pindahkan fokus ke kolom pertama yang bermasalah (WCAG 3.3.1/3.3.3):
 * pengguna keyboard dan pembaca layar langsung berada di tempat yang perlu diperbaiki.
 * Pasang `ref` yang dikembalikan pada <form>.
 */
export function useFocusFirstError(state: FormState) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== 'error') return;
    formRef.current?.querySelector<HTMLElement>(FIRST_INVALID)?.focus();
  }, [state]);

  return formRef;
}
