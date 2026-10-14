import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Fase 5: landing, halaman tentang dan kebijakan privasi, serta audit aksesibilitas lintas rute
 * (axe + jalan-jalan keyboard) untuk SEMUA halaman utama pada kedua viewport.
 *
 * Halaman berlogin diwakili pratinjau /dev/*, yang memakai komponen yang sama dengan halaman
 * sungguhan (lihat DECISIONS.md Fase 1). Alur dengan akun sungguhan ada di *.auth.spec.ts.
 */

/** Rute publik + halaman autentikasi. */
const PUBLIC_ROUTES = [
  '/',
  '/tentang',
  '/kebijakan-privasi',
  '/syarat-penggunaan',
  '/developers',
  '/masuk',
  '/daftar',
  '/lupa-sandi',
  '/akun-bermasalah',
] as const;

/** Pratinjau halaman berlogin, satu per layar utama tiap portal. */
const PREVIEW_ROUTES = [
  '/dev/beranda',
  '/dev/asesmen',
  '/dev/hasil',
  '/dev/jurnal',
  '/dev/teman-cerita',
  '/dev/konsultasi',
  '/dev/konsultasi-detail',
  '/dev/privasi',
  '/dev/profil',
  '/dev/admin',
  '/dev/psikolog',
  '/dev/klien',
  '/dev/jadwal',
  '/dev/pendamping',
  '/dev/pendamping-detail',
  '/dev/faskes',
  '/dev/faskes-peta',
  '/dev/faskes-laporan',
  '/dev/kunci-api',
  '/dev/shell',
  '/dev/ui',
] as const;

const ALL_ROUTES = [...PUBLIC_ROUTES, ...PREVIEW_ROUTES];

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** Bagian dalam peta Leaflet adalah pihak ketiga; wadahnya sendiri diperiksa di fase4.spec.ts. */
const THIRD_PARTY = ['.leaflet-container'];

async function settle(page: Page, route: string) {
  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);
  if (route === '/dev/faskes-peta') await expect(page.locator('.leaflet-container')).toBeVisible();
}

test.describe('landing (/)', () => {
  test('memuat semua bagian bernama dengan satu h1 dan urutan judul yang benar', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const h2 = await page.getByRole('heading', { level: 2 }).allTextContents();
    expect(h2).toEqual([
      '1 dari 3 remaja Indonesia punya masalah kesehatan mental dalam setahun.',
      'Cara kerjanya',
      'Satu sistem, empat pihak',
      'Kamu bisa lihat siapa yang membuka datamu.',
      'Terbuka untuk sistem lain',
    ]);
    for (const name of ['Kenali', 'Pahami', 'Terhubung', 'Tercatat']) {
      await expect(page.getByRole('heading', { level: 3, name })).toBeVisible();
    }
  });

  test('tautan jangkar di header menuju bagian yang ada', async ({ page }) => {
    await page.goto('/');
    for (const id of ['cara-kerja', 'untuk-siapa', 'privasi', 'developer']) {
      await expect(page.locator(`section#${id}`)).toHaveCount(1);
    }
    // Menu utama disembunyikan di bawah 861px (sama dengan desain), jadi role-based locator tidak
    // melihatnya di mobile; periksa href-nya langsung dari DOM.
    const hrefs = await page
      .locator('nav[aria-label="Utama"] a')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual(['/#cara-kerja', '/#untuk-siapa', '/#privasi', '/#developer']);
  });

  test('diagram ekosistem punya penjelasan teks dan tidak ditampilkan sebagai gambar kosong', async ({
    page,
  }) => {
    await page.goto('/');
    const figure = page.getByRole('figure');
    await expect(figure).toContainText('data kamu terhubung ke psikolog dan keluarga');
    await expect(figure.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  test('claim yang bergantung pada integrasi nyata ditulis jujur: SATUSEHAT berjalan sebagai simulasi', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText('masih berjalan sebagai simulasi')).toBeVisible();
  });

  test('angka I-NAMHS memuat sumber dengan tautan keluar yang aman', async ({ page }) => {
    await page.goto('/');
    const source = page.getByRole('link', { name: /Ringkasan hasil di situs UGM/ });
    await expect(source).toHaveAttribute('href', /^https:\/\/ugm\.ac\.id\//);
    await expect(source).toHaveAttribute('rel', /noopener/);
    await expect(
      page.getByText('Indonesia National Adolescent Mental Health Survey'),
    ).toBeVisible();
  });

  test('contoh API memakai alamat situs ini dan kode FHIR yang sama dengan pemeta', async ({
    page,
  }) => {
    await page.goto('/');
    const example = page.getByRole('group', { name: 'Contoh permintaan API' });
    await expect(example).toContainText('/api/v1/fhir/Observation?patient=me');
    await expect(example).toContainText('"44261-6"');
    await expect(example).toContainText('"resourceType": "Bundle"');
    await expect(page.getByRole('link', { name: 'Baca dokumentasi API' })).toHaveAttribute(
      'href',
      '/developers',
    );
  });

  test('tidak ada tanda seru dan tidak ada kata klinis terlarang di teks yang terlihat', async ({
    page,
  }) => {
    for (const route of ['/', '/tentang', '/kebijakan-privasi', '/syarat-penggunaan']) {
      await page.goto(route);
      const text = await page.locator('main').innerText();
      expect(text, route).not.toContain('!');
      expect(text, route).not.toMatch(/\b(gangguan|diagnosa|pasien)\b/i);
    }
  });

  test('tidak ada overflow horizontal di semua halaman marketing', async ({ page }) => {
    for (const route of ['/', '/tentang', '/kebijakan-privasi', '/syarat-penggunaan']) {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, route).toBeLessThanOrEqual(0);
    }
  });
});

test.describe('landing dengan gerak dikurangi', () => {
  test.use({ reducedMotion: 'reduce' });

  test('benang tergambar penuh, denyut disembunyikan, dan tidak ada animasi berjalan', async ({
    page,
  }) => {
    await page.goto('/');
    const state = await page.evaluate(() => {
      const threads = Array.from(document.querySelectorAll('.eco .thread--on'));
      const pulse = document.querySelector('.eco .pulse');
      return {
        offsets: threads.map((t) => getComputedStyle(t).strokeDashoffset),
        pulse: pulse ? getComputedStyle(pulse).display : 'tidak ada',
        running: document
          .getAnimations()
          .filter(
            (a) =>
              a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity,
          ).length,
      };
    });
    expect(state.offsets).toEqual(['0px', '0px']);
    expect(state.pulse).toBe('none');
    expect(state.running).toBe(0);
  });
});

test.describe('halaman tentang dan kebijakan privasi', () => {
  test('/tentang: menyebut batasan (bukan diagnosis) dan kontak krisis dari sumber tunggal', async ({
    page,
  }) => {
    await page.goto('/tentang');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mindra');
    await expect(page.getByText('Alat skrining dan pendamping, bukan diagnosis')).toBeVisible();
    await expect(page.locator('main').getByRole('link', { name: '119 ext. 8' })).toHaveAttribute(
      'href',
      'tel:119,8',
    );
    await expect(
      page.getByText('belum ada data yang masuk ke rekam kesehatan nasional'),
    ).toBeVisible();
  });

  test('/kebijakan-privasi: ditandai rancangan, memuat tiga tabel bernama, dan menjelaskan hapus akun, unduh data, dan pilihan statistik wilayah', async ({
    page,
  }) => {
    await page.goto('/kebijakan-privasi');
    await expect(page.getByText('Rancangan untuk versi demo')).toBeVisible();
    for (const name of [
      'Jenis data yang disimpan',
      'Pihak yang bisa melihat datamu',
      'Layanan pihak ketiga',
    ]) {
      await expect(page.getByRole('table', { name })).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: /Statistik wilayah anonim/ })).toBeVisible();
    await expect(page.getByText('mati bawaannya')).toBeVisible();
    await expect(page.getByText('Menghapus akun', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Mengunduh salinan datamu', { exact: false })).toBeVisible();
    // Layanan yang benar-benar dipakai harus disebut.
    for (const processor of ['Supabase', 'Vercel', 'Upstash', 'Anthropic', 'OpenStreetMap']) {
      await expect(page.getByRole('rowheader', { name: processor })).toBeVisible();
    }
  });

  test('/syarat-penggunaan: ditandai rancangan, usia minimal 17, bukan layanan darurat, dan jujur soal pembayaran', async ({
    page,
  }) => {
    await page.goto('/syarat-penggunaan');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Syarat penggunaan');
    await expect(page.getByText('Rancangan untuk versi demo')).toBeVisible();
    await expect(page.getByText('minimal 17 tahun')).toBeVisible();
    await expect(page.locator('main').getByRole('link', { name: '119 ext. 8' })).toHaveAttribute(
      'href',
      'tel:119,8',
    );
    await expect(page.getByText('belum memproses pembayaran')).toBeVisible();
    await expect(page.getByText('masih berjalan sebagai simulasi lokal')).toBeVisible();
  });

  test('footer hanya menautkan halaman yang ada', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('navigation', { name: 'Footer' });
    const hrefs = await footer
      .getByRole('link')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual(['/tentang', '/kebijakan-privasi', '/syarat-penggunaan', '/developers']);
    for (const href of hrefs) {
      const response = await page.request.get(href as string);
      expect(response.status(), String(href)).toBe(200);
    }
  });
});

test.describe('robots.txt dan sitemap.xml', () => {
  test('robots mengizinkan halaman publik, menutup portal, API, dan pratinjau', async ({
    request,
  }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('Allow: /');
    for (const closed of ['/api/', '/dev/', '/beranda', '/psikolog', '/faskes', '/privasi']) {
      expect(body, closed).toContain(`Disallow: ${closed}`);
    }
    expect(body).not.toContain('Disallow: /developers');
    expect(body).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);
  });

  test('sitemap memuat lima halaman publik dan tidak ada halaman berlogin', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const body = await response.text();
    const locs = Array.from(
      body.matchAll(/<loc>([^<]+)<\/loc>/g),
      (m) => new URL(m[1] ?? '').pathname,
    );
    expect(locs.sort()).toEqual([
      '/',
      '/developers',
      '/kebijakan-privasi',
      '/syarat-penggunaan',
      '/tentang',
    ]);
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// CSP
// ───────────────────────────────────────────────────────────────────────────────
test.describe('CSP: tidak ada skrip yang ditolak karena eval', () => {
  // Server dev memakai CSP dengan 'unsafe-eval' (React Refresh), jadi tes ini baru bermakna terhadap build produksi:
  // di CI (`CI=true`) otomatis begitu; lokal: `pnpm build && pnpm start --port 3200` lalu `E2E_PORT=3200 pnpm test:e2e`.
  // Penyebab historis: Zod 4 mencoba `Function("")` untuk JIT; diatasi `jitless` di instrumentation-client.ts.
  const ROUTES = [
    '/',
    '/masuk',
    '/daftar',
    '/lupa-sandi',
    '/dev/klien',
    '/dev/jurnal',
    '/dev/privasi',
    '/dev/psikolog',
  ];
  for (const route of ROUTES) {
    test(`tanpa pelanggaran eval di ${route}`, async ({ page }) => {
      await page.addInitScript(() => {
        (window as unknown as { __csp: string[] }).__csp = [];
        document.addEventListener('securitypolicyviolation', (event) => {
          (window as unknown as { __csp: string[] }).__csp.push(
            `${event.violatedDirective} ${event.blockedURI} ${event.sourceFile}`,
          );
        });
      });
      await settle(page, route);
      await page.waitForTimeout(800);
      const violations = await page.evaluate(
        () => (window as unknown as { __csp: string[] }).__csp,
      );
      expect(violations.filter((entry) => entry.includes(' eval '))).toEqual([]);
    });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Audit aksesibilitas lintas rute
// ───────────────────────────────────────────────────────────────────────────────
test.describe('audit axe: semua rute utama, WCAG 2.2 AA + praktik terbaik', () => {
  for (const route of ALL_ROUTES) {
    test(`axe ${route}`, async ({ page }) => {
      await settle(page, route);
      let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS).exclude('nextjs-portal');
      for (const selector of THIRD_PARTY) builder = builder.exclude(selector);
      const results = await builder.analyze();
      expect(
        results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => n.target.join(' ')),
        })),
      ).toEqual([]);
    });
  }
});

test.describe('audit keyboard: urutan Tab, cincin fokus terlihat, tanpa jebakan', () => {
  for (const route of ALL_ROUTES) {
    test(`tab ${route}`, async ({ page }) => {
      test.setTimeout(90_000);
      await settle(page, route);

      const problems: string[] = [];
      const seen = new Set<string>();
      let reachedEnd = false;

      for (let step = 0; step < 220; step += 1) {
        await page.keyboard.press('Tab');
        const info = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body || el === document.documentElement) return null;
          if (el.tagName.toLowerCase() === 'nextjs-portal') return { skip: true as const };
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const label =
            el.getAttribute('aria-label') ||
            (el as HTMLElement).innerText?.trim().slice(0, 40) ||
            el.getAttribute('name') ||
            el.getAttribute('href') ||
            '';
          const hasRing =
            (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) ||
            style.boxShadow !== 'none';
          return {
            skip: false as const,
            id: `${el.tagName.toLowerCase()}|${label}|${Math.round(rect.top + window.scrollY)}|${Math.round(rect.left)}`,
            desc: `${el.tagName.toLowerCase()} "${label}"`,
            hasRing,
            visible: rect.width > 0 && rect.height > 0,
            tabindex: el.getAttribute('tabindex'),
          };
        });

        if (info === null) {
          // Fokus keluar dari dokumen (kembali ke bilah alamat): seluruh halaman sudah dilewati.
          reachedEnd = true;
          break;
        }
        if (info.skip) continue;
        if (seen.has(info.id)) {
          reachedEnd = true; // siklus penuh tanpa jebakan
          break;
        }
        seen.add(info.id);
        if (!info.visible) problems.push(`tak terlihat tapi terfokus: ${info.desc}`);
        if (!info.hasRing) problems.push(`tanpa cincin fokus: ${info.desc}`);
        if (info.tabindex !== null && Number(info.tabindex) > 0)
          problems.push(`tabindex positif: ${info.desc}`);
      }

      expect(problems).toEqual([]);
      expect(seen.size, 'halaman harus punya elemen yang bisa difokuskan').toBeGreaterThan(0);
      expect(reachedEnd, 'Tab harus bisa melewati seluruh halaman (tanpa jebakan keyboard)').toBe(
        true,
      );
    });
  }
});

test.describe('keyboard walkthrough landing', () => {
  test('Tab dari awal: skip link, logo, lalu menu, tombol masuk dan daftar, lalu hero', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/');
    const order: string[] = [];
    for (let step = 0; step < 14; step += 1) {
      await page.keyboard.press('Tab');
      order.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          return el?.getAttribute('aria-label') ?? el?.innerText?.trim() ?? '';
        }),
      );
    }
    expect(order.slice(0, 3)).toEqual([
      'Langsung ke konten',
      'Mindra, beranda',
      isMobile ? 'Masuk' : 'Cara kerja',
    ]);
    expect(order).toContain('Mulai cek perasaan');
    expect(order.indexOf('Mulai cek perasaan')).toBeGreaterThan(order.indexOf('Daftar gratis'));
  });

  test('Enter pada "Lihat cara kerjanya" menggulir ke bagian Cara kerjanya', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Lihat cara kerjanya' }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#cara-kerja$/);
    await expect(page.getByRole('heading', { name: 'Cara kerjanya' })).toBeInViewport();
  });
});
