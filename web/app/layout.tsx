import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { siteUrl } from '@/lib/env/public';
import { cn } from '@/lib/utils/cn';
import './globals.css';

// Font di-host sendiri oleh next/font (diunduh saat build, disajikan dari domain kita):
// tidak ada permintaan ke Google saat pengguna membuka halaman — penting untuk privasi.
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
  display: 'swap',
});

// Hanya untuk <code>/<kbd>; tidak perlu dipramuat di setiap halaman.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Mindra — Ruang aman untuk perasaanmu',
    template: '%s · Mindra',
  },
  description:
    'Mindra menemanimu mengenali perasaan setiap hari. Kalau kamu mau, catatanmu bisa dibagikan ke psikolog, keluarga, dan layanan kesehatan. Kamu yang memegang kuncinya.',
  applicationName: 'Mindra',
};

// Tanpa `maximumScale`/`userScalable`: pengguna harus bisa memperbesar halaman (WCAG 1.4.4).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F8F7F5',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="id"
      className={cn(plusJakarta.variable, instrumentSerif.variable, jetbrainsMono.variable)}
    >
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
