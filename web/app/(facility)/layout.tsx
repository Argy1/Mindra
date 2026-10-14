import type { ReactNode } from 'react';
import { PortalShell } from '@/components/layout/PortalShell';

// Portal berisi data per pengguna: JANGAN pernah diprerender. Tanpa ini, build di lingkungan tanpa
// env Supabase menyimpulkan halaman statis dan "memanggang" redirect('/masuk') ke hasilnya.
export const dynamic = 'force-dynamic';

/** Portal peran `facility_admin`: peran diperiksa dari database sebelum apa pun dirender. */
export default function FaskesLayout({ children }: { children: ReactNode }) {
  return <PortalShell role="facility_admin">{children}</PortalShell>;
}
