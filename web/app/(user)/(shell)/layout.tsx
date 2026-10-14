import type { ReactNode } from 'react';
import { FontSizeApplier } from '@/components/features/profile/FontSizeApplier';
import { PortalShell } from '@/components/layout/PortalShell';
import { requireRole } from '@/lib/auth/session';
import { getFontSizePreference } from '@/lib/server/profile';

/**
 * Halaman pengguna dengan kerangka aplikasi. Peran diperiksa dari database (requireRole di sini dan oleh
 * PortalShell; hasilnya di-cache per permintaan). Preferensi ukuran teks pengguna diterapkan ke seluruh halaman.
 */
export default async function UserShellLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole('user');
  const fontSize = await getFontSizePreference(profile.id);

  return (
    <PortalShell role="user">
      <FontSizeApplier size={fontSize} />
      {children}
    </PortalShell>
  );
}
