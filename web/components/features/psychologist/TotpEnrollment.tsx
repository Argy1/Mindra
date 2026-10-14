'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { groupTotpSecret, TOTP_LENGTH, totpCodeSchema } from '@/lib/validation/mfa';

interface TotpEnrollmentProps {
  /** `first` = pendaftaran pertama (wajib) lalu masuk portal; `backup` = menambah perangkat cadangan. */
  mode: 'first' | 'backup';
  /** Tujuan setelah pendaftaran pertama selesai (beranda portal sesuai peran). */
  redirectTo?: string;
}

type Step =
  | { name: 'idle' }
  | { name: 'scan'; factorId: string; qr: string; secret: string }
  | { name: 'done' };

const WRONG_CODE =
  'Kode tidak cocok. Periksa kode terbaru di aplikasi autentikatormu, lalu coba lagi.';
const TOO_MANY = 'Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.';
const GENERIC = 'Belum bisa menyelesaikan pendaftaran. Periksa koneksimu, lalu coba lagi.';

/**
 * Mendaftarkan aplikasi autentikator (TOTP) lewat Supabase Auth, langsung dari browser: secret dibuat
 * Supabase dan hanya ditampilkan sekali di sini; server Mindra tidak pernah melihat secret maupun kode.
 * Percobaan yang ditinggalkan (faktor belum terverifikasi) dibersihkan dulu supaya tidak menumpuk.
 */
export function TotpEnrollment({ mode, redirectTo = '/psikolog' }: TotpEnrollmentProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: 'idle' });
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const existing = await supabase.auth.mfa.listFactors();
      for (const factor of existing.data?.all ?? []) {
        if (factor.factor_type === 'totp' && factor.status === 'unverified') {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Mindra',
        friendlyName: `Perangkat ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
      });
      if (enrollError || !data) {
        setError(GENERIC);
        return;
      }
      setStep({
        name: 'scan',
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch {
      setError(GENERIC);
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step.name !== 'scan') return;
    const parsed = totpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? WRONG_CODE);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: step.factorId,
        code: parsed.data,
      });
      if (verifyError) {
        setError(verifyError.status === 429 ? TOO_MANY : WRONG_CODE);
        setCode('');
        return;
      }
      setStep({ name: 'done' });
      if (mode === 'first') router.replace(redirectTo);
      router.refresh();
    } catch {
      setError(GENERIC);
    } finally {
      setBusy(false);
    }
  }

  if (step.name === 'done') {
    return (
      <Alert tone="success" role="status" compact>
        <p className="text-sm">
          {mode === 'first'
            ? 'Verifikasi dua langkah aktif. Mengarahkanmu ke ringkasan klien.'
            : 'Perangkat cadangan ditambahkan.'}
        </p>
      </Alert>
    );
  }

  if (step.name === 'idle') {
    return (
      <div className="grid justify-items-start gap-3">
        <Button onClick={start} loading={busy}>
          {mode === 'first' ? 'Mulai pasang verifikasi' : 'Tambah perangkat cadangan'}
        </Button>
        {error ? (
          <p role="alert" className="text-sm font-medium text-danger-700">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={verify} noValidate className="grid gap-6">
      <ol className="grid gap-5">
        <li className="grid gap-3">
          <p className="body-m">
            <strong className="text-fg-1">1. Pindai kode QR</strong> dengan aplikasi autentikator
            (Google Authenticator, Authy, atau sejenisnya).
          </p>
          <div className="grid justify-items-start gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <Image
              src={step.qr}
              alt="Kode QR untuk aplikasi autentikator"
              width={176}
              height={176}
              unoptimized
              className="rounded-lg border border-line-soft bg-white p-2"
            />
            <div className="min-w-0">
              <p className="text-sm text-fg-2">
                Tidak bisa memindai? Ketik kode ini di aplikasimu:
              </p>
              <p
                className="mt-1 font-mono text-base font-semibold tracking-wider break-all text-fg-1"
                data-testid="totp-secret"
              >
                {groupTotpSecret(step.secret)}
              </p>
            </div>
          </div>
        </li>
        <li className="grid gap-3">
          <p className="body-m">
            <strong className="text-fg-1">2. Masukkan kode {TOTP_LENGTH} angka</strong> yang tampil
            di aplikasi.
          </p>
          <Input
            name="code"
            label="Kode verifikasi"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={TOTP_LENGTH + 1}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            error={error ?? undefined}
            wrapperClassName="max-w-xs"
          />
        </li>
      </ol>
      <div>
        <Button type="submit" loading={busy}>
          Verifikasi dan aktifkan
        </Button>
      </div>
    </form>
  );
}
