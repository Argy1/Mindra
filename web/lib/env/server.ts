import 'server-only';
import { z } from 'zod';

/**
 * Secret yang HANYA boleh ada di server (CLAUDE.md). `server-only` membuat build gagal bila
 * berkas ini terimpor dari komponen klien, sehingga secret tidak bisa bocor ke bundel browser.
 * Tidak pernah memakai awalan NEXT_PUBLIC_.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
  });
  if (parsed.success) return parsed.data;
  const names = parsed.error.issues.map((issue) => issue.path.join('.'));
  throw new Error(`Variabel lingkungan server belum diisi: ${names.join(', ')}`);
}
