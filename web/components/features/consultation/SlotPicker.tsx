'use client';

import Link from 'next/link';
import { useActionState, useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck } from '@phosphor-icons/react/ssr';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { initialFormState } from '@/lib/auth/form-state';
import { bookConsultationAction } from '@/lib/consultation/actions';
import { formatRupiah } from '@/lib/domain/consultation/directory';
import {
  SESSION_MINUTES,
  nextAvailable,
  type Slot,
  type SlotDay,
} from '@/lib/domain/consultation/slots';
import { cn } from '@/lib/utils/cn';
import { formatDateId, formatShortDayId, formatTimeId } from '@/lib/utils/date';

interface SlotPickerProps {
  psychologistId: string;
  psychologistName: string;
  fee: number;
  days: readonly SlotDay[];
}

const STATE_NOTE: Readonly<Record<Slot['state'], string>> = {
  available: '',
  taken: 'sudah dipesan',
  too_soon: 'terlalu dekat',
  too_far: 'terlalu jauh',
};

/** "Kamis, 15 Oktober, 09.00–09.50 WIB". */
export function describeSession(startsAt: string, minutes = SESSION_MINUTES): string {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + minutes * 60_000);
  const day = formatDateId(start, { weekday: 'long', day: 'numeric', month: 'long' });
  return `${day}, ${formatTimeId(start)}–${formatTimeId(end)} WIB`;
}

/**
 * Pemilih jam. Dua langkah yang bisa dioperasikan dengan keyboard: pilih hari (radio), pilih jam (radio), lalu
 * "Pesan sesi". Ini hanya tampilan; kebenaran slot ditegakkan database saat memesan. Bila slot ternyata baru saja
 * diambil orang lain, pesan galat muncul dan daftar dimuat ulang supaya slot itu tidak lagi ditawarkan.
 */
export function SlotPicker({ psychologistId, psychologistName, fee, days }: SlotPickerProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(bookConsultationAction, initialFormState);
  const first = useMemo(() => nextAvailable(days)?.date ?? days[0]?.date ?? '', [days]);
  const [date, setDate] = useState(first);
  const [startsAt, setStartsAt] = useState('');
  const dayId = useId();
  const slotId = useId();

  const day = days.find((entry) => entry.date === date);
  const availableCount = (entry: SlotDay) =>
    entry.slots.filter((slot) => slot.state === 'available').length;
  const selected = day?.slots.find(
    (slot) => slot.startsAt === startsAt && slot.state === 'available',
  );

  // Setelah gagal (mis. slot baru dipesan orang lain), ambil ulang slot dan kosongkan pilihan.
  useEffect(() => {
    if (state.status === 'error') {
      setStartsAt('');
      router.refresh();
    }
  }, [state, router]);

  if (state.status === 'success') {
    const when = describeSession(state.values?.startsAt ?? startsAt);
    return (
      <div role="status" className="grid gap-4">
        <Alert tone="success" title="Sesimu sudah dipesan.">
          <p className="mt-1.5">
            {psychologistName}, {when}.
          </p>
        </Alert>
        <ul className="grid gap-2 text-sm text-fg-2">
          <li>
            Psikolog hanya melihat jam sesimu. Kalau kamu mau membagikan hasil skrining atau
            catatanmu, atur lewat <Link href="/privasi">Privasi dan izin</Link>.
          </li>
          <li>
            Tarif sesi {formatRupiah(fee)} tercatat sebagai informasi. Pembayaran belum tersedia di
            Mindra Web.
          </li>
          <li>
            Kamu bisa membatalkan dari halaman <Link href="/konsultasi">Konsultasi</Link> selama
            sesi belum dimulai.
          </li>
        </ul>
        <div>
          <Button href="/konsultasi" variant="secondary" size="sm">
            Lihat sesi kamu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="psychologistId" value={psychologistId} />

      <fieldset className="relative min-w-0">
        <legend className="mb-2 text-sm font-semibold text-fg-1">Pilih hari</legend>
        <div
          role="group"
          aria-label="Daftar hari"
          tabIndex={0}
          className="relative flex gap-2 overflow-x-auto pb-1"
        >
          {days.map((entry) => {
            const count = availableCount(entry);
            const id = `${dayId}-${entry.date}`;
            return (
              <div key={entry.date} className="flex-none">
                <input
                  type="radio"
                  id={id}
                  name="hari"
                  value={entry.date}
                  checked={date === entry.date}
                  onChange={() => {
                    setDate(entry.date);
                    setStartsAt('');
                  }}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  className={cn(
                    'touch-target grid min-h-14 min-w-[5.25rem] cursor-pointer content-center justify-items-center rounded-lg border-[1.5px] border-line-soft bg-raised px-3 py-2 text-center transition-colors duration-(--dur-fast)',
                    'peer-checked:border-biru-400 peer-checked:bg-biru-50 peer-focus-visible:shadow-[var(--glow-biru)] hover:border-biru-200',
                    count === 0 && 'text-fg-4',
                  )}
                >
                  <span className="text-sm font-semibold">
                    {formatShortDayId(`${entry.date}T12:00:00+07:00`)}
                  </span>
                  <span className="text-xs text-fg-3">
                    {count === 0 ? 'penuh' : `${count} jam`}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="relative min-w-0">
        <legend className="mb-2 text-sm font-semibold text-fg-1">Pilih jam (WIB)</legend>
        {day && day.slots.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {day.slots.map((slot) => {
              const id = `${slotId}-${slot.startsAt}`;
              const unavailable = slot.state !== 'available';
              return (
                <div key={slot.startsAt}>
                  <input
                    type="radio"
                    id={id}
                    name="startsAt"
                    value={slot.startsAt}
                    disabled={unavailable}
                    checked={startsAt === slot.startsAt}
                    onChange={() => setStartsAt(slot.startsAt)}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor={id}
                    className={cn(
                      'touch-target inline-flex min-h-11 min-w-[4.5rem] cursor-pointer items-center justify-center rounded-pill border-[1.5px] border-line-soft bg-raised px-4 text-sm font-medium text-fg-1 num',
                      'transition-colors duration-(--dur-fast) hover:border-biru-200',
                      'peer-checked:border-biru-500 peer-checked:bg-biru-500 peer-checked:text-white peer-focus-visible:shadow-[var(--glow-biru)]',
                      'peer-disabled:cursor-not-allowed peer-disabled:bg-sunken peer-disabled:text-fg-4 peer-disabled:line-through',
                    )}
                  >
                    {slot.label}
                    {unavailable ? (
                      <span className="sr-only"> ({STATE_NOTE[slot.state]})</span>
                    ) : null}
                  </label>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="body-m">Psikolog ini tidak punya jadwal di hari itu. Pilih hari lain.</p>
        )}
      </fieldset>

      {selected ? (
        <div className="rounded-lg bg-biru-50 px-4 py-3.5 text-sm text-biru-900">
          <p className="font-semibold">{describeSession(selected.startsAt)}</p>
          <p className="mt-0.5">
            Dengan {psychologistName}. Tarif per sesi {formatRupiah(fee)}; pembayaran belum tersedia
            di Mindra Web.
          </p>
        </div>
      ) : null}

      {state.status === 'error' && state.message ? (
        <Alert tone="error" role="alert" compact>
          <p className="text-sm">{state.message}</p>
        </Alert>
      ) : null}

      <div>
        <Button type="submit" loading={pending} disabled={!selected}>
          <CalendarCheck aria-hidden />
          Pesan sesi
        </Button>
      </div>
    </form>
  );
}
