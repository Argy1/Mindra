import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { isDevPagesEnabled } from '@/lib/utils/dev-pages';

export const metadata: Metadata = {
  title: 'Pratinjau',
  robots: { index: false, follow: false },
};

// Evaluasi gerbang per request (bukan dipanggang saat build), supaya ENABLE_DEV_PAGES yang
// diatur saat runtime berlaku sama dengan middleware.ts dan tidak ada rute /dev yang "terpanggang" 404.
export const dynamic = 'force-dynamic';

/**
 * Lapisan kedua gerbang /dev/* (lapisan pertama: middleware.ts). 404 di produksi kecuali
 * ENABLE_DEV_PAGES=true.
 */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (!isDevPagesEnabled()) notFound();
  return children;
}
