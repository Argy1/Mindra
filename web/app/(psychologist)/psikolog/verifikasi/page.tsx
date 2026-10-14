import type { Metadata } from 'next';
import { MfaVerifyView } from '@/components/features/security/MfaSecurityView';
import { requireRole } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Verifikasi dua langkah' };

/** Tujuan psikolog yang sudah punya faktor TOTP tetapi sesinya belum aal2. Di luar gerbang MFA. */
export default async function VerifikasiPage() {
  await requireRole('psychologist');
  return (
    <MfaVerifyView
      role="psychologist"
      intro="Masukkan kode dari aplikasi autentikatormu untuk membuka data klien."
    />
  );
}
