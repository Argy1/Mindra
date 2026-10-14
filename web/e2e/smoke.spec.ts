import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

/** Galat konsol yang tidak boleh ada di halaman mana pun. */
function collectConsoleErrors(page: Page): ConsoleMessage[] {
  const errors: ConsoleMessage[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message);
  });
  page.on('pageerror', (error) => {
    throw error;
  });
  return errors;
}

test.describe('halaman publik /', () => {
  test('memuat hero, header, pita krisis, dan footer', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/');

    await expect(page).toHaveTitle(/Mindra/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(
      page.getByRole('heading', { level: 1, name: /Ruang aman untuk perasaanmu/ }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Daftar gratis' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Masuk', exact: true })).toBeVisible();

    const crisis = page.getByRole('complementary', { name: 'Bantuan darurat' });
    await expect(crisis.getByRole('link', { name: /^Hubungi / })).toHaveAttribute('href', /^tel:/);
    await expect(page.getByRole('contentinfo')).toContainText(
      'bukan pengganti diagnosis profesional',
    );

    expect(errors.map((e) => e.text())).toEqual([]);
  });

  test('skip link: Tab pertama memunculkannya, Enter memindahkan fokus ke konten', async ({
    page,
  }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Langsung ke konten' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#isi$/);
    await expect(page.locator('main#isi')).toBeFocused();
  });

  test('tidak ada overflow horizontal', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('katalog /dev/ui', () => {
  test('memuat semua bagian tanpa galat konsol', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/dev/ui');
    await expect(page.getByRole('heading', { level: 1, name: 'Pratinjau komponen' })).toBeVisible();
    for (const name of ['Warna', 'Tipografi', 'Tombol', 'Kartu', 'Form', 'Tab']) {
      await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeAttached();
    }
    expect(errors.map((e) => e.text())).toEqual([]);
  });

  test('tab bisa dioperasikan dengan panah keyboard', async ({ page }) => {
    await page.goto('/dev/ui');
    const first = page.getByRole('tab', { name: '7 hari' });
    await first.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: '30 hari' })).toBeFocused();
    await expect(page.getByRole('tab', { name: '30 hari' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: '90 hari' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('saklar bisa dinyalakan dengan Spasi', async ({ page }) => {
    await page.goto('/dev/ui');
    const toggle = page.getByRole('switch', { name: 'Mood harian untuk Ibu' });
    await toggle.focus();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  test('toast muncul di wilayah live dan galat menetap', async ({ page }) => {
    await page.goto('/dev/ui');
    await page.getByRole('button', { name: 'Toast galat (menetap)' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Jawabanmu belum tersimpan' }),
    ).toBeVisible();
  });

  test('dialog: latar inert, ESC menutup, fokus kembali ke pemicu', async ({ page }) => {
    await page.goto('/dev/ui');
    const trigger = page.getByRole('button', { name: 'Buka dialog' });
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: 'Cabut semua izin Rina Sari?' });
    await expect(dialog).toBeVisible();

    // Dialog native TIDAK memenjara fokus secara ketat: setelah elemen terakhir, Tab boleh pindah
    // ke UI browser (document.body). Yang wajib: fokus tidak pernah mendarat di konten halaman
    // di belakang dialog (latar bersifat inert).
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      const focusLeakedToPage = await page.evaluate(() => {
        const active = document.activeElement;
        return active !== null && active !== document.body && active.closest('dialog') === null;
      });
      expect(focusLeakedToPage).toBe(false);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
