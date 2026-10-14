import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Logo } from '@/components/layout/Logo';

/** Naskah hukum berasal dari ketentuan aplikasi mobile (docs/terms_of_service.md), disesuaikan untuk web. */
const FOOTER_LINKS = [
  { href: '/tentang', label: 'Tentang' },
  { href: '/kebijakan-privasi', label: 'Kebijakan privasi' },
  { href: '/syarat-penggunaan', label: 'Syarat penggunaan' },
  { href: '/developers', label: 'API' },
] as const;

/** Footer halaman marketing (design/landing.html `footer.mk`). */
export function MarketingFooter() {
  return (
    <footer className="py-12 pb-16 text-sm text-fg-4">
      <Container className="flex flex-wrap justify-between gap-6">
        <Logo size="sm" />
        <nav aria-label="Footer" className="flex flex-wrap gap-6">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-fg-3 no-underline hover:text-fg-1"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p>Mindra adalah alat skrining dan pendamping, bukan pengganti diagnosis profesional.</p>
      </Container>
    </footer>
  );
}
