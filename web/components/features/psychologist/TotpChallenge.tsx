'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { TOTP_LENGTH, totpCodeSchema } from '@/lib/validation/mfa';

const WRONG_CODE =
  'Kode tidak cocok. Periksa kode terbaru di aplikasi autentikatormu, lalu coba lagi.';
const TOO_MANY = 'Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.';
const GENERIC = 'Belum bisa memverifikasi. Periksa koneksimu, lalu coba lagi.';

/** Verifikasi dua langkah saat masuk: kode TOTP dikirim langsung ke Supabase Auth, sesi naik ke aal2. */
export function TotpChallenge({
  factorId,
  redirectTo = '/psikolog',
}: {
  factorId: string;
  /** Tujuan setelah sesi naik ke aal2 (beranda portal sesuai peran). */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Halaman ini hanya punya satu tujuan: fokus langsung ke kolom kode (bukan atribut autoFocus).
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        factorId,
        code: parsed.data,
      });
      if (verifyError) {
        setError(verifyError.status === 429 ? TOO_MANY : WRONG_CODE);
        setCode('');
        return;
      }
      // Tombol tetap berputar selama dasbor dimuat (bisa beberapa detik), bukan kembali tampak siap.
      startNavigation(() => {
        router.replace(redirectTo);
        router.refresh();
      });
    } catch {
      setError(GENERIC);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid max-w-sm gap-5">
      <Input
        name="code"
        label="Kode verifikasi"
        helper={`Kode ${TOTP_LENGTH} angka dari aplikasi autentikatormu.`}
        inputMode="numeric"
        autoComplete="one-time-code"
        ref={inputRef}
        maxLength={TOTP_LENGTH + 1}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        error={error ?? undefined}
      />
      <Button type="submit" loading={busy || navigating}>
        Verifikasi
      </Button>
    </form>
  );
}
