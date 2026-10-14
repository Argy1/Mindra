import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api/errors';
import { hashApiKey, isApiKeyFormat, type ApiScope } from '@/lib/api/keys';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Autentikasi API v1. Dua jenis kredensial, tidak pernah dicampur dan TIDAK PERNAH dari cookie
 * (tidak ada CSRF karena peramban tidak mengirim `Authorization` atau `X-API-Key` secara otomatis):
 *   - `Authorization: Bearer <token akses Supabase>`: pengguna; semua kueri berjalan di bawah RLS.
 *   - `X-API-Key: mk_live_...`: sistem mitra; di-hash lalu dicocokkan ke `api_clients`.
 * Semua kegagalan menjawab SAMA (401 unauthorized) supaya penyerang tidak bisa membedakan "token salah",
 * "kunci dicabut", dan "kunci tidak ada".
 */

export interface UserPrincipal {
  kind: 'user';
  userId: string;
  /** Klien Supabase yang membawa token pengguna: RLS menentukan apa yang terbaca. */
  supabase: SupabaseClient<Database>;
}

export interface ApiKeyPrincipal {
  kind: 'apiKey';
  clientId: string;
  facilityId: string | null;
  scopes: readonly ApiScope[];
  keyPrefix: string;
}

export interface AnonymousPrincipal {
  kind: 'anonymous';
}

export type Principal = UserPrincipal | ApiKeyPrincipal | AnonymousPrincipal;

export interface ApiClientRecord {
  id: string;
  facilityId: string | null;
  scopes: readonly ApiScope[];
  keyPrefix: string;
}

export interface AuthDeps {
  /** Memvalidasi token ke server Auth; null bila tidak valid/kedaluwarsa. */
  verifyToken(token: string): Promise<{ userId: string } | null>;
  createUserClient(token: string): SupabaseClient<Database>;
  /** Mencari klien API berdasarkan hash kunci; null bila tidak ada atau SUDAH DICABUT. */
  findApiClient(hash: string): Promise<ApiClientRecord | null>;
  /** Mencatat pemakaian terakhir (boleh gagal diam-diam). */
  touchApiClient(id: string): Promise<void>;
}

const UNAUTHORIZED = () => new ApiError('unauthorized');

/** Token JWT: tiga segmen base64url, panjang wajar. Pemeriksaan murah sebelum menelepon server Auth. */
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
const MAX_TOKEN_LENGTH = 4096;

export function extractBearerToken(headers: Headers): string | null {
  const header = headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  const token = match?.[1];
  if (!token || token.length > MAX_TOKEN_LENGTH || !JWT_SHAPE.test(token)) return null;
  return token;
}

export async function authenticateBearer(headers: Headers, deps: AuthDeps): Promise<UserPrincipal> {
  const token = extractBearerToken(headers);
  if (!token) throw UNAUTHORIZED();

  const verified = await deps.verifyToken(token);
  if (!verified) throw UNAUTHORIZED();

  return { kind: 'user', userId: verified.userId, supabase: deps.createUserClient(token) };
}

export async function authenticateApiKey(
  headers: Headers,
  deps: AuthDeps,
  requiredScope?: ApiScope,
): Promise<ApiKeyPrincipal> {
  const key = headers.get('x-api-key')?.trim();
  if (!isApiKeyFormat(key)) throw UNAUTHORIZED();

  const client = await deps.findApiClient(hashApiKey(key));
  if (!client) throw UNAUTHORIZED();

  // Kunci valid tetapi tidak punya cakupan yang dibutuhkan: dikenal, jadi 403 (bukan 401).
  if (requiredScope && !client.scopes.includes(requiredScope)) {
    throw new ApiError('forbidden', `Kunci ini tidak memiliki cakupan ${requiredScope}.`);
  }

  void deps.touchApiClient(client.id).catch(() => undefined);
  return {
    kind: 'apiKey',
    clientId: client.id,
    facilityId: client.facilityId,
    scopes: client.scopes,
    keyPrefix: client.keyPrefix,
  };
}
