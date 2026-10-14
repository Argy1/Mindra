import { expect, test, type Page } from '@playwright/test';

/**
 * Alur Fase 1 dengan AKUN SUNGGUHAN di Supabase (skrining tersimpan, hasil, krisis, jurnal, beranda).
 *
 * Dilewati kecuali kredensial uji diberikan lewat lingkungan:
 *
 *   E2E_USER_EMAIL=pengguna@demo.mindra.test E2E_USER_PASSWORD=... pnpm exec playwright test e2e/fase1.auth.spec.ts
 *
 * PERHATIAN: spec ini MENULIS data ke proyek Supabase yang ada di .env.local (hasil skrining, catatan
 * perasaan; skenario PHQ-9 butir 9 juga membuat satu alert krisis lewat trigger). Pakai akun uji khusus
 * (mis. akun demo `is_demo`), jangan akun pribadi. Catatan perasaan yang dibuat dihapus di akhir.
 * Berjalan serial karena tiap tes membangun di atas data tes sebelumnya.
 */
const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.skip(
  !email || !password,
  'Butuh E2E_USER_EMAIL dan E2E_USER_PASSWORD (akun uji berperan "user").',
);
test.describe.configure({ mode: 'serial' });

async function signIn(page: Page) {
  await page.goto('/masuk');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Kata sandi', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/);
}

async function completeInstrument(page: Page, tipe: string, keys: readonly string[]) {
  await page.goto(`/asesmen/${tipe}`);
  await page.locator('[data-ready="true"]').waitFor();
  for (let index = 0; index < keys.length - 1; index += 1) {
    await page.keyboard.press(keys[index]!);
    await page.keyboard.press('Enter');
  }
  await page.keyboard.press(keys.at(-1)!);
  await page.getByRole('button', { name: 'Lihat hasil' }).click();
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test('GAD-7 lengkap disimpan: halaman hasil menampilkan skor yang dihitung server', async ({
  page,
}) => {
  // Semua jawaban ke-1 (nilai 0) → skor 0, kategori minimal.
  await completeInstrument(page, 'gad7', ['1', '1', '1', '1', '1', '1', '1']);
  await expect(page).toHaveURL(/\/asesmen\/hasil\/[0-9a-f-]{36}/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kecemasan tingkat minimal');
  await expect(page.getByText('dari 21')).toBeVisible();
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toHaveCount(0);
  await expect(page.getByText(/bukan diagnosis/)).toBeVisible();
});

test('PHQ-9 butir 9 > 0: banner krisis di halaman hasil, berfokus, dengan tombol telepon', async ({
  page,
}) => {
  await completeInstrument(page, 'phq9', ['1', '1', '1', '1', '1', '1', '1', '1', '2']);
  await expect(page).toHaveURL(/\/asesmen\/hasil\//);
  const banner = page.locator('[role="alert"]:not(#__next-route-announcer__)');
  await expect(banner).toBeVisible();
  await expect(banner).toBeFocused();
  await expect(banner.getByRole('link', { name: /Hubungi/ })).toHaveAttribute('href', /^tel:/);
});

test('hasil milik orang lain atau id acak → 404, bukan data', async ({ page }) => {
  const response = await page.goto('/asesmen/hasil/00000000-0000-4000-8000-00000000dead');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Halaman ini tidak kami temukan.',
  );
});

test('daftar skrining menampilkan hasil terakhir tiap instrumen', async ({ page }) => {
  await page.goto('/asesmen');
  await expect(page.getByRole('heading', { level: 1, name: 'Cek perasaan' })).toBeVisible();
  await expect(page.getByText(/Terakhir diisi/).first()).toBeVisible();
});

test('jurnal: catat perasaan, muncul di daftar, lalu hapus', async ({ page }) => {
  await page.goto('/jurnal');
  const note = `Catatan uji e2e ${Date.now()}`;
  await page.getByRole('radio', { name: 'Tenang' }).check();
  await page.getByLabel('Catatan').first().fill(note);
  await page.getByRole('button', { name: 'Simpan catatan', exact: true }).click();
  await expect(page.getByText('Tersimpan. Terima kasih sudah mencatat perasaanmu.')).toBeVisible();
  await expect(page.getByText(note)).toBeVisible();

  const entry = page.locator('li', { hasText: note });
  await entry.getByRole('button', { name: /Hapus catatan perasaan/ }).click();
  await entry.getByRole('button', { name: 'Ya, hapus' }).click();
  await expect(page.getByText(note)).toHaveCount(0);
});

test('beranda memuat data sungguhan tanpa galat dan menyapa pengguna', async ({ page }) => {
  await page.goto('/beranda');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /^Selamat (pagi|siang|sore|malam)/,
  );
  await expect(page.getByRole('heading', { name: 'Minggu ini' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Skrining terakhir' })).toBeVisible();
});
