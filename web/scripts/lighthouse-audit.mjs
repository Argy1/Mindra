#!/usr/bin/env node
/**
 * Audit Lighthouse untuk semua halaman utama (docs/TESTING.md).
 *
 * Pakai SERVER PRODUKSI, bukan `next dev` (mode dev jauh lebih lambat dan menyesatkan):
 *
 *   pnpm build
 *   ENABLE_DEV_PAGES=true pnpm start --port 3200       # /dev/* mewakili halaman berlogin
 *   node scripts/lighthouse-audit.mjs                  # semua rute, mobile + desktop
 *   node scripts/lighthouse-audit.mjs --only / /tentang --forms mobile
 *
 * Opsi:
 *   --base <url>      alamat server (bawaan http://localhost:3200)
 *   --out <dir>       tempat laporan lengkap (JSON + HTML) per halaman (bawaan: folder sementara)
 *   --only <rute...>  hanya rute ini
 *   --forms <a,b>     mobile, desktop, atau keduanya (bawaan mobile,desktop)
 *   --insecure        terima sertifikat swatandatangani (proxy HTTPS lokal); jangan dipakai untuk situs asli
 *   --setup <teks>    keterangan lingkungan yang ditulis ke summary.json
 *
 * Hasil ringkas (skor + metrik utama) ditulis ke docs/lighthouse/summary.json dan summary.md.
 * Laporan lengkap TIDAK dimasukkan ke repo (masing-masing ±800 KB).
 *
 * Lighthouse dijalankan lewat `pnpm dlx lighthouse@12.8.2` (bukan dependensi proyek). Versi 13.5.0
 * gagal dimuat di Node 24 (SyntaxError pada lib/cdt/SDK.js), jadi versinya sengaja dikunci.
 * Halaman berlogin tidak bisa diaudit tanpa akun; rute /dev/* memakai komponen yang sama dengan
 * halaman aslinya, tanpa login dan tanpa data nyata.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const LIGHTHOUSE = 'lighthouse@12.8.2';
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const PUBLIC_ROUTES = [
  '/',
  '/tentang',
  '/kebijakan-privasi',
  '/syarat-penggunaan',
  '/developers',
  '/masuk',
  '/daftar',
  '/lupa-sandi',
];
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
];

function parseArgs(argv) {
  const args = {
    base: 'http://localhost:3200',
    out: null,
    only: null,
    forms: ['mobile', 'desktop'],
    insecure: false,
    setup: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--base') args.base = argv[(i += 1)].replace(/\/+$/, '');
    else if (flag === '--out') args.out = resolve(argv[(i += 1)]);
    else if (flag === '--forms') args.forms = argv[(i += 1)].split(',');
    else if (flag === '--insecure') args.insecure = true;
    else if (flag === '--setup') args.setup = argv[(i += 1)];
    else if (flag === '--only') {
      args.only = [];
      while (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) {
        args.only.push(argv[(i += 1)]);
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const routes = args.only ?? [...PUBLIC_ROUTES, ...PREVIEW_ROUTES];
const outDir = args.out ?? join(tmpdir(), 'mindra-lighthouse');
mkdirSync(outDir, { recursive: true });
const chrome = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
if (!chrome) {
  console.error('Chrome tidak ditemukan. Atur CHROME_PATH ke berkas chrome/chromium.');
  process.exit(1);
}

const slug = (route) => (route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '-'));
const pct = (score) => (score === null || score === undefined ? null : Math.round(score * 100));

const results = [];
for (const route of routes) {
  for (const form of args.forms) {
    const base = join(outDir, `${slug(route)}.${form}`);
    const command = [
      'pnpm dlx',
      LIGHTHOUSE,
      `"${args.base}${route}"`,
      '--output=json --output=html',
      `--output-path="${base}"`,
      '--only-categories=performance,accessibility,best-practices,seo',
      form === 'desktop' ? '--preset=desktop' : '',
      '--quiet',
      `--chrome-flags="--headless=new --no-sandbox${args.insecure ? ' --ignore-certificate-errors' : ''}"`,
    ]
      .filter(Boolean)
      .join(' ');
    const started = Date.now();
    const run = spawnSync(command, {
      shell: true,
      encoding: 'utf8',
      env: { ...process.env, CHROME_PATH: chrome },
      maxBuffer: 64 * 1024 * 1024,
    });
    const jsonPath = `${base}.report.json`;
    if (!existsSync(jsonPath)) {
      console.error(`GAGAL ${form} ${route}\n${(run.stderr || run.stdout || '').slice(-400)}`);
      results.push({ route, form, error: true });
      continue;
    }
    const report = JSON.parse(readFileSync(jsonPath, 'utf8'));
    const audit = (id) => report.audits[id]?.numericValue;
    const row = {
      route,
      form,
      performance: pct(report.categories.performance.score),
      accessibility: pct(report.categories.accessibility.score),
      bestPractices: pct(report.categories['best-practices'].score),
      seo: pct(report.categories.seo.score),
      fcpMs: Math.round(audit('first-contentful-paint')),
      lcpMs: Math.round(audit('largest-contentful-paint')),
      tbtMs: Math.round(audit('total-blocking-time')),
      cls: Number(audit('cumulative-layout-shift').toFixed(3)),
      speedIndexMs: Math.round(audit('speed-index')),
      lighthouseVersion: report.lighthouseVersion,
      warnings: report.runWarnings,
    };
    results.push(row);
    console.log(
      `${form.padEnd(7)} ${route.padEnd(24)} P${row.performance} A${row.accessibility} BP${row.bestPractices} SEO${row.seo}  LCP ${row.lcpMs}ms  TBT ${row.tbtMs}ms  CLS ${row.cls}  (${Math.round((Date.now() - started) / 1000)} dtk)`,
    );
  }
}

const docsDir = resolve('docs/lighthouse');
mkdirSync(docsDir, { recursive: true });
const ok = results.filter((r) => !r.error);
const summary = {
  generatedAt: new Date().toISOString(),
  lighthouse: ok[0]?.lighthouseVersion ?? null,
  base: args.base,
  setup:
    args.setup ??
    'next start (build produksi) di mesin lokal; throttling bawaan Lighthouse (simulasi). Halaman berlogin diwakili rute /dev/*.',
  results,
};
writeFileSync(join(docsDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

const lines = [
  '| Rute | Perangkat | Performa | Aksesibilitas | Praktik terbaik | SEO | LCP | TBT | CLS |',
  '| ---- | --------- | -------: | ------------: | --------------: | --: | --: | --: | --: |',
  ...ok.map(
    (r) =>
      `| \`${r.route}\` | ${r.form === 'mobile' ? 'Mobile' : 'Desktop'} | ${r.performance} | ${r.accessibility} | ${r.bestPractices} | ${r.seo} | ${(r.lcpMs / 1000).toFixed(1)} dtk | ${r.tbtMs} ms | ${r.cls} |`,
  ),
];
writeFileSync(join(docsDir, 'summary.md'), `${lines.join('\n')}\n`);

const targets = { performance: 90, accessibility: 95, bestPractices: 95, seo: 90 };
const misses = ok.flatMap((r) =>
  Object.entries(targets)
    .filter(([key, min]) => r[key] < min)
    .map(([key, min]) => `${r.form} ${r.route}: ${key} ${r[key]} < ${min}`),
);
console.log(
  `\n${ok.length}/${results.length} halaman diaudit. Ringkasan: docs/lighthouse/summary.{json,md}`,
);
console.log(
  misses.length
    ? `Di bawah target CLAUDE.md:\n  ${misses.join('\n  ')}`
    : 'Semua halaman memenuhi target CLAUDE.md.',
);
process.exit(results.some((r) => r.error) ? 1 : 0);
