import type { ReactNode } from 'react';
import { HelpButton } from '@/components/layout/HelpButton';

interface TopbarProps {
  /** Sisi kiri: tanggal, judul halaman, atau indikator "Terhubung langsung". */
  start?: ReactNode;
  /** Sisi kanan: ikon notifikasi, kolom cari, tombol unduh, dll. */
  actions?: ReactNode;
  /** Tombol bantuan krisis versi ikon. Hanya tampil di mobile (di desktop ada di sidebar). */
  showHelp: boolean;
}

/** Bilah atas lengket 72px dengan latar krem buram (design/ui.css `.topbar`). */
export function Topbar({ start, actions, showHelp }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-topbar items-center justify-between gap-4 bg-canvas/82 px-gutter backdrop-blur-[20px] backdrop-saturate-120">
      <div className="min-w-0 text-sm text-fg-3">{start}</div>
      <div className="flex items-center gap-2">
        {showHelp ? <HelpButton variant="icon" className="shell:hidden" /> : null}
        {actions}
      </div>
    </header>
  );
}
