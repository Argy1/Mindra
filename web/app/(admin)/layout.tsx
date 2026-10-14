import type { ReactNode } from 'react';
import { PortalShell } from '@/components/layout/PortalShell';

// Portal berisi data per pengguna: JANGAN pernah diprerender (lihat catatan di app/(facility)/layout.tsx).
export const dynamic = 'force-dynamic';

/** Portal peran `admin`: peran diperiksa dari database sebelum apa pun dirender. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <PortalShell role="admin">{children}</PortalShell>;
}
