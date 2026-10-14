import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Gelombang 1 sebelum deploy: halaman Profil, portal admin, dan gerbang rutenya. Dua halaman berlogin diuji lewat
 * pratinjau /dev/* yang memakai komponen yang SAMA dengan halaman sungguhan, tanpa login dan tanpa menyimpan apa pun:
 * Server Action asli menjawab "sesimu sudah berakhir", dan itulah cara memeriksa tampilan galat. Aksesibilitas
 * (axe) kedua halaman ada di fase5.spec.ts; alur dengan akun sungguhan ada di gelombang1.auth.spec.ts.
 */

const alerts = (scope: Page | Locator) =>
  scope.locator('[role="alert"]:not(#__next-route-announcer__)');

const octet = () => Math.floor(Math.random() * 254) + 1;
const uniqueIp = () => `10.${octet()}.${octet()}.${octet()}`;

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('Profil (/dev/profil)', () => {
  test('memuat empat bagian bernama, data diri terisi, dan 38 provinsi dalam daftar', async ({
    page,
  }) => {
    await page.goto('/dev/profil');
    await expect(page.getByRole('heading', { level: 1, name: 'Profilmu' })).toBeVisible();
    for (const name of ['Tentang kamu', 'Tampilan', 'Datamu', 'Hapus akun']) {
      await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
    }

    await expect(page.getByLabel('Nama panggilan')).toHaveValue('Argy Demo');
    await expect(page.getByLabel('Email')).toHaveValue('pengguna@demo.mindra.test');
    await expect(page.getByLabel('Email')).toHaveAttribute('readonly', '');
    await expect(page.getByLabel('Kota atau kabupaten')).toHaveValue('Kota Bogor');
    await expect(page.getByRole('combobox', { name: /^Provinsi/ })).toHaveValue('Jawa Barat');
    // "Belum dipilih" + 38 provinsi.
    await expect(page.getByRole('combobox', { name: /^Provinsi/ }).locator('option')).toHaveCount(
      39,
    );
    // Saran kota berasal dari faskes yang ada.
    await expect(page.locator('#saran-kota option')).toHaveCount(5);
  });

  test('statistik wilayah: pilihan eksplisit dengan penjelasan yang jujur (anonim, minimal 10 orang, bisa dimatikan)', async ({
    page,
  }) => {
    await page.goto('/dev/profil');
    const optIn = page.getByRole('checkbox', { name: /Ikut statistik wilayah anonim/ });
    await expect(optIn).toBeChecked(); // data contoh: sudah ikut
    const label = page.locator('label').filter({ has: optIn });
    await expect(label).toContainText('Tanpa namamu');
    await expect(label).toContainText('sedikitnya 10 orang');
    await expect(label).toContainText('matikan kapan saja');
  });

  test('ikut statistik tanpa kota dan provinsi: dua pesan di kolomnya, fokus ke kolom pertama bermasalah, tidak ada yang tersimpan', async ({
    page,
  }) => {
    await page.goto('/dev/profil');
    await page.getByLabel('Kota atau kabupaten').fill('');
    await page.getByRole('combobox', { name: /^Provinsi/ }).selectOption('');
    await page.getByRole('button', { name: 'Simpan profil' }).click();

    await expect(page.getByLabel('Kota atau kabupaten')).toHaveAccessibleDescription(
      /Isi kotamu untuk ikut statistik wilayah/,
    );
    await expect(page.getByRole('combobox', { name: /^Provinsi/ })).toHaveAccessibleDescription(
      /Pilih provinsimu untuk ikut statistik wilayah/,
    );
    await expect(page.getByLabel('Kota atau kabupaten')).toBeFocused();
  });

  test('nama kosong dan kota berisi tanda yang tak diizinkan ditolak sebelum menyentuh server', async ({
    page,
  }) => {
    await page.goto('/dev/profil');
    await page.getByLabel('Nama panggilan').fill('');
    await page.getByLabel('Kota atau kabupaten').fill('Bogor<script>');
    await page.getByRole('button', { name: 'Simpan profil' }).click();
    await expect(page.getByLabel('Nama panggilan')).toHaveAccessibleDescription('Isi namamu.');
    await expect(page.getByLabel('Kota atau kabupaten')).toHaveAccessibleDescription(
      /huruf dan angka saja/,
    );
  });

  test('simpan tanpa sesi: pesan galat umum (bukan teknis) dan isian tidak hilang', async ({
    page,
  }) => {
    await page.goto('/dev/profil');
    await page.getByLabel('Nama panggilan').fill('Nama Baru');
    await page.getByRole('button', { name: 'Simpan profil' }).click();
    await expect(alerts(page).filter({ hasText: 'Sesimu sudah berakhir' })).toBeVisible();
    await expect(page.getByLabel('Nama panggilan')).toHaveValue('Nama Baru');
  });

  test('ukuran teks: berlaku seketika saat dipilih, lalu KEMBALI bila penyimpanan gagal (di pratinjau tanpa sesi)', async ({
    page,
  }) => {
    await page.goto('/dev/profil');
    const root = page.locator('html');
    await expect(root).not.toHaveAttribute('data-font-size', /.+/);

    await page.getByRole('radio', { name: /Lebih besar/ }).check({ force: true });
    // Penyimpanan ditolak server (tanpa sesi): ukuran dikembalikan dan toast galat tampil.
    await expect(page.getByText('Ukuran teks belum tersimpan')).toBeVisible();
    await expect(root).not.toHaveAttribute('data-font-size', /.+/);
    await expect(page.getByRole('radio', { name: /Biasa/ })).toBeChecked();
  });

  test('unduh data: tautan biasa (bukan next/link) bertanda download ke rute unduhan', async ({
    page,
  }) => {
    await page.goto('/dev/profil');
    const link = page.getByRole('link', { name: 'Unduh data saya' });
    await expect(link).toHaveAttribute('href', '/profil/unduh');
    await expect(link).toHaveAttribute('download', '');
    await expect(
      page.getByRole('link', { name: /Atur izin dan lihat riwayat akses/ }),
    ).toHaveAttribute('href', '/privasi');
  });

  test('hapus akun: dialog dua langkah, kolom wajib bergalat, ESC menutup dan fokus kembali ke tombol', async ({
    page,
  }) => {
    await page.goto('/dev/profil');
    const trigger = page.getByRole('button', { name: 'Hapus akun' });
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: 'Hapus akunmu?' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('tidak bisa dikembalikan');
    await expect(dialog).toContainText('SATUSEHAT');

    await dialog.getByRole('button', { name: 'Hapus akun saya' }).click();
    await expect(dialog.getByLabel(/Ketik HAPUS/)).toHaveAccessibleDescription(/Ketik HAPUS/);
    await expect(dialog.getByLabel('Kata sandimu')).toHaveAccessibleDescription(
      'Isi kata sandimu.',
    );

    // Kata penegas huruf kecil tidak cukup.
    await dialog.getByLabel(/Ketik HAPUS/).fill('hapus');
    await dialog.getByLabel('Kata sandimu').fill('apa-saja');
    await dialog.getByRole('button', { name: 'Hapus akun saya' }).click();
    await expect(dialog.getByLabel(/Ketik HAPUS/)).toHaveAccessibleDescription(/huruf kapital/);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('hapus akun dengan isian lengkap tanpa sesi: tidak ada penghapusan, pesan sesi berakhir', async ({
    page,
  }) => {
    await page.goto('/dev/profil');
    await page.getByRole('button', { name: 'Hapus akun' }).click();
    const dialog = page.getByRole('dialog', { name: 'Hapus akunmu?' });
    await dialog.getByLabel(/Ketik HAPUS/).fill('HAPUS');
    await dialog.getByLabel('Kata sandimu').fill('apa-saja');
    await dialog.getByRole('button', { name: 'Hapus akun saya' }).click();
    await expect(alerts(dialog).filter({ hasText: 'Sesimu sudah berakhir' })).toBeVisible();
    await expect(page).toHaveURL(/\/dev\/profil/);
  });

  test('pemberitahuan permintaan akun psikolog muncul hanya saat ada permintaan', async ({
    page,
  }) => {
    await page.goto('/dev/profil');
    await expect(page.getByText('Permintaan akun psikologmu sedang ditinjau')).toHaveCount(0);
    await page.goto('/dev/profil?menunggu=1');
    await expect(page.getByText('Permintaan akun psikologmu sedang ditinjau')).toBeVisible();
    await expect(page.getByText('keluar lalu masuk lagi')).toBeVisible();
  });

  test('navigasi pengguna memuat Profil (sidebar di desktop, "Saya" di bawah di ponsel) dan tidak ada overflow', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/dev/profil');
    if (isMobile) {
      await expect(
        page.locator('[data-bottom-nav]').getByRole('link', { name: 'Saya' }),
      ).toHaveAttribute('href', '/profil');
    } else {
      await expect(
        page
          .getByRole('navigation', { name: 'Navigasi utama' })
          .first()
          .getByRole('link', { name: 'Profil' }),
      ).toHaveAttribute('aria-current', 'page');
    }
    await noHorizontalOverflow(page);
  });
});

test.describe('Antrean admin (/dev/admin)', () => {
  test('menampilkan pemohon, jumlah, dan riwayat keputusan', async ({ page }) => {
    await page.goto('/dev/admin');
    await expect(page.getByRole('heading', { level: 1, name: 'Antrean psikolog' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /Menunggu tinjauan/ })).toContainText(
      '(2)',
    );
    const cards = page.getByRole('article');
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('Calon Psikolog Demo');
    await expect(cards.first()).toContainText('calon.psikolog@demo.mindra.test');

    const history = page.getByRole('region', { name: 'Keputusan terakhir' });
    await expect(history).toContainText('Disetujui');
    await expect(history).toContainText('Ditolak');
  });

  test('keadaan kosong memberi tahu apa yang akan muncul', async ({ page }) => {
    await page.goto('/dev/admin?kosong=1');
    await expect(page.getByText('Tidak ada permintaan yang menunggu')).toBeVisible();
    await expect(page.getByText('Belum ada keputusan.')).toBeVisible();
  });

  test('setujui: dialog berisi data praktik dengan nilai bawaan yang masuk akal (Senin sampai Jumat, 09.00 sampai 15.00)', async ({
    page,
  }) => {
    await page.goto('/dev/admin');
    await page.getByRole('button', { name: /Tinjau dan setujui Calon Psikolog Demo/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Setujui Calon Psikolog Demo' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Periksa nomor STR dan izin praktiknya');

    await expect(dialog.getByLabel('Nama di direktori')).toHaveValue('Calon Psikolog Demo');
    await expect(dialog.getByLabel('Gelar')).toHaveValue('M.Psi., Psikolog');
    await expect(dialog.getByLabel('Jam mulai (WIB)')).toHaveValue('09:00');
    await expect(dialog.getByLabel('Jam selesai (WIB)')).toHaveValue('15:00');
    for (const day of ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']) {
      await expect(dialog.getByRole('checkbox', { name: day })).toBeChecked();
    }
    for (const day of ['Sabtu', 'Minggu']) {
      await expect(dialog.getByRole('checkbox', { name: day })).not.toBeChecked();
    }
    // Lencana terverifikasi tidak dicentang otomatis: admin harus sengaja memeriksa dulu.
    await expect(
      dialog.getByRole('checkbox', { name: /sudah memeriksa nomor STR/ }),
    ).not.toBeChecked();
  });

  test('setujui tanpa STR dan dengan tarif bukan angka: pesan per kolom, fokus ke kolom pertama bermasalah', async ({
    page,
  }) => {
    await page.goto('/dev/admin');
    await page.getByRole('button', { name: /Tinjau dan setujui Calon Psikolog Demo/ }).click();
    const dialog = page.getByRole('dialog', { name: /Setujui/ });
    await dialog.getByLabel('Tarif per sesi (Rp)').fill('seratus ribu');
    await dialog.getByRole('button', { name: 'Setujui akun' }).click();

    await expect(dialog.getByLabel('Nomor STR', { exact: true })).toHaveAccessibleDescription(
      /Isi nomor STR/,
    );
    await expect(dialog.getByLabel('Tarif per sesi (Rp)')).toHaveAccessibleDescription(
      /bilangan bulat/,
    );
    await expect(dialog.getByLabel('Nomor STR', { exact: true })).toBeFocused();
  });

  test('jam selesai sebelum jam mulai ditolak; tanpa hari praktik, jam tidak diperiksa', async ({
    page,
  }) => {
    await page.goto('/dev/admin');
    await page.getByRole('button', { name: /Tinjau dan setujui Calon Psikolog Demo/ }).click();
    const dialog = page.getByRole('dialog', { name: /Setujui/ });
    await dialog.getByLabel('Nomor STR', { exact: true }).fill('STR-1');
    await dialog.getByLabel('Jam mulai (WIB)').fill('15:00');
    await dialog.getByLabel('Jam selesai (WIB)').fill('09:00');
    await dialog.getByRole('button', { name: 'Setujui akun' }).click();
    await expect(dialog.getByLabel('Jam selesai (WIB)')).toHaveAccessibleDescription(
      /setelah jam mulai/,
    );

    // Hari dikosongkan: formulir lolos validasi dan sampai ke server (tanpa sesi → pesan sesi berakhir).
    for (const day of ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']) {
      await dialog.getByRole('checkbox', { name: day }).uncheck();
    }
    await dialog.getByRole('button', { name: 'Setujui akun' }).click();
    await expect(alerts(dialog).filter({ hasText: 'Sesimu sudah berakhir' })).toBeVisible();
  });

  test('tolak: dialog konfirmasi menjelaskan akibatnya; ESC menutup dan fokus kembali', async ({
    page,
  }) => {
    await page.goto('/dev/admin');
    const trigger = page.getByRole('button', { name: /^Tolak Calon Psikolog Demo$/ });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Tolak permintaan Calon Psikolog Demo?' });
    await expect(dialog).toContainText('tetap memakai akun pengguna biasa');
    await expect(dialog).toContainText('tercatat');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('tidak ada overflow horizontal dengan dialog tertutup maupun terbuka', async ({ page }) => {
    await page.goto('/dev/admin');
    await noHorizontalOverflow(page);
    await page.getByRole('button', { name: /Tinjau dan setujui Calon Psikolog Demo/ }).click();
    await expect(page.getByRole('dialog', { name: /Setujui/ })).toBeVisible();
    await noHorizontalOverflow(page);
  });
});

test.describe('gerbang rute baru', () => {
  for (const path of ['/profil', '/admin', '/admin/keamanan', '/admin/verifikasi']) {
    test(`${path} tanpa sesi mengarah ke halaman masuk`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/masuk/);
    });
  }

  test('unduhan data tanpa sesi tidak pernah memberi berkas', async ({ request }) => {
    const response = await request.get('/profil/unduh', {
      maxRedirects: 0,
      headers: { 'x-real-ip': uniqueIp() },
    });
    expect([301, 302, 303, 307, 308, 401, 403]).toContain(response.status());
    expect(response.headers()['content-type'] ?? '').not.toContain('application/json');
    expect(await response.text()).not.toContain('"id_akun"');
  });

  test('halaman masuk menjelaskan bahwa akun sudah dihapus setelah penghapusan', async ({
    page,
  }) => {
    await page.goto('/masuk?galat=akun_dihapus');
    await expect(page.getByText('Akunmu dan seluruh datanya sudah dihapus')).toBeVisible();
  });
});

test.describe('aksesibilitas dialog (axe, WCAG 2.2 AA)', () => {
  const audit = async (page: Page, label: string) => {
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .exclude('nextjs-portal')
      .analyze();
    expect(
      results.violations.map(
        (v) => `${label} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([]);
  };

  test('hapus akun: dialog terbuka, dan dengan galat tampil', async ({ page }) => {
    await page.goto('/dev/profil');
    await page.getByRole('button', { name: 'Hapus akun' }).click();
    const dialog = page.getByRole('dialog', { name: 'Hapus akunmu?' });
    await expect(dialog).toHaveCSS('opacity', '1');
    await audit(page, 'hapus-akun');
    await dialog.getByRole('button', { name: 'Hapus akun saya' }).click();
    await expect(dialog.getByLabel('Kata sandimu')).toHaveAccessibleDescription(
      'Isi kata sandimu.',
    );
    await audit(page, 'hapus-akun-galat');
  });

  test('setujui akun psikolog: dialog terbuka, dan dengan galat tampil', async ({ page }) => {
    await page.goto('/dev/admin');
    await page.getByRole('button', { name: /Tinjau dan setujui Calon Psikolog Demo/ }).click();
    const dialog = page.getByRole('dialog', { name: /Setujui/ });
    await expect(dialog).toHaveCSS('opacity', '1');
    await audit(page, 'setujui');
    await dialog.getByRole('button', { name: 'Setujui akun' }).click();
    await expect(dialog.getByLabel('Nomor STR', { exact: true })).toHaveAccessibleDescription(
      /Isi nomor STR/,
    );
    await audit(page, 'setujui-galat');
  });

  test('tolak permintaan: dialog konfirmasi terbuka', async ({ page }) => {
    await page.goto('/dev/admin');
    await page.getByRole('button', { name: /^Tolak Calon Psikolog Demo$/ }).click();
    await expect(page.getByRole('dialog', { name: /Tolak permintaan/ })).toHaveCSS('opacity', '1');
    await audit(page, 'tolak');
  });
});
