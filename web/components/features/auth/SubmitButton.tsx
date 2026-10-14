'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/Button';

/** Tombol kirim yang menampilkan status memproses selama Server Action berjalan (cegah kirim ganda). */
export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block loading={pending}>
      {children}
    </Button>
  );
}
