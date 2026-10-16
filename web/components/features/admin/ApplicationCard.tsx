'use client';

import { useActionState, useEffect, useState } from 'react';
import { FormMessage } from '@/components/features/auth/FormMessage';
import { SubmitButton } from '@/components/features/auth/SubmitButton';
import { useFocusFirstError } from '@/components/features/auth/use-focus-first-error';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { reviewPsychologistAction } from '@/lib/admin/actions';
import { initialFormState, type FormState } from '@/lib/auth/form-state';
import { DEFAULT_TITLE, PRACTICE_DAYS, timeOptions } from '@/lib/domain/admin/review';
import type { PendingPsychologist } from '@/lib/server/admin';
import { formatDateId } from '@/lib/utils/date';

/** Menutup dialog dan memberi tahu lewat toast begitu keputusan tersimpan (kartunya sendiri hilang dari antrean). */
function useDoneNotice(state: FormState, onDone: () => void) {
  const { toast } = useToast();
  useEffect(() => {
    if (state.status !== 'success' || !state.message) return;
    toast({ title: 'Keputusan tersimpan', description: state.message, tone: 'success' });
    onDone();
    // Efek hanya bereaksi pada hasil baru; `toast` dan `onDone` stabil dalam praktik.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lihat komentar di atas
  }, [state]);
}

function ApproveDialog({
  applicant,
  open,
  onOpenChange,
}: {
  applicant: PendingPsychologist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction] = useActionState(reviewPsychologistAction, initialFormState);
  const formRef = useFocusFirstError(state);
  useDoneNotice(state, () => onOpenChange(false));
  const errors = state.fieldErrors ?? {};
  // Setelah galat, isian dikembalikan server (React 19 mengosongkan kolom tak-terkendali setelah setiap aksi).
  const kept = state.status === 'error' ? state.values : undefined;
  const text = (key: string, fallback: string) => kept?.[key] ?? fallback;
  const keptDays = kept ? new Set(kept.days?.split(',').filter(Boolean)) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Setujui ${applicant.name}`}
      description="Periksa nomor STR dan izin praktiknya di sumber resmi dulu. Setelah disetujui, ia tampil di direktori psikolog dan bisa dipesan."
      className="max-w-2xl"
    >
      <form ref={formRef} action={formAction} noValidate className="grid gap-4">
        <input type="hidden" name="decision" value="approve" />
        <input type="hidden" name="profileId" value={applicant.id} />
        <FormMessage state={state} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="fullName"
            label="Nama di direktori"
            defaultValue={text('fullName', applicant.name)}
            error={errors.fullName}
            required
          />
          <Input
            name="title"
            label="Gelar"
            optional
            defaultValue={text('title', DEFAULT_TITLE)}
            error={errors.title}
          />
          <Input
            name="strNumber"
            label="Nomor STR"
            autoComplete="off"
            defaultValue={text('strNumber', applicant.strNumber ?? '')}
            error={errors.strNumber}
            helper={
              applicant.strNumber
                ? 'Diisi pemohon saat mendaftar. Cocokkan dengan sumber resmi sebelum menyetujui.'
                : 'Pemohon tidak mengisi nomor STR saat mendaftar. Isi setelah kamu memeriksanya.'
            }
            required
          />
          <Input
            name="fee"
            label="Tarif per sesi (Rp)"
            inputMode="numeric"
            defaultValue={text('fee', '150000')}
            error={errors.fee}
            required
          />
        </div>

        <Input
          name="specializations"
          label="Spesialisasi"
          optional
          defaultValue={text('specializations', '')}
          helper="Pisahkan dengan koma, mis. Kecemasan, Tidur, Stres kerja."
          error={errors.specializations}
        />

        <fieldset className="grid gap-2 border-0 p-0" aria-invalid={errors.days ? true : undefined}>
          <legend className="mb-1 text-sm font-semibold text-fg-1">
            Hari praktik <span className="font-normal text-fg-3">(opsional)</span>
          </legend>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {PRACTICE_DAYS.map((day) => (
              <label
                key={day.value}
                className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-fg-2"
              >
                <input
                  type="checkbox"
                  name="days"
                  value={day.value}
                  defaultChecked={
                    keptDays ? keptDays.has(String(day.value)) : day.value >= 1 && day.value <= 5
                  }
                  className="size-5 cursor-pointer accent-biru-600"
                />
                {day.label}
              </label>
            ))}
          </div>
          {errors.days ? (
            <p className="text-sm font-medium text-danger-700">{errors.days}</p>
          ) : null}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            name="start"
            label="Jam mulai (WIB, 24 jam)"
            defaultValue={text('start', '09:00')}
            error={errors.start}
          >
            {timeOptions(kept?.start).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Select
            name="end"
            label="Jam selesai (WIB, 24 jam)"
            defaultValue={text('end', '15:00')}
            error={errors.end}
          >
            {timeOptions(kept?.end).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
        <p className="-mt-2 meta">
          Satu sesi 50 menit pada kisi 60 menit dari jam mulai. Hari dan jam bisa diubah nanti lewat
          basis data; kosongkan hari bila belum ingin menerima pesanan.
        </p>

        <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm text-fg-2">
          <input
            type="checkbox"
            name="verified"
            defaultChecked={kept?.verified === 'on'}
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-biru-600"
          />
          <span>
            Saya sudah memeriksa nomor STR dan izin praktiknya. Tampilkan lencana terverifikasi di
            direktori.
          </span>
        </label>

        <div className="flex flex-wrap justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <div className="min-w-40">
            <SubmitButton>Setujui akun</SubmitButton>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function RejectDialog({
  applicant,
  open,
  onOpenChange,
}: {
  applicant: PendingPsychologist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction] = useActionState(reviewPsychologistAction, initialFormState);
  useDoneNotice(state, () => onOpenChange(false));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Tolak permintaan ${applicant.name}?`}
      description="Pemohon tetap memakai akun pengguna biasa dan tidak diberi tahu alasannya lewat Mindra. Keputusan ini tercatat."
    >
      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="decision" value="reject" />
        <input type="hidden" name="profileId" value={applicant.id} />
        <FormMessage state={state} />
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <div className="min-w-40">
            <SubmitButton>Tolak permintaan</SubmitButton>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

/** Satu pemohon akun psikolog: ringkasan dan dua keputusan. */
export function ApplicationCard({ applicant }: { applicant: PendingPsychologist }) {
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);

  return (
    <Card as="article" aria-label={`Permintaan ${applicant.name}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Avatar name={applicant.name} tone="biru" />
        <div className="min-w-0 flex-1 basis-56">
          <h3 className="font-semibold text-fg-1">{applicant.name}</h3>
          <p className="meta break-all">{applicant.email}</p>
          <p className="meta">
            {applicant.strNumber ? `STR dari pemohon: ${applicant.strNumber}` : 'STR belum diisi'}
          </p>
          <p className="meta">
            Mengajukan{' '}
            {formatDateId(new Date(applicant.createdAt), {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setMode('approve')}>
            Tinjau dan setujui
            <span className="sr-only"> {applicant.name}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-danger-700"
            onClick={() => setMode('reject')}
          >
            Tolak
            <span className="sr-only"> {applicant.name}</span>
          </Button>
        </div>
      </div>

      <ApproveDialog
        applicant={applicant}
        open={mode === 'approve'}
        onOpenChange={(open) => setMode(open ? 'approve' : null)}
      />
      <RejectDialog
        applicant={applicant}
        open={mode === 'reject'}
        onOpenChange={(open) => setMode(open ? 'reject' : null)}
      />
    </Card>
  );
}
