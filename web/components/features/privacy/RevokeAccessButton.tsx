'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { revokeCaregiverAction, revokeCareLinkAction } from '@/lib/privacy/actions';

interface RevokeAccessButtonProps {
  kind: 'psychologist' | 'caregiver';
  id: string;
  name: string;
  /** Undangan yang belum diterima: tombol berbunyi "Batalkan undangan". */
  invitePending?: boolean;
}

/**
 * Cabut akses dengan SATU klik, tanpa dialog konfirmasi. Mencabut adalah arah yang melindungi privasi
 * dan bisa dibalik (hubungkan lagi atau undang lagi), jadi hambatannya sengaja dibuat sekecil mungkin.
 * Hasilnya berlaku seketika dan diumumkan lewat toast.
 */
export function RevokeAccessButton({ kind, id, name, invitePending }: RevokeAccessButtonProps) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function revoke() {
    startTransition(async () => {
      const result =
        kind === 'psychologist' ? await revokeCareLinkAction(id) : await revokeCaregiverAction(id);
      if (result.status === 'error') {
        toast({ title: 'Akses belum dicabut', description: result.message, tone: 'error' });
        return;
      }
      toast({
        title: invitePending ? 'Undangan dibatalkan' : 'Akses dicabut',
        description: result.message,
        tone: 'success',
      });
    });
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-danger-700"
      loading={pending}
      onClick={revoke}
    >
      {invitePending ? 'Batalkan undangan' : 'Cabut akses'}
      <span className="sr-only"> {name}</span>
    </Button>
  );
}
