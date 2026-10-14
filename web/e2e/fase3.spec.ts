import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Fase 3 (API publik, dokumentasi, kunci API). Dua bagian:
 *   - halaman: /developers dan pratinjau /dev/kunci-api (axe, overflow, keyboard);
 *   - HTTP sungguhan ke /api/v1 TANPA kredensial (yang menolak, yang publik, header, batas laju).
 * Alur berkredensial ada di fase3.auth.spec.ts (dilewati tanpa akun uji).
 */

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

/**
 * Tiap permintaan tes memakai "IP" acak sendiri (header x-real-ip) supaya batas laju per IP tidak saling
 * mengganggu antar tes dan antar proyek (desktop dan mobile berjalan paralel). Alamat privat 10.x.y.z.
 */
const octet = () => Math.floor(Math.random() * 254) + 1;
const uniqueIp = () => `10.${octet()}.${octet()}.${octet()}`;
const headersFor = (extra: Record<string, string> = {}) => ({ 'x-real-ip': uniqueIp(), ...extra });

const json = async (response: Awaited<ReturnType<APIRequestContext['get']>>) =>
  (await response.json()) as Record<string, unknown> & {
    data?: unknown;
    error?: { code: string; message: string };
  };

test.describe('/developers', () => {
  test('memuat panduan, daftar endpoint, dan setiap operasi dengan contoh curl', async ({
    page,
  }) => {
    await page.goto('/developers');
    await expect(page.getByRole('heading', { level: 1, name: 'API Mindra' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Spesifikasi OpenAPI 3.1/ })).toHaveAttribute(
      'href',
      '/api/v1/openapi.json',
    );
    await expect(page.getByRole('heading', { level: 2, name: 'Mulai cepat' })).toBeVisible();

    // Satu bagian per operasi, masing-masing dengan contoh curl yang memakai variabel lingkungan.
    const operations = page.locator('article[id^="op-"]');
    expect(await operations.count()).toBeGreaterThanOrEqual(11);
    await expect(
      page.getByRole('group', { name: /Contoh curl POST \/api\/v1\/assessments/ }),
    ).toContainText('Authorization: Bearer $MINDRA_TOKEN');
    await expect(
      page.getByRole('group', {
        name: /Contoh curl GET \/api\/v1\/facilities\/\{id\}\/aggregates/,
      }),
    ).toContainText('X-API-Key: $MINDRA_API_KEY');
    await expect(page.locator('main')).not.toContainText(/undefined|\[object Object\]/);
  });

  test('aturan penting disebut terang: skor dari server, layanan krisis wajib, k-anonymity, mode SATUSEHAT', async ({
    page,
  }) => {
    await page.goto('/developers');
    const rules = page
      .getByRole('heading', { name: 'Aturan yang tidak bisa ditawar' })
      .locator('xpath=ancestor::div[1]');
    await expect(rules).toContainText('selalu dihitung server');
    await expect(rules).toContainText('wajib');
    await expect(rules).toContainText('k ≥ 10');
    await expect(rules).toContainText('mock');
  });

  test('tautan daftar endpoint melompat ke operasinya', async ({ page, isMobile }) => {
    await page.goto('/developers');
    if (isMobile) await page.getByText('Daftar endpoint', { exact: true }).first().click();
    const link = page.getByRole('link', { name: /POST\s*\/assessments/ }).first();
    await link.click();
    await expect(page).toHaveURL(/#op-createAssessment$/);
    await expect(page.locator('#op-createAssessment')).toBeInViewport();
  });

  test('blok kode dan tabel yang bisa digulir dijangkau keyboard', async ({ page }) => {
    await page.goto('/developers');
    const code = page.getByRole('group', { name: /Contoh curl GET \/api\/v1\/instruments/ });
    await code.focus();
    await expect(code).toBeFocused();
  });

  test('tanpa pelanggaran aksesibilitas dan tanpa overflow horizontal', async ({ page }) => {
    await page.goto('/developers');
    await expectNoViolations(page);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('manajemen kunci API (/dev/kunci-api)', () => {
  test('daftar kunci aktif dan dicabut; prefiks tampil, kunci utuh tidak pernah', async ({
    page,
  }) => {
    await page.goto('/dev/kunci-api');
    await expect(page.getByRole('heading', { level: 1, name: 'Kunci API' })).toBeVisible();
    const active = page.getByRole('region', { name: 'Kunci aktif' });
    await expect(active).toContainText('Dinkes Kota Bogor, sistem pelaporan');
    await expect(active).toContainText('mk_live_k7M2qX9r…');
    await expect(active).toContainText('aggregates:read');
    await expect(page.getByRole('region', { name: 'Kunci yang sudah dicabut' })).toContainText(
      'Dicabut',
    );
    await expect(page.locator('main')).not.toContainText(/mk_live_[A-Za-z0-9_-]{32}/);
  });

  test('pencabutan meminta konfirmasi dua langkah dan memakai Server Action asli', async ({
    page,
  }) => {
    await page.goto('/dev/kunci-api');
    await page.getByRole('button', { name: /Cabut kunci Dinkes/ }).click();
    await expect(page.getByText('Cabut kunci ini? Tidak bisa dibatalkan.')).toBeVisible();
    await page.getByRole('button', { name: 'Batal' }).click();
    await expect(page.getByText('Cabut kunci ini?')).toHaveCount(0);

    await page.getByRole('button', { name: /Cabut kunci Dinkes/ }).click();
    await page.getByRole('button', { name: /Ya, cabut/ }).click();
    // Tanpa sesi, Server Action menolak dengan pesan yang jelas dan kunci tetap tampil.
    await expect(alerts(page).filter({ hasText: 'Sesimu sudah berakhir' })).toBeVisible();
  });

  test('formulir membuat kunci: validasi kolom dan galat sesi', async ({ page }) => {
    await page.goto('/dev/kunci-api');
    await page.getByRole('button', { name: 'Buat kunci' }).click();
    await expect(page.getByText(/Nama kunci minimal 3 karakter/)).toBeVisible();
    await expect(page.getByLabel('Nama kunci')).toBeFocused();

    await page.getByLabel('Nama kunci').fill('Sistem pelaporan');
    await page.getByRole('button', { name: 'Buat kunci' }).click();
    await expect(alerts(page).filter({ hasText: 'Sesimu sudah berakhir' })).toBeVisible();
  });

  test('keadaan kosong dan akun tanpa faskes dijelaskan', async ({ page }) => {
    await page.goto('/dev/kunci-api?kosong=1');
    await expect(page.getByRole('heading', { name: 'Belum ada kunci aktif' })).toBeVisible();
    await page.goto('/dev/kunci-api?tanpa-faskes=1');
    await expect(page.getByText(/belum terhubung ke faskes mana pun/)).toBeVisible();
  });

  test('tanpa pelanggaran aksesibilitas dan tanpa overflow horizontal', async ({ page }) => {
    await page.goto('/dev/kunci-api');
    await expectNoViolations(page);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('API v1 lewat HTTP (tanpa kredensial)', () => {
  test('GET /instruments publik: 4 instrumen, header keamanan dan laju, boleh di-cache', async ({
    request,
  }) => {
    const response = await request.get('/api/v1/instruments', { headers: headersFor() });
    expect(response.status()).toBe(200);
    expect(response.headers()['x-request-id']).toBeTruthy();
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-ratelimit-limit']).toBe('60');
    expect(response.headers()['cache-control']).toBe('public, max-age=3600');
    const body = await json(response);
    expect(body.error).toBeNull();
    expect((body.data as Array<{ id: string }>).map((i) => i.id)).toEqual([
      'phq9',
      'gad7',
      'pss10',
      'srq20',
    ]);
  });

  test('GET /openapi.json: OpenAPI 3.1 yang memuat semua operasi', async ({ request }) => {
    const response = await request.get('/api/v1/openapi.json', { headers: headersFor() });
    expect(response.status()).toBe(200);
    const doc = (await response.json()) as {
      openapi: string;
      paths: Record<string, Record<string, unknown>>;
    };
    expect(doc.openapi).toBe('3.1.0');
    expect(Object.keys(doc.paths).sort()).toEqual([
      '/api/v1/assessments',
      '/api/v1/companion/chat',
      '/api/v1/consultations',
      '/api/v1/facilities/{id}/aggregates',
      '/api/v1/fhir/Observation',
      '/api/v1/insights/weekly',
      '/api/v1/instruments',
      '/api/v1/mood-entries',
      '/api/v1/openapi.json',
      '/api/v1/psychologists',
      '/api/v1/psychologists/{id}/slots',
      '/api/v1/satusehat/sync',
      '/api/v1/sleep-entries',
    ]);
    expect(Object.keys(doc.paths['/api/v1/assessments']!).sort()).toEqual(['get', 'post']);
  });

  test('endpoint pengguna tanpa token: 401 dengan amplop galat, tanpa cache, id permintaan ada', async ({
    request,
  }) => {
    for (const path of [
      '/api/v1/assessments',
      '/api/v1/mood-entries',
      '/api/v1/sleep-entries',
      '/api/v1/insights/weekly',
    ]) {
      const response = await request.get(path, { headers: headersFor() });
      expect(response.status(), path).toBe(401);
      expect(response.headers()['cache-control'], path).toBe('no-store');
      expect(response.headers()['x-request-id'], path).toBeTruthy();
      const body = await json(response);
      expect(body.data, path).toBeNull();
      expect(body.error?.code, path).toBe('unauthorized');
    }
  });

  test('token yang bentuknya salah ditolak seragam, tanpa menyentuh server Auth', async ({
    request,
  }) => {
    for (const authorization of ['Bearer bukan-jwt', 'Basic abc', 'Bearer ', 'bearer']) {
      const response = await request.get('/api/v1/assessments', {
        headers: headersFor({ authorization }),
      });
      expect(response.status(), authorization).toBe(401);
      expect((await json(response)).error?.message).toBe('Kredensial tidak ada atau tidak valid.');
    }
  });

  test('POST tanpa kredensial: 401 (autentikasi didahulukan, jadi isi permintaan tidak diperiksa dan tidak dipantulkan)', async ({
    request,
  }) => {
    const response = await request.post('/api/v1/assessments', {
      headers: headersFor({ 'content-type': 'application/json' }),
      data: { type: 'phq9', answers: { rahasia: 'nilai-sensitif' } },
    });
    expect(response.status()).toBe(401);
    expect(await response.text()).not.toContain('nilai-sensitif');
  });

  test('FHIR tanpa token: OperationOutcome berformat application/fhir+json', async ({
    request,
  }) => {
    const response = await request.get('/api/v1/fhir/Observation?patient=me', {
      headers: headersFor(),
    });
    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/fhir+json');
    const body = (await response.json()) as {
      resourceType: string;
      issue: Array<{ code: string }>;
    };
    expect(body.resourceType).toBe('OperationOutcome');
    expect(body.issue[0]!.code).toBe('login');
  });

  test('agregat mitra: tanpa kunci atau kunci berbentuk salah → 401 seragam; token pengguna tidak diterima', async ({
    request,
  }) => {
    const id = '66666666-6666-4666-8666-666666666666';
    const attempts: Array<Record<string, string>> = [
      {},
      { 'x-api-key': 'mk_live_salah' },
      { 'x-api-key': `mk_test_${'a'.repeat(32)}` },
      { authorization: 'Bearer aaa.bbb.ccc' },
    ];
    for (const headers of attempts) {
      const response = await request.get(`/api/v1/facilities/${id}/aggregates`, {
        headers: headersFor(headers),
      });
      expect(response.status(), JSON.stringify(headers)).toBe(401);
    }
  });

  test('metode yang tidak ada dijawab 405, bukan 500', async ({ request }) => {
    const response = await request.delete('/api/v1/instruments', { headers: headersFor() });
    expect(response.status()).toBe(405);
  });

  test('batas laju: kelewatan → 429 dengan Retry-After, IP lain tidak terkena', async ({
    request,
  }) => {
    // Batas publik 60 permintaan per menit per IP (jendela geser). Dikirim BERKELOMPOK paralel: bila satu per satu,
    // server dev yang sedang sibuk (seluruh suite berjalan) bisa membutuhkan lebih dari 60 detik untuk 61 permintaan,
    // sehingga permintaan awal sudah keluar dari jendela dan 429 tidak pernah terjadi (itu perilaku yang benar).
    test.setTimeout(120_000);
    const ip = uniqueIp();
    let blocked: Awaited<ReturnType<typeof request.get>> | null = null;
    for (let sent = 0; sent < 90 && !blocked; sent += 15) {
      const batch = await Promise.all(
        Array.from({ length: 15 }, () =>
          request.get('/api/v1/instruments', { headers: { 'x-real-ip': ip }, timeout: 30_000 }),
        ),
      );
      blocked = batch.find((response) => response.status() === 429) ?? null;
    }
    expect(blocked, 'seharusnya kena 429 sebelum 90 permintaan').not.toBeNull();
    expect(Number(blocked!.headers()['retry-after'])).toBeGreaterThanOrEqual(1);
    expect(blocked!.headers()['x-ratelimit-remaining']).toBe('0');
    expect(((await blocked!.json()) as { error: { code: string } }).error.code).toBe(
      'rate_limited',
    );

    const other = await request.get('/api/v1/instruments', {
      headers: { 'x-real-ip': '198.51.100.250' },
    });
    expect(other.status()).toBe(200);
  });
});
