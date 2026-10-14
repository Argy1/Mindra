import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from '@/components/features/auth/RegisterForm';

export const metadata: Metadata = { title: 'Daftar' };

export default function RegisterPage() {
  return (
    <>
      <h1 className="display-3">Mulai dari satu langkah kecil.</h1>
      <p className="mt-2 body-m">Buat akun gratis. Datamu tetap kamu yang pegang.</p>
      <div className="mt-6">
        <RegisterForm />
      </div>
      <p className="mt-6 text-center text-sm">
        Sudah punya akun? <Link href="/masuk">Masuk</Link>
      </p>
    </>
  );
}
