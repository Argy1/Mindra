import type { ReactNode } from 'react';
import { SignOutButton } from '@/components/features/auth/SignOutButton';
import { AppShell } from '@/components/layout/AppShell';
import type { ShellRole } from '@/components/layout/nav-config';
import { ROLE_LABEL } from '@/lib/auth/roles';
import { requireRole } from '@/lib/auth/session';
import { formatDateId } from '@/lib/utils/date';

interface PortalShellProps {
  role: ShellRole;
  width?: 'content' | 'reading';
  children: ReactNode;
}

/**
 * Kerangka setiap portal berperan: memeriksa peran dari DATABASE (requireRole) sebelum merender
 * apa pun, lalu membungkus halaman dengan AppShell dan tombol keluar.
 */
export async function PortalShell({ role, width, children }: PortalShellProps) {
  const profile = await requireRole(role);

  return (
    <AppShell
      role={role}
      width={width ?? 'content'}
      user={{ name: profile.name, roleLabel: ROLE_LABEL[profile.role] }}
      topbarStart={<p>{formatDateId(new Date())}</p>}
      topbarActions={<SignOutButton />}
    >
      {children}
    </AppShell>
  );
}
