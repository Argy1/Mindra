'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { SHELL_NAV, type ShellRole } from '@/components/layout/nav-config';
import { Sidebar, type ShellBadges, type ShellUser } from '@/components/layout/Sidebar';
import { SkipLink } from '@/components/layout/SkipLink';
import { Topbar } from '@/components/layout/Topbar';
import { cn } from '@/lib/utils/cn';

export interface AppShellProps {
  /** Menentukan isi navigasi (lihat nav-config.tsx). */
  role: ShellRole;
  user: ShellUser;
  /** Slot kiri topbar, mis. tanggal hari ini. */
  topbarStart?: ReactNode;
  /** Slot kanan topbar, mis. <IconButton label="Notifikasi">. */
  topbarActions?: ReactNode;
  /** Lencana angka per item navigasi (kunci = href). */
  badges?: ShellBadges;
  /** `reading` = lebar 720px untuk asesmen/chat/artikel; bawaan `content` = 1120px dasbor. */
  width?: 'content' | 'reading';
  /** Timpa path aktif (bawaan: path URL saat ini). Berguna untuk pratinjau dan tes. */
  currentPath?: string;
  children: ReactNode;
}

/**
 * Kerangka aplikasi sesudah masuk: sidebar 256px di desktop (≥ 961px), bottom nav 5 item di
 * mobile, topbar lengket, dan <main id="isi"> sebagai sasaran skip link.
 * Mengikuti design/app-beranda.html. Komponen klien hanya karena membaca path untuk
 * `aria-current`; isi halaman (children) tetap bisa berupa Server Component.
 */
export function AppShell({
  role,
  user,
  topbarStart,
  topbarActions,
  badges,
  width = 'content',
  currentPath,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const path = currentPath ?? pathname ?? '';
  const nav = SHELL_NAV[role];

  return (
    <>
      <SkipLink />
      <div className="min-h-dvh shell:grid shell:grid-cols-[var(--sidebar-w)_minmax(0,1fr)]">
        <Sidebar nav={nav} currentPath={path} user={user} badges={badges} />

        <div className="min-w-0">
          <Topbar start={topbarStart} actions={topbarActions} showHelp={nav.showHelp} />
          <main
            id="isi"
            tabIndex={-1}
            className={cn(
              'mx-auto w-full px-gutter pt-2 pb-16 max-shell:pb-28',
              'focus-visible:shadow-none focus-visible:outline-none',
              width === 'reading' ? 'max-w-reading' : 'max-w-content',
            )}
          >
            {children}
          </main>
        </div>
      </div>
      <BottomNav items={nav.bottom} currentPath={path} />
    </>
  );
}
