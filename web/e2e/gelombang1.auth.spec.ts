import { expect, test, type Page } from '@playwright/test';

/**
 * Gelombang 1 dengan AKUN SUNGGUHAN di Supabase (migrasi `…000600` harus sudah diterapkan): halaman Profil (simpan,
 * persetujuan statistik wilayah, ukuran teks, unduh data) dan penghapusan akun. Dilewati kecuali kredensial ada:
 *
 *   # Profil dan unduh data: akun uji khusus (nilai awalnya dipulihkan di akhir)
 *   E2E_USER_EMAIL=pengguna@demo.mindra.test E2E_USER_PASSWORD=... \
 *   # Hapus akun: akun SEKALI PAKAI yang dibuat khusus untuk ini (akan DIHAPUS PERMANEN; jangan akun demo)
 *   E2E_DELETE_EMAIL=hapus-saya@example.test E2E_DELETE_PASSWORD=... \
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   pnpm exec playwright test e2e/gelombang1.auth.spec.ts --project=desktop-1440
 *
 * Terhadap situs yang sudah berjalan (mis. demo di Vercel) tambahkan `E2E_BASE_URL=https://<alamat>`.
 *
 * PERHATIAN: spec ini MENULIS data (nama, kota, provinsi, persetujuan, ukuran teks akun uji). Berjalan serial dan
 * memulihkan nilai awal setelahnya. Yang TIDAK dicakup di sini dan diuji di tempat lain: portal admin (butuh sesi
 * aal2 dengan TOTP; lihat tests/db/region-admin.test.ts dan e2e/gelombang1.spec.ts untuk halamannya).
 */
const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const deleteEmail = process.env.E2E_DELETE_EMAIL;
const deletePassword = process.env.E2E_DELETE_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test.describe.configure({ mode: 'serial' });

async function signIn(page: Page, address: string, secret: string) {
  await page.goto('/masuk');
  await page.getByLabel('Email').fill(address);
  await page.getByLabel('Kata sandi').fill(secret);
  await page.getByRole('button', { name: /^Masuk/ }).click();
  await page.waitForURL(/\/beranda/);
}

test.describe('Profil dengan akun sungguhan', () => {
  test.skip(
    !email || !password || !supabaseUrl || !anonKey,
    'Butuh E2E_USER_EMAIL, E2E_USER_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, dan NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );

  let original: { name: string; city: string; province: string; share: boolean } | null = null;

  test('menyimpan nama, kota, provinsi, dan persetujuan; nilainya bertahan setelah muat ulang', async ({
    page,
  }) => {
    await signIn(page, email!, password!);
    await page.goto('/profil');

    const name = page.getByLabel('Nama panggilan');
    const city = page.getByLabel('Kota atau kabupaten');
    const province = page.getByRole('combobox', { name: /^Provinsi/ });
    const optIn = page.getByRole('checkbox', { name: /Ikut statistik wilayah anonim/ });
    original = {
      name: await name.inputValue(),
      city: await city.inputValue(),
      province: await province.inputValue(),
      share: await optIn.isChecked(),
    };

    await name.fill('Penguji Otomatis');
    await city.fill('Kota Bandung');
    await province.selectOption('Jawa Barat');
    await optIn.uncheck();
    await page.getByRole('button', { name: 'Simpan profil' }).click();
    await expect(page.getByText('Profilmu sudah diperbarui.')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Nama panggilan')).toHaveValue('Penguji Otomatis');
    await expect(page.getByLabel('Kota atau kabupaten')).toHaveValue('Kota Bandung');
    await expect(page.getByRole('combobox', { name: /^Provinsi/ })).toHaveValue('Jawa Barat');
    await expect(
      page.getByRole('checkbox', { name: /Ikut statistik wilayah anonim/ }),
    ).not.toBeChecked();
  });

  test('ikut statistik tanpa kota ditolak (di formulir) dan tidak mengubah apa pun', async ({
    page,
  }) => {
    await signIn(page, email!, password!);
    await page.goto('/profil');
    await page.getByLabel('Kota atau kabupaten').fill('');
    await page.getByRole('checkbox', { name: /Ikut statistik wilayah anonim/ }).check();
    await page.getByRole('button', { name: 'Simpan profil' }).click();
    await expect(page.getByLabel('Kota atau kabupaten')).toHaveAccessibleDescription(
      /Isi kotamu untuk ikut statistik wilayah/,
    );
    await page.reload();
    await expect(page.getByLabel('Kota atau kabupaten')).toHaveValue('Kota Bandung');
  });

  test('ukuran teks tersimpan dan diterapkan ke seluruh halaman', async ({ page }) => {
    await signIn(page, email!, password!);
    await page.goto('/profil');
    await page.getByRole('radio', { name: /Lebih besar/ }).check({ force: true });
    await expect(page.getByText('Ukuran teks disimpan')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'large');
    await page.goto('/beranda');
    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'large');
    await page.goto('/profil');
    await page.getByRole('radio', { name: /Biasa/ }).check({ force: true });
    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'normal');
  });

  test('unduh data: berkas JSON milik sendiri, tanpa kolom rahasia', async ({ page }) => {
    await signIn(page, email!, password!);
    const response = await page.request.get('/profil/unduh');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-disposition']).toMatch(
      /data-mindra-\d{4}-\d{2}-\d{2}\.json/,
    );
    expect(response.headers()['cache-control']).toContain('no-store');
    const text = await response.text();
    const document = JSON.parse(text) as {
      id_akun: string;
      data: Record<string, unknown[]>;
      bagian_dilewati: string[];
    };
    expect(document.id_akun).toMatch(/^[0-9a-f-]{36}$/);
    expect(document.data).toHaveProperty('profil');
    expect(text).not.toMatch(/nik_encrypted|agora_token|invite_code/);
  });

  test('unduh data tanpa masuk: ditolak', async ({ playwright, baseURL }) => {
    const anonymous = await playwright.request.newContext({ baseURL: baseURL! });
    const response = await anonymous.get('/profil/unduh', { maxRedirects: 0 });
    expect([307, 308, 401]).toContain(response.status());
    await anonymous.dispose();
  });

  test.afterAll(async ({ browser, baseURL }) => {
    if (!original) return;
    const context = await browser.newContext({ baseURL: baseURL! });
    const page = await context.newPage();
    await signIn(page, email!, password!);
    await page.goto('/profil');
    await page.getByLabel('Nama panggilan').fill(original.name);
    await page.getByLabel('Kota atau kabupaten').fill(original.city);
    await page.getByRole('combobox', { name: /^Provinsi/ }).selectOption(original.province);
    const optIn = page.getByRole('checkbox', { name: /Ikut statistik wilayah anonim/ });
    if (original.share) await optIn.check();
    else await optIn.uncheck();
    await page.getByRole('button', { name: 'Simpan profil' }).click();
    await expect(page.getByText('Profilmu sudah diperbarui.')).toBeVisible();
    await context.close();
  });
});

test.describe('Hapus akun dengan akun sekali pakai', () => {
  test.skip(
    !deleteEmail || !deletePassword || !supabaseUrl || !anonKey,
    'Butuh E2E_DELETE_EMAIL, E2E_DELETE_PASSWORD (akun sekali pakai), NEXT_PUBLIC_SUPABASE_URL, dan NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );

  test('sandi salah: akun tetap ada; sandi benar + HAPUS: akun hilang dan tidak bisa masuk lagi', async ({
    page,
  }) => {
    await signIn(page, deleteEmail!, deletePassword!);
    await page.goto('/profil');

    // Sandi salah: galat di kolom sandi, akun utuh.
    await page.getByRole('button', { name: 'Hapus akun' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Ketik HAPUS/).fill('HAPUS');
    await dialog.getByLabel('Kata sandimu').fill('sandi-yang-salah-123');
    await dialog.getByRole('button', { name: 'Hapus akun saya' }).click();
    await expect(dialog.getByLabel('Kata sandimu')).toHaveAccessibleDescription(/belum benar/);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Profilmu' })).toBeVisible();

    // Sandi benar: akun dihapus, diarahkan ke halaman masuk dengan pemberitahuan.
    await page.getByRole('button', { name: 'Hapus akun' }).click();
    const confirm = page.getByRole('dialog');
    await confirm.getByLabel(/Ketik HAPUS/).fill('HAPUS');
    await confirm.getByLabel('Kata sandimu').fill(deletePassword!);
    await confirm.getByRole('button', { name: 'Hapus akun saya' }).click();
    await page.waitForURL(/\/masuk\?galat=akun_dihapus/);
    await expect(page.getByText(/Akunmu dan seluruh datanya sudah dihapus/)).toBeVisible();

    // Masuk lagi dengan akun yang sama: gagal.
    await page.getByLabel('Email').fill(deleteEmail!);
    await page.getByLabel('Kata sandi').fill(deletePassword!);
    await page.getByRole('button', { name: /^Masuk/ }).click();
    await expect(page).toHaveURL(/\/masuk/);
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
