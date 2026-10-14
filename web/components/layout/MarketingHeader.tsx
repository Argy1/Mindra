import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';

/** Tautan jangkar ke bagian landing. Awalan "/" supaya tetap benar dari halaman marketing lain. */
const NAV_LINKS = [
  { href: '/#cara-kerja', label: 'Cara kerja' },
  { href: '/#untuk-siapa', label: 'Untuk siapa' },
  { href: '/#privasi', label: 'Privasi' },
  { href: '/#developer', label: 'Developer' },
] as const;

/** Header halaman marketing (design/landing.html `.mk-header`). */
export function MarketingHeader() {
  return (
    <header>
      <Container className="flex h-20 items-center justify-between">
        <Link href="/" aria-label="Mindra, beranda" className="rounded-md">
          <Logo size="lg" />
        </Link>

        <nav aria-label="Utama" className="hidden gap-7 nav:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[0.9375rem] font-medium text-fg-2 no-underline hover:text-fg-1"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button href="/masuk" variant="ghost" size="sm">
            Masuk
          </Button>
          <Button href="/daftar" size="sm">
            Daftar gratis
          </Button>
        </div>
      </Container>
    </header>
  );
}
