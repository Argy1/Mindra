import type { Metadata } from 'next';
import { MfaSecurityView } from '@/components/features/security/MfaSecurityView';
import { requireRole } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Keamanan akun' };

interface PageProps {
  searchParams: Promise<{ wajib?: string | string[] }>;
}

/** Di luar gerbang MFA: tujuan admin yang belum memasang TOTP (lihat MfaSecurityView). */
export default async function KeamananPage({ searchParams }: PageProps) {
  await requireRole('admin');
  const params = await searchParams;
  const required = (Array.isArray(params.wajib) ? params.wajib[0] : params.wajib) === '1';

  return (
    <MfaSecurityView
      role="admin"
      required={required}
      intro="Akunmu menyetujui akun psikolog, jadi akunmu memakai verifikasi dua langkah: kata sandi dan kode dari aplikasi autentikator."
      requiredNotice="Pasang verifikasi dua langkah dulu. Antrean peninjauan baru bisa kamu buka setelah langkah ini selesai."
    />
  );
}
