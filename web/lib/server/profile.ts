import 'server-only';
import { canonicalProvince, type Province } from '@/lib/domain/region/provinces';
import { createClient } from '@/lib/supabase/server';
import { FONT_SIZES, type FontSize } from '@/lib/validation/profile';

/**
 * Pembacaan profil milik pemanggil sendiri (RLS membatasi ke barisnya). Hanya kolom yang dipakai halaman
 * Profil dan layar yang bergantung pada preferensi tampilan; kolom sensitif lain (mis. NIK terenkripsi)
 * tidak pernah dipilih.
 */

export interface ProfileDetails {
  id: string;
  name: string;
  email: string;
  city: string;
  /** Provinsi kanonik, atau '' bila belum diisi atau tidak dikenal. */
  province: Province | '';
  shareRegionStats: boolean;
  fontSize: FontSize;
  /** Permintaan peran yang sedang ditinjau admin (null bila tidak ada). */
  requestedRole: 'psychologist' | null;
}

const asFontSize = (value: unknown): FontSize =>
  (FONT_SIZES as readonly string[]).includes(value as string) ? (value as FontSize) : 'normal';

export async function getProfileDetails(userId: string): Promise<ProfileDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, name, email, city, domicile_province, share_region_stats, font_size_preference, requested_role',
    )
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    city: data.city ?? '',
    province: canonicalProvince(data.domicile_province) ?? '',
    shareRegionStats: data.share_region_stats === true,
    fontSize: asFontSize(data.font_size_preference),
    requestedRole: data.requested_role === 'psychologist' ? 'psychologist' : null,
  };
}

/** Preferensi ukuran teks saja (ringan; dipakai layout portal pengguna di setiap halaman). */
export async function getFontSizePreference(userId: string): Promise<FontSize> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('font_size_preference')
    .eq('id', userId)
    .maybeSingle();
  return asFontSize(data?.font_size_preference);
}

/** Permintaan peran psikolog yang masih menunggu tinjauan admin (null bila tidak ada). */
export async function getRequestedRole(userId: string): Promise<'psychologist' | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('requested_role')
    .eq('id', userId)
    .maybeSingle();
  return data?.requested_role === 'psychologist' ? 'psychologist' : null;
}

/** Nama kota yang sudah punya faskes (daftar saran untuk kolom kota; faskes bersifat publik). */
export async function getKnownCities(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('facilities').select('city').order('city').limit(500);
  return [...new Set((data ?? []).map((row) => row.city.trim()).filter(Boolean))];
}
