'use client';

import { useOptimistic, useTransition } from 'react';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { setSatusehatConsentAction } from '@/lib/privacy/actions';

/**
 * Izin sinkronisasi ke SATUSEHAT. Saklar ini hanya mencatat persetujuan; tidak ada hasil skrining yang
 * dikirim sebelum kamu sendiri memilih hasil yang ingin dikirim (Fase 3).
 */
export function SatusehatConsent({ enabled }: { enabled: boolean }) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(enabled, (_state, next: boolean) => next);

  function change(next: boolean) {
    startTransition(async () => {
      setOptimistic(next);
      const result = await setSatusehatConsentAction(next);
      toast(
        result.status === 'ok'
          ? { title: 'Pengaturan SATUSEHAT disimpan', description: result.message, tone: 'success' }
          : { title: 'Belum tersimpan', description: result.message, tone: 'error' },
      );
    });
  }

  return (
    <Switch label="Izinkan sinkronisasi SATUSEHAT" checked={optimistic} onCheckedChange={change} />
  );
}
