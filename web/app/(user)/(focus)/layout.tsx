import type { ReactNode } from 'react';
import { SkipLink } from '@/components/layout/SkipLink';
import { requireRole } from '@/lib/auth/session';

/**
 * Mode fokus: tanpa sidebar atau bottom nav, supaya pengguna hanya melihat satu pertanyaan.
 * Peran tetap diperiksa dari database (lapisan kedua setelah middleware), sama seperti PortalShell.
 */
export default async function UserFocusLayout({ children }: { children: ReactNode }) {
  await requireRole('user');
  return (
    <>
      <SkipLink />
      {children}
    </>
  );
}
