'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, WarningCircle, X } from '@phosphor-icons/react/ssr';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Progress } from '@/components/ui/Progress';
import { RadioCard } from '@/components/ui/RadioCard';
import type { SubmitAssessmentResult } from '@/lib/assessment/result';
import type { Instrument, InstrumentId } from '@/lib/domain/assessment/instruments';
import { CRISIS_ITEM } from '@/lib/domain/crisis/detector';
import { PRIMARY_CRISIS_RESOURCE, crisisCallLabel } from '@/lib/domain/crisis/resources';

export interface AssessmentSubmission {
  type: InstrumentId;
  /** Jawaban MENTAH per id butir. Skor dan kategori dihitung server. */
  answers: Record<string, number>;
}

interface AssessmentRunnerProps {
  instrument: Instrument;
  /** Server Action penyimpan (atau stub di halaman pratinjau). */
  onSubmit: (submission: AssessmentSubmission) => Promise<SubmitAssessmentResult>;
  /** Dipanggil setelah tersimpan. Bawaan: pindah ke halaman hasil. */
  onDone?: (id: string) => void;
  /** Tujuan tombol keluar. */
  exitHref?: string;
}

const NETWORK_MESSAGE = 'Koneksi terputus. Periksa jaringanmu, lalu coba kirim lagi.';

/**
 * Layar pengisian skrining: satu pertanyaan per layar, mode fokus (design/app-asesmen.html state 1).
 *
 * Keyboard: panah/spasi pada pilihan (radio bawaan browser), tombol 1–9 memilih jawaban ke-n, dan Enter
 * (pengiriman implisit formulir) = Lanjut. Fokus berpindah ke pertanyaan baru supaya pembaca layar
 * langsung membacanya. Skor TIDAK dihitung di sini; hanya jawaban mentah yang dikirim.
 */
export function AssessmentRunner({
  instrument,
  onSubmit,
  onDone,
  exitHref = '/asesmen',
}: AssessmentRunnerProps) {
  const router = useRouter();
  const total = instrument.questions.length;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<'answering' | 'submitting' | 'failed'>('answering');
  const [failure, setFailure] = useState<string | null>(null);
  const [needAnswer, setNeedAnswer] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // Penanda hidrasi: pintasan keyboard baru aktif setelah komponen terpasang. Dipakai tes e2e untuk
  // menunggu kondisi yang sebenarnya, bukan menebak waktu.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const headingId = useId();
  const errorId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const optionRefs = useRef<Array<HTMLInputElement | null>>([]);
  const movedOnce = useRef(false);

  const question = instrument.questions[index]!;
  const current = answers[question.id];
  const isLast = index === total - 1;
  const answeredCount = Object.keys(answers).length;
  const crisisItem = CRISIS_ITEM[instrument.id];
  const showCrisisNote = crisisItem === question.id && current !== undefined && current > 0;

  // Pindahkan fokus ke pertanyaan baru (bukan saat pertama kali dimuat).
  useEffect(() => {
    if (movedOnce.current) headingRef.current?.focus();
    else movedOnce.current = true;
  }, [index]);

  // Pintasan angka: "1" memilih jawaban pertama, dst.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (leaving || phase === 'submitting') return;
      const position = Number(event.key);
      if (!Number.isInteger(position) || position < 1) return;
      const option = question.options[position - 1];
      if (!option) return;
      event.preventDefault();
      setAnswers((previous) => ({ ...previous, [question.id]: option.value }));
      setNeedAnswer(false);
      optionRefs.current[position - 1]?.focus();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [question, leaving, phase]);

  function choose(value: number) {
    setAnswers((previous) => ({ ...previous, [question.id]: value }));
    setNeedAnswer(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === 'submitting') return;

    if (current === undefined) {
      setNeedAnswer(true);
      optionRefs.current[0]?.focus();
      return;
    }
    if (!isLast) {
      setIndex(index + 1);
      return;
    }

    setPhase('submitting');
    setFailure(null);
    try {
      const result = await onSubmit({ type: instrument.id, answers });
      if (result.status === 'ok') {
        // Tetap "submitting" sampai halaman berganti, supaya tidak bisa dikirim dua kali.
        if (onDone) onDone(result.id);
        else router.push(`/asesmen/hasil/${result.id}`);
        return;
      }
      setFailure(result.message);
    } catch {
      setFailure(NETWORK_MESSAGE);
    }
    setPhase('failed');
  }

  return (
    <div className="min-h-dvh bg-canvas pb-16" data-ready={ready ? 'true' : undefined}>
      <header className="mx-auto flex max-w-reading items-center justify-between gap-4 px-gutter py-5">
        {answeredCount === 0 ? (
          <Button variant="ghost" size="sm" href={exitHref}>
            <X aria-hidden /> Keluar
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setLeaving(true)}>
            <X aria-hidden /> Keluar
          </Button>
        )}
        <Progress
          className="max-w-xs flex-1"
          value={index + 1}
          min={1}
          max={total}
          label={`Pertanyaan ${index + 1} dari ${total}`}
        />
        <span className="meta num" aria-hidden>
          {index + 1} / {total}
        </span>
      </header>

      <main id="isi" className="mx-auto max-w-reading px-gutter pt-10">
        <form onSubmit={handleSubmit} noValidate>
          <p className="mb-3 text-sm text-fg-4">
            {instrument.name} · {instrument.lead}
          </p>
          <h1
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-[clamp(1.75rem,3.4vw,2.375rem)] leading-[1.2] font-normal text-fg-1 outline-none"
          >
            {question.text}
          </h1>
          <p className="mt-3 text-fg-3">
            Tidak ada jawaban benar atau salah. Pilih yang paling dekat dengan yang kamu rasakan.
          </p>

          <fieldset
            key={question.id}
            aria-labelledby={headingId}
            aria-describedby={needAnswer ? errorId : undefined}
            className="mt-9 grid gap-3 border-0 p-0"
          >
            {question.options.map((option, optionIndex) => (
              <RadioCard
                key={option.value}
                ref={(node) => {
                  optionRefs.current[optionIndex] = node;
                }}
                name={question.id}
                value={option.value}
                label={option.label}
                hint={String(optionIndex + 1)}
                checked={current === option.value}
                onChange={() => choose(option.value)}
                disabled={phase === 'submitting'}
              />
            ))}
            <div id={errorId} aria-live="polite" className="empty:hidden">
              {needAnswer ? (
                <p className="flex items-start gap-1.5 text-sm font-medium text-danger-700">
                  <WarningCircle aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
                  <span>Pilih salah satu jawaban dulu, lalu lanjut.</span>
                </p>
              ) : null}
            </div>
          </fieldset>

          {showCrisisNote ? (
            <Alert tone="info" compact role="status" className="mt-5">
              <p className="text-sm">
                Terima kasih sudah jujur menjawabnya. Kalau kamu sedang perlu bicara dengan
                seseorang sekarang, {PRIMARY_CRISIS_RESOURCE.name} (
                {PRIMARY_CRISIS_RESOURCE.displayNumber}) tersedia{' '}
                {PRIMARY_CRISIS_RESOURCE.availability}.
              </p>
              <Button
                className="mt-3"
                variant="secondary"
                size="sm"
                href={PRIMARY_CRISIS_RESOURCE.telHref}
              >
                {crisisCallLabel()}
              </Button>
            </Alert>
          ) : null}

          {phase === 'failed' && failure ? (
            <Alert tone="error" compact role="alert" className="mt-5">
              <p className="text-sm">{failure}</p>
            </Alert>
          ) : null}

          <div className="mt-10 flex justify-between gap-3">
            <Button
              variant="secondary"
              type="button"
              disabled={index === 0 || phase === 'submitting'}
              onClick={() => {
                setNeedAnswer(false);
                setIndex(index - 1);
              }}
            >
              <ArrowLeft aria-hidden /> Sebelumnya
            </Button>
            <Button type="submit" loading={phase === 'submitting'}>
              {isLast ? (phase === 'failed' ? 'Kirim lagi' : 'Lihat hasil') : 'Lanjut'}
            </Button>
          </div>

          <p className="mt-8 text-center text-sm text-fg-4">
            Jawabanmu baru tersimpan setelah kamu menyelesaikan semua pertanyaan.
          </p>
        </form>
      </main>

      <Dialog
        open={leaving}
        onOpenChange={setLeaving}
        title="Keluar dari skrining?"
        description="Jawabanmu belum tersimpan. Kalau keluar sekarang, kamu perlu mengulang dari awal."
        footer={
          <>
            <Button variant="secondary" onClick={() => setLeaving(false)}>
              Lanjutkan mengisi
            </Button>
            <Button href={exitHref}>Keluar</Button>
          </>
        }
      />
    </div>
  );
}
