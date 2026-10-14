import { expect, test } from '@playwright/test';

const SHELL_BREAKPOINT = 961;

test.describe('AppShell /dev/shell', () => {
  test('sidebar di desktop, bottom nav di mobile — tidak pernah keduanya', async ({ page }) => {
    await page.goto('/dev/shell');
    const isDesktop = (page.viewportSize()?.width ?? 0) >= SHELL_BREAKPOINT;

    // Playwright hanya menghitung elemen yang terlihat; jadi tepat satu navigasi utama.
    const nav = page.getByRole('navigation', { name: 'Navigasi utama' });
    await expect(nav).toHaveCount(1);

    if (isDesktop) {
      await expect(nav).not.toHaveAttribute('data-bottom-nav', /.*/);
      // Enam menu utama + Profil (grup "Akun").
      await expect(nav.getByRole('link')).toHaveCount(7);
      const box = await nav.boundingBox();
      expect(box?.x).toBeLessThan(64); // di tepi kiri
    } else {
      await expect(nav).toHaveAttribute('data-bottom-nav', 'true');
      await expect(nav.getByRole('link')).toHaveCount(5);
      const viewportHeight = page.viewportSize()?.height ?? 0;
      const box = await nav.boundingBox();
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThan(viewportHeight - 2); // menempel di bawah
    }
  });

  test('item aktif ditandai aria-current dan konten tidak tertutup bottom nav', async ({
    page,
  }) => {
    await page.goto('/dev/shell');
    // Playwright tidak punya opsi `current` di getByRole, jadi pakai selektor atribut.
    await expect(
      page.getByRole('navigation', { name: 'Navigasi utama' }).locator('[aria-current="page"]'),
    ).toHaveText(/Beranda/);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const lastCard = page.getByRole('region', { name: 'Yang menemanimu' });
    await expect(lastCard).toBeInViewport({ ratio: 1 });
  });

  test('topbar tetap menempel saat menggulir', async ({ page }) => {
    await page.goto('/dev/shell');
    const topbar = page.getByRole('banner');
    await page.evaluate(() => window.scrollTo(0, 300));
    const box = await topbar.boundingBox();
    expect(Math.round(box?.y ?? -1)).toBe(0);
    expect(Math.round(box?.height ?? 0)).toBe(72);
  });

  test('bantuan krisis: dialog terbuka, berisi nomor, ESC menutup, fokus kembali', async ({
    page,
  }) => {
    await page.goto('/dev/shell');
    const trigger = page.getByRole('button', { name: 'Butuh bantuan sekarang' });
    await expect(trigger).toBeVisible(); // di desktop: sidebar; di mobile: ikon di topbar
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: 'Butuh bantuan sekarang' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: /^Hubungi / })).toHaveAttribute('href', /^tel:/);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('skip link melompati navigasi menuju konten utama', async ({ page }) => {
    await page.goto('/dev/shell');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Langsung ke konten' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#isi')).toBeFocused();
  });

  test('tidak ada overflow horizontal', async ({ page }) => {
    await page.goto('/dev/shell');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
