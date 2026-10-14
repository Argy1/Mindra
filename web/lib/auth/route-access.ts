import { ROLE_HOME, type UserRole } from '@/lib/auth/roles';

/** Rute yang hanya boleh dibuka peran tertentu. Awalan dicocokkan per segmen (/faskes ≠ /faskes-lain). */
const PORTALS: ReadonlyArray<{ role: UserRole; prefixes: readonly string[] }> = [
  {
    role: 'user',
    prefixes: [
      '/beranda',
      '/asesmen',
      '/jurnal',
      '/teman-cerita',
      '/konsultasi',
      '/privasi',
      '/profil',
    ],
  },
  { role: 'psychologist', prefixes: ['/psikolog'] },
  { role: 'caregiver', prefixes: ['/pendamping'] },
  { role: 'facility_admin', prefixes: ['/faskes'] },
  { role: 'admin', prefixes: ['/admin'] },
];

/** Semua awalan rute berportal, datar. Dipakai app/robots.ts agar daftar yang ditutup dari mesin pencari tak menyimpang. */
export const PORTAL_PREFIXES: readonly string[] = PORTALS.flatMap((portal) => portal.prefixes);

/** Halaman untuk pengunjung yang BELUM masuk; yang sudah masuk dialihkan ke beranda perannya. */
const GUEST_ONLY = ['/masuk', '/daftar', '/lupa-sandi'] as const;

/** Butuh sesi apa pun peran (mis. membuat kata sandi baru dari tautan pemulihan). */
const ANY_SESSION = ['/atur-sandi'] as const;

export type RouteAccess = { kind: 'allow' } | { kind: 'redirect'; to: string };

const matches = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Peran yang berwenang atas `pathname`, atau null bila rute tidak dibatasi peran. */
export function portalRoleFor(pathname: string): UserRole | null {
  for (const portal of PORTALS) {
    if (portal.prefixes.some((prefix) => matches(pathname, prefix))) return portal.role;
  }
  return null;
}

export interface AccessInput {
  /** Path tanpa query. */
  pathname: string;
  /** Path + query asli, dipakai sebagai `?next=` agar pengguna kembali ke tempat tadi. */
  fullPath?: string;
  signedIn: boolean;
  /**
   * Peran dari klaim JWT (app_metadata.role). `undefined` = sesi lama tanpa klaim (dibuat sebelum
   * migrasi): jangan blokir di sini, biarkan layout server memeriksa peran dari tabel profiles.
   */
  role?: UserRole | undefined;
}

/**
 * Keputusan akses cepat untuk middleware (tanpa query DB). Ini LAPISAN PERTAMA saja; yang
 * mengamankan data adalah RLS, dan layout server memeriksa ulang peran dari `profiles`
 * (sumber kebenaran) lewat requireRole().
 */
export function decideAccess({ pathname, fullPath, signedIn, role }: AccessInput): RouteAccess {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const home = role ? ROLE_HOME[role] : ROLE_HOME.user;

  if (GUEST_ONLY.some((guest) => matches(path, guest))) {
    return signedIn ? { kind: 'redirect', to: home } : { kind: 'allow' };
  }

  if (ANY_SESSION.some((page) => matches(path, page))) {
    return signedIn ? { kind: 'allow' } : { kind: 'redirect', to: '/lupa-sandi' };
  }

  const required = portalRoleFor(path);
  if (required === null) return { kind: 'allow' };

  if (!signedIn) {
    const next = encodeURIComponent(fullPath ?? path);
    return { kind: 'redirect', to: `/masuk?next=${next}` };
  }
  if (role !== undefined && role !== required) return { kind: 'redirect', to: ROLE_HOME[role] };
  return { kind: 'allow' };
}
