import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Fase 2 (ekosistem perawatan) diuji lewat halaman pratinjau /dev/* yang memakai komponen yang SAMA
 * dengan halaman sungguhan, tetapi tanpa login dan tanpa menyimpan apa pun. Alur dengan akun sungguhan
 * (alert krisis lintas akun, izin pendamping) ada di fase2.auth.spec.ts (dilewati tanpa kredensial).
 */

/** role=alert milik aplikasi. Next.js memasang satu role=alert bawaan (pengumuman rute) di setiap halaman. */
const alerts = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');

const axe = (page: Page) =>
  new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .exclude('nextjs-portal');

async function expectNoViolations(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const results = await axe(page).analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target.join(' ')),
    })),
  ).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Pratinjau yang berisi panel realtime menandai diri setelah terhubung; tunggu sebelum berinteraksi. */
async function openDashboard(page: Page, query = '') {
  await page.goto(`/dev/psikolog${query}`);
  await expect(page.getByText('Terhubung langsung')).toBeVisible();
}

test.describe('dasbor psikolog (/dev/psikolog)', () => {
  test('menampilkan sapaan, peringatan terbuka, angka ringkasan, tabel klien, dan jadwal hari ini', async ({
    page,
  }) => {
    await openDashboard(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Selamat pagi, Rina.');

    const panel = page.getByRole('region', { name: 'Peringatan krisis, perlu ditindaklanjuti' });
    await expect(panel).toContainText('Dimas Pratama');
    await expect(panel).toContainText('PHQ-9 skor 17');
    await expect(panel).toContainText('1 terbuka');
    // Jawaban per butir tidak pernah ditampilkan kepada psikolog.
    await expect(panel).not.toContainText(/beberapa hari|hampir setiap hari/i);

    const stats = page.getByRole('term').filter({ hasText: 'klien aktif' });
    await expect(stats).toHaveCount(1);

    const table = page.getByRole('table');
    await expect(table.getByRole('row')).toHaveCount(6); // judul + 5 klien
    await expect(page.getByRole('region', { name: 'Hari ini' })).toContainText('Nadia Azzahra');
  });

  test('peringatan krisis baru muncul TANPA memuat ulang halaman dan diumumkan ke pembaca layar', async ({
    page,
  }) => {
    await openDashboard(page);
    // Penanda yang hilang bila dokumen dimuat ulang.
    await page.evaluate(() => {
      (window as unknown as { __tanpaReload: boolean }).__tanpaReload = true;
    });
    await expect(page.getByText('1 terbuka')).toBeVisible();

    await page.getByRole('button', { name: 'Simulasikan peringatan masuk' }).click();

    await expect(page.getByText('2 terbuka')).toBeVisible();
    const item = page.locator('li[data-alert-id]', { hasText: 'Nadia Azzahra' });
    await expect(item).toBeVisible();
    await expect(item).toContainText('Kritis');
    await expect(
      alerts(page).filter({ hasText: 'Peringatan krisis baru dari Nadia Azzahra.' }),
    ).toHaveCount(1);

    // Tidak ada navigasi: penanda masih ada dan fokus tidak dicuri dari halaman.
    expect(
      await page.evaluate(() => (window as unknown as { __tanpaReload?: boolean }).__tanpaReload),
    ).toBe(true);
  });

  test('"Tandai sudah ditangani" memakai Server Action asli: tanpa sesi, galatnya tampil dan kartu tetap', async ({
    page,
  }) => {
    await openDashboard(page);
    await page.getByRole('button', { name: /Tandai sudah ditangani/ }).click();
    await expect(alerts(page).filter({ hasText: 'Sesimu sudah berakhir' })).toBeVisible();
    await expect(page.getByText('1 terbuka')).toBeVisible();
  });

  test('filter tabel klien: skor memburuk dan belum check-in 3 hari', async ({ page }) => {
    await openDashboard(page, '?filter=memburuk');
    const rows = page.getByRole('table').getByRole('row');
    await expect(rows).toHaveCount(2); // judul + Dimas
    await expect(rows.nth(1)).toContainText('Dimas Pratama');

    await page.goto('/dev/psikolog?filter=belum-checkin');
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(2);
    await expect(page.getByRole('table')).toContainText('Bagas H.');
    await expect(page.getByRole('link', { name: 'Belum check-in 3 hari' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  test('klien yang tidak membagikan skrining ditulis "Tidak dibagikan", bukan dikosongkan', async ({
    page,
  }) => {
    await openDashboard(page);
    const sari = page.getByRole('row', { name: /Sari W\./ });
    await expect(sari).toContainText('Tidak dibagikan');
  });

  test('tanpa pelanggaran aksesibilitas dan tanpa overflow horizontal', async ({ page }) => {
    await openDashboard(page);
    await expectNoViolations(page);
    await expectNoHorizontalOverflow(page);
    // Keadaan setelah peringatan baru muncul juga harus lolos.
    await page.getByRole('button', { name: 'Simulasikan peringatan masuk' }).click();
    await expect(page.getByText('2 terbuka')).toBeVisible();
    await expectNoViolations(page);
  });
});

test.describe('detail klien (/dev/klien)', () => {
  test('klien yang membagikan semuanya: skrining, mood, tidur, peringatan, dan catatan sesi', async ({
    page,
  }) => {
    await page.goto('/dev/klien');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dimas Pratama');
    await expect(page.getByRole('region', { name: 'Skrining' })).toContainText('Berat');
    await expect(page.getByRole('region', { name: 'Mood 14 hari' })).toContainText('Check-in');
    await expect(page.getByRole('region', { name: 'Tidur 14 hari' })).toContainText('Rata-rata');
    await expect(page.getByRole('region', { name: 'Peringatan krisis' })).toContainText('Terbuka');
    // Satu formulir catatan per sesi, dengan dua kolom yang pembacanya dijelaskan.
    await expect(page.getByRole('textbox', { name: 'Catatan sesi' })).toHaveCount(2);
    await expect(page.getByText('Hanya kamu yang bisa membaca catatan ini.').first()).toBeVisible();
    await expect(page.getByText(/Klien bisa membaca catatan ini/).first()).toBeVisible();
    await expectNoViolations(page);
    await expectNoHorizontalOverflow(page);
  });

  test('klien yang hanya membagikan mood dan tidur: bagian lain ditulis "tidak dibagikan"', async ({
    page,
  }) => {
    await page.goto('/dev/klien?bagikan=sebagian');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sari W.');
    await expect(page.getByRole('region', { name: 'Skrining' })).toContainText(
      'Klien tidak membagikan hasil skrining',
    );
    await expect(page.getByRole('region', { name: 'Peringatan krisis' })).toContainText(
      'Klien tidak membagikan peringatan krisis',
    );
    // Yang dibagikan tetap tampil.
    await expect(page.getByRole('region', { name: 'Mood 14 hari' })).toContainText('Check-in');
    await expectNoViolations(page);
  });
});

test.describe('privasi dan izin (/dev/privasi)', () => {
  test('menampilkan siapa yang punya akses, saklar izin berlabel lengkap, riwayat akses, dan SATUSEHAT', async ({
    page,
  }) => {
    await page.goto('/dev/privasi');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Datamu, aturanmu.');
    await expect(
      page.getByRole('switch', { name: 'Hasil skrining untuk Rina Sari, M.Psi.' }),
    ).toBeChecked();
    await expect(
      page.getByRole('switch', { name: 'Ringkasan teman cerita untuk Rina Sari, M.Psi.' }),
    ).not.toBeChecked();
    await expect(page.getByRole('switch', { name: 'Hasil skrining untuk Ibu' })).not.toBeChecked();
    await expect(page.getByText('Kode undangan:')).toContainText('K7M2QX9R');

    const log = page.getByRole('region', { name: 'Riwayat akses' });
    await expect(log.getByText('Hari ini')).toBeVisible();
    await expect(log.getByText('Kemarin')).toBeVisible();
    await expect(log).toContainText('membuka hasil skrining');
    await expect(log).toContainText('menandai peringatan krisis sudah ditangani');

    await expect(page.getByRole('link', { name: /Unduh CSV/ })).toHaveAttribute(
      'href',
      '/privasi/riwayat',
    );
    await expect(
      page.getByRole('switch', { name: 'Izinkan sinkronisasi SATUSEHAT' }),
    ).not.toBeChecked();
  });

  test('saklar yang ditolak server kembali ke keadaan semula dan alasannya diumumkan', async ({
    page,
  }) => {
    await page.goto('/dev/privasi');
    const toggle = page.getByRole('switch', { name: 'Hasil skrining untuk Ibu' });
    await toggle.click();
    // Tanpa sesi, Server Action menolak: saklar kembali mati dan toast galat tampil.
    await expect(page.getByText('Izin belum berubah')).toBeVisible();
    await expect(page.getByText('Sesimu sudah berakhir.')).toBeVisible();
    await expect(toggle).not.toBeChecked();
  });

  test('keadaan kosong: hanya pemilik yang bisa melihat datanya, dengan ajakan menghubungkan', async ({
    page,
  }) => {
    await page.goto('/dev/privasi?kosong=1');
    await expect(
      page.getByRole('heading', { name: 'Saat ini hanya kamu yang bisa melihat datamu' }),
    ).toBeVisible();
    await expect(page.getByText('Belum ada yang membuka datamu.')).toBeVisible();
    await expectNoViolations(page);
  });

  test('formulir undangan dan daftar psikolog yang bisa dihubungkan tersedia dan dapat dibuka dengan keyboard', async ({
    page,
  }) => {
    await page.goto('/dev/privasi');
    await page.getByText('Undang pendamping').click();
    await expect(page.getByLabel('Nomor ponsel pendamping')).toBeVisible();
    // Server Action menolak nomor yang bukan nomor ponsel Indonesia dengan pesan yang membantu.
    await page.getByLabel('Nomor ponsel pendamping').fill('123');
    await page.getByRole('button', { name: 'Buat undangan' }).click();
    await expect(page.getByText('Isi nomor ponsel yang benar')).toBeVisible();

    await page.getByText('Hubungkan psikolog').click();
    await expect(page.getByText('Budi Hartono, M.Psi.', { exact: true })).toBeVisible();
    await expect(page.getByText(/Ringkasan teman cerita tidak dibagikan kecuali/)).toBeVisible();
  });

  test('tanpa pelanggaran aksesibilitas dan tanpa overflow horizontal', async ({ page }) => {
    await page.goto('/dev/privasi');
    await expectNoViolations(page);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('portal pendamping (/dev/pendamping)', () => {
  test('daftar orang yang didampingi menyebut data yang dibagikan, dan ada formulir undangan serta panduan', async ({
    page,
  }) => {
    await page.goto('/dev/pendamping');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Halo, Sari.');
    await expect(page.getByText('Yang dibagikan: mood harian, peringatan darurat.')).toBeVisible();
    await expect(page.getByText('Belum ada data yang dibagikan.')).toBeVisible();
    await expect(page.getByLabel('Kode undangan')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Panduan untuk pendamping' })).toBeVisible();
    await expectNoViolations(page);
    await expectNoHorizontalOverflow(page);
  });

  test('menerima undangan dengan kode yang bentuknya salah menampilkan pesan yang membantu', async ({
    page,
  }) => {
    await page.goto('/dev/pendamping');
    await page.getByLabel('Kode undangan').fill('ab');
    await page.getByRole('button', { name: 'Terima undangan' }).click();
    await expect(page.getByText(/Kode undangan biasanya 8 huruf dan angka/)).toBeVisible();
  });

  test('keadaan kosong mengajak meminta undangan', async ({ page }) => {
    await page.goto('/dev/pendamping?kosong=1');
    await expect(page.getByRole('heading', { name: 'Belum ada yang kamu dampingi' })).toBeVisible();
  });

  test('panduan dapat dibuka dengan keyboard dan memuat nomor layanan krisis dari sumber tunggal', async ({
    page,
  }) => {
    await page.goto('/dev/pendamping');
    const article = page.locator('article', { hasText: 'Kapan harus mencari bantuan profesional' });
    await article.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(article.getByText(/119 ext\. 8/)).toBeVisible();
  });
});

test.describe('detail pendamping (/dev/pendamping-detail)', () => {
  test('hanya bagian yang diizinkan yang tampil; hasil skrining tidak dibagikan; ada banner darurat', async ({
    page,
  }) => {
    await page.goto('/dev/pendamping-detail');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Argy F.');

    await expect(page.getByRole('region', { name: 'Mood 7 hari' })).toContainText('Check-in');
    await expect(page.getByRole('region', { name: 'Hasil skrining terakhir' })).toContainText(
      'Argy F. tidak membagikan hasil skrining',
    );
    // Skor dan jawaban tidak pernah dikirim ke halaman pendamping.
    await expect(page.locator('main')).not.toContainText(/skor \d+|\bPHQ-9\b/);

    const banner = alerts(page).filter({ hasText: 'Ada peringatan darurat untuk Argy F.' });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('link', { name: /Hubungi/ })).toHaveAttribute('href', /^tel:/);
    await expectNoViolations(page);
    await expectNoHorizontalOverflow(page);
  });
});
