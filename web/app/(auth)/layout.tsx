import Link from 'next/link';
import type { ReactNode } from 'react';
import { Container } from '@/components/layout/Container';
import { Logo } from '@/components/layout/Logo';
import { SkipLink } from '@/components/layout/SkipLink';

/** Kerangka halaman masuk/daftar: kartu tengah 440px di atas krem (docs/DESIGN.md). */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <header>
        <Container className="flex h-20 items-center">
          <Link href="/" aria-label="Mindra, beranda" className="rounded-md">
            <Logo size="lg" />
          </Link>
        </Container>
      </header>
      <main
        id="isi"
        tabIndex={-1}
        className="mx-auto w-full max-w-[27.5rem] px-gutter pt-4 pb-16 focus-visible:shadow-none focus-visible:outline-none"
      >
        <div className="rounded-xl bg-raised p-8 shadow-md max-sm:p-6">{children}</div>
        <p className="mt-6 text-center meta">
          Mindra adalah alat skrining dan pendamping, bukan pengganti diagnosis profesional.
        </p>
      </main>
    </>
  );
}
