import 'server-only';
import { createClient } from '@/lib/supabase/server';

/** Pembacaan untuk halaman /faskes/kunci-api (klien sesi admin faskes, RLS). */

export interface ManagedFacility {
  id: string;
  name: string;
  city: string;
  province: string;
}

export interface ApiKeyRow {
  id: string;
  name: string;
  /** 8 karakter acak; tampilan penuh lewat `displayApiKeyPrefix`. */
  prefix: string;
  facilityId: string | null;
  facilityName: string | null;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface ApiKeyOverview {
  facilities: ManagedFacility[];
  keys: ApiKeyRow[];
}

export async function getApiKeyOverview(userId: string): Promise<ApiKeyOverview> {
  const supabase = await createClient();
  const [memberships, keys] = await Promise.all([
    supabase
      .from('facility_admins')
      .select('facility_id, facilities(id, name, city, province)')
      .eq('profile_id', userId),
    supabase
      .from('api_clients')
      .select('id, name, key_prefix, facility_id, scopes, created_at, last_used_at, revoked_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  if (memberships.error || keys.error) throw new Error('Gagal memuat kunci API.');

  const facilities = (memberships.data ?? []).flatMap((row) =>
    row.facilities
      ? [
          {
            id: row.facilities.id,
            name: row.facilities.name,
            city: row.facilities.city,
            province: row.facilities.province,
          },
        ]
      : [],
  );
  const nameById = new Map(facilities.map((facility) => [facility.id, facility.name]));

  return {
    facilities,
    keys: (keys.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      prefix: row.key_prefix,
      facilityId: row.facility_id,
      facilityName: row.facility_id ? (nameById.get(row.facility_id) ?? null) : null,
      scopes: row.scopes,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      revokedAt: row.revoked_at,
    })),
  };
}
