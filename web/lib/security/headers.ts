import { buildCsp, type CspOptions } from './csp';

export interface HeaderEntry {
  key: string;
  value: string;
}

/**
 * Header keamanan untuk SEMUA respons (dipasang di next.config.ts).
 * Dipisah ke fungsi murni supaya isinya bisa diuji tanpa menjalankan Next.
 */
export function securityHeaders(options: CspOptions): HeaderEntry[] {
  const headers: HeaderEntry[] = [
    { key: 'Content-Security-Policy', value: buildCsp(options) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    // geolocation=(self) untuk "faskes terdekat"; perangkat lain tidak dibutuhkan web.
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()',
    },
    // Cadangan untuk browser lama yang belum mengerti CSP frame-ancestors.
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
  ];

  // HSTS hanya bermakna lewat HTTPS; jangan dikirim saat pengembangan.
  if (!options.isDev) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains',
    });
  }
  return headers;
}
