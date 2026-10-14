#!/usr/bin/env node
/**
 * Penguji beban tanpa dependensi (Node 22+), padanan lokal untuk load/read-endpoints.js (k6).
 *
 * Dibuat karena k6 adalah biner terpisah yang tidak ikut terpasang di mesin pengembangan; skrip ini
 * memakai profil, bobot endpoint, jeda, dan ambang yang SAMA. Ini BUKAN k6 dan angkanya tidak boleh
 * disebut sebagai hasil k6. Hasil k6 sungguhan menunggu Argy menjalankan load/read-endpoints.js.
 *
 *   pnpm build && pnpm start --port 3200
 *   node load/node-load.mjs --base http://localhost:3200 --label lokal
 *
 * Opsi:
 *   --base <url>       alamat server (bawaan http://localhost:3200)
 *   --vus <n>          pengguna virtual (bawaan 200)
 *   --hold <detik>     lama bertahan di puncak (bawaan 120)
 *   --ramp <detik>     lama naik ke puncak (bawaan 15)
 *   --no-spoof-ip      JANGAN kirim x-real-ip acak (bawaan: kirim, supaya yang diukur kapasitas aplikasi)
 *   --limiter-check    tambahkan tahap uji batas laju: satu IP, banyak koneksi paralel
 *   --label <nama>     nama berkas hasil (bawaan "lokal")
 *   --out <dir>        folder hasil JSON (bawaan load/results); grafik SVG ke docs/img/
 *
 * Keluar dengan kode 1 bila ambang gagal: p95 < 500 ms dan galat < 1% (keseluruhan dan per endpoint).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, release, totalmem } from 'node:os';
import { join, resolve } from 'node:path';

const ENDPOINTS = [
  { name: 'beranda', path: '/', weight: 30, json: false },
  { name: 'developers', path: '/developers', weight: 10, json: false },
  { name: 'tentang', path: '/tentang', weight: 5, json: false },
  { name: 'instruments', path: '/api/v1/instruments', weight: 35, json: true },
  { name: 'openapi', path: '/api/v1/openapi.json', weight: 10, json: true },
];
const TOTAL_WEIGHT = ENDPOINTS.reduce((sum, e) => sum + e.weight, 0);
const P95_LIMIT_MS = 500;
const ERROR_LIMIT = 0.01;
const BUCKET_SECONDS = 5;

function parseArgs(argv) {
  const args = {
    base: 'http://localhost:3200',
    vus: 200,
    hold: 120,
    ramp: 15,
    spoof: true,
    limiterCheck: false,
    label: 'lokal',
    out: resolve('load/results'),
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--base') args.base = argv[(i += 1)].replace(/\/+$/, '');
    else if (flag === '--vus') args.vus = Number(argv[(i += 1)]);
    else if (flag === '--hold') args.hold = Number(argv[(i += 1)]);
    else if (flag === '--ramp') args.ramp = Number(argv[(i += 1)]);
    else if (flag === '--no-spoof-ip') args.spoof = false;
    else if (flag === '--limiter-check') args.limiterCheck = true;
    else if (flag === '--label') args.label = argv[(i += 1)];
    else if (flag === '--out') args.out = resolve(argv[(i += 1)]);
    else throw new Error(`Opsi tidak dikenal: ${flag}`);
  }
  return args;
}

const octet = () => Math.floor(Math.random() * 254) + 1;
const randomIp = () => `10.${octet()}.${octet()}.${octet()}`;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function pickEndpoint() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const endpoint of ENDPOINTS) {
    roll -= endpoint.weight;
    if (roll < 0) return endpoint;
  }
  return ENDPOINTS[0];
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((total, v) => total + v, 0);
  return {
    count: sorted.length,
    avg: sorted.length ? sum / sorted.length : 0,
    min: sorted[0] ?? 0,
    med: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

const round = (value, digits = 1) => Number(value.toFixed(digits));

/** Satu permintaan; membaca seluruh badan supaya waktu mencakup unduhan, seperti k6. */
async function hit(base, endpoint, spoof, sample) {
  const headers = { Accept: endpoint.json ? 'application/json' : 'text/html' };
  if (spoof) headers['x-real-ip'] = randomIp();
  const started = performance.now();
  let status = 0;
  let ok = false;
  try {
    const response = await fetch(`${base}${endpoint.path}`, { headers });
    const body = await response.text();
    status = response.status;
    ok =
      status === 200 &&
      body.length > 0 &&
      (!endpoint.json || /"(data|openapi)"/.test(body.slice(0, 4096)));
  } catch {
    status = 0;
  }
  sample(endpoint.name, performance.now() - started, ok, status);
}

async function runMainPhase(args) {
  const samples = [];
  const t0 = performance.now();
  const total = args.ramp + args.hold;
  const sample = (endpoint, ms, ok, status) =>
    samples.push({ at: (performance.now() - t0) / 1000, endpoint, ms, ok, status });

  const vu = async (index) => {
    // Naik linear: VU ke-i mulai pada detik ramp * i / vus.
    await sleep(((args.ramp * index) / args.vus) * 1000);
    while ((performance.now() - t0) / 1000 < total) {
      await hit(args.base, pickEndpoint(), args.spoof, sample);
      await sleep(500 + Math.random() * 1000);
    }
  };
  await Promise.all(Array.from({ length: args.vus }, (_, i) => vu(i)));
  return { samples, duration: (performance.now() - t0) / 1000 };
}

/** Satu IP, banyak koneksi paralel: batas laju harus menahan di angka yang dijanjikan. */
async function runLimiterCheck(args) {
  const ip = randomIp();
  const concurrency = 200;
  const requests = 600;
  const codes = new Map();
  const allowedLatencies = [];
  const blockedLatencies = [];
  let next = 0;

  const worker = async () => {
    while (next < requests) {
      next += 1;
      const started = performance.now();
      let status = 0;
      try {
        const response = await fetch(`${args.base}/api/v1/instruments`, {
          headers: { 'x-real-ip': ip },
        });
        await response.text();
        status = response.status;
      } catch {
        status = 0;
      }
      const elapsed = performance.now() - started;
      codes.set(status, (codes.get(status) ?? 0) + 1);
      (status === 200 ? allowedLatencies : blockedLatencies).push(elapsed);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return {
    concurrency,
    requests,
    statusCounts: Object.fromEntries([...codes.entries()].sort((a, b) => a[0] - b[0])),
    allowed200: codes.get(200) ?? 0,
    blocked429: codes.get(429) ?? 0,
    otherErrors: requests - (codes.get(200) ?? 0) - (codes.get(429) ?? 0),
    allowedLatencyMs: stats(allowedLatencies),
    blockedLatencyMs: stats(blockedLatencies),
  };
}

function summarize(samples, duration) {
  const byEndpoint = {};
  for (const endpoint of ENDPOINTS) {
    const rows = samples.filter((s) => s.endpoint === endpoint.name);
    const failed = rows.filter((s) => !s.ok).length;
    byEndpoint[endpoint.name] = {
      path: endpoint.path,
      ...Object.fromEntries(
        Object.entries(stats(rows.map((s) => s.ms))).map(([k, v]) => [
          k,
          k === 'count' ? v : round(v),
        ]),
      ),
      failed,
      errorRate: rows.length ? round(failed / rows.length, 5) : 0,
    };
  }
  const all = stats(samples.map((s) => s.ms));
  const failed = samples.filter((s) => !s.ok).length;
  const statusCounts = {};
  for (const s of samples) statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
  return {
    overall: {
      requests: samples.length,
      requestsPerSecond: round(samples.length / duration),
      failed,
      errorRate: round(failed / Math.max(1, samples.length), 5),
      latencyMs: Object.fromEntries(
        Object.entries(all).map(([k, v]) => [k, k === 'count' ? v : round(v)]),
      ),
      statusCounts,
    },
    byEndpoint,
  };
}

function timeSeries(samples, duration) {
  const buckets = Math.ceil(duration / BUCKET_SECONDS);
  return Array.from({ length: buckets }, (_, i) => {
    const rows = samples.filter(
      (s) => s.at >= i * BUCKET_SECONDS && s.at < (i + 1) * BUCKET_SECONDS,
    );
    const sorted = rows.map((r) => r.ms).sort((a, b) => a - b);
    return {
      t: i * BUCKET_SECONDS,
      rps: round(rows.length / BUCKET_SECONDS),
      p50: round(percentile(sorted, 50)),
      p95: round(percentile(sorted, 95)),
      errors: rows.filter((r) => !r.ok).length,
    };
  });
}

/** Grafik SVG buatan sendiri (tanpa pustaka), dua panel: latensi p50/p95 dan permintaan per detik. */
function renderChart(series, meta) {
  const W = 760;
  const H = 440;
  const left = 64;
  const right = 24;
  const innerW = W - left - right;
  const panel = (top, height) => ({ top, height });
  const lat = panel(64, 150);
  const rps = panel(268, 100);
  const maxT = series.length * BUCKET_SECONDS;
  const x = (t) => left + (t / maxT) * innerW;
  // Sumbu dengan kelipatan bulat (0, 100, 200, ...) supaya angkanya mudah dibaca.
  const niceStep = (max, steps) => steps.find((step) => max / step <= 5) ?? steps[steps.length - 1];
  const latRaw = Math.max(P95_LIMIT_MS * 1.1, ...series.map((s) => s.p95)) * 1.05;
  const latStep = niceStep(latRaw, [50, 100, 200, 250, 500, 1000, 2000]);
  const maxLat = Math.ceil(latRaw / latStep) * latStep;
  const yLat = (v) => lat.top + lat.height - (v / maxLat) * lat.height;
  const rpsRaw = Math.max(10, ...series.map((s) => s.rps)) * 1.1;
  const rpsStep = niceStep(rpsRaw, [10, 20, 25, 50, 100, 200, 500, 1000]);
  const maxRps = Math.ceil(rpsRaw / rpsStep) * rpsStep;
  const yRps = (v) => rps.top + rps.height - (v / maxRps) * rps.height;
  const ticks = (max, step) =>
    Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);

  const line = (key) =>
    series
      .map(
        (s, i) =>
          `${i === 0 ? 'M' : 'L'}${x(s.t + BUCKET_SECONDS / 2).toFixed(1)} ${yLat(s[key]).toFixed(1)}`,
      )
      .join(' ');
  const barW = Math.max(2, innerW / series.length - 2);
  const bars = series
    .map(
      (s) =>
        `<rect x="${(x(s.t) + 1).toFixed(1)}" y="${yRps(s.rps).toFixed(1)}" width="${barW.toFixed(1)}" height="${(rps.top + rps.height - yRps(s.rps)).toFixed(1)}" fill="#3B7E72"/>`,
    )
    .join('');
  const errorMarks = series
    .filter((s) => s.errors > 0)
    .map(
      (s) =>
        `<rect x="${(x(s.t) + 1).toFixed(1)}" y="${(rps.top + rps.height + 4).toFixed(1)}" width="${barW.toFixed(1)}" height="6" fill="#C0392B"/>`,
    )
    .join('');
  const xTicks = Array.from({ length: Math.floor(maxT / 20) + 1 }, (_, i) => i * 20)
    .map(
      (t) =>
        `<text x="${x(t).toFixed(1)}" y="${rps.top + rps.height + 26}" text-anchor="middle" class="tick">${t} dtk</text>`,
    )
    .join('');
  const yLatTicks = ticks(maxLat, latStep)
    .map(
      (v) =>
        `<line x1="${left}" x2="${W - right}" y1="${yLat(v).toFixed(1)}" y2="${yLat(v).toFixed(1)}" class="grid"/><text x="${left - 8}" y="${(yLat(v) + 4).toFixed(1)}" text-anchor="end" class="tick">${Math.round(v)}</text>`,
    )
    .join('');
  const yRpsTicks = ticks(maxRps, rpsStep)
    .map(
      (v) =>
        `<line x1="${left}" x2="${W - right}" y1="${yRps(v).toFixed(1)}" y2="${yRps(v).toFixed(1)}" class="grid"/><text x="${left - 8}" y="${(yRps(v) + 4).toFixed(1)}" text-anchor="end" class="tick">${Math.round(v)}</text>`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
  <title id="t">Latensi dan throughput uji beban</title>
  <desc id="d">${meta.desc}</desc>
  <style>
    text { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; fill: #44403A; }
    .title { font-size: 15px; font-weight: 700; fill: #1A1A2E; }
    .sub { font-size: 12px; fill: #635E55; }
    .tick { font-size: 11px; fill: #635E55; }
    .grid { stroke: #DFDBD3; stroke-width: 1; }
    .axis { font-size: 12px; font-weight: 600; }
  </style>
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <text x="${left}" y="24" class="title">${meta.title}</text>
  <text x="${left}" y="42" class="sub">${meta.subtitle}</text>
  <text x="${left}" y="${lat.top - 8}" class="axis">Latensi (ms)</text>
  ${yLatTicks}
  <line x1="${left}" x2="${W - right}" y1="${yLat(P95_LIMIT_MS).toFixed(1)}" y2="${yLat(P95_LIMIT_MS).toFixed(1)}" stroke="#C0392B" stroke-width="1.5" stroke-dasharray="6 4"/>
  <text x="${W - right}" y="${(yLat(P95_LIMIT_MS) - 6).toFixed(1)}" text-anchor="end" class="tick" style="fill:#C0392B">ambang p95 ${P95_LIMIT_MS} ms</text>
  <path d="${line('p50')}" fill="none" stroke="#3B7E72" stroke-width="2"/>
  <path d="${line('p95')}" fill="none" stroke="#2E6DA4" stroke-width="2.5"/>
  <g transform="translate(${W - right - 150} ${lat.top - 14})">
    <line x1="0" x2="18" y1="0" y2="0" stroke="#3B7E72" stroke-width="2"/><text x="24" y="4" class="tick">p50</text>
    <line x1="64" x2="82" y1="0" y2="0" stroke="#2E6DA4" stroke-width="2.5"/><text x="88" y="4" class="tick">p95</text>
  </g>
  <text x="${left}" y="${rps.top - 8}" class="axis">Permintaan per detik</text>
  ${yRpsTicks}
  ${bars}
  ${errorMarks}
  ${xTicks}
  <text x="${W - right}" y="${H - 8}" text-anchor="end" class="tick">Batang merah di bawah panel = detik dengan permintaan gagal</text>
</svg>
`;
}

function verdict(summary) {
  const checks = [];
  const { overall, byEndpoint } = summary;
  checks.push({
    name: `p95 keseluruhan < ${P95_LIMIT_MS} ms`,
    value: `${overall.latencyMs.p95} ms`,
    pass: overall.latencyMs.p95 < P95_LIMIT_MS,
  });
  checks.push({
    name: `galat keseluruhan < ${ERROR_LIMIT * 100}%`,
    value: `${round(overall.errorRate * 100, 3)}%`,
    pass: overall.errorRate < ERROR_LIMIT,
  });
  for (const [name, e] of Object.entries(byEndpoint)) {
    checks.push({
      name: `${name}: p95 < ${P95_LIMIT_MS} ms`,
      value: `${e.p95} ms`,
      pass: e.p95 < P95_LIMIT_MS,
    });
    checks.push({
      name: `${name}: galat < ${ERROR_LIMIT * 100}%`,
      value: `${round(e.errorRate * 100, 3)}%`,
      pass: e.errorRate < ERROR_LIMIT,
    });
  }
  return checks;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const probe = await fetch(`${args.base}/`).catch(() => null);
  if (!probe || probe.status !== 200) {
    console.error(
      `Server tidak menjawab 200 di ${args.base}/. Jalankan "pnpm build && pnpm start --port 3200" dulu.`,
    );
    process.exit(2);
  }

  console.log(
    `Mulai: ${args.vus} VU, naik ${args.ramp} dtk, bertahan ${args.hold} dtk, ${args.spoof ? 'IP acak per permintaan' : 'satu IP'} -> ${args.base}`,
  );
  const startedAt = new Date().toISOString();
  const { samples, duration } = await runMainPhase(args);
  const summary = summarize(samples, duration);
  const series = timeSeries(samples, duration);
  const checks = verdict(summary);
  const limiter = args.limiterCheck ? await runLimiterCheck(args) : null;

  const cpu = cpus();
  const result = {
    label: args.label,
    startedAt,
    tool: 'load/node-load.mjs (bukan k6)',
    profile: {
      vus: args.vus,
      rampSeconds: args.ramp,
      holdSeconds: args.hold,
      spoofIp: args.spoof,
      base: args.base,
    },
    machine: {
      os: `${platform()} ${release()}`,
      node: process.version,
      cpu: cpu[0]?.model ?? 'tidak diketahui',
      cores: cpu.length,
      memoryGb: round(totalmem() / 1024 ** 3),
      note: 'Server dan penguji beban berjalan di mesin yang sama dan berbagi CPU.',
    },
    thresholds: checks,
    ...summary,
    limiterCheck: limiter,
    series,
  };

  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, `${args.label}.json`), `${JSON.stringify(result, null, 2)}\n`);
  mkdirSync(resolve('docs/img'), { recursive: true });
  const chart = renderChart(series, {
    title: `Uji beban ${args.vus} pengguna virtual (${args.label})`,
    subtitle: `${summary.overall.requests} permintaan dalam ${Math.round(duration)} dtk, p95 ${summary.overall.latencyMs.p95} ms, galat ${round(summary.overall.errorRate * 100, 3)}%`,
    desc: `Garis p50 dan p95 latensi per ${BUCKET_SECONDS} detik dan batang permintaan per detik selama uji beban lokal.`,
  });
  writeFileSync(resolve(`docs/img/load-${args.label}.svg`), chart);

  const o = summary.overall;
  console.log(
    `\n${o.requests} permintaan, ${o.requestsPerSecond}/dtk, galat ${round(o.errorRate * 100, 3)}% (${o.failed})`,
  );
  console.log(
    `latensi ms: avg ${o.latencyMs.avg}  med ${o.latencyMs.med}  p90 ${o.latencyMs.p90}  p95 ${o.latencyMs.p95}  p99 ${o.latencyMs.p99}  maks ${o.latencyMs.max}`,
  );
  console.log('status:', JSON.stringify(o.statusCounts));
  for (const [name, e] of Object.entries(summary.byEndpoint)) {
    console.log(
      `  ${name.padEnd(11)} n=${String(e.count).padEnd(6)} med ${String(e.med).padEnd(7)} p95 ${String(e.p95).padEnd(7)} p99 ${String(e.p99).padEnd(7)} galat ${round(e.errorRate * 100, 3)}%`,
    );
  }
  if (limiter) {
    console.log(
      `\nBatas laju (satu IP, ${limiter.concurrency} koneksi paralel, ${limiter.requests} permintaan): ${JSON.stringify(limiter.statusCounts)}`,
    );
  }
  console.log('\nAmbang:');
  for (const c of checks) console.log(`  ${c.pass ? 'LULUS' : 'GAGAL'}  ${c.name}  (${c.value})`);
  process.exit(checks.every((c) => c.pass) ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
