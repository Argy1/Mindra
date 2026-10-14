'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Phone } from '@phosphor-icons/react/ssr';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { crisisCallLabel, PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';

interface CrisisBannerProps {
  title: string;
  /** Penjelasan singkat, hangat, tanpa menghakimi. */
  children: ReactNode;
  /** Tombol tambahan setelah tombol kontak utama, mis. "Kabari psikolog". */
  actions?: ReactNode;
  /** Catatan kecil di bawah tombol, mis. "Psikologmu sudah menerima pemberitahuan." */
  footnote?: string;
  /** Pindahkan fokus ke banner saat muncul (bawaan: ya). */
  focusOnMount?: boolean;
}

/**
 * Banner krisis (design/app-asesmen.html state 2). `role="alert"` supaya diumumkan segera,
 * dan menerima fokus saat muncul. Tombol panggilan utama SELALU diambil dari
 * lib/domain/crisis/resources.ts — nomor tidak pernah ditulis di sini.
 */
export function CrisisBanner({
  title,
  children,
  actions,
  footnote,
  focusOnMount = true,
}: CrisisBannerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // preventScroll: banner selalu elemen pertama di halaman. Tanpa ini browser bisa menggulirkan
    // halaman sehingga sebagian banner terlewat dari layar.
    if (focusOnMount) ref.current?.focus({ preventScroll: true });
  }, [focusOnMount]);

  return (
    <Alert
      ref={ref}
      tone="crisis"
      role="alert"
      tabIndex={-1}
      title={title}
      className="focus-visible:outline-offset-4"
    >
      <div className="mt-1.5">{children}</div>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <Button variant="crisis" href={PRIMARY_CRISIS_RESOURCE.telHref}>
          <Phone aria-hidden />
          {crisisCallLabel()}
        </Button>
        {actions}
      </div>
      {footnote ? <p className="mt-3 meta text-danger-700">{footnote}</p> : null}
    </Alert>
  );
}
