import type { Metadata } from 'next';
import { SignOutButton } from '@/components/features/auth/SignOutButton';

export const metadata: Metadata = { title: 'Akunmu belum lengkap' };

/**
 * Tujuan darurat bila akun login ada tetapi baris profilnya hilang. Tanpa halaman ini pengguna
 * akan terpental antara /masuk dan berandanya tanpa akhir. Sengaja sederhana dan bisa diakses
 * saat sudah masuk.
 */
export default function BrokenAccountPage() {
  return (
    <>
      <h1 className="display-3">Akunmu belum lengkap.</h1>
      <p className="mt-2 body-m">
        Kami belum menemukan profil untuk akun ini. Keluar dulu, lalu masuk lagi. Kalau masih
        begini, hubungi pengelola Mindra.
      </p>
      <div className="mt-6 flex items-center gap-2">
        <SignOutButton />
        <span className="text-sm text-fg-3">Keluar</span>
      </div>
    </>
  );
}
