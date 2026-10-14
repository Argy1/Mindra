import type { MetadataRoute } from 'next';
import { PORTAL_PREFIXES } from '@/lib/auth/route-access';
import { siteUrl } from '@/lib/env/public';

/**
 * Hanya halaman publik yang boleh diindeks. Portal berlogin, API, dan halaman pratinjau
 * pengembang (/dev) tidak punya isi untuk mesin pencari.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/tentang', '/kebijakan-privasi', '/syarat-penggunaan', '/developers'],
      // Portal berlogin diambil dari sumber yang sama dengan guard rute, jadi portal baru otomatis tertutup.
      disallow: ['/api/', '/dev/', '/auth/', '/atur-sandi', ...PORTAL_PREFIXES],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
