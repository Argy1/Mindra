/**
 * Content-Security-Policy dibangun dari fungsi murni agar bisa diuji (tests/security).
 *
 * Trade-off yang disengaja: `script-src` memakai 'unsafe-inline'. Next.js menyisipkan skrip inline
 * untuk hidrasi; CSP berbasis NONCE menuntut render dinamis di setiap permintaan, yang meniadakan
 * halaman marketing statis di CDN (docs/ARCHITECTURE.md §9). Pertahanan XSS utamanya tetap:
 * React meng-escape keluaran, tanpa penyisipan HTML mentah, dan CSP ini membatasi tujuan koneksi,
 * bingkai, <base>, <form>, dan objek. Jalur peningkatan: nonce di middleware untuk rute berdata.
 */
export interface CspOptions {
  /** NEXT_PUBLIC_SUPABASE_URL; boleh kosong saat belum dikonfigurasi. */
  supabaseUrl?: string | undefined;
  /** Pengembangan membutuhkan 'unsafe-eval' (React Refresh) dan WebSocket HMR. */
  isDev: boolean;
}

type Directives = Record<string, string[]>;

export function supabaseOrigins(supabaseUrl: string | undefined): { http: string[]; ws: string[] } {
  if (!supabaseUrl) return { http: [], ws: [] };
  try {
    const url = new URL(supabaseUrl);
    const ws = new URL(url.origin);
    ws.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return { http: [url.origin], ws: [ws.origin] };
  } catch {
    return { http: [], ws: [] };
  }
}

export function buildCspDirectives({ supabaseUrl, isDev }: CspOptions): Directives {
  const supabase = supabaseOrigins(supabaseUrl);

  return {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    // Avatar dari Supabase Storage, ubin peta OpenStreetMap (Leaflet, Fase 4), data:/blob: untuk SVG & grafik.
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      ...supabase.http,
      'https://tile.openstreetmap.org',
      'https://*.tile.openstreetmap.org',
    ],
    'font-src': ["'self'", 'data:'],
    // Realtime (alert krisis) memakai WebSocket ke Supabase.
    'connect-src': [
      "'self'",
      ...supabase.http,
      ...supabase.ws,
      ...(isDev ? ['ws://localhost:*', 'http://localhost:*'] : []),
    ],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
}

export function buildCsp(options: CspOptions): string {
  const parts = Object.entries(buildCspDirectives(options)).map(
    ([name, values]) => `${name} ${values.join(' ')}`,
  );
  if (!options.isDev) parts.push('upgrade-insecure-requests');
  return parts.join('; ');
}
