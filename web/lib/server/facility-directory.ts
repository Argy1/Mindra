import 'server-only';
import type { DirectoryFacility } from '@/lib/domain/faskes/nearest';
import { readPublicEnv } from '@/lib/env/public';
import { createClient } from '@/lib/supabase/server';

/** Batas baris yang dikirim ke peramban; direktori nasional pun jauh di bawah ini untuk satu tahap awal. */
export const DIRECTORY_LIMIT = 1000;

export type DirectoryResult = { ok: true; facilities: DirectoryFacility[] } | { ok: false };

/**
 * Direktori layanan kesehatan jiwa untuk halaman publik "Layanan terdekat". Datanya publik menurut RLS
 * (`Facilities are public`, anon dan authenticated boleh baca), jadi pengunjung yang belum masuk pun dilayani.
 * Hanya kolom yang tampil yang dibaca. Galat apa pun menghasilkan `ok: false` tanpa pesan database.
 */
export async function listFacilityDirectory(): Promise<DirectoryResult> {
  if (!readPublicEnv().ok) return { ok: false };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('facilities')
      .select('id, name, type, city, province, address, phone, lat, lng')
      .eq('has_mental_health_service', true)
      .order('province')
      .order('city')
      .order('name')
      .limit(DIRECTORY_LIMIT);
    if (error) return { ok: false };
    return { ok: true, facilities: data ?? [] };
  } catch {
    return { ok: false };
  }
}
