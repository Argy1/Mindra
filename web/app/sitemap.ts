import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env/public';

/** Hanya halaman publik; sama dengan yang diizinkan di app/robots.ts. */
const PUBLIC_PATHS = [
  '/',
  '/tentang',
  '/kebijakan-privasi',
  '/syarat-penggunaan',
  '/developers',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PUBLIC_PATHS.map((path) => ({
    url: path === '/' ? base : `${base}${path}`,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.6,
  }));
}
