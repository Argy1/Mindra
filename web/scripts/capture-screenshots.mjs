#!/usr/bin/env node
/**
 * Tangkapan layar untuk README dan docs/TESTING.md, dari server yang sedang berjalan.
 *
 *   pnpm build && ENABLE_DEV_PAGES=true pnpm start --port 3200
 *   node scripts/capture-screenshots.mjs --base http://localhost:3200
 *
 * Halaman berlogin diambil dari rute pratinjau /dev/* (komponen yang sama dengan halaman asli, data contoh).
 * Hasil: docs/img/*.png. Gerak dimatikan (reducedMotion) supaya tangkapan konsisten antar-putaran.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const baseIndex = process.argv.indexOf('--base');
const BASE = (baseIndex > 0 ? process.argv[baseIndex + 1] : 'http://localhost:3200').replace(
  /\/+$/,
  '',
);
const OUT = resolve('docs/img');
mkdirSync(OUT, { recursive: true });

/** `full`: seluruh halaman; selain itu hanya layar pertama. */
const DESKTOP = [
  { route: '/', name: 'landing', full: true },
  { route: '/dev/beranda', name: 'beranda' },
  { route: '/dev/hasil', name: 'hasil-skrining' },
  { route: '/dev/jurnal', name: 'jurnal' },
  { route: '/dev/teman-cerita', name: 'teman-cerita' },
  { route: '/dev/konsultasi', name: 'konsultasi' },
  { route: '/dev/privasi', name: 'privasi' },
  { route: '/dev/psikolog', name: 'psikolog-dasbor' },
  { route: '/dev/klien', name: 'psikolog-klien' },
  { route: '/dev/pendamping', name: 'pendamping' },
  { route: '/dev/faskes', name: 'faskes-dasbor' },
  { route: '/dev/faskes-peta', name: 'faskes-peta' },
  { route: '/dev/kunci-api', name: 'kunci-api' },
  { route: '/developers', name: 'api-dokumentasi' },
];
const MOBILE = [
  { route: '/', name: 'landing-mobile', full: true },
  { route: '/dev/beranda', name: 'beranda-mobile' },
  { route: '/dev/teman-cerita', name: 'teman-cerita-mobile' },
];

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });

async function capture(shots, viewport, isMobile) {
  const context = await browser.newContext({
    viewport,
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    isMobile,
  });
  const page = await context.newPage();
  for (const shot of shots) {
    await page.goto(`${BASE}${shot.route}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (shot.route === '/dev/faskes-peta') await page.waitForSelector('.leaflet-container');
    await page.waitForTimeout(600);
    // Sembunyikan indikator pengembangan Next.js bila ada (tidak muncul di build produksi).
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: Boolean(shot.full) });
    console.log(`${shot.name}.png`);
  }
  await context.close();
}

await capture(DESKTOP, { width: 1440, height: 900 }, false);
await capture(MOBILE, { width: 390, height: 844 }, true);
await browser.close();
