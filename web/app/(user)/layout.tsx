import type { ReactNode } from 'react';

// Portal berisi data per pengguna: JANGAN pernah diprerender. Tanpa ini, build di lingkungan tanpa
// env Supabase menyimpulkan halaman statis dan "memanggang" redirect('/masuk') ke hasilnya.
export const dynamic = 'force-dynamic';

/**
 * Portal peran `user`. Dibagi dua grup rute menurut kerangkanya:
 *   (shell)  beranda, jurnal, daftar skrining, hasil: di dalam AppShell (sidebar / bottom nav)
 *   (focus)  pengisian skrining: mode fokus tanpa navigasi (design/app-asesmen.html state 1)
 * Pemeriksaan peran dilakukan oleh layout masing-masing grup.
 */
export default function UserPortalLayout({ children }: { children: ReactNode }) {
  return children;
}
