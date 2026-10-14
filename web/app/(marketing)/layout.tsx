import type { ReactNode } from 'react';
import { CrisisBand } from '@/components/layout/CrisisBand';
import { MarketingFooter } from '@/components/layout/MarketingFooter';
import { MarketingHeader } from '@/components/layout/MarketingHeader';
import { SkipLink } from '@/components/layout/SkipLink';

/** Kerangka halaman publik: landing, tentang, kebijakan privasi. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <MarketingHeader />
      <main id="isi" tabIndex={-1} className="focus-visible:shadow-none focus-visible:outline-none">
        {children}
      </main>
      <CrisisBand />
      <MarketingFooter />
    </>
  );
}
