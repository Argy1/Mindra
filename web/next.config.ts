import path from 'node:path';
import type { NextConfig } from 'next';
import { securityHeaders } from './lib/security/headers';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Folder induk berisi proyek Flutter; kunci root agar Next tidak salah mendeteksi workspace.
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    // Impor ikon Phosphor per-ikon saja (paketnya berisi >1.500 ikon).
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          isDev: process.env.NODE_ENV !== 'production',
        }),
      },
    ];
  },
};

export default nextConfig;
