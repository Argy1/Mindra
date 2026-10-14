import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Alur Fase 2 dengan AKUN SUNGGUHAN di Supabase. Dilewati kecuali kredensial uji diberikan lewat
 * lingkungan. Dua skenario wajib dari docs/PLAN.md:
 *
 *   1. PHQ-9 butir 9 > 0 → peringatan muncul di dasbor psikolog TANPA memuat ulang halaman.
 *   2. Pendamping tanpa izin `assessment_results` tidak bisa melihat hasil skrining.
 *
 * Variabel lingkungan (semua akun harus akun uji/demo, bukan akun pribadi):
 *
 *   E2E_USER_EMAIL, E2E_USER_PASSWORD, E2E_USER_NAME
 *       pasien yang tertaut ke psikolog di bawah, dengan izin `crisis_alerts` menyala.
 *       E2E_USER_NAME = nama pasien seperti tampil di dasbor psikolog.
 *   E2E_PSYCHOLOGIST_EMAIL, E2E_PSYCHOLOGIST_PASSWORD, E2E_PSYCHOLOGIST_MFA_OFF=1
 *       psikolog yang tertaut ke pasien. MFA TOTP wajib untuk psikolog, jadi spec ini hanya jalan bila
 *       saklar demo dimatikan: server dijalankan dengan MFA_ENFORCEMENT=off DAN database diberi
 *       `alter database postgres set app.psychologist_mfa = 'off'` (lihat README, bagian MFA).
 *   E2E_CAREGIVER_EMAIL, E2E_CAREGIVER_PASSWORD, E2E_CAREGIVER_PERSON_ID
 *       pendamping aktif dengan izin `assessment_results` MATI untuk pengguna ber-id itu.
 *
 * Contoh:
 *   E2E_USER_EMAIL=... E2E_USER_PASSWORD=... E2E_USER_NAME="Dimas Pratama" \
 *   E2E_PSYCHOLOGIST_EMAIL=... E2E_PSYCHOLOGIST_PASSWORD=... E2E_PSYCHOLOGIST_MFA_OFF=1 \
 *   pnpm exec playwright test e2e/fase2.auth.spec.ts --project=desktop-1440
 *
 * PERHATIAN: skenario 1 MENULIS data (satu hasil skrining dan satu alert krisis). Alert ditandai
 * ditangani di akhir tes; hasil skrining tetap ada di akun uji.
 */
const env = process.env;
const pairs = {
  user: [env.E2E_USER_EMAIL, env.E2E_USER_PASSWORD],
  psychologist: [env.E2E_PSYCHOLOGIST_EMAIL, env.E2E_PSYCHOLOGIST_PASSWORD],
  caregiver: [env.E2E_CAREGIVER_EMAIL, env.E2E_CAREGIVER_PASSWORD],
} as const;
type Who = keyof typeof pairs;

const has = (who: Who) => Boolean(pairs[who][0] && pairs[who][1]);

async function signIn(page: Page, who: Who, landing: RegExp) {
  const [email, password] = pairs[who];
  await page.goto('/masuk');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Kata sandi', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page).toHaveURL(landing);
}

async function newSignedInPage(browser: Browser, who: Who, landing: RegExp) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, who, landing);
  return { context, page };
}

test.describe('peringatan krisis realtime', () => {
  test.skip(
    !has('user') ||
      !has('psychologist') ||
      !env.E2E_USER_NAME ||
      env.E2E_PSYCHOLOGIST_MFA_OFF !== '1',
    'Butuh akun pasien + psikolog tertaut, E2E_USER_NAME, dan E2E_PSYCHOLOGIST_MFA_OFF=1.',
  );

  test('PHQ-9 butir 9 > 0 memunculkan peringatan di dasbor psikolog tanpa memuat ulang', async ({
    browser,
  }) => {
    const psychologist = await newSignedInPage(browser, 'psychologist', /\/psikolog/);
    const dashboard = psychologist.page;
    await expect(dashboard.getByText('Terhubung langsung')).toBeVisible({ timeout: 15_000 });

    // Penanda yang hilang bila dokumen dimuat ulang.
    await dashboard.evaluate(() => {
      (window as unknown as { __tanpaReload: boolean }).__tanpaReload = true;
    });
    const items = dashboard.locator('li[data-alert-id]').filter({ hasText: env.E2E_USER_NAME! });
    const before = await items.count();

    // Pasien mengisi PHQ-9 dengan butir 9 = "beberapa hari" di sesi browser LAIN.
    const patient = await newSignedInPage(browser, 'user', /\/beranda/);
    await patient.page.goto('/asesmen/phq9');
    await patient.page.locator('[data-ready="true"]').waitFor();
    const answers = ['1', '1', '1', '1', '1', '1', '1', '1', '2'];
    for (const key of answers.slice(0, -1)) {
      await patient.page.keyboard.press(key);
      await patient.page.keyboard.press('Enter');
    }
    await patient.page.keyboard.press(answers.at(-1)!);
    await patient.page.getByRole('button', { name: 'Lihat hasil' }).click();
    await expect(patient.page).toHaveURL(/\/asesmen\/hasil\//);
    await patient.context.close();

    // Peringatan tiba lewat Realtime; kartu lengkap menyusul setelah server mencatat akses.
    await expect.poll(() => items.count(), { timeout: 20_000 }).toBeGreaterThan(before);
    expect(
      await dashboard.evaluate(
        () => (window as unknown as { __tanpaReload?: boolean }).__tanpaReload,
      ),
    ).toBe(true);
    await expect(items.first()).toContainText('PHQ-9', { timeout: 20_000 });

    // Bersih-bersih sekaligus menguji "Tandai sudah ditangani".
    await items
      .first()
      .getByRole('button', { name: /Tandai sudah ditangani/ })
      .click();
    await expect.poll(() => items.count(), { timeout: 15_000 }).toBe(before);
    await psychologist.context.close();
  });
});

test.describe('izin pendamping', () => {
  test.skip(
    !has('caregiver') || !env.E2E_CAREGIVER_PERSON_ID,
    'Butuh akun pendamping dan E2E_CAREGIVER_PERSON_ID (izin hasil skrining mati).',
  );

  test('pendamping tanpa izin assessment_results tidak bisa melihat hasil skrining', async ({
    page,
  }) => {
    await signIn(page, 'caregiver', /\/pendamping/);
    await page.goto(`/pendamping/${env.E2E_CAREGIVER_PERSON_ID}`);

    const section = page.getByRole('region', { name: 'Hasil skrining terakhir' });
    await expect(section).toContainText('tidak membagikan hasil skrining');
    // Tidak ada kategori, nama instrumen, maupun skor yang bocor di bagian itu.
    await expect(section).not.toContainText(
      /PHQ-9|GAD-7|SRQ-20|PSS-10|Minimal|Ringan|Sedang|Berat/,
    );
  });

  test('id orang yang tidak kamu dampingi → 404, bukan data', async ({ page }) => {
    await signIn(page, 'caregiver', /\/pendamping/);
    const response = await page.goto('/pendamping/00000000-0000-4000-8000-00000000dead');
    expect(response?.status()).toBe(404);
  });
});
