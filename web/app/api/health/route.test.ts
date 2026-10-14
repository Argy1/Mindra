// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const select = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => ({ select: () => ({ limit: select }) }) }),
}));

import { GET } from './route';

const URL_VALUE = 'https://rahasia-proyek.supabase.co';
const KEY_VALUE = 'kunci-anon-rahasia-yang-cukup-panjang';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_VALUE);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', KEY_VALUE);
});
afterEach(() => {
  vi.unstubAllEnvs();
  select.mockReset();
});

async function call() {
  const response = await GET();
  return { response, body: await response.json() };
}

describe('GET /api/health', () => {
  it('database menjawab → 200 { data: { status: "ok" }, error: null }', async () => {
    select.mockResolvedValue({ error: null });
    const { response, body } = await call();
    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.status).toBe('ok');
    expect(new Date(body.data.time).toString()).not.toBe('Invalid Date');
  });

  it('tidak boleh di-cache oleh CDN/monitor (selalu hasil terbaru)', async () => {
    select.mockResolvedValue({ error: null });
    expect((await call()).response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('RLS menolak anon (42501) justru bukti database sehat → 200', async () => {
    select.mockResolvedValue({ error: { code: '42501' } });
    expect((await call()).response.status).toBe(200);
  });

  it('galat database lain → 503 database_unreachable dalam format { data, error }', async () => {
    select.mockResolvedValue({ error: { code: 'PGRST205' } });
    const { response, body } = await call();
    expect(response.status).toBe(503);
    expect(body).toEqual({
      data: null,
      error: { code: 'database_unreachable', message: 'Database tidak menjawab.' },
    });
  });

  it('jaringan putus (melempar) → 503, bukan 500', async () => {
    select.mockRejectedValue(new Error('fetch failed'));
    expect((await call()).response.status).toBe(503);
  });

  it('belum dikonfigurasi → 503 not_configured tanpa menyentuh database', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    const { response, body } = await call();
    expect(response.status).toBe(503);
    expect(body.error.code).toBe('not_configured');
    expect(select).not.toHaveBeenCalled();
  });

  it('respons TIDAK PERNAH memuat URL/kunci atau detail galat internal', async () => {
    select.mockRejectedValue(new Error(`gagal menghubungi ${URL_VALUE} dengan ${KEY_VALUE}`));
    const { body } = await call();
    const text = JSON.stringify(body);
    expect(text).not.toContain('rahasia');
    expect(text).not.toContain('gagal menghubungi');
  });
});
