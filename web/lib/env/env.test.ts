import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicEnv, readPublicEnv, siteUrl } from './public';

const VALID_KEY = 'x'.repeat(40);

function setEnv(values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('readPublicEnv', () => {
  it('lengkap dan valid → ok, dengan SITE_URL bawaan localhost', () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: VALID_KEY,
      NEXT_PUBLIC_SITE_URL: '',
    });
    const result = readPublicEnv();
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.env.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
  });

  it('kosong → tidak ok, menyebut NAMA variabel yang kurang', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' });
    const result = readPublicEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const text = result.problems.join(' ');
      expect(text).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(text).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
  });

  it('URL produksi harus https; http hanya untuk jaringan lokal', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: VALID_KEY });
    for (const url of [
      'http://localhost:54321',
      'http://127.0.0.1:54321',
      'http://192.168.137.72:54321',
    ]) {
      setEnv({ NEXT_PUBLIC_SUPABASE_URL: url });
      expect(readPublicEnv().ok, url).toBe(true);
    }
    for (const url of ['http://abc.supabase.co', 'ftp://abc.supabase.co', 'bukan-url']) {
      setEnv({ NEXT_PUBLIC_SUPABASE_URL: url });
      expect(readPublicEnv().ok, url).toBe(false);
    }
  });

  it('kunci yang terlalu pendek ditolak', () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'pendek',
    });
    expect(readPublicEnv().ok).toBe(false);
  });

  it('NILAI tidak pernah ikut dicetak di pesan masalah (hanya nama dan alasan)', () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'http://rahasia-host.example',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'kunci-rahasia',
    });
    const result = readPublicEnv();
    expect(JSON.stringify(result)).not.toMatch(/rahasia-host|kunci-rahasia/);
  });
});

describe('getPublicEnv', () => {
  it('melempar galat yang bisa ditindaklanjuti bila belum dikonfigurasi', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' });
    expect(() => getPublicEnv()).toThrow(/\.env\.example/);
  });
});

describe('siteUrl', () => {
  it('memakai NEXT_PUBLIC_SITE_URL tanpa garis miring di ujung', () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: 'https://mindra.example.id/' });
    expect(siteUrl()).toBe('https://mindra.example.id');
    setEnv({ NEXT_PUBLIC_SITE_URL: 'https://mindra.example.id///' });
    expect(siteUrl()).toBe('https://mindra.example.id');
  });

  it('kosong atau bukan URL → localhost, bukan alamat karangan', () => {
    for (const value of ['', 'bukan-url', 'mindra.example.id']) {
      setEnv({ NEXT_PUBLIC_SITE_URL: value });
      expect(siteUrl(), value).toBe('http://localhost:3000');
    }
  });

  it('tidak melempar walau variabel Supabase belum diisi (halaman publik tetap bisa dibangun)', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' });
    expect(() => siteUrl()).not.toThrow();
  });
});
