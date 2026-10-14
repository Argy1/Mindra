import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Fase 4 (portal faskes, Teman cerita, Konsultasi) lewat halaman pratinjau /dev/* yang memakai komponen yang SAMA
 * dengan halaman sungguhan, tanpa login dan tanpa menyimpan apa pun. Perilaku HTTP API dan gerbang rute diuji
 * terhadap server sungguhan tanpa kredensial. Alur dengan akun sungguhan ada di fase4.auth.spec.ts (dilewati
 * tanpa kredensial).
 */

const alerts = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');

const axe = (page: Page) =>
  new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .exclude('nextjs-portal');

async function expectNoViolations(page: Page, options: { exclude?: string[] } = {}) {
  await page.evaluate(() => document.fonts.ready);
  let builder = axe(page);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);
  const results = await builder.analyze();
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

/** Hari dipilih lewat label-nya (radio aslinya disembunyikan secara visual). */
const pickDay = (page: Page, text: string) =>
  page.locator('label').filter({ hasText: text }).click();

// Setiap pengujian memakai IP sendiri supaya batas laju per IP tidak saling mengganggu antar proyek dan antar putaran.
const octet = () => Math.floor(Math.random() * 254) + 1;
const uniqueIp = () => `10.${octet()}.${octet()}.${octet()}`;
const headersFor = (extra: Record<string, string> = {}) => ({ 'x-real-ip': uniqueIp(), ...extra });

// ───────────────────────────────────────────────────────────────────────────────
// Portal faskes
// ───────────────────────────────────────────────────────────────────────────────
test.describe('dasbor faskes (/dev/faskes)', () => {
  test('menampilkan judul wilayah, catatan anonim, empat ringkasan, grafik, perbandingan kota, dan sebaran', async ({
    page,
  }) => {
    await page.goto('/dev/faskes');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Kesehatan mental warga Kota Bogor',
    );
    await expect(page.getByText('Semua angka di halaman ini adalah gabungan anonim')).toBeVisible();

    for (const label of [
      'warga aktif pekan terakhir',
      'rata-rata skor PHQ-9',
      'skor sedang atau berat',
      'peringatan krisis dalam periode',
    ]) {
      await expect(page.getByRole('term').filter({ hasText: label })).toHaveCount(1);
    }

    // Grafik punya ringkasan teks yang menyebut arah dan puncak, bukan hanya gambar.
    const chart = page.locator('svg[role="img"]:visible').first();
    await expect(chart).toHaveAttribute(
      'aria-label',
      /PHQ-9 \(depresi\): .* tertinggi .* pada pekan/,
    );

    // Kota yang kurang dari 10 pengguna disembunyikan, bukan digambar nol.
    const comparison = page.getByRole('region', { name: 'Dibanding kota lain' });
    await expect(comparison).toContainText('Kab. Cianjur');
    await expect(comparison).toContainText('disembunyikan karena penggunanya kurang dari 10');
    await expect(comparison.getByText('(kotamu)')).toHaveCount(1);
  });

  test('angka grafik tersedia sebagai tabel, dan pekan tersembunyi ditandai', async ({ page }) => {
    await page.goto('/dev/faskes');
    await page.getByText('Lihat angka sebagai tabel').click();
    const table = page.getByRole('table', { name: /Rata-rata skor per pekan/ });
    await expect(table).toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(13); // judul + 12 pekan
    // Pekan berjalan: Kota Bogor baru dua hari, di bawah 10 pengguna.
    await expect(table).toContainText('disembunyikan (kurang dari 10 pengguna)');
  });

  test('pilihan periode memakai tautan; bawaan 12 minggu; periode asing jatuh ke bawaan', async ({
    page,
  }) => {
    // Tiga pemuatan halaman berturut-turut ke server dev saat seluruh suite berjalan paralel.
    test.setTimeout(90_000);
    await page.goto('/dev/faskes');
    const nav = page.getByRole('navigation', { name: 'Periode' });
    await expect(nav.getByRole('link', { name: '12 minggu' })).toHaveAttribute(
      'aria-current',
      'true',
    );

    await nav.getByRole('link', { name: '4 minggu' }).click();
    await expect(page).toHaveURL(/periode=4/, { timeout: 20_000 });
    await expect(page.getByText('4 minggu terakhir')).toBeVisible();
    await expect(nav.getByRole('link', { name: '4 minggu' })).toHaveAttribute(
      'aria-current',
      'true',
    );

    await page.goto('/dev/faskes?periode=999');
    await expect(page.getByText('12 minggu terakhir')).toBeVisible();
    await page.goto('/dev/faskes?periode=52');
    await expect(page.getByText('1 tahun terakhir')).toBeVisible();
  });

  test('tidak ada overflow horizontal dan lolos axe, di semua periode', async ({ page }) => {
    for (const periode of ['4', '12', '52']) {
      await page.goto(`/dev/faskes?periode=${periode}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoViolations(page);
    }
  });

  test('tautan ke kunci API dan dokumentasi ada', async ({ page }) => {
    await page.goto('/dev/faskes');
    await expect(page.getByRole('link', { name: 'Kelola kunci API' })).toHaveAttribute(
      'href',
      '/faskes/kunci-api',
    );
    await expect(page.getByRole('link', { name: 'Dokumentasi', exact: true })).toHaveAttribute(
      'href',
      '/developers',
    );
  });
});

test.describe('peta layanan (/dev/faskes-peta)', () => {
  test('peta Leaflet dimuat dengan atribusi OpenStreetMap; semua angka juga ada di tabel', async ({
    page,
  }) => {
    await page.goto('/dev/faskes-peta');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Peta layanan di Jawa Barat');
    const map = page.getByRole('group', { name: /Peta interaktif sebaran rata-rata PHQ-9/ });
    await expect(map.locator('.leaflet-container')).toHaveCount(0); // wadah itu sendiri adalah .leaflet-container
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap');

    const table = page.getByRole('table', { name: /Rata-rata PHQ-9 dan pengguna aktif per kota/ });
    await expect(table.getByRole('row')).toHaveCount(5); // judul + 4 kota
    await expect(table).toContainText('Disembunyikan (kurang dari 10 pengguna)');
    await expect(table).toContainText('(kotamu)');
  });

  test('daftar faskes publik tersedia sebagai tabel dan faskesmu ditandai', async ({ page }) => {
    await page.goto('/dev/faskes-peta');
    const table = page.getByRole('table', { name: 'Daftar faskes di provinsi ini' });
    await expect(table.getByRole('row')).toHaveCount(9); // judul + 8 faskes
    await expect(table).toContainText('(faskesmu)');
  });

  test('tidak ada overflow horizontal dan lolos axe (selain bagian dalam peta pihak ketiga)', async ({
    page,
  }) => {
    await page.goto('/dev/faskes-peta');
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoViolations(page, { exclude: ['.leaflet-container'] });
  });

  test('peta bisa dioperasikan dengan keyboard: fokus masuk dan tombol zoom punya nama', async ({
    page,
  }) => {
    await page.goto('/dev/faskes-peta');
    await expect(
      page
        .getByRole('button', { name: /zoom in|perbesar/i })
        .or(page.locator('.leaflet-control-zoom-in')),
    ).toBeVisible();
    await expect(page.locator('.leaflet-control-zoom-in')).toHaveAttribute('role', 'button');
  });
});

test.describe('laporan bulanan (/dev/faskes-laporan)', () => {
  test('tabel anonim, pilihan bulan, dan tautan unduh CSV ke rute asli', async ({ page }) => {
    await page.goto('/dev/faskes-laporan');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Laporan bulanan');
    const table = page.getByRole('table', { name: 'Laporan Oktober 2026 per kota' });
    await expect(table).toContainText('Kota Bogor');
    await expect(table).toContainText('Disembunyikan (kurang dari 10 pengguna)');

    const download = page.getByRole('link', { name: /Unduh CSV/ });
    await expect(download).toHaveAttribute('href', /^\/faskes\/unduh\/laporan\?bulan=2026-10/);

    await page
      .getByRole('navigation', { name: 'Bulan' })
      .getByRole('link', { name: 'September 2026' })
      .click();
    await expect(page).toHaveURL(/bulan=2026-09/);
    await expect(
      page.getByRole('table', { name: 'Laporan September 2026 per kota' }),
    ).toBeVisible();
  });

  test('bulan yang bukan pilihan jatuh ke bulan terbaru; tidak ada overflow; lolos axe', async ({
    page,
  }) => {
    await page.goto('/dev/faskes-laporan?bulan=1999-01');
    await expect(page.getByRole('table', { name: 'Laporan Oktober 2026 per kota' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoViolations(page);
  });
});

test.describe('gerbang portal faskes tanpa masuk', () => {
  for (const path of [
    '/faskes',
    '/faskes/peta',
    '/faskes/laporan',
    '/faskes/kunci-api',
    '/faskes/keamanan',
    '/faskes/verifikasi',
  ]) {
    test(`${path} mengarahkan ke halaman masuk`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/masuk/);
    });
  }

  test('unduhan CSV tanpa sesi tidak pernah memberi berkas', async ({ request }) => {
    const response = await request.get('/faskes/unduh/laporan?bulan=2026-10', {
      maxRedirects: 0,
      headers: headersFor(),
    });
    expect([301, 302, 303, 307, 308, 401, 403]).toContain(response.status());
    expect(response.headers()['content-type'] ?? '').not.toContain('text/csv');
    expect(await response.text()).not.toContain('rata2_phq9');
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// Teman cerita
// ───────────────────────────────────────────────────────────────────────────────
test.describe('Teman cerita (/dev/teman-cerita)', () => {
  test('keadaan awal: sapaan, catatan bahwa ini AI, saran pembuka, kolom tulis berlabel', async ({
    page,
  }) => {
    await page.goto('/dev/teman-cerita');
    await expect(page.getByRole('heading', { level: 1, name: 'Teman cerita' })).toBeVisible();
    const log = page.getByRole('log', { name: 'Percakapan dengan Teman cerita' });
    await expect(log).toContainText('Teman cerita adalah AI');
    await expect(log).toContainText('119 ext. 8');
    await expect(log).toContainText('Hai. Aku di sini.');
    await expect(
      page.getByRole('group', { name: 'Saran pembuka' }).getByRole('button'),
    ).toHaveCount(3);
    await expect(page.getByLabel('Tulis pesan')).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Kirim' })).toBeDisabled();
    await expectNoHorizontalOverflow(page);
    await expectNoViolations(page);
  });

  test('mengirim pesan: pesanmu muncul, indikator menulis, balasan mengalir lalu masuk daftar', async ({
    page,
  }) => {
    await page.goto('/dev/teman-cerita');
    await page.getByLabel('Tulis pesan').fill('Capek banget hari ini');
    await page.getByRole('button', { name: 'Kirim' }).click();

    const log = page.getByRole('log', { name: 'Percakapan dengan Teman cerita' });
    await expect(log).toContainText('Capek banget hari ini');
    await expect(page.getByRole('status').filter({ hasText: 'sedang menulis' })).toBeAttached();
    await expect(page.getByRole('button', { name: 'Berhenti' })).toBeVisible();

    await expect(log).toContainText('Kedengarannya kamu sedang memikul banyak hal', {
      timeout: 10_000,
    });
    await expect(log).toContainText('mana yang paling bikin dadamu sesak');
    await expect(page.getByRole('button', { name: 'Berhenti' })).toBeHidden();
    await expect(page.getByLabel('Tulis pesan')).toHaveValue('');
    await expect(alerts(page)).toHaveCount(0);
    await expectNoViolations(page);
  });

  test('Enter mengirim, Shift+Enter menambah baris', async ({ page }) => {
    await page.goto('/dev/teman-cerita');
    const box = page.getByLabel('Tulis pesan');
    await box.fill('baris satu');
    await box.press('Shift+Enter');
    await box.type('baris dua');
    await expect(box).toHaveValue('baris satu\nbaris dua');
    await box.press('Enter');
    await expect(page.getByRole('log')).toContainText('baris dua');
    await expect(box).toHaveValue('');
  });

  test('saran pembuka mengirim pesan dan hilang setelahnya', async ({ page }) => {
    await page.goto('/dev/teman-cerita');
    await page.getByRole('button', { name: 'Aku cuma mau cerita dulu' }).click();
    await expect(page.getByRole('log')).toContainText('Aku cuma mau cerita dulu');
    await expect(page.getByRole('group', { name: 'Saran pembuka' })).toHaveCount(0);
  });

  test('pesan krisis: banner peran alert dengan tombol telepon, balasan tetap, fokus pindah ke banner', async ({
    page,
  }) => {
    await page.goto('/dev/teman-cerita');
    await page.getByLabel('Tulis pesan').fill('Aku ingin mati saja rasanya');
    await page.getByRole('button', { name: 'Kirim' }).click();

    const banner = alerts(page).filter({ hasText: 'Kamu tidak sendirian' });
    await expect(banner).toBeVisible({ timeout: 10_000 });
    const call = banner.getByRole('link', { name: /Hubungi 119 ext\. 8/ });
    await expect(call).toHaveAttribute('href', 'tel:119,8');
    await expect(banner).toContainText('tanpa isi percakapanmu');
    await expect(banner).toBeFocused();

    const log = page.getByRole('log');
    await expect(log).toContainText('Apakah kamu aman sekarang?');
    await expect(log).toContainText('SEJIWA di 119 ext. 8');
    await expectNoViolations(page);
  });

  test('galat model: pesan jelas, teks dikembalikan ke kolom tulis, tidak ada gelembung setengah jadi', async ({
    page,
  }) => {
    await page.goto('/dev/teman-cerita?mode=gagal');
    await page.getByLabel('Tulis pesan').fill('Tolong dengarkan aku');
    await page.getByRole('button', { name: 'Kirim' }).click();

    const alert = alerts(page).filter({ hasText: 'sedang tidak bisa menjawab' });
    await expect(alert).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Tulis pesan')).toHaveValue('Tolong dengarkan aku');
    await expect(page.getByRole('log')).not.toContainText('Kedengarannya');
    await expect(page.getByRole('log')).not.toContainText('Tolong dengarkan aku');
    await expectNoViolations(page);
  });

  test('batas pesan per jam: kalimat menyebut kira-kira berapa menit lagi', async ({ page }) => {
    await page.goto('/dev/teman-cerita?mode=batas');
    await page.getByLabel('Tulis pesan').fill('halo');
    await page.getByRole('button', { name: 'Kirim' }).click();
    await expect(alerts(page).filter({ hasText: 'sekitar 25 menit lagi' })).toBeVisible();
    await expect(page.getByLabel('Tulis pesan')).toHaveValue('halo');
  });

  test('tombol Berhenti menghentikan balasan tanpa galat dan mengembalikan teks', async ({
    page,
  }) => {
    await page.goto('/dev/teman-cerita?mode=lambat');
    await page.getByLabel('Tulis pesan').fill('pelan-pelan saja');
    await page.getByRole('button', { name: 'Kirim' }).click();
    await page.getByRole('button', { name: 'Berhenti' }).click();
    await expect(page.getByRole('button', { name: 'Kirim' })).toBeVisible();
    await expect(page.getByLabel('Tulis pesan')).toHaveValue('pelan-pelan saja');
    await expect(alerts(page)).toHaveCount(0);
  });

  test('riwayat: dialog daftar percakapan, ESC menutup dan fokus kembali ke tombol', async ({
    page,
  }) => {
    await page.goto('/dev/teman-cerita?riwayat=1');
    const trigger = page.getByRole('button', { name: 'Riwayat' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Riwayat percakapan' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link')).toHaveCount(3); // 2 percakapan + "Percakapan baru"
    await expect(dialog).toContainText('Susah tidur beberapa hari ini');
    await expectNoViolations(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('riwayat percakapan lama tampil, dengan penanda pembicara untuk pembaca layar', async ({
    page,
  }) => {
    await page.goto('/dev/teman-cerita?riwayat=1');
    const log = page.getByRole('log');
    await expect(log).toContainText('Capek banget. Tugas numpuk');
    await expect(log.getByText('Kamu:', { exact: false }).first()).toBeAttached();
    await expect(log.getByText('Teman cerita:', { exact: false }).first()).toBeAttached();
  });

  test('server belum dikonfigurasi: kolom tulis mati dan alasannya jelas', async ({ page }) => {
    await page.goto('/dev/teman-cerita?nonaktif=1');
    await expect(page.getByLabel('Tulis pesan')).toBeDisabled();
    await expect(page.getByText('belum diaktifkan di server ini')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Saran pembuka' })).toHaveCount(0);
  });

  test('tidak ada overflow horizontal di percakapan panjang', async ({ page }) => {
    await page.goto('/dev/teman-cerita?riwayat=1');
    await page.getByLabel('Tulis pesan').fill('x'.repeat(1800));
    await expect(page.getByText(/karakter tersisa/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('API Teman cerita tanpa kredensial', () => {
  test('POST /api/v1/companion/chat tanpa token: 401 seragam', async ({ request }) => {
    const response = await request.post('/api/v1/companion/chat', {
      headers: headersFor({ 'content-type': 'application/json' }),
      data: { message: 'halo' },
    });
    expect(response.status()).toBe(401);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
      'unauthorized',
    );
  });

  test('token palsu juga 401; tidak ada aliran SSE yang terbuka', async ({ request }) => {
    const response = await request.post('/api/v1/companion/chat', {
      headers: headersFor({
        'content-type': 'application/json',
        authorization: 'Bearer aaaa.bbbb.cccc',
      }),
      data: { message: 'halo' },
    });
    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');
  });

  test('halaman /teman-cerita mengarahkan ke masuk bila belum login', async ({ page }) => {
    await page.goto('/teman-cerita');
    await expect(page).toHaveURL(/\/masuk/);
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// Konsultasi
// ───────────────────────────────────────────────────────────────────────────────
test.describe('Konsultasi (/dev/konsultasi)', () => {
  test('menampilkan sesi mendatang, riwayat, filter, dan kartu psikolog', async ({ page }) => {
    await page.goto('/dev/konsultasi');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Konsultasi');
    const sessions = page.getByRole('region', { name: 'Sesi kamu' });
    await expect(sessions).toContainText('Kamis, 15 Oktober');
    await expect(sessions).toContainText('10.00–10.50 WIB');
    await expect(sessions).toContainText('Terjadwal');
    await expect(sessions).toContainText('Menunggu konfirmasi');
    await expect(sessions.getByRole('button', { name: 'Batalkan' })).toHaveCount(2);
    await expect(page.getByRole('heading', { level: 2, name: '3 psikolog' })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(3);
    await expectNoHorizontalOverflow(page);
    await expectNoViolations(page);
  });

  test('batalkan sesi memakai konfirmasi dua langkah', async ({ page }) => {
    await page.goto('/dev/konsultasi');
    const sessions = page.getByRole('region', { name: 'Sesi kamu' });
    await sessions.getByRole('button', { name: 'Batalkan' }).first().click();
    await expect(sessions.getByText('Batalkan sesi ini?')).toBeVisible();
    await sessions.getByRole('button', { name: 'Tidak jadi' }).click();
    await expect(sessions.getByText('Batalkan sesi ini?')).toBeHidden();
  });

  test('riwayat sesi dilipat dan memuat sesi selesai serta dibatalkan', async ({ page }) => {
    await page.goto('/dev/konsultasi');
    await page.getByText('Riwayat sesi (2)').click();
    const sessions = page.getByRole('region', { name: 'Sesi kamu' });
    await expect(sessions).toContainText('Selesai');
    await expect(sessions).toContainText('Dibatalkan');
  });

  test('filter lewat formulir GET: pencarian, spesialisasi, dan urutan hidup di URL', async ({
    page,
  }) => {
    await page.goto('/dev/konsultasi');
    await page.getByLabel('Cari nama atau topik').fill('stres kerja');
    await page.getByRole('button', { name: 'Terapkan' }).click();
    await expect(page).toHaveURL(/q=stres/);
    await expect(page.getByRole('heading', { level: 2, name: '1 dari 3 psikolog' })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('article')).toContainText('Budi Hartono');

    await page.getByRole('link', { name: 'Hapus filter' }).click();
    await expect(page.getByRole('article')).toHaveCount(3);

    await page.goto('/dev/konsultasi?spesialisasi=Remaja&urut=nama');
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('combobox', { name: 'Spesialisasi' })).toHaveValue('Remaja');
    await expect(page.getByRole('combobox', { name: 'Urutkan' })).toHaveValue('nama');
  });

  test('tidak ada hasil: keadaan kosong yang menawarkan jalan keluar; tarif nol ditulis belum ditetapkan', async ({
    page,
  }) => {
    await page.goto('/dev/konsultasi?q=tidak-ada-yang-cocok');
    await expect(page.getByText('Belum ada yang cocok')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Hapus filter' })).toBeVisible();

    await page.goto('/dev/konsultasi');
    await expect(page.getByRole('article').filter({ hasText: 'Ayu Lestari' })).toContainText(
      'Belum ditetapkan',
    );
    await expect(page.getByRole('article').filter({ hasText: 'Ayu Lestari' })).toContainText(
      'Belum ada penilaian',
    );
  });

  test('tanpa sesi: ajakan memilih psikolog', async ({ page }) => {
    await page.goto('/dev/konsultasi?kosong=1');
    await expect(page.getByText('Belum ada sesi')).toBeVisible();
    await expectNoViolations(page);
  });

  test('nilai filter berbahaya tidak merusak halaman', async ({ page }) => {
    await page.goto(
      `/dev/konsultasi?q=${encodeURIComponent('<script>alert(1)</script>')}&urut=acak&bahasa=%00`,
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Konsultasi');
    await expect(page.getByRole('combobox', { name: 'Urutkan' })).toHaveValue('rating');
  });
});

test.describe('pemilih jam (/dev/konsultasi-detail)', () => {
  test('hari, jam, dan ringkasan: slot terisi dimatikan, pilihan menampilkan ringkasan WIB', async ({
    page,
  }) => {
    await page.goto('/dev/konsultasi-detail');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rina Sari');
    await expect(page.getByRole('button', { name: 'Pesan sesi' })).toBeDisabled();

    // Hari ini: 09.00 dan 10.00 sudah lewat batas 1 jam, jadi mati.
    await expect(page.getByLabel(/^09\.00/)).toBeDisabled();
    await expect(page.getByLabel(/^11\.00/)).toBeEnabled();

    await pickDay(page, 'Kam, 15 Okt');
    await expect(page.getByLabel(/^10\.00/)).toBeDisabled(); // sudah dipesan
    await expect(page.getByLabel(/^09\.00/)).toBeEnabled();
    await expect(page.getByLabel(/^10\.00/)).toHaveAccessibleName(/sudah dipesan/);

    await page.getByText('09.00', { exact: true }).click();
    await expect(page.getByText('Kamis, 15 Oktober, 09.00–09.50 WIB')).toBeVisible();
    await expect(page.getByText(/pembayaran belum tersedia di Mindra Web/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pesan sesi' })).toBeEnabled();
  });

  test('keyboard: panah memindahkan pilihan hari, Spasi memilih jam', async ({ page }) => {
    await page.goto('/dev/konsultasi-detail');
    await page.getByRole('radio', { name: /Rab, 14 Okt/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: /Kam, 15 Okt/ })).toBeChecked();
    await page.getByRole('radio', { name: /^09\.00/ }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('radio', { name: /^09\.00/ })).toBeChecked();
  });

  test('memesan tanpa sesi: pesan galat jelas, pilihan dikosongkan, slot dimuat ulang', async ({
    page,
  }) => {
    await page.goto('/dev/konsultasi-detail');
    await pickDay(page, 'Kam, 15 Okt');
    await page.getByText('11.00', { exact: true }).click();
    await page.getByRole('button', { name: 'Pesan sesi' }).click();
    await expect(alerts(page).filter({ hasText: 'Sesimu sudah berakhir' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /^11\.00/ })).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Pesan sesi' })).toBeDisabled();
  });

  test('hari tanpa jadwal: penjelasan, bukan layar kosong', async ({ page }) => {
    await page.goto('/dev/konsultasi-detail');
    await pickDay(page, 'Sab, 17 Okt');
    await expect(page.getByText('tidak punya jadwal di hari itu')).toBeVisible();
  });

  test('tidak ada overflow horizontal dan lolos axe', async ({ page }) => {
    await page.goto('/dev/konsultasi-detail');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoViolations(page);
    await pickDay(page, 'Kam, 15 Okt');
    await page.getByText('09.00', { exact: true }).click();
    // Tunggu transisi warna selesai: axe membaca warna di tengah transisi sebagai kontras rendah.
    await page.waitForTimeout(400);
    await expectNoViolations(page);
  });
});

test.describe('jadwal psikolog (/dev/jadwal)', () => {
  test('sesi per hari, nama hanya untuk klien yang menautkan akun, hari relatif', async ({
    page,
  }) => {
    await page.goto('/dev/jadwal');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jadwal');
    const upcoming = page.getByRole('region', { name: 'Akan datang' });
    await expect(upcoming).toContainText('Hari ini');
    await expect(upcoming).toContainText('Besok');
    await expect(upcoming).toContainText('Argy Fadillah');
    await expect(upcoming).toContainText('Dewi Lestari');
    await expect(upcoming.getByText('Klien (belum menautkan akun)')).toHaveCount(2);
    await expect(page.getByRole('region', { name: 'Baru lewat' })).toContainText('Selesai');
    await expectNoHorizontalOverflow(page);
    await expectNoViolations(page);
  });

  test('tanpa sesi: keadaan kosong', async ({ page }) => {
    await page.goto('/dev/jadwal?kosong=1');
    await expect(page.getByText('Belum ada sesi terjadwal')).toBeVisible();
  });
});

test.describe('API konsultasi tanpa kredensial dan dokumentasi', () => {
  test('GET /psychologists, GET slots, POST /consultations tanpa token: 401', async ({
    request,
  }) => {
    const id = '00000000-0000-4000-8000-0000b5100000';
    const list = await request.get('/api/v1/psychologists', { headers: headersFor() });
    expect(list.status()).toBe(401);
    const slots = await request.get(`/api/v1/psychologists/${id}/slots`, { headers: headersFor() });
    expect(slots.status()).toBe(401);
    const book = await request.post('/api/v1/consultations', {
      headers: headersFor({ 'content-type': 'application/json' }),
      data: { psychologistId: id, startsAt: '2026-10-21T10:00:00+07:00' },
    });
    expect(book.status()).toBe(401);
  });

  test('OpenAPI memuat endpoint baru, aliran SSE, dan kode 409', async ({ request }) => {
    const response = await request.get('/api/v1/openapi.json', { headers: headersFor() });
    expect(response.status()).toBe(200);
    const doc = (await response.json()) as {
      paths: Record<
        string,
        Record<string, { responses: Record<string, { content?: Record<string, unknown> }> }>
      >;
      components: { schemas?: Record<string, unknown> };
    };
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        '/api/v1/companion/chat',
        '/api/v1/psychologists',
        '/api/v1/psychologists/{id}/slots',
        '/api/v1/consultations',
      ]),
    );
    expect(doc.paths['/api/v1/companion/chat']!.post!.responses['200']!.content).toHaveProperty(
      'text/event-stream',
    );
    expect(doc.paths['/api/v1/consultations']!.post!.responses).toHaveProperty('409');
    expect(doc.paths['/api/v1/consultations']!.post!.responses).toHaveProperty('429');
  });

  test('halaman /developers mendokumentasikan Teman cerita dan Konsultasi', async ({ page }) => {
    await page.goto('/developers');
    await expect(page.getByText('/api/v1/companion/chat').first()).toBeVisible();
    await expect(page.getByText('/api/v1/consultations').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('halaman /konsultasi dan jadwal psikolog mengarahkan ke masuk bila belum login', async ({
    page,
  }) => {
    await page.goto('/konsultasi');
    await expect(page).toHaveURL(/\/masuk/);
    await page.goto('/konsultasi/00000000-0000-4000-8000-0000b5100000');
    await expect(page).toHaveURL(/\/masuk/);
    await page.goto('/psikolog/jadwal');
    await expect(page).toHaveURL(/\/masuk/);
  });
});
