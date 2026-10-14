import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Rute yang sudah ada. Tambahkan rute baru di sini setiap fase selesai (target PLAN.md Fase 5). */
const ROUTES = [
  '/',
  '/masuk',
  '/daftar',
  '/lupa-sandi',
  '/akun-bermasalah',
  '/dev/ui',
  '/dev/shell',
] as const;

for (const route of ROUTES) {
  test(`axe: ${route} tanpa pelanggaran WCAG 2.1 A/AA`, async ({ page }) => {
    await page.goto(route);
    // Tunggu font dan hidrasi selesai supaya kontras dihitung pada tampilan akhir.
    await page.evaluate(() => document.fonts.ready);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      // Indikator dev Next.js bukan bagian dari aplikasi kita.
      .exclude('nextjs-portal')
      .analyze();

    const summary = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => node.target.join(' ')),
    }));
    expect(summary).toEqual([]);
  });
}

test('axe: dialog bantuan krisis yang terbuka juga bebas pelanggaran', async ({ page }) => {
  await page.goto('/dev/shell');
  await page.getByRole('button', { name: 'Butuh bantuan sekarang' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // Tunggu animasi masuk selesai: axe menghitung kontras dari warna yang tampil, dan pada opasitas
  // < 1 warnanya bercampur dengan latar (positif palsu yang hanya muncul di perangkat lambat).
  await expect(dialog).toHaveCSS('opacity', '1');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('nextjs-portal')
    .analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
});

test('axe: formulir dalam keadaan GALAT (pesan per kolom tampil) juga bebas pelanggaran', async ({
  page,
}) => {
  for (const [route, submit] of [
    ['/masuk', 'Masuk'],
    ['/daftar', 'Buat akun'],
    ['/lupa-sandi', 'Kirim tautan'],
  ] as const) {
    await page.goto(route);
    await page.getByRole('button', { name: submit, exact: true }).click();
    await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('nextjs-portal')
      .analyze();
    const summary = results.violations.map(
      (v) => `${route} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    );
    expect(summary).toEqual([]);
  }
});
