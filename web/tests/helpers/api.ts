import { vi } from 'vitest';
import type { ApiClientRecord, AuthDeps } from '@/lib/api/auth';
import type { RouteDeps } from '@/lib/api/handler';
import { createMemoryLimiter } from '@/lib/api/ratelimit';
import { createFakeSupabase } from '@/tests/helpers/fake-supabase';

/** Perlengkapan tes rute API: kredensial palsu, pembatas laju memori, dan klien Supabase palsu. */

export const USER_ID = '11111111-1111-4111-8111-111111111111';
export const TOKEN = 'aaaa.bbbb.cccc';

export interface ApiTestKit {
  deps: RouteDeps;
  supabase: ReturnType<typeof createFakeSupabase>;
  auth: AuthDeps & { findApiClient: ReturnType<typeof vi.fn> };
}

export function makeKit(
  options: {
    supabase?: ReturnType<typeof createFakeSupabase>;
    clients?: Record<string, ApiClientRecord>;
  } = {},
): ApiTestKit {
  const supabase = options.supabase ?? createFakeSupabase();
  const clients = options.clients ?? {};
  const auth = {
    verifyToken: vi.fn(async (token: string) => (token === TOKEN ? { userId: USER_ID } : null)),
    createUserClient: vi.fn(() => supabase.client as never),
    findApiClient: vi.fn(async (hash: string) => clients[hash] ?? null),
    touchApiClient: vi.fn(async () => undefined),
  };
  let counter = 0;
  return {
    supabase,
    auth,
    deps: {
      auth,
      limiter: createMemoryLimiter(() => 1_700_000_000_000),
      newRequestId: () => `req-test-${(counter += 1)}`,
    },
  };
}

export const bearer = (path: string, init: RequestInit = {}) =>
  new Request(`http://localhost${path}`, {
    ...init,
    headers: { authorization: `Bearer ${TOKEN}`, ...(init.headers as Record<string, string>) },
  });

export const jsonBody = (path: string, body: unknown, method = 'POST') =>
  bearer(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

export const parse = async (response: Response) =>
  (await response.json()) as Record<string, unknown> & {
    data?: unknown;
    error?: { code: string; message: string; issues?: Array<{ path: string; message: string }> };
    meta?: { nextCursor: string | null };
  };
