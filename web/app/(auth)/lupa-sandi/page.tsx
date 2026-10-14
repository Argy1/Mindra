import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm';

export const metadata: Metadata = { title: 'Lupa kata sandi' };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="display-3">Lupa kata sandi?</h1>
      <p className="mt-2 body-m">
        Masukkan emailmu. Kami kirim tautan untuk membuat kata sandi baru.
      </p>
      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/masuk">Kembali ke halaman masuk</Link>
      </p>
    </>
  );
}
