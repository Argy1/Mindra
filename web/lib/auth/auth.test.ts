import { describe, expect, it } from 'vitest';
import { SHELL_NAV } from '@/components/layout/nav-config';
import { GENERIC_ERROR, mapAuthError } from './errors';
import { safeNextPath } from './next-path';
import { decideAccess, portalRoleFor } from './route-access';
import { ROLE_HOME, USER_ROLES, isUserRole } from './roles';

describe('peran', () => {
  it('daftar peran sama dengan CHECK profiles_role_check di migrasi', () => {
    expect([...USER_ROLES]).toEqual([
      'user',
      'psychologist',
      'caregiver',
      'facility_admin',
      'admin',
    ]);
  });

  it('isUserRole menolak nilai asing', () => {
    expect(isUserRole('psychologist')).toBe(true);
    expect(isUserRole('superadmin')).toBe(false);
    expect(isUserRole(undefined)).toBe(false);
    expect(isUserRole(1)).toBe(false);
  });

  it('beranda tiap peran sama dengan homeHref navigasi AppShell (tidak bisa menyimpang)', () => {
    for (const role of ['user', 'psychologist', 'caregiver', 'facility_admin'] as const) {
      expect(SHELL_NAV[role].homeHref, role).toBe(ROLE_HOME[role]);
    }
  });

  it('setiap item navigasi tiap peran berada di portal peran itu (guard rute dan menu sepakat)', () => {
    for (const role of ['user', 'psychologist', 'caregiver', 'facility_admin'] as const) {
      const hrefs = SHELL_NAV[role].groups.flatMap((g) => g.items.map((i) => i.href));
      for (const href of hrefs) {
        // Tautan umum (dokumentasi API) boleh di luar portal; selebihnya harus milik peran ini.
        const owner = portalRoleFor(href);
        if (owner !== null) expect(owner, `${role}: ${href}`).toBe(role);
      }
    }
  });
});

describe('safeNextPath: anti open redirect', () => {
  const FALLBACK = '/beranda';

  it.each([
    ['/beranda', '/beranda'],
    ['/asesmen/phq9', '/asesmen/phq9'],
    ['/jurnal?tab=tidur', '/jurnal?tab=tidur'],
    ['/psikolog/klien/123?x=1&y=2', '/psikolog/klien/123?x=1&y=2'],
  ])('menerima jalur lokal %s', (raw, expected) => {
    expect(safeNextPath(raw, FALLBACK)).toBe(expected);
  });

  it.each([
    ['//evil.com'],
    ['//evil.com/beranda'],
    ['/\\evil.com'],
    ['\\\\evil.com'],
    ['https://evil.com'],
    ['http://evil.com/beranda'],
    ['javascript:alert(1)'],
    ['data:text/html,x'],
    ['beranda'],
    ['/%0d%0aLocation:https://evil.com'],
    ['/beranda\u0000'],
    ['/beranda\n'],
    [' /beranda'],
    ['/' + 'a'.repeat(600)],
    [''],
  ])('menolak %j → fallback', (raw) => {
    expect(safeNextPath(raw, FALLBACK)).toBe(FALLBACK);
  });

  it('menolak null/undefined', () => {
    expect(safeNextPath(null, FALLBACK)).toBe(FALLBACK);
    expect(safeNextPath(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it('tidak mengembalikan pengguna ke halaman auth (putaran masuk → masuk)', () => {
    for (const path of ['/masuk', '/masuk?next=/x', '/daftar', '/lupa-sandi', '/masuk/sesuatu']) {
      expect(safeNextPath(path, FALLBACK), path).toBe(FALLBACK);
    }
  });

  it('jalur yang hanya mirip auth (/masukkan) tetap diterima', () => {
    expect(safeNextPath('/masukkan-data', FALLBACK)).toBe('/masukkan-data');
  });
});

describe('decideAccess: guard rute per peran', () => {
  const signedOut = { signedIn: false } as const;

  it('pengunjung ke portal manapun → /masuk dengan ?next= ter-encode', () => {
    const result = decideAccess({
      pathname: '/psikolog/klien/1',
      fullPath: '/psikolog/klien/1?a=b',
      ...signedOut,
    });
    expect(result).toEqual({
      kind: 'redirect',
      to: `/masuk?next=${encodeURIComponent('/psikolog/klien/1?a=b')}`,
    });
  });

  it('pengunjung ke halaman publik → boleh', () => {
    for (const pathname of [
      '/',
      '/tentang',
      '/kebijakan-privasi',
      '/developers',
      '/masuk',
      '/daftar',
      '/lupa-sandi',
    ]) {
      expect(decideAccess({ pathname, ...signedOut }), pathname).toEqual({ kind: 'allow' });
    }
  });

  it.each([
    ['user', '/beranda'],
    ['user', '/asesmen/phq9'],
    ['user', '/privasi'],
    ['psychologist', '/psikolog'],
    ['psychologist', '/psikolog/klien/9'],
    ['caregiver', '/pendamping/9'],
    ['facility_admin', '/faskes'],
    ['admin', '/admin/psikolog'],
  ] as const)('peran %s ke %s → boleh', (role, pathname) => {
    expect(decideAccess({ pathname, signedIn: true, role })).toEqual({ kind: 'allow' });
  });

  it.each([
    ['user', '/psikolog', '/beranda'],
    ['user', '/faskes', '/beranda'],
    ['psychologist', '/beranda', '/psikolog'],
    ['psychologist', '/faskes', '/psikolog'],
    ['caregiver', '/psikolog/klien/1', '/pendamping'],
    ['facility_admin', '/psikolog', '/faskes'],
    ['facility_admin', '/beranda', '/faskes'],
    ['user', '/admin', '/beranda'],
  ] as const)('peran %s ke %s (salah portal) → dipulangkan ke %s', (role, pathname, home) => {
    expect(decideAccess({ pathname, signedIn: true, role })).toEqual({
      kind: 'redirect',
      to: home,
    });
  });

  it('batas segmen: /faskes-lain BUKAN bagian portal /faskes', () => {
    expect(portalRoleFor('/faskes')).toBe('facility_admin');
    expect(portalRoleFor('/faskes/peta')).toBe('facility_admin');
    expect(portalRoleFor('/faskes-lain')).toBeNull();
    expect(portalRoleFor('/psikologi')).toBeNull();
  });

  it('yang sudah masuk tidak perlu melihat /masuk /daftar /lupa-sandi: dialihkan ke beranda perannya', () => {
    for (const pathname of ['/masuk', '/daftar', '/lupa-sandi']) {
      expect(decideAccess({ pathname, signedIn: true, role: 'psychologist' }), pathname).toEqual({
        kind: 'redirect',
        to: '/psikolog',
      });
    }
  });

  it('sesi lama tanpa klaim peran: tidak diblokir middleware (layout server memutuskan dari database)', () => {
    expect(decideAccess({ pathname: '/psikolog', signedIn: true })).toEqual({ kind: 'allow' });
    expect(decideAccess({ pathname: '/beranda', signedIn: true })).toEqual({ kind: 'allow' });
  });

  it('/atur-sandi: butuh sesi apa pun perannya', () => {
    expect(decideAccess({ pathname: '/atur-sandi', signedIn: true, role: 'user' })).toEqual({
      kind: 'allow',
    });
    expect(decideAccess({ pathname: '/atur-sandi', signedIn: false })).toEqual({
      kind: 'redirect',
      to: '/lupa-sandi',
    });
  });

  it('garis miring di akhir path tidak menghindari guard', () => {
    expect(decideAccess({ pathname: '/psikolog/', signedIn: false }).kind).toBe('redirect');
    expect(decideAccess({ pathname: '/psikolog/', signedIn: true, role: 'user' })).toEqual({
      kind: 'redirect',
      to: '/beranda',
    });
  });

  it('/auth/callback selalu boleh (tempat sesi dibuat)', () => {
    expect(decideAccess({ pathname: '/auth/callback', ...signedOut })).toEqual({ kind: 'allow' });
  });
});

describe('mapAuthError', () => {
  it('kredensial salah memakai pesan yang sama apa pun penyebabnya (tidak membocorkan akun)', () => {
    expect(mapAuthError({ code: 'invalid_credentials' })).toMatch(
      /Email atau kata sandi belum cocok/,
    );
  });

  it('kode dikenal → pesan Bahasa Indonesia dengan sapaan "kamu", tanpa tanda seru', () => {
    for (const code of [
      'email_not_confirmed',
      'over_request_rate_limit',
      'weak_password',
      'same_password',
    ]) {
      const message = mapAuthError({ code });
      expect(message).not.toBe(GENERIC_ERROR);
      expect(message).not.toMatch(/!|\banda\b/i);
    }
  });

  it('status 429 tanpa kode → pesan pembatasan laju', () => {
    expect(mapAuthError({ status: 429 })).toMatch(/Terlalu banyak/);
  });

  it('kode tak dikenal dan null → pesan umum; teks asli server tidak pernah dipantulkan', () => {
    expect(mapAuthError({ code: 'sesuatu_yang_aneh' })).toBe(GENERIC_ERROR);
    expect(mapAuthError(null)).toBe(GENERIC_ERROR);
    expect(mapAuthError({ code: 'db_password_is_hunter2' })).not.toMatch(/hunter2/);
  });
});
