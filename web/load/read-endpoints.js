/**
 * Uji beban k6 untuk endpoint BACA publik Mindra (docs/PLAN.md Fase 5, docs/TESTING.md).
 *
 *   k6 run -e BASE_URL=https://alamat-demo.example load/read-endpoints.js --summary-export=load/results/k6-summary.json
 *
 * Profil: naik ke 200 VU dalam 15 detik, bertahan 2 menit, turun 10 detik.
 * Ambang lulus (docs/ARCHITECTURE.md §9): p95 < 500 ms dan galat < 1% (di semua endpoint).
 *
 * Variabel (-e NAMA=nilai):
 *   BASE_URL        alamat situs (wajib untuk selain lokal; bawaan http://localhost:3000)
 *   VUS             jumlah pengguna virtual (bawaan 200)
 *   HOLD            lama bertahan di VUS, mis. 2m (bawaan 2m)
 *   SPOOF_IP=1      kirim header x-real-ip acak per permintaan. HANYA untuk server lokal/staging tanpa
 *                   proxy tepercaya: dengan itu setiap VU tampak sebagai IP berbeda sehingga yang diukur
 *                   adalah kapasitas aplikasi, bukan batas laju per IP. Di Vercel header ini ditimpa
 *                   platform, jadi tidak ada gunanya (dan batas 60 permintaan/menit/IP akan menjawab 429).
 *   INCLUDE_HEALTH=1 ikut menembak /api/health (menyentuh database Supabase; jangan di proyek cloud
 *                   bersama tanpa izin pemiliknya)
 *
 * Yang diuji hanya data publik tanpa login (halaman statis + endpoint yang tidak membaca data pengguna).
 * Endpoint berotorisasi tidak diuji di sini karena butuh token; batas lajunya dibuktikan di
 * tests/ dan e2e/fase3.spec.ts.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const VUS = Number(__ENV.VUS || 200);
const HOLD = __ENV.HOLD || '2m';
const SPOOF_IP = __ENV.SPOOF_IP === '1';
const INCLUDE_HEALTH = __ENV.INCLUDE_HEALTH === '1';

/** Bobot menggambarkan campuran kunjungan: banyak halaman publik, lalu pembacaan katalog dan spesifikasi. */
const ENDPOINTS = [
  { name: 'beranda', path: '/', weight: 30, json: false },
  { name: 'developers', path: '/developers', weight: 10, json: false },
  { name: 'tentang', path: '/tentang', weight: 5, json: false },
  { name: 'instruments', path: '/api/v1/instruments', weight: 35, json: true },
  { name: 'openapi', path: '/api/v1/openapi.json', weight: 10, json: true },
  ...(INCLUDE_HEALTH ? [{ name: 'health', path: '/api/health', weight: 10, json: true }] : []),
];
const TOTAL_WEIGHT = ENDPOINTS.reduce((sum, endpoint) => sum + endpoint.weight, 0);

function pick() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const endpoint of ENDPOINTS) {
    roll -= endpoint.weight;
    if (roll < 0) return endpoint;
  }
  return ENDPOINTS[0];
}

const octet = () => Math.floor(Math.random() * 254) + 1;

const perEndpoint = {};
for (const endpoint of ENDPOINTS) {
  perEndpoint[`http_req_duration{endpoint:${endpoint.name}}`] = ['p(95)<500'];
  perEndpoint[`http_req_failed{endpoint:${endpoint.name}}`] = ['rate<0.01'];
}

export const options = {
  scenarios: {
    baca: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: VUS },
        { duration: HOLD, target: VUS },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99'],
    ...perEndpoint,
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  const endpoint = pick();
  const headers = { Accept: endpoint.json ? 'application/json' : 'text/html' };
  if (SPOOF_IP) headers['x-real-ip'] = `10.${octet()}.${octet()}.${octet()}`;

  const response = http.get(`${BASE_URL}${endpoint.path}`, {
    headers,
    tags: { endpoint: endpoint.name },
  });

  check(response, {
    'status 200': (r) => r.status === 200,
    'isi tidak kosong': (r) => (r.body ? r.body.length > 0 : false),
    ...(endpoint.json
      ? { 'berisi data atau spesifikasi': (r) => /"(data|openapi)"/.test(r.body) }
      : {}),
  });

  // Jeda "berpikir" 0,5 sampai 1,5 detik, seperti orang sungguhan (≈ 200 permintaan/detik pada 200 VU).
  sleep(0.5 + Math.random());
}
