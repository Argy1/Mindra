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

  describe('cadangan alamat produksi Vercel (bila NEXT_PUBLIC_SITE_URL terlewat)', () => {
    const production = {
      VERCEL_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: 'mindra-web.vercel.app',
    };

    it('deployment produksi tanpa SITE_URL: memakai alamat produksi Vercel (https)', () => {
      setEnv({ NEXT_PUBLIC_SITE_URL: '', ...production });
      expect(siteUrl()).toBe('https://mindra-web.vercel.app');
    });

    it('SITE_URL yang diisi selalu menang atas cadangan', () => {
      setEnv({ NEXT_PUBLIC_SITE_URL: 'https://mindra.example.id', ...production });
      expect(siteUrl()).toBe('https://mindra.example.id');
    });

    it.each(['preview', 'development', ''])(
      'lingkungan %j: tidak dipakai (hanya produksi)',
      (vercelEnv) => {
        setEnv({ NEXT_PUBLIC_SITE_URL: '', ...production, VERCEL_ENV: vercelEnv });
        expect(siteUrl()).toBe('http://localhost:3000');
      },
    );

    it.each([
      '',
      'bukan host',
      'host-tanpa-titik',
      'a.com/path',
      'a.com:3000',
      'javascript:alert(1)',
      '-a.com',
      'a.com-',
    ])('nilai host %j ditolak, jatuh ke localhost', (host) => {
      setEnv({
        NEXT_PUBLIC_SITE_URL: '',
        VERCEL_ENV: 'production',
        VERCEL_PROJECT_PRODUCTION_URL: host,
      });
      expect(siteUrl()).toBe('http://localhost:3000');
    });

    it('readPublicEnv ikut memakai cadangan sehingga tautan email tidak ke localhost', () => {
      setEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: VALID_KEY,
        NEXT_PUBLIC_SITE_URL: '',
        ...production,
      });
      const result = readPublicEnv();
      expect(result).toMatchObject({ ok: true });
      if (result.ok) expect(result.env.NEXT_PUBLIC_SITE_URL).toBe('https://mindra-web.vercel.app');
    });

    it('variabel NEXT_PUBLIC_VERCEL_* dibaca juga (tertanam di bundel klien)', () => {
      setEnv({
        NEXT_PUBLIC_SITE_URL: '',
        VERCEL_ENV: '',
        VERCEL_PROJECT_PRODUCTION_URL: '',
        NEXT_PUBLIC_VERCEL_ENV: 'production',
        NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: 'mindra-web.vercel.app',
      });
      expect(siteUrl()).toBe('https://mindra-web.vercel.app');
    });
  });
});
