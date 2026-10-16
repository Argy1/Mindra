'use client';

import { useState, useTransition } from 'react';
import { Stethoscope } from '@phosphor-icons/react/ssr';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { connectPsychologistAction } from '@/lib/privacy/actions';

export interface ConnectOption {
  id: string;
  name: string;
  specializations: readonly string[];
}

/**
 * Menghubungkan psikolog. Persetujuan dijelaskan SEBELUM tombol ditekan: apa yang akan bisa dilihat,
 * apa yang tidak, dan bahwa semuanya bisa diubah. Izin awal sama dengan database (ringkasan teman
 * cerita mati) dan hanya berlaku setelah tombol "Hubungkan" ditekan.
 */
export function ConnectPsychologist({ options }: { options: readonly ConnectOption[] }) {
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function connect(option: ConnectOption) {
    setPendingId(option.id);
    startTransition(async () => {
      const result = await connectPsychologistAction(option.id);
      setPendingId(null);
      toast(
        result.status === 'ok'
          ? {
              title: `Terhubung dengan ${option.name}`,
              description: result.message,
              tone: 'success',
            }
          : { title: 'Belum terhubung', description: result.message, tone: 'error' },
      );
    });
  }

  return (
    <details className="rounded-lg bg-sunken px-5 py-4">
      <summary className="flex w-full cursor-pointer items-center gap-2 font-semibold text-fg-1">
        <Stethoscope aria-hidden className="size-5" />
        Hubungkan psikolog
      </summary>
      <div className="mt-3 grid gap-4">
        <p className="body-m">
          Setelah terhubung, psikolog bisa melihat hasil skrining, mood harian, catatan tidur, dan
          peringatan krisismu. Ringkasan teman cerita tidak dibagikan kecuali kamu menyalakannya.
          Kamu bisa mengubah atau mencabut izin kapan saja, dan setiap kali datamu dibuka akan
          tercatat di riwayat akses.
        </p>
        {options.length === 0 ? (
          <p className="body-m">Belum ada psikolog lain yang tersedia untuk dihubungkan.</p>
        ) : (
          <ul className="grid">
            {options.map((option) => (
              <li
                key={option.id}
                className="flex flex-wrap items-center gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0"
              >
                <Avatar name={option.name} tone="biru" size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-fg-1">{option.name}</span>
                  {option.specializations.length > 0 ? (
                    <span className="block meta">{option.specializations.join(', ')}</span>
                  ) : null}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={pendingId === option.id}
                  onClick={() => connect(option)}
                >
                  Hubungkan
                  <span className="sr-only"> dengan {option.name}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
