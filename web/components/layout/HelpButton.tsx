'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lifebuoy, Phone } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { IconButton } from '@/components/ui/IconButton';
import { CRISIS_RESOURCES, crisisCallLabel } from '@/lib/domain/crisis/resources';
import { cn } from '@/lib/utils/cn';

interface HelpButtonProps {
  /** `sidebar` = blok merah muda di sidebar desktop; `icon` = tombol ikon di topbar mobile. */
  variant: 'sidebar' | 'icon';
  className?: string;
}

const LABEL = 'Butuh bantuan sekarang';

/**
 * Pintasan bantuan krisis yang selalu terjangkau. Membuka dialog berisi kontak dari
 * lib/domain/crisis/resources.ts (sumber tunggal) — tanpa perpindahan halaman, jadi tidak
 * bisa tersesat atau gagal dimuat saat orang sedang panik.
 */
export function HelpButton({ variant, className }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md bg-danger-50 p-3 text-left',
            'text-sm font-semibold text-danger-700 transition-colors duration-(--dur-fast) hover:bg-danger-100',
            className,
          )}
        >
          <Lifebuoy aria-hidden weight="duotone" className="size-5 shrink-0" />
          {LABEL}
        </button>
      ) : (
        <IconButton label={LABEL} tone="danger" onClick={() => setOpen(true)} className={className}>
          <Lifebuoy weight="duotone" />
        </IconButton>
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={LABEL}
        description="Kalau kamu sedang dalam bahaya atau berpikir untuk menyakiti diri, jangan tunggu. Ada yang siap mendengar."
      >
        <ul className="grid gap-4">
          {CRISIS_RESOURCES.map((resource) => (
            <li key={resource.id} className="rounded-lg bg-danger-50 p-4">
              <p className="font-semibold text-danger-900">
                {resource.name} · {resource.displayNumber}
              </p>
              <p className="mt-1 text-sm text-danger-900">
                {resource.description} Tersedia {resource.availability}.
              </p>
              <Button variant="crisis" href={resource.telHref} className="mt-3">
                <Phone aria-hidden />
                {crisisCallLabel(resource)}
              </Button>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-fg-2">
          Butuh menenangkan diri dulu? Ada{' '}
          <Link href="/bantuan">latihan napas, grounding, dan panduan menemani orang lain</Link>,
          serta <Link href="/layanan-terdekat">layanan kesehatan terdekat</Link>.
        </p>
      </Dialog>
    </>
  );
}
