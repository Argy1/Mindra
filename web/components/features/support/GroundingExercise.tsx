'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { GROUNDING_STEPS, groundingProgress } from '@/lib/domain/support/grounding';

type Mode = 'idle' | 'running' | 'finished';

/**
 * Grounding 5-4-3-2-1, selangkah demi selangkah. Tidak ada kolom isian: tidak ada yang ditulis, dicatat, atau dikirim.
 * Langkah baru diumumkan ke pembaca layar lewat wilayah `status`; fokus tetap di tombol supaya urutan keyboard tidak bergeser.
 */
export function GroundingExercise() {
  const [mode, setMode] = useState<Mode>('idle');
  const [index, setIndex] = useState(0);
  const progress = groundingProgress(index);

  function start() {
    setIndex(0);
    setMode('running');
  }

  function next() {
    if (progress.isLast) setMode('finished');
    else setIndex(progress.index + 1);
  }

  const announcement =
    mode === 'running'
      ? `${progress.label}. ${progress.step.prompt}`
      : mode === 'finished'
        ? 'Selesai. Kamu sudah melewati kelima langkah.'
        : '';

  return (
    <div className="grid gap-5">
      {mode === 'idle' ? (
        <p className="text-fg-2">
          Kalau pikiranmu berputar atau tubuhmu terasa tegang, latihan ini mengajakmu memperhatikan
          apa yang ada di sekitarmu sekarang, lewat lima indra, satu langkah pada satu waktu.
        </p>
      ) : mode === 'running' ? (
        <div className="grid gap-3 rounded-lg bg-sunken p-5">
          <p className="meta">{progress.label}</p>
          <p className="text-fg-1">
            <span aria-hidden className="mr-3 text-4xl font-bold text-biru-700 tabular-nums">
              {progress.step.count}
            </span>
            <span className="text-lg font-semibold">hal yang bisa kamu {progress.step.sense}</span>
          </p>
          <p className="text-fg-2">{progress.step.prompt}</p>
        </div>
      ) : (
        <div className="grid gap-2 rounded-lg bg-sunken p-5">
          <p className="text-xl font-bold text-fg-1">Selesai</p>
          <p className="text-fg-2">
            Kamu sudah melewati kelima langkah. Tarik napas pelan sekali lagi. Kalau rasanya masih
            berat, ulangi dari awal, atau hubungi seseorang yang kamu percaya.
          </p>
        </div>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        {mode === 'running' ? (
          <>
            <Button
              variant="secondary"
              onClick={() => setIndex(progress.index - 1)}
              disabled={progress.isFirst}
            >
              Kembali
            </Button>
            <Button onClick={next}>{progress.isLast ? 'Selesai' : 'Lanjut'}</Button>
          </>
        ) : (
          <Button onClick={start}>
            {mode === 'finished'
              ? 'Ulangi grounding'
              : `Mulai grounding ${GROUNDING_STEPS.map((s) => s.count).join('-')}`}
          </Button>
        )}
      </div>
    </div>
  );
}
