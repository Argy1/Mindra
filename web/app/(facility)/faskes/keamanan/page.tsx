import type { Metadata } from 'next';
import { MfaSecurityView } from '@/components/features/security/MfaSecurityView';
import { MFA_ENROLLED_PARAM } from '@/lib/auth/mfa';
import { requireRole } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Keamanan akun' };

interface PageProps {
  searchParams: Promise<{ wajib?: string | string[]; berhasil?: string | string[] }>;
}

/** Di luar gerbang MFA: tujuan admin faskes yang belum memasang TOTP (lihat MfaSecurityView). */
export default async function KeamananPage({ searchParams }: PageProps) {
  await requireRole('facility_admin');
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const required = first(params.wajib) === '1';
  const justEnrolled = first(params[MFA_ENROLLED_PARAM]) === '1';

  return (
    <MfaSecurityView
      role="facility_admin"
      required={required}
      justEnrolled={justEnrolled}
      intro="Akunmu membuka angka wilayah dan mengelola kunci API, jadi akunmu memakai verifikasi dua langkah: kata sandi dan kode dari aplikasi autentikator."
      requiredNotice="Pasang verifikasi dua langkah dulu. Dasbor dan kunci API baru bisa kamu buka setelah langkah ini selesai."
    />
  );
}
