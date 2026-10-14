import { defineConfig, devices } from '@playwright/test';

// E2E_PORT memungkinkan menjalankan suite terhadap server yang sudah ada, mis. build produksi di port lain
// (`E2E_PORT=3200 pnpm test:e2e`): berguna untuk tes yang hanya bermakna di produksi (CSP tanpa unsafe-eval).
const PORT = Number(process.env.E2E_PORT ?? 3100);
// E2E_BASE_URL = alamat situs yang sudah berjalan (mis. demo di Vercel): tidak ada server yang dijalankan. Hanya cocok untuk
// spec yang tidak butuh halaman `/dev/*` (di produksi memang 404), terutama `*.auth.spec.ts` dengan akun sungguhan.
const REMOTE_BASE_URL = process.env.E2E_BASE_URL?.replace(/\/+$/, '');
const isCI = Boolean(process.env.CI);

// Lokal: pakai Google Chrome yang sudah terpasang (tanpa mengunduh browser Playwright).
// CI: pakai Chromium bawaan Playwright (`pnpm exec playwright install --with-deps chromium`).
const channel = isCI ? undefined : 'chrome';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: REMOTE_BASE_URL ?? `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  },
  projects: [
    {
      name: 'desktop-1440',
      use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-390',
      use: { ...devices['Pixel 7'], channel, viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: REMOTE_BASE_URL
    ? undefined
    : {
        command: isCI
          ? `pnpm build && pnpm start --port ${PORT}`
          : `pnpm exec next dev --turbopack --port ${PORT}`,
        url: `http://localhost:${PORT}/`,
        reuseExistingServer: !isCI,
        timeout: 180_000,
        env: { ENABLE_DEV_PAGES: 'true' },
      },
});
