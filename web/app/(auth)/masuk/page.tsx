import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/features/auth/LoginForm';
import { CALLBACK_ERRORS } from '@/lib/auth/errors';
import { safeNextPath } from '@/lib/auth/next-path';

export const metadata: Metadata = { title: 'Masuk' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // `next` disaring di server; nilai yang tidak aman menjadi kosong (lalu diganti beranda perannya).
  const next = typeof params.next === 'string' ? safeNextPath(params.next, '') : '';
  const notice = typeof params.galat === 'string' ? CALLBACK_ERRORS[params.galat] : undefined;

  return (
    <>
      <h1 className="display-3">Selamat datang kembali.</h1>
      <p className="mt-2 body-m">Masuk untuk melanjutkan.</p>
      <div className="mt-6">
        <LoginForm next={next || undefined} notice={notice} />
      </div>
      <p className="mt-6 text-center text-sm">
        Belum punya akun? <Link href="/daftar">Daftar</Link>
      </p>
    </>
  );
}
