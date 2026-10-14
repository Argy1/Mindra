import { expect, test } from '@playwright/test';

/**
 * Alur autentikasi pada tingkat browser. Sengaja TIDAK mengirim formulir yang valid: itu akan
 * memanggil Supabase sungguhan (mengirim email, membuat akun). Yang diuji di sini adalah validasi,
 * aksesibilitas, guard rute, dan keamanan pengalihan: semuanya tanpa jaringan ke Supabase.
 */

test.describe('/masuk', () => {
  test('menampilkan formulir berlabel dan tautan ke daftar dan lupa sandi', async ({ page }) => {
    await page.goto('/masuk');
    await expect(page).toHaveTitle(/Masuk/);
    await expect(
      page.getByRole('heading', { level: 1, name: /Selamat datang kembali/ }),
    ).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Kata sandi', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Masuk', exact: true })).toBeEnabled();
    await expect(page.getByRole('link', { name: 'Lupa kata sandi?' })).toHaveAttribute(
      'href',
      '/lupa-sandi',
    );
    await expect(page.getByRole('link', { name: 'Daftar', exact: true })).toHaveAttribute(
      'href',
      '/daftar',
    );
  });

  test('kirim kosong: pesan per kolom, fokus pindah ke kolom pertama yang bermasalah', async ({
    page,
  }) => {
    await page.goto('/masuk');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();

    const email = page.getByLabel('Email');
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toHaveAccessibleDescription('Isi alamat emailmu.');
    await expect(page.getByLabel('Kata sandi', { exact: true })).toHaveAccessibleDescription(
      'Isi kata sandimu.',
    );
    await expect(email).toBeFocused();
  });

  test('email tidak valid: pesan menjelaskan cara memperbaiki', async ({ page }) => {
    await page.goto('/masuk');
    await page.getByLabel('Email').fill('bukan-email');
    await page.getByLabel('Kata sandi', { exact: true }).fill('apa-saja');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await expect(page.getByLabel('Email')).toHaveAccessibleDescription(/Contoh: nama@email\.com/);
    // Nilai email dipulihkan setelah galat; kata sandi TIDAK pernah dikembalikan.
    await expect(page.getByLabel('Email')).toHaveValue('bukan-email');
    await expect(page.getByLabel('Kata sandi', { exact: true })).toHaveValue('');
  });

  test('tombol tampilkan kata sandi: mengganti tipe dan aria-pressed', async ({ page }) => {
    await page.goto('/masuk');
    const field = page.getByLabel('Kata sandi', { exact: true });
    const toggle = page.getByRole('button', { name: 'Tampilkan kata sandi' });
    await expect(field).toHaveAttribute('type', 'password');
    await toggle.click();
    await expect(field).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: 'Sembunyikan kata sandi' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('?next= yang aman dibawa ke formulir; yang berbahaya dibuang', async ({ page }) => {
    await page.goto('/masuk?next=/asesmen/phq9');
    await expect(page.locator('input[name="next"]')).toHaveValue('/asesmen/phq9');

    for (const evil of [
      '//evil.com',
      'https://evil.com',
      '/%0d%0aLocation:https://evil.com',
      '/\\evil.com',
    ]) {
      await page.goto(`/masuk?next=${encodeURIComponent(evil)}`);
      await expect(page.locator('input[name="next"]'), evil).toHaveCount(0);
    }
  });

  test('tautan email yang gagal membawa pesan ramah', async ({ page }) => {
    await page.goto('/masuk?galat=tautan');
    await expect(
      page.getByRole('status').filter({ hasText: 'Tautan sudah tidak berlaku' }),
    ).toBeVisible();
  });
});

test.describe('/daftar', () => {
  test('kirim kosong: semua kolom wajib bergalat, termasuk persetujuan', async ({ page }) => {
    await page.goto('/daftar');
    await page.getByRole('button', { name: 'Buat akun' }).click();

    await expect(page.getByLabel('Nama panggilan')).toHaveAccessibleDescription('Isi namamu.');
    await expect(page.getByLabel('Email')).toHaveAccessibleDescription('Isi alamat emailmu.');
    await expect(page.getByLabel('Kata sandi', { exact: true })).toHaveAccessibleDescription(
      /Minimal 8 karakter/,
    );
    await expect(
      page.getByRole('checkbox', { name: /berusia 17 tahun/ }),
    ).toHaveAccessibleDescription('Centang bahwa kamu berusia 17 tahun ke atas.');
    await expect(
      page.getByRole('checkbox', { name: /ketentuan layanan/ }),
    ).toHaveAccessibleDescription('Centang persetujuan untuk melanjutkan.');
    await expect(page.getByLabel('Nama panggilan')).toBeFocused();
  });

  test('pilihan peran: bawaan "diriku sendiri", bisa diganti dengan keyboard', async ({ page }) => {
    await page.goto('/daftar');
    const group = page.getByRole('group', { name: 'Kamu mendaftar sebagai' });
    await expect(group.getByRole('radio', { name: /Untuk diriku sendiri/ })).toBeChecked();

    await group.getByRole('radio', { name: /Untuk diriku sendiri/ }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(group.getByRole('radio', { name: /Saya psikolog/ })).toBeChecked();
  });

  test('usia dan persetujuan tetap tercentang setelah galat validasi lain; tautan naskah hukum ada', async ({
    page,
  }) => {
    await page.goto('/daftar');
    const age = page.getByRole('checkbox', { name: /berusia 17 tahun/ });
    const consent = page.getByRole('checkbox', { name: /ketentuan layanan/ });
    await age.check();
    await consent.check();
    await page.getByRole('button', { name: 'Buat akun' }).click();
    await expect(page.getByLabel('Nama panggilan')).toHaveAccessibleDescription('Isi namamu.');
    await expect(age).toBeChecked();
    await expect(consent).toBeChecked();
    await expect(page.getByRole('link', { name: 'ketentuan layanan' })).toHaveAttribute(
      'href',
      '/syarat-penggunaan',
    );
    await expect(page.getByRole('link', { name: 'kebijakan privasi' })).toHaveAttribute(
      'href',
      '/kebijakan-privasi',
    );
  });

  test('kata sandi 73 karakter ditolak (batas bcrypt)', async ({ page }) => {
    await page.goto('/daftar');
    await page.getByLabel('Kata sandi', { exact: true }).fill('x'.repeat(73));
    await page.getByRole('button', { name: 'Buat akun' }).click();
    await expect(page.getByLabel('Kata sandi', { exact: true })).toHaveAccessibleDescription(
      /maksimal 72/,
    );
  });
});

test.describe('/lupa-sandi', () => {
  test('email kosong dan tidak valid ditolak sebelum menyentuh server Auth', async ({ page }) => {
    await page.goto('/lupa-sandi');
    await page.getByRole('button', { name: 'Kirim tautan' }).click();
    await expect(page.getByLabel('Email')).toHaveAccessibleDescription('Isi alamat emailmu.');
    await page.getByLabel('Email').fill('salah');
    await page.getByRole('button', { name: 'Kirim tautan' }).click();
    await expect(page.getByLabel('Email')).toHaveAccessibleDescription(/nama@email\.com/);
  });
});

test.describe('guard rute (tanpa sesi)', () => {
  for (const path of ['/beranda', '/asesmen/phq9', '/psikolog', '/pendamping', '/faskes']) {
    test(`${path} → /masuk dengan ?next= yang asli`, async ({ page }) => {
      await page.goto(`${path}?x=1`);
      const url = new URL(page.url());
      expect(url.pathname).toBe('/masuk');
      expect(url.searchParams.get('next')).toBe(`${path}?x=1`);
      await expect(page.locator('input[name="next"]')).toHaveValue(`${path}?x=1`);
    });
  }

  test('/atur-sandi butuh sesi: pengunjung dialihkan ke /lupa-sandi', async ({ page }) => {
    await page.goto('/atur-sandi');
    expect(new URL(page.url()).pathname).toBe('/lupa-sandi');
  });

  test('/auth/callback tanpa kode → /masuk?galat=tautan', async ({ page }) => {
    await page.goto('/auth/callback');
    const url = new URL(page.url());
    expect(url.pathname).toBe('/masuk');
    expect(url.searchParams.get('galat')).toBe('tautan');
  });

  test('/auth/callback dengan next berbahaya tidak pernah mengarah keluar situs', async ({
    page,
  }) => {
    await page.goto('/auth/callback?code=palsu&next=//evil.com');
    expect(new URL(page.url()).hostname).toBe('localhost');
    expect(page.url()).not.toContain('evil.com');
  });
});

test.describe('/api/health & header keamanan', () => {
  test('format { data, error } dan tidak di-cache', async ({ request }) => {
    const response = await request.get('/api/health');
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(['data', 'error']);
    expect(response.headers()['cache-control']).toBe('no-store');
    expect(JSON.stringify(body)).not.toMatch(/supabase\.co|eyJ/); // tidak membocorkan URL atau token
  });

  test('semua halaman membawa header keamanan inti', async ({ request }) => {
    for (const path of ['/', '/masuk', '/daftar']) {
      const headers = (await request.get(path)).headers();
      expect(headers['x-content-type-options'], path).toBe('nosniff');
      expect(headers['x-frame-options'], path).toBe('DENY');
      expect(headers['referrer-policy'], path).toBe('strict-origin-when-cross-origin');
      expect(headers['permissions-policy'], path).toContain('camera=()');
      expect(headers['content-security-policy'], path).toContain("frame-ancestors 'none'");
      expect(headers['content-security-policy'], path).toContain("object-src 'none'");
      expect(headers['x-powered-by'], path).toBeUndefined();
    }
  });
});
