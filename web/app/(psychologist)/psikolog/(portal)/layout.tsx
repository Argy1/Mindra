import type { ReactNode } from 'react';
import { requireMfaPsychologist } from '@/lib/auth/mfa-server';

/**
 * Gerbang MFA untuk semua halaman data klien (/psikolog, /psikolog/klien/...). Halaman keamanan dan
 * verifikasi sengaja berada di luar grup ini: itulah tujuan redirect bagi sesi yang belum aal2.
 * Setiap halaman juga memanggil requireMfaPsychologist() sendiri; layout dan halaman dirender
 * bersamaan, jadi gerbang di layout saja tidak cukup mencegah pembacaan data lebih dulu.
 */
export default async function PsychologistPortalLayout({ children }: { children: ReactNode }) {
  await requireMfaPsychologist();
  return children;
}
