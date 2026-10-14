import { z } from 'zod';

/**
 * Variabel lingkungan yang BOLEH sampai ke browser (awalan NEXT_PUBLIC_). Tidak ada secret di sini:
 * kunci anon aman karena akses data dijaga RLS, bukan kerahasiaan kunci.
 */
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/;

const supabaseUrl = z.url({ error: 'harus berupa URL, mis. https://abcdefgh.supabase.co' }).refine(
  (value) => {
    // Zod tetap menjalankan refine walau pemeriksaan z.url() sudah gagal, jadi nilai di sini BISA
    // bukan URL. new URL() yang melempar di sini akan menjatuhkan middleware untuk SETIAP permintaan.
    try {
      const url = new URL(value);
      return (
        url.protocol === 'https:' || (url.protocol === 'http:' && LOCAL_HOST.test(url.hostname))
      );
    } catch {
      return false;
    }
  },
  { error: 'harus memakai https (http hanya untuk localhost)' },
);

/**
 * Alamat produksi bawaan Vercel (tanpa protokol), mis. `mindra-web.vercel.app` atau domain khusus bila ada. Dipakai HANYA
 * di deployment produksi dan HANYA bila `NEXT_PUBLIC_SITE_URL` tidak diisi, supaya sitemap dan tautan di email (konfirmasi
 * pendaftaran, atur ulang sandi) tidak mengarah ke localhost ketika variabel itu terlewat. Nilai yang bukan nama host yang
 * wajar ditolak. `NEXT_PUBLIC_VERCEL_*` (otomatis dari Vercel) ikut dibaca agar nilainya tertanam di bundel klien.
 */
function vercelProductionUrl(): string | undefined {
  const isProduction =
    (process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV) === 'production';
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
    '';
  if (!isProduction || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(host) || !host.includes('.')) {
    return undefined;
  }
  return `https://${host}`;
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, { error: 'terlalu pendek untuk kunci Supabase' }),
  NEXT_PUBLIC_SITE_URL: z.url().default('http://localhost:3000'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export type PublicEnvResult = { ok: true; env: PublicEnv } | { ok: false; problems: string[] };

/**
 * PENTING: akses `process.env.NEXT_PUBLIC_X` harus literal agar Next.js menanamkan nilainya di
 * bundel klien. Itu sebabnya objek ini ditulis eksplisit, bukan memakai process.env[nama].
 */
export function readPublicEnv(): PublicEnvResult {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || vercelProductionUrl(),
  });

  if (parsed.success) return { ok: true, env: parsed.data };

  // Hanya NAMA variabel dan alasannya; nilai tidak pernah ikut dicetak.
  const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  return { ok: false, problems };
}

const DEFAULT_SITE_URL = 'http://localhost:3000';

/**
 * Alamat publik situs tanpa garis miring di ujung. Tidak melempar bila variabel Supabase belum
 * lengkap: halaman publik (landing, robots, sitemap) tetap harus bisa dibangun. Nilai tidak
 * valid jatuh ke localhost, bukan ke alamat karangan.
 */
export function siteUrl(): string {
  const parsed = z.url().safeParse(process.env.NEXT_PUBLIC_SITE_URL || vercelProductionUrl());
  return (parsed.success ? parsed.data : DEFAULT_SITE_URL).replace(/\/+$/, '');
}

/** Untuk kode yang tidak boleh jalan tanpa Supabase. Memberi pesan galat yang bisa ditindaklanjuti. */
export function getPublicEnv(): PublicEnv {
  const result = readPublicEnv();
  if (result.ok) return result.env;
  throw new Error(
    `Konfigurasi Supabase belum lengkap. Salin .env.example menjadi .env.local lalu isi: ${result.problems.join('; ')}`,
  );
}
