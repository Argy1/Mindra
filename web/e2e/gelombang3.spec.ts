import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Gelombang 3: halaman Bantuan (/bantuan: kontak krisis, napas terpandu, grounding, panduan menemani orang lain) dan
 * daftar layanan terdekat. /bantuan adalah halaman publik asli. Daftar layanan diuji lewat pratinjau
 * /dev/layanan-terdekat (komponen yang sama, data contoh tanpa database). Audit axe seluruh rute ada di fase5.spec.ts;
 * di sini axe diulang pada keadaan yang berubah (latihan berjalan, lokasi aktif, galat).
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    label,
  ).toEqual([]);
}

/** Jam palsu yang BEKU: waktu hanya maju lewat `clock.runFor`, jadi batas fase napas bisa diuji tepat. */
async function openWithFrozenClock(page: Page, path: string) {
  await page.clock.install({ time: new Date('2026-10-14T10:00:00Z') });
  await page.goto(path);
  await page.clock.pauseAt(new Date('2026-10-14T10:05:00Z'));
}

/** Pointer dijauhkan dan transisi CSS (hover, fokus) dibiarkan selesai, supaya axe tidak mengukur warna di tengah transisi. */
async function settle(page: Page) {
  await page.mouse.move(1, 1);
  await page.waitForTimeout(400);
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('Bantuan (/bantuan)', () => {
  test('terbuka tanpa masuk; bagian bernama; kontak krisis dari sumber tunggal (SEJIWA dan 112)', async ({
    page,
  }) => {
    const response = await page.goto('/bantuan');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Kamu tidak harus menghadapinya sendirian',
    );
    for (const name of [
      'Kalau kamu atau orang di dekatmu dalam bahaya sekarang',
      'Menenangkan diri sekarang',
      'Kalau kamu ingin bicara dengan seseorang',
      'Kalau kamu menemani orang yang sedang berat',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
    }
    const main = page.getByRole('main');
    await expect(main.getByRole('link', { name: 'Hubungi 119 ext. 8' })).toHaveAttribute(
      'href',
      'tel:119,8',
    );
    await expect(main.getByRole('link', { name: 'Hubungi 112' })).toHaveAttribute(
      'href',
      'tel:112',
    );
  });

  test('tidak menyimpan apa pun: tanpa cookie, tanpa kolom isian, tanpa penyimpanan lokal', async ({
    page,
    context,
  }) => {
    await page.goto('/bantuan');
    await page.getByRole('button', { name: 'Mulai grounding 5-4-3-2-1' }).click();
    await page.getByRole('button', { name: 'Mulai napas terpandu' }).click();
    expect(await context.cookies()).toEqual([]);
    expect(await page.locator('main input, main textarea, main select, main form').count()).toBe(0);
    const stored = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }));
    expect(stored).toEqual({ local: [], session: [] });
  });

  test('tidak ada tanda seru, emoji, atau kata klinis terlarang', async ({ page }) => {
    await page.goto('/bantuan');
    const text = await page.getByRole('main').innerText();
    expect(text).not.toContain('!');
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/\b(gangguan|diagnosa|pasien)\b/i);
  });

  test('napas terpandu: fase berganti tiap 4 dan 4 detik, pengumuman hanya di pergantian fase', async ({
    page,
  }) => {
    await openWithFrozenClock(page, '/bantuan');
    const status = page.locator('section[aria-labelledby="napas"] [role="status"]');
    await expect(status).toHaveText('');

    await page.getByRole('button', { name: 'Mulai napas terpandu' }).click();
    await expect(status).toHaveText('Tarik napas. Siklus 1 dari 5.');
    await page.clock.runFor(2_000);
    await expect(status).toHaveText('Tarik napas. Siklus 1 dari 5.');
    await page.clock.runFor(2_300);
    await expect(status).toHaveText('Tahan sebentar. Siklus 1 dari 5.');
    await page.clock.runFor(4_000);
    await expect(status).toHaveText('Hembuskan pelan. Siklus 1 dari 5.');
    await page.clock.runFor(6_000);
    await expect(status).toHaveText('Tarik napas. Siklus 2 dari 5.');

    await page.getByRole('button', { name: 'Berhenti' }).click();
    await expect(page.getByRole('button', { name: 'Mulai napas terpandu' })).toBeVisible();
    await expect(status).toHaveText('');
  });

  test('napas terpandu selesai setelah 5 siklus', async ({ page }) => {
    await openWithFrozenClock(page, '/bantuan');
    await page.getByRole('button', { name: 'Mulai napas terpandu' }).click();
    await page.clock.runFor(71_000);
    const section = page.locator('section[aria-labelledby="napas"]');
    await expect(section.getByText('Selesai', { exact: true })).toBeVisible();
    await expect(section.getByRole('button', { name: 'Ulangi napas terpandu' })).toBeVisible();
  });

  test('grounding: bisa dijalankan hanya dengan keyboard dari awal sampai selesai', async ({
    page,
  }) => {
    await page.goto('/bantuan');
    const section = page.locator('section[aria-labelledby="grounding"]');
    const start = section.getByRole('button', { name: 'Mulai grounding 5-4-3-2-1' });
    await start.focus();
    await page.keyboard.press('Enter');
    await expect(section.getByRole('status')).toContainText('Langkah 1 dari 5.');
    for (let step = 2; step <= 5; step += 1) {
      await section.getByRole('button', { name: 'Lanjut' }).focus();
      await page.keyboard.press('Enter');
      await expect(section.getByRole('status')).toContainText(`Langkah ${step} dari 5.`);
    }
    await section.getByRole('button', { name: 'Selesai' }).focus();
    await page.keyboard.press('Enter');
    await expect(section.getByText(/Kamu sudah melewati kelima langkah/).first()).toBeVisible();
  });

  test.describe('gerak dikurangi', () => {
    test.use({ reducedMotion: 'reduce' });

    test('lingkaran napas tidak beranimasi, tetapi petunjuk teks tetap lengkap', async ({
      page,
    }) => {
      await page.goto('/bantuan');
      await page.getByRole('button', { name: 'Mulai napas terpandu' }).click();
      const circle = page.locator(
        'section[aria-labelledby="napas"] [aria-hidden="true"].rounded-full',
      );
      const duration = await circle.evaluate(
        (element) => getComputedStyle(element).transitionDuration,
      );
      // Jaring pengaman global: durasi transisi ~0 saat prefers-reduced-motion.
      expect(parseFloat(duration)).toBeLessThan(0.01);
      await expect(page.getByText('Tarik napas', { exact: true }).first()).toBeVisible();
    });
  });

  test('tidak ada overflow horizontal', async ({ page }) => {
    await page.goto('/bantuan');
    await noHorizontalOverflow(page);
  });

  test('axe: awal dan grounding berjalan', async ({ page }) => {
    await page.goto('/bantuan');
    await expectNoViolations(page, 'awal');
    await page.getByRole('button', { name: 'Mulai grounding 5-4-3-2-1' }).click();
    await expectNoViolations(page, 'grounding berjalan');
  });

  test('axe: napas berjalan dan napas selesai', async ({ page }) => {
    // axe memakai pewaktu: jam dilepas (`resume`) sebelum dianalisis.
    await openWithFrozenClock(page, '/bantuan');
    await page.getByRole('button', { name: 'Mulai napas terpandu' }).click();
    await page.clock.runFor(5_000);
    await page.clock.resume();
    await settle(page);
    await expectNoViolations(page, 'napas berjalan');
    await page.getByRole('button', { name: 'Berhenti' }).click();

    await page.clock.pauseAt(new Date(Date.now() + 60_000));
    await page.getByRole('button', { name: 'Mulai napas terpandu' }).click();
    await page.clock.runFor(71_000);
    await page.clock.resume();
    await expect(
      page.locator('section[aria-labelledby="napas"]').getByText('Selesai', { exact: true }),
    ).toBeVisible();
    await settle(page);
    await expectNoViolations(page, 'napas selesai');
  });

  test('footer dan dialog bantuan krisis menautkan ke halaman ini', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: 'Bantuan' }),
    ).toHaveAttribute('href', '/bantuan');

    await page.goto('/dev/shell');
    await page.getByRole('button', { name: 'Butuh bantuan sekarang' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('link', { name: /latihan napas/ })).toHaveAttribute(
      'href',
      '/bantuan',
    );
    await expect(dialog.getByRole('link', { name: 'layanan kesehatan terdekat' })).toHaveAttribute(
      'href',
      '/layanan-terdekat',
    );
    await expect(dialog.getByRole('link', { name: 'Hubungi 112' })).toHaveAttribute(
      'href',
      'tel:112',
    );
  });
});

test.describe('Layanan terdekat (/dev/layanan-terdekat)', () => {
  test('memuat daftar contoh, catatan "masih contoh", dan kendali pencarian bernama', async ({
    page,
  }) => {
    await page.goto('/dev/layanan-terdekat');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Daftar ini masih contoh' }),
    ).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Provinsi' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Cari nama atau kota' })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(5);
    await expect(page.getByText('Menampilkan 5 dari 5 layanan')).toBeVisible();
  });

  test('menyaring menurut provinsi dan pencarian', async ({ page }) => {
    await page.goto('/dev/layanan-terdekat');
    await page.getByRole('combobox', { name: 'Provinsi' }).selectOption('Jawa Barat');
    await expect(page.getByRole('article')).toHaveCount(2);
    await page.getByRole('searchbox', { name: 'Cari nama atau kota' }).fill('bandung');
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 3 })).toHaveText('Rumah Sakit Contoh Bandung');
    await page.getByRole('searchbox', { name: 'Cari nama atau kota' }).fill('tidak ada');
    await expect(page.getByRole('heading', { name: 'Tidak ada layanan yang cocok' })).toBeVisible();
  });

  test('lokasi diizinkan: terurut dari terdekat, jarak tampil, dan tidak ada permintaan jaringan yang memuat koordinat', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL: baseURL ?? 'http://localhost:3100',
      permissions: ['geolocation'],
      geolocation: { latitude: -6.5944, longitude: 106.7892 }, // Bogor
    });
    const page = await context.newPage();
    const requests: string[] = [];
    await page.goto('/dev/layanan-terdekat');
    page.on('request', (request) => requests.push(`${request.url()} ${request.postData() ?? ''}`));

    await page.getByRole('button', { name: 'Urutkan dari lokasiku' }).click();
    await expect(page.getByRole('button', { name: 'Hapus lokasiku' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3 }).first()).toHaveText(
      'Puskesmas Contoh Bogor Tengah',
    );
    await expect(page.getByText(/dari lokasimu \(garis lurus\)/).first()).toBeVisible();
    expect(requests.filter((entry) => /6\.59|106\.78|-6\.5944/.test(entry))).toEqual([]);

    // Tautan peta memuat koordinat faskes, bukan lokasi pengguna.
    for (const link of await page.getByRole('link', { name: /Lihat di peta/ }).all()) {
      expect(await link.getAttribute('href')).not.toMatch(/106\.7892|-6\.5944/);
    }
    await expectNoViolations(page, 'lokasi aktif');
    await context.close();
  });

  test('lokasi ditolak: pesan yang jelas, daftar tetap dapat dipakai', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ baseURL: baseURL ?? 'http://localhost:3100' });
    const page = await context.newPage();
    await page.goto('/dev/layanan-terdekat');
    await page.getByRole('button', { name: 'Urutkan dari lokasiku' }).click();
    await expect(page.getByText(/Izin lokasi ditolak/)).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(5);
    await context.close();
  });

  test('gagal memuat: peringatan dengan jalan keluar ke SEJIWA', async ({ page }) => {
    await page.goto('/dev/layanan-terdekat?gagal=1');
    const alert = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(alert).toContainText('Daftar layanan belum bisa dimuat');
    await expect(alert).toContainText('119 ext. 8');
  });

  test('terverifikasi: catatan "masih contoh" hilang', async ({ page }) => {
    await page.goto('/dev/layanan-terdekat?terverifikasi=1');
    await expect(page.getByRole('heading', { name: 'Daftar ini masih contoh' })).toHaveCount(0);
  });

  test('tidak ada overflow horizontal dan axe bersih (awal, tersaring, kosong, gagal)', async ({
    page,
  }) => {
    await page.goto('/dev/layanan-terdekat');
    await noHorizontalOverflow(page);
    await expectNoViolations(page, 'awal');
    await page.getByRole('combobox', { name: 'Provinsi' }).selectOption('Jawa Timur');
    await expectNoViolations(page, 'tersaring');
    await page.getByRole('searchbox', { name: 'Cari nama atau kota' }).fill('zzz');
    await expectNoViolations(page, 'kosong');
    await page.goto('/dev/layanan-terdekat?gagal=1');
    await expectNoViolations(page, 'gagal');
  });
});

test.describe('Panduan awal di Beranda (/dev/beranda?panduan=1)', () => {
  test('tidak tampil tanpa penanda; tampil dengan tiga langkah dan tautan yang benar', async ({
    page,
  }) => {
    await page.goto('/dev/beranda');
    await expect(page.getByRole('region', { name: 'Selamat datang di Mindra' })).toHaveCount(0);

    await page.goto('/dev/beranda?panduan=1');
    const card = page.getByRole('region', { name: 'Selamat datang di Mindra' });
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading', { level: 3 })).toHaveText([
      'Kenali perasaanmu',
      'Pegang kendali atas datamu',
      'Tahu ke mana mencari bantuan',
    ]);
    await expect(card.getByRole('link', { name: 'Mulai skrining' })).toHaveAttribute(
      'href',
      '/asesmen',
    );
    await expect(card.getByRole('link', { name: 'Atur izin' })).toHaveAttribute('href', '/privasi');
    await expect(card.getByRole('link', { name: 'Lihat bantuan' })).toHaveAttribute(
      'href',
      '/bantuan',
    );
  });

  test('menyembunyikan tanpa sesi: pesan galat yang jelas dan panduan tetap tampil', async ({
    page,
  }) => {
    await page.goto('/dev/beranda?panduan=1');
    await page.getByRole('button', { name: 'Sembunyikan panduan ini' }).click();
    const alert = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(alert).toBeVisible();
    await expect(page.getByRole('region', { name: 'Selamat datang di Mindra' })).toBeVisible();
  });

  test('urutan judul tidak melompat dan axe bersih (awal dan setelah galat)', async ({ page }) => {
    await page.goto('/dev/beranda?panduan=1');
    await noHorizontalOverflow(page);
    await expectNoViolations(page, 'awal');
    await page.getByRole('button', { name: 'Sembunyikan panduan ini' }).click();
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toBeVisible();
    await settle(page);
    await expectNoViolations(page, 'setelah galat');
  });
});

test.describe('Ringkasan Teman cerita di detail klien (/dev/klien)', () => {
  test('klien yang membagikan: empat hitungan, waktu terakhir, dan catatan bahwa isi tidak dibagikan', async ({
    page,
  }) => {
    await page.goto('/dev/klien');
    const section = page.getByRole('region', { name: 'Teman cerita' });
    await expect(section).toBeVisible();
    await expect(section.locator('dt')).toHaveText([
      'Percakapan',
      'Pesan',
      'Hari aktif',
      'Bertanda krisis',
    ]);
    await expect(section.locator('dd')).toHaveText(['6', '52', '4', '1']);
    await expect(section.getByText(/Dalam 30 hari terakhir, terakhir/)).toBeVisible();
    await expect(section.getByText(/Isi percakapan tidak pernah dibagikan/)).toBeVisible();
    await expect(section.getByText(/Klien tidak membagikan/)).toHaveCount(0);
  });

  test('klien yang tidak membagikan: tertulis tidak dibagikan, bukan kosong', async ({ page }) => {
    await page.goto('/dev/klien?bagikan=sebagian');
    const section = page.getByRole('region', { name: 'Teman cerita' });
    await expect(section).toContainText('Klien tidak membagikan ringkasan penggunaan Teman cerita');
    await expect(section.locator('dl')).toHaveCount(0);
  });

  test('axe bersih untuk kedua keadaan', async ({ page }) => {
    await page.goto('/dev/klien');
    await expectNoViolations(page, 'dibagikan');
    await page.goto('/dev/klien?bagikan=sebagian');
    await expectNoViolations(page, 'tidak dibagikan');
  });
});

test.describe('layanan terdekat publik (/layanan-terdekat)', () => {
  test('terbuka tanpa masuk dan tidak pernah menjawab galat server', async ({ page }) => {
    const response = await page.goto('/layanan-terdekat');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Layanan kesehatan terdekat');
    // Dengan database: daftar. Tanpa database yang terjangkau (mis. CI): pesan gagal yang jelas. Keduanya sah.
    const hasList = (await page.getByRole('article').count()) > 0;
    const hasFailure =
      (await page
        .locator('[role="alert"]:not(#__next-route-announcer__)')
        .filter({ hasText: 'Daftar layanan belum bisa dimuat' })
        .count()) > 0;
    const hasEmpty =
      (await page.getByRole('heading', { name: 'Tidak ada layanan yang cocok' }).count()) > 0;
    expect(hasList || hasFailure || hasEmpty).toBe(true);
  });
});
