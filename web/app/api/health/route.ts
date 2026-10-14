import { NextResponse } from 'next/server';
import { readPublicEnv } from '@/lib/env/public';
import { createClient } from '@supabase/supabase-js';

/**
 * Pemeriksaan kesehatan untuk uptime monitor (docs/ARCHITECTURE.md §9) — sekaligus menjaga proyek
 * Supabase free tier tidak "tertidur". Publik, tanpa data pengguna, tanpa detail internal.
 * Format respons sama dengan API v1: { data, error }.
 */
export const dynamic = 'force-dynamic';

const HEADERS = { 'Cache-Control': 'no-store' } as const;

export async function GET() {
  const env = readPublicEnv();
  if (!env.ok) {
    return NextResponse.json(
      {
        data: null,
        error: { code: 'not_configured', message: 'Konfigurasi database belum lengkap.' },
      },
      { status: 503, headers: HEADERS },
    );
  }

  try {
    // Kunci anon + RLS: permintaan ini tidak bisa membaca satu baris pun, tetapi membuktikan
    // bahwa PostgREST dan Postgres menjawab.
    const supabase = createClient(
      env.env.NEXT_PUBLIC_SUPABASE_URL,
      env.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { error } = await supabase
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    // 42501 = RLS/hak menolak anon: database menjawab, itu sehat. Hanya galat jaringan/server yang gagal.
    if (error && error.code !== '42501' && error.code !== 'PGRST301') throw new Error(error.code);
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'database_unreachable', message: 'Database tidak menjawab.' } },
      { status: 503, headers: HEADERS },
    );
  }

  return NextResponse.json(
    { data: { status: 'ok', time: new Date().toISOString() }, error: null },
    { status: 200, headers: HEADERS },
  );
}
