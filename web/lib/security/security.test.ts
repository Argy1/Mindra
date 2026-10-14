import { describe, expect, it } from 'vitest';
import { buildCsp, buildCspDirectives, supabaseOrigins } from './csp';
import { securityHeaders } from './headers';

const SUPABASE = 'https://abcdefgh.supabase.co';

describe('supabaseOrigins', () => {
  it('https → https + wss', () => {
    expect(supabaseOrigins(SUPABASE)).toEqual({
      http: [SUPABASE],
      ws: ['wss://abcdefgh.supabase.co'],
    });
  });

  it('http lokal → http + ws, tanpa path', () => {
    expect(supabaseOrigins('http://192.168.1.5:54321/rest/v1')).toEqual({
      http: ['http://192.168.1.5:54321'],
      ws: ['ws://192.168.1.5:54321'],
    });
  });

  it('kosong atau rusak → tidak ada asal tambahan', () => {
    expect(supabaseOrigins(undefined)).toEqual({ http: [], ws: [] });
    expect(supabaseOrigins('bukan url')).toEqual({ http: [], ws: [] });
  });
});

describe('CSP', () => {
  const prod = buildCspDirectives({ supabaseUrl: SUPABASE, isDev: false });

  it('menutup vektor utama: tanpa objek, tanpa bingkai, <base> dan form hanya same-origin', () => {
    expect(prod['object-src']).toEqual(["'none'"]);
    expect(prod['frame-ancestors']).toEqual(["'none'"]);
    expect(prod['base-uri']).toEqual(["'self'"]);
    expect(prod['form-action']).toEqual(["'self'"]);
    expect(prod['default-src']).toEqual(["'self'"]);
  });

  it('koneksi hanya ke diri sendiri + Supabase (HTTP dan WebSocket Realtime)', () => {
    expect(prod['connect-src']).toEqual(["'self'", SUPABASE, 'wss://abcdefgh.supabase.co']);
  });

  it("produksi TIDAK memakai 'unsafe-eval'; pengembangan memakainya (React Refresh)", () => {
    expect(prod['script-src']).not.toContain("'unsafe-eval'");
    expect(buildCspDirectives({ isDev: true })['script-src']).toContain("'unsafe-eval'");
  });

  it('tidak ada wildcard sumber skrip dan tidak ada sumber http: di produksi', () => {
    const csp = buildCsp({ supabaseUrl: SUPABASE, isDev: false });
    expect(csp).not.toMatch(/script-src[^;]*\*/);
    expect(csp).not.toMatch(/http:\/\//);
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('pengembangan tidak memaksa HTTPS (localhost berjalan di http)', () => {
    expect(buildCsp({ isDev: true })).not.toContain('upgrade-insecure-requests');
  });

  it('direktif dipisah titik koma dan tidak ada nilai kosong', () => {
    const csp = buildCsp({ supabaseUrl: SUPABASE, isDev: false });
    for (const part of csp.split('; '))
      expect(part.trim().split(' ').length).toBeGreaterThanOrEqual(1);
    expect(csp).not.toMatch(/;;|\s;/);
  });
});

describe('securityHeaders', () => {
  const headers = (isDev: boolean) =>
    Object.fromEntries(
      securityHeaders({ supabaseUrl: SUPABASE, isDev }).map((h) => [h.key, h.value]),
    );

  it('semua header yang diwajibkan docs/ARCHITECTURE.md §8 ada', () => {
    const h = headers(false);
    expect(h['Strict-Transport-Security']).toMatch(/max-age=\d{8,}/);
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['Permissions-Policy']).toContain('camera=()');
    expect(h['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(h['X-Frame-Options']).toBe('DENY');
  });

  it('kamera dan mikrofon dimatikan; lokasi hanya untuk situs sendiri', () => {
    const policy = headers(false)['Permissions-Policy']!;
    expect(policy).toContain('microphone=()');
    expect(policy).toContain('geolocation=(self)');
  });

  it('HSTS hanya di produksi', () => {
    expect(headers(false)['Strict-Transport-Security']).toBeDefined();
    expect(headers(true)['Strict-Transport-Security']).toBeUndefined();
  });

  it('tidak ada header ganda', () => {
    const keys = securityHeaders({ isDev: false }).map((h) => h.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
