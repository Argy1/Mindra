'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  BREATHING_CYCLES,
  BREATHING_PATTERN,
  breathPosition,
  cycleSeconds,
} from '@/lib/domain/support/breathing';
import { cn } from '@/lib/utils/cn';

type Mode = 'idle' | 'running' | 'finished';

const TICK_MS = 200;

/**
 * Napas terpandu 4-4-6 sebanyak 5 siklus. Posisi dihitung dari waktu berlalu (bukan dari hitungan pewaktu), jadi tab yang
 * tertahan tidak membuat latihan melenceng. Untuk pembaca layar: hanya pergantian fase yang diumumkan (bukan tiap detik),
 * dan gerak lingkaran dimatikan oleh `prefers-reduced-motion` (CSS global) tanpa mengurangi petunjuk teks.
 */
export function BreathingExercise() {
  const [mode, setMode] = useState<Mode>('idle');
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (mode !== 'running') return;
    const timer = window.setInterval(() => {
      const ms = Date.now() - startedAt.current;
      if (breathPosition(ms).done) {
        window.clearInterval(timer);
        setElapsed(ms);
        setMode('finished');
        return;
      }
      setElapsed(ms);
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [mode]);

  function start() {
    startedAt.current = Date.now();
    setElapsed(0);
    setMode('running');
  }

  function stop() {
    setMode('idle');
    setElapsed(0);
  }

  const position = breathPosition(elapsed);
  const running = mode === 'running';
  const expanded = running && position.phase.id !== 'out';
  const announcement =
    mode === 'running'
      ? `${position.phase.label}. Siklus ${position.cycle} dari ${position.cycles}.`
      : mode === 'finished'
        ? `Selesai. Kamu sudah menyelesaikan ${BREATHING_CYCLES} siklus napas.`
        : '';

  return (
    <div className="grid gap-5">
      <div className="flex flex-col items-center gap-4 py-2">
        <div
          aria-hidden
          className={cn(
            'grid size-44 place-items-center rounded-full bg-biru-100 ring-8 ring-biru-50',
            'transition-transform ease-(--ease-breath)',
            expanded ? 'scale-100' : 'scale-[0.62]',
          )}
          style={{ transitionDuration: running ? `${position.phase.seconds}s` : '0.4s' }}
        />
        <div className="grid min-h-24 place-items-center text-center">
          {mode === 'running' ? (
            <>
              <p className="text-2xl font-bold text-fg-1">{position.phase.label}</p>
              <p aria-hidden className="text-4xl font-bold text-biru-700 tabular-nums">
                {position.secondsLeft}
              </p>
              <p className="text-sm text-fg-3">
                Siklus {position.cycle} dari {position.cycles}
              </p>
            </>
          ) : mode === 'finished' ? (
            <>
              <p className="text-xl font-bold text-fg-1">Selesai</p>
              <p className="max-w-prose text-fg-2">
                Kamu sudah menyelesaikan {BREATHING_CYCLES} siklus. Bagaimana rasanya sekarang?
                Kalau masih berat, ulangi sekali lagi atau hubungi seseorang yang kamu percaya.
              </p>
            </>
          ) : (
            <p className="max-w-prose text-fg-2">
              {BREATHING_CYCLES} siklus, sekitar {cycleSeconds() * BREATHING_CYCLES} detik. Tarik
              napas {BREATHING_PATTERN[0]?.seconds} detik, tahan {BREATHING_PATTERN[1]?.seconds}{' '}
              detik, lalu hembuskan pelan {BREATHING_PATTERN[2]?.seconds} detik. Duduk atau berdiri
              dengan nyaman, dan berhenti kapan saja.
            </p>
          )}
        </div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="flex justify-center">
        {running ? (
          <Button variant="secondary" onClick={stop}>
            Berhenti
          </Button>
        ) : (
          <Button onClick={start}>
            {mode === 'finished' ? 'Ulangi napas terpandu' : 'Mulai napas terpandu'}
          </Button>
        )}
      </div>
    </div>
  );
}
