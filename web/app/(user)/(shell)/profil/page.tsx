import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ProfileView } from '@/components/features/profile/ProfileView';
import { requireRole } from '@/lib/auth/session';
import { getKnownCities, getProfileDetails } from '@/lib/server/profile';

export const metadata: Metadata = { title: 'Profil' };

export default async function ProfilPage() {
  const profile = await requireRole('user');
  const [details, knownCities] = await Promise.all([
    getProfileDetails(profile.id),
    getKnownCities(),
  ]);
  // Profil yang baru saja dibaca sesi tetapi tidak terbaca di sini: akun bermasalah, bukan halaman kosong.
  if (!details) redirect('/akun-bermasalah');

  return <ProfileView details={details} knownCities={knownCities} />;
}
