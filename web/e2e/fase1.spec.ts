import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Fase 1 (skrining, jurnal, beranda) diuji lewat halaman pratinjau /dev/* yang memakai komponen yang
 * SAMA dengan halaman sungguhan tetapi tanpa login dan tanpa menyimpan apa pun. Alur dengan akun
 * sungguhan ada di fase1.auth.spec.ts (dilewati kecuali kredensial uji diberikan).
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

/** Membuka runner dan menunggu sampai pintasan keyboard aktif (komponen sudah terhidrasi). */
async function openRunner(page: Page, tipe = 'phq9') {
  await page.goto(`/dev/asesmen?tipe=${tipe}`);
  await page.locator('[data-ready="true"]').waitFor();
}

/** Menjawab satu pertanyaan hanya dengan keyboard: angka lalu Enter. */
async function answer(page: Page, key: string) {
  await page.keyboard.press(key);
  await page.keyboard.press('Enter');
}

test.describe('runner skrining (/dev/asesmen)', () => {
  test('PHQ-9 selesai HANYA dengan keyboard; yang dikirim jawaban mentah tanpa skor', async ({
    page,
  }) => {
    await openRunner(page, 'phq9');
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toContainText('Kurang tertarik');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');

    // Pertanyaan 1–8: jawaban ke-2 (nilai 1). Fokus selalu pindah ke judul pertanyaan baru.
    for (let n = 2; n <= 9; n += 1) {
      await answer(page, '2');
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(n));
      await expect(heading).toBeFocused();
    }
    // Pertanyaan 9 (butir krisis): jawaban ke-1 (nilai 0), lalu kirim dengan Enter.
    await page.keyboard.press('1');
    await expect(page.getByRole('button', { name: 'Lihat hasil' })).toBeVisible();
    await page.keyboard.press('Enter');

    const payload = page.getByTestId('payload');
    await expect(payload).toBeVisible();
    const sent = JSON.parse((await payload.textContent()) ?? '{}') as {
      type: string;
      answers: Record<string, number>;
    };
    expect(Object.keys(sent).sort()).toEqual(['answers', 'type']);
    expect(sent.type).toBe('phq9');
    expect(Object.keys(sent.answers)).toHaveLength(9);
    expect(sent.answers.phq9_1).toBe(1);
    expect(sent.answers.phq9_9).toBe(0);
    expect(JSON.stringify(sent)).not.toMatch(/score|total|category|kategori/i);
  });

  test('SRQ-20: 20 pertanyaan ya/tidak dengan tombol 1 dan 2', async ({ page }) => {
    await openRunner(page, 'srq20');
    for (let n = 1; n < 20; n += 1) await answer(page, n % 2 === 0 ? '2' : '1');
    await page.keyboard.press('2');
    await page.keyboard.press('Enter');
    const sent = JSON.parse((await page.getByTestId('payload').textContent()) ?? '{}') as {
      answers: Record<string, number>;
    };
    expect(Object.keys(sent.answers)).toHaveLength(20);
    expect(Object.values(sent.answers).every((value) => value === 0 || value === 1)).toBe(true);
  });

  test('Lanjut tanpa memilih menampilkan pesan dan tidak pindah', async ({ page }) => {
    await openRunner(page);
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await expect(page.getByText('Pilih salah satu jawaban dulu, lalu lanjut.')).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    await expect(page.getByRole('radio').first()).toBeFocused();
  });

  test('Sebelumnya mempertahankan jawaban sebelumnya', async ({ page }) => {
    await openRunner(page);
    await answer(page, '3');
    await page.getByRole('button', { name: /Sebelumnya/ }).click();
    await expect(page.getByRole('radio').nth(2)).toBeChecked();
  });

  test('butir krisis dijawab > 0: catatan lembut dengan tautan telepon (bukan banner merah)', async ({
    page,
  }) => {
    await openRunner(page, 'phq9');
    for (let n = 1; n <= 8; n += 1) await answer(page, '1');
    await page.keyboard.press('3');
    const note = page.getByRole('status');
    await expect(note).toContainText('Healing119.id');
    await expect(note.getByRole('link', { name: /Hubungi/ })).toHaveAttribute('href', /^tel:/);
    await expect(alerts(page)).toHaveCount(0);
    await expectNoViolations(page);
  });

  test('keluar setelah menjawab meminta konfirmasi; ESC menutup dan jawaban tetap', async ({
    page,
  }) => {
    await openRunner(page);
    await page.keyboard.press('2');
    await page.getByRole('button', { name: /Keluar/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Keluar dari skrining?' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('radio').nth(1)).toBeChecked();
  });

  for (const tipe of ['phq9', 'gad7', 'pss10', 'srq20'] as const) {
    test(`axe: pertanyaan pertama ${tipe} bebas pelanggaran dan tanpa overflow`, async ({
      page,
    }) => {
      await openRunner(page, tipe);
      await expectNoViolations(page);
      await expectNoHorizontalOverflow(page);
    });
  }

  test('axe: pilihan terpilih, galat, dan dialog keluar', async ({ page }) => {
    await openRunner(page);
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await expectNoViolations(page);
    await page.keyboard.press('1');
    await page.getByRole('button', { name: /Keluar/ }).click();
    await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1');
    await expectNoViolations(page);
  });
});

test.describe('halaman hasil (/dev/hasil)', () => {
  test('tanpa krisis: tidak ada role="alert", ada catatan bukan-diagnosis dan rekomendasi', async ({
    page,
  }) => {
    await page.goto('/dev/hasil?tipe=phq9&skor=11');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Gejala depresi tingkat sedang' }),
    ).toBeVisible();
    await expect(page.getByText('dari 27')).toBeVisible();
    await expect(page.getByText(/bukan diagnosis/)).toBeVisible();
    await expect(alerts(page)).toHaveCount(0);
    await expect(page.getByRole('img', { name: /Tren skor PHQ-9: 16, 14, 14, 11/ })).toBeVisible();
    await expectNoViolations(page);
    await expectNoHorizontalOverflow(page);
  });

  test('dengan krisis: banner role="alert" pertama di halaman, berfokus, tombol telepon', async ({
    page,
  }) => {
    await page.goto('/dev/hasil?tipe=phq9&skor=14&krisis=1');
    const banner = alerts(page);
    await expect(banner).toBeVisible();
    await expect(banner).toBeFocused();
    await expect(banner.getByRole('heading')).toHaveText(
      'Kamu tidak harus menghadapinya sendirian.',
    );
    await expect(banner.getByRole('link', { name: /Hubungi/ })).toHaveAttribute('href', /^tel:/);
    // Banner adalah elemen pertama di <main>, di atas kartu hasil.
    const firstChildIsBanner = await page.evaluate(
      () => document.querySelector('main > div > *')?.getAttribute('role') === 'alert',
    );
    expect(firstChildIsBanner).toBe(true);
    await expectNoViolations(page);
    await expectNoHorizontalOverflow(page);
  });

  for (const [tipe, skor] of [
    ['gad7', 4],
    ['pss10', 30],
    ['srq20', 12],
  ] as const) {
    test(`axe: hasil ${tipe} skor ${skor}`, async ({ page }) => {
      await page.goto(`/dev/hasil?tipe=${tipe}&skor=${skor}&riwayat=0`);
      await expectNoViolations(page);
    });
  }

  test('skrining pertama tanpa tren mengajak mengulang', async ({ page }) => {
    await page.goto('/dev/hasil?tipe=gad7&skor=9&riwayat=0');
    await expect(page.getByText(/skrining GAD-7 pertamamu/)).toBeVisible();
  });
});

test.describe('beranda (/dev/beranda)', () => {
  test('menampilkan sapaan, check-in, minggu ini, dan skrining terakhir sesuai data contoh', async ({
    page,
  }) => {
    await page.goto('/dev/beranda');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Selamat sore, Argy.');
    await expect(
      page.getByRole('group', { name: 'Pilih perasaanmu' }).getByRole('button'),
    ).toHaveCount(7);
    await expect(page.getByText('6 dari 7')).toBeVisible();
    await expect(page.getByText('6,6 jam')).toBeVisible();
    await expect(page.getByText('Jumat')).toBeVisible();
    // Grafik adalah satu gambar dengan ringkasan lengkap untuk pembaca layar.
    const chart = page.getByRole('img', { name: /Mood dan jam tidur 7 hari terakhir/ });
    await expect(chart).toHaveAttribute('aria-label', /Rabu tenang, tidur 7,5 jam/);
    await expect(chart).toHaveAttribute('aria-label', /Selasa belum check-in, tidur 6,5 jam/);
    await expect(page.getByRole('img', { name: 'Tren skor PHQ-9: 16, 14, 14, 11' })).toBeVisible();
  });

  test('check-in tanpa sesi: pesan galat yang ramah (role="alert"), bukan layar kosong', async ({
    page,
  }) => {
    await page.goto('/dev/beranda');
    await page.getByRole('button', { name: 'Tenang' }).click();
    await expect(alerts(page)).toContainText('Sesimu sudah berakhir');
  });

  test('axe dan tanpa overflow horizontal', async ({ page }) => {
    await page.goto('/dev/beranda');
    await expectNoViolations(page);
    await expectNoHorizontalOverflow(page);
  });

  test('tombol perasaan bisa dicapai dengan Tab dan dioperasikan dengan keyboard', async ({
    page,
  }) => {
    await page.goto('/dev/beranda');
    const tenang = page.getByRole('button', { name: 'Tenang' });
    await tenang.focus();
    await expect(tenang).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Syukur' })).toBeFocused();
  });
});

test.describe('jurnal (/dev/jurnal)', () => {
  test('simpan tanpa memilih perasaan: galat di kelompok yang tepat dan fokus ke pilihan pertama', async ({
    page,
  }) => {
    await page.goto('/dev/jurnal');
    await page.getByRole('button', { name: 'Simpan catatan', exact: true }).click();
    await expect(page.getByText('Pilih salah satu perasaan.')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Tenang' })).toBeFocused();
    await expectNoViolations(page);
  });

  test('jam tidur sama dengan jam bangun: galat jelas, nilai isian tidak hilang', async ({
    page,
  }) => {
    await page.goto('/dev/jurnal');
    await page.getByLabel('Jam tidur').fill('06:00');
    await page.getByLabel('Jam bangun').fill('06:00');
    await page.getByRole('radio', { name: /Baik: tidur cukup nyenyak/ }).check();
    await page.getByRole('button', { name: 'Simpan catatan tidur' }).click();
    await expect(page.getByText('Jam tidur dan jam bangun tidak boleh sama.')).toBeVisible();
    await expect(page.getByLabel('Jam tidur')).toHaveValue('06:00');
    await expect(page.getByRole('radio', { name: /Baik: tidur cukup nyenyak/ })).toBeChecked();
    await expectNoViolations(page);
  });

  test('kualitas tidur belum dipilih: galat di kelompok kualitas', async ({ page }) => {
    await page.goto('/dev/jurnal');
    await page.getByRole('button', { name: 'Simpan catatan tidur' }).click();
    await expect(page.getByText('Pilih kualitas tidurmu dari 1 sampai 5.')).toBeVisible();
  });

  test('daftar catatan contoh tampil dengan tombol hapus dua langkah', async ({ page }) => {
    await page.goto('/dev/jurnal');
    await expect(page.getByText('Tenggat tugas menumpuk')).toBeVisible();
    await page
      .getByRole('button', { name: /Hapus catatan perasaan/ })
      .first()
      .click();
    await expect(page.getByText('Hapus catatan ini?').first()).toBeVisible();
    await page.getByRole('button', { name: 'Batal' }).first().click();
    await expect(page.getByText('Hapus catatan ini?')).toHaveCount(0);
  });

  test('axe awal dan tanpa overflow horizontal', async ({ page }) => {
    await page.goto('/dev/jurnal');
    await expectNoViolations(page);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('rute sungguhan tanpa sesi tetap dijaga', () => {
  for (const route of ['/asesmen', '/asesmen/phq9', '/asesmen/hasil/abc', '/jurnal', '/beranda']) {
    test(`${route} → /masuk`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/masuk\?next=/);
    });
  }

  test('rute yang tidak ada menampilkan 404 berbahasa Indonesia', async ({ page }) => {
    const response = await page.goto('/halaman-yang-tidak-ada');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Halaman ini tidak kami temukan.',
    );
    await expectNoViolations(page);
  });
});
