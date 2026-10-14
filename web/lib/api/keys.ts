import { createHash, randomBytes } from 'node:crypto';

/**
 * Kunci API untuk sistem mitra (mis. dinas kesehatan yang menarik agregat anonim).
 *
 * Bentuk: `mk_live_` + 32 karakter base64url dari 24 byte acak CSPRNG (192 bit). Kunci utuh hanya
 * ditampilkan SEKALI saat dibuat; yang disimpan hanya SHA-256 (hex) dan 8 karakter acak pertama sebagai
 * pengenal. SHA-256 tanpa garam memadai karena kunci berentropi tinggi (bukan kata sandi buatan manusia),
 * dan memungkinkan pencarian indeks langsung berdasarkan hash.
 */
export const API_KEY_MARKER = 'mk_live_';
const RANDOM_LENGTH = 32;
export const API_KEY_PREFIX_LENGTH = 8;

/** Cakupan yang dikenal; sama dengan CHECK constraint `api_clients_scopes_known` di database. */
export const API_SCOPES = ['aggregates:read'] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export function isApiScope(value: unknown): value is ApiScope {
  return typeof value === 'string' && (API_SCOPES as readonly string[]).includes(value);
}

const FORMAT = new RegExp(`^${API_KEY_MARKER}[A-Za-z0-9_-]{${RANDOM_LENGTH}}$`);

/** Pemeriksaan bentuk murah SEBELUM menyentuh database, supaya tebakan sembarang tidak membebani. */
export function isApiKeyFormat(value: unknown): value is string {
  return typeof value === 'string' && FORMAT.test(value);
}

export interface GeneratedApiKey {
  /** Kunci utuh: tampilkan sekali, jangan disimpan. */
  key: string;
  /** 8 karakter acak setelah `mk_live_`; aman ditampilkan dan disimpan. */
  prefix: string;
  /** SHA-256 hex dari kunci utuh; inilah yang disimpan. */
  hash: string;
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

export function apiKeyPrefix(key: string): string {
  return key.slice(API_KEY_MARKER.length, API_KEY_MARKER.length + API_KEY_PREFIX_LENGTH);
}

export function generateApiKey(): GeneratedApiKey {
  const key = `${API_KEY_MARKER}${randomBytes(24).toString('base64url').slice(0, RANDOM_LENGTH)}`;
  return { key, prefix: apiKeyPrefix(key), hash: hashApiKey(key) };
}

/** Tampilan aman untuk daftar kunci: `mk_live_ab12cd34…`. */
export function displayApiKeyPrefix(prefix: string): string {
  return `${API_KEY_MARKER}${prefix}…`;
}
