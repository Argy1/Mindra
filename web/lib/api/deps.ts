import 'server-only';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { AuthDeps } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/errors';
import type { HandlerDeps } from '@/lib/api/handler';
import { getRateLimiter } from '@/lib/api/ratelimit';
import { readPublicEnv } from '@/lib/env/public';
import { findApiClientByHash, touchApiClient } from '@/lib/server/api-clients';
import type { Database } from '@/lib/supabase/database.types';

/** Penyambungan produksi untuk `defineRoute`. Tes memakai tiruan, bukan berkas ini. */

function publicEnvOrThrow() {
  const env = readPublicEnv();
  if (!env.ok) throw new ApiError('not_configured');
  return env.env;
}

const NO_SESSION = { persistSession: false, autoRefreshToken: false } as const;

export const productionAuthDeps: AuthDeps = {
  async verifyToken(token) {
    const env = publicEnvOrThrow();
    const supabase = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: NO_SESSION },
    );
    // getUser memvalidasi ke server Auth (bukan sekadar membaca tanda tangan), jadi sesi yang sudah
    // dicabut atau pengguna yang dihapus langsung ditolak.
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return { userId: data.user.id };
  },

  createUserClient(token) {
    const env = publicEnvOrThrow();
    return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: NO_SESSION,
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  },

  findApiClient: findApiClientByHash,
  touchApiClient: (id) => touchApiClient(id),
};

export function getDefaultHandlerDeps(): HandlerDeps {
  return {
    auth: productionAuthDeps,
    limiter: getRateLimiter(),
    newRequestId: () => randomUUID(),
  };
}
