import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm';

export const metadata: Metadata = { title: 'Buat kata sandi baru' };

/** Tujuan tautan pemulihan di email (lewat /auth/callback). Middleware mensyaratkan sesi. */
export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="display-3">Buat kata sandi baru.</h1>
      <p className="mt-2 body-m">Pilih kata sandi yang belum pernah kamu pakai di tempat lain.</p>
      <div className="mt-6">
        <ResetPasswordForm />
      </div>
    </>
  );
}
