# Panduan pengembang

Rincian operasional Mindra Web: menjalankan, menyambungkan Supabase, MFA, API, akun demo, pratinjau, dan struktur kode.
Ringkasan untuk juri ada di [`README.md`](../README.md); keputusan teknis dan alasannya di [`DECISIONS.md`](DECISIONS.md).

## Menjalankan

Prasyarat: Node.js ≥ 22.12 dan [pnpm](https://pnpm.io).

```bash
pnpm install
cp .env.example .env.local   # lalu isi (lihat "Menyambungkan Supabase")
pnpm dev                     # http://localhost:3000
```

Situs publik (`/`) dan halaman masuk/daftar tetap tampil walau `.env.local` belum diisi; formulir akan
menjawab bahwa layanan belum dikonfigurasi.

| Perintah         | Fungsi                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| `pnpm dev`       | Server pengembangan                                                    |
| `pnpm build`     | Build produksi                                                         |
| `pnpm lint`      | ESLint (aturan `jsx-a11y` diperketat; klien service role dibatasi)     |
| `pnpm typecheck` | `tsc --noEmit` (TypeScript strict)                                     |
| `pnpm test`      | Vitest: unit, komponen, dan **uji RLS pada Postgres** (PGlite)         |
| `pnpm test:e2e`  | Playwright + axe-core (desktop 1440 dan mobile 390)                    |
| `pnpm seed`      | Isi data demo (butuh `SUPABASE_SERVICE_ROLE_KEY`; `--reset` menghapus) |
| `pnpm db:types`  | Regenerasi `lib/supabase/database.types.ts` dari proyek Supabase       |
| `pnpm format`    | Prettier                                                               |
| `pnpm lighthouse` | Audit Lighthouse semua halaman utama (server produksi; lihat [`TESTING.md`](TESTING.md)) |
| `pnpm load`      | Uji beban lokal 200 pengguna virtual tanpa dependensi (padanan `load/read-endpoints.js`) |
| `pnpm load:k6`   | Uji beban k6 asli (butuh k6 terpasang)                                  |
| `pnpm usability:report` | Rekap uji pengguna SUS dan UEQ-S dari CSV ([`UJI-PENGGUNA.md`](UJI-PENGGUNA.md)) |

Tes e2e lokal memakai Google Chrome yang sudah terpasang. Di CI, pasang Chromium Playwright:
`pnpm exec playwright install --with-deps chromium`. Tes e2e **tidak** mengirim formulir pendaftaran
yang valid (akan mengirim email sungguhan lewat Supabase); ia menguji validasi, guard rute, aksesibilitas
(axe, WCAG 2.2 AA), dan alur penuh lewat halaman pratinjau `/dev/*` yang tidak butuh login.

Alur dengan **akun sungguhan** (simpan skrining, banner krisis dari data tersimpan, jurnal, beranda) ada di
`../e2e/fase1.auth.spec.ts` dan dilewati kecuali kredensial uji diberikan. Spec itu MENULIS data ke proyek
Supabase di `.env.local`, jadi pakai akun uji, bukan akun pribadi:

```bash
E2E_USER_EMAIL=pengguna@demo.mindra.test E2E_USER_PASSWORD=... pnpm exec playwright test e2e/fase1.auth.spec.ts
```

Alur Fase 2 dengan akun sungguhan ada di `../e2e/fase2.auth.spec.ts` (dilewati tanpa kredensial): peringatan krisis
muncul di dasbor psikolog tanpa memuat ulang saat pasien mengisi PHQ-9 butir 9 > 0, dan pendamping tanpa izin
`assessment_results` tidak bisa melihat hasil skrining. Variabel yang dibutuhkan dijelaskan di kepala berkas itu.
Skenario psikolog butuh MFA dimatikan (lihat "MFA psikolog").

Alur Fase 3 lewat HTTP tanpa kredensial (401, 403, 422, 429, OpenAPI, FHIR, halaman `/developers`) ada di
`../e2e/fase3.spec.ts` dan berjalan di suite biasa. Alur API dengan **akun sungguhan** (masuk lewat Supabase Auth,
membuat skrining GAD-7 dan PHQ-9 yang memicu krisis, mood, tidur, Bundel FHIR, sinkronisasi SATUSEHAT) ada di
`../e2e/fase3.auth.spec.ts`. Spec itu MENULIS data ke proyek Supabase, jadi pakai akun uji khusus:

```bash
E2E_USER_EMAIL=pengguna@demo.mindra.test E2E_USER_PASSWORD=... \
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
pnpm exec playwright test e2e/fase3.auth.spec.ts --project=desktop-1440
```

> Jangan menjalankan `pnpm build` saat `pnpm dev` sedang berjalan; keduanya memakai folder `.next`.

## Menyambungkan Supabase

1. Pilih proyek Supabase untuk web dan mobile. Terapkan SEMUA migrasi di `../supabase/migrations/`
   berurutan: lima migrasi aplikasi Flutter, lalu delapan migrasi web:
   - `20261014000000_web_ecosystem.sql` (peran, izin psikolog, alert krisis, log akses, faskes, agregat anonim)
   - `20261014000100_caregiver_invite_hardening.sql` (menutup F1, F3, F4, F8; **mengubah aplikasi Flutter**: bangun ulang)
   - `20261014000200_assessment_integrity.sql` (menutup F6: skor dihitung ulang server)
   - `20261014000300_care_ecosystem.sql` (Fase 2: **MFA psikolog di database**, RPC daftar klien/pendamping/riwayat akses, `log_access_batch`, catatan sesi, persetujuan SATUSEHAT; menutup F5)
   - `20261014000400_drop_inert_psychologist_policies.sql` (Fase 3: menghapus 4 policy psikolog lama yang inert, menutup sisa F5)
   - `20261014000500_facility_mfa_and_booking.sql` (Fase 4: **MFA admin faskes di database**, constraint anti-bentrok jadwal konsultasi, fungsi pemesanan; butuh ekstensi `btree_gist`; **mengubah perilaku aplikasi Flutter**: sesi yang bertumpuk kini ditolak)
   - `20261014000600_region_optin_admin_review.sql` (Gelombang 1: **statistik wilayah opt-in** `profiles.share_region_stats` dan `facility_aggregate()` yang hanya menghitung yang setuju; `psychologist_available_slots()` untuk daftar slot (dipakai web dan Flutter); `delete_my_account()`; **portal admin**: tabel `admin_actions`, `admin_pending_psychologists()`, `admin_review_psychologist()`, dan pintu peninjauan pada trigger penjaga kolom istimewa)

   Pada proyek yang lima migrasi Flutter-nya sudah ada, cukup delapan migrasi web. Halaman Fase 2 (`/privasi`,
   `/psikolog`, `/pendamping`) memakai RPC dari `…000300`; tanpa migrasi itu halaman tersebut menampilkan halaman galat. Semuanya idempotent.
   Rincian celah yang ditutup: [`docs/TEMUAN-KEAMANAN.md`](TEMUAN-KEAMANAN.md).

2. Isi `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
   (Dashboard > Settings > API). `SUPABASE_SERVICE_ROLE_KEY` **rahasia**, hanya untuk `pnpm seed` dan kode server.
   Untuk API publik: `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` (wajib di produksi; kosong = pembatas laju
   di memori proses) serta blok `SATUSEHAT_*` (bawaan `SATUSEHAT_MODE=mock`, simulasi lokal tanpa kredensial).
   Untuk Teman cerita: `ANTHROPIC_API_KEY` (server saja; kosong = fitur nonaktif, jalur krisis tetap jalan) dan opsional `ANTHROPIC_MODEL`.
3. Dashboard > Authentication > URL Configuration: tambahkan `<NEXT_PUBLIC_SITE_URL>/auth/callback` ke
   Redirect URLs (tanpa ini tautan konfirmasi email dan pemulihan sandi ditolak).
4. `pnpm seed --yes` untuk akun demo. Bila data demo sudah ada dan hanya akun baru yang kurang (mis. akun admin), pakai
   `pnpm seed --yes --add-accounts`: akun yang belum ada ditambahkan tanpa menyentuh data demo lain (`--reset` menghapus
   dan membuat ulang semuanya). Setiap migrasi berubah, jalankan `pnpm db:types` (butuh
   `SUPABASE_PROJECT_ID` dan `SUPABASE_ACCESS_TOKEN` di `.env.local`).

## MFA psikolog

Akun psikolog wajib memakai TOTP (aplikasi autentikator). Penegakannya ada **di database**: `can_view()` hanya
membuka data klien bagi sesi berklaim `aal2`, jadi token tanpa TOTP ditolak walau dipakai langsung ke API.
Halaman web hanya mengarahkan: `/psikolog/keamanan` (pasang TOTP, tambah perangkat cadangan) dan `/psikolog/verifikasi`.

Untuk demo atau uji e2e tanpa perangkat autentikator, ada dua sakelar yang **keduanya** harus dimatikan:

```bash
# 1. server web (.env.local)
MFA_ENFORCEMENT=off
# 2. database (SQL Editor); kembalikan dengan: alter database postgres reset app.psychologist_mfa;
alter database postgres set app.psychologist_mfa = 'off';
```

Hanya nilai persis `off` yang berlaku; salah ketik tetap mewajibkan MFA. Jangan dimatikan di lingkungan sungguhan.

## API publik

Dokumentasi interaktif di `/developers` (contoh curl per endpoint, tabel kolom, kode galat); dokumen mesin OpenAPI 3.1
di `/api/v1/openapi.json` (dibangkitkan dari skema Zod yang sama dengan validasi, jadi tidak bisa menyimpang).

| Metode dan jalur                          | Auth      | Fungsi                                                           |
| ----------------------------------------- | --------- | ---------------------------------------------------------------- |
| `GET /api/v1/instruments`                 | publik    | Instrumen dan pertanyaan (PHQ-9, GAD-7, PSS-10, SRQ-20)          |
| `GET`, `POST /api/v1/assessments`         | Bearer    | Riwayat (kursor) dan kirim jawaban; skor dihitung di server      |
| `GET`, `POST /api/v1/mood-entries`        | Bearer    | Catatan mood                                                     |
| `GET`, `POST /api/v1/sleep-entries`       | Bearer    | Catatan tidur                                                    |
| `GET /api/v1/insights/weekly`             | Bearer    | Ringkasan mingguan                                               |
| `GET /api/v1/fhir/Observation?patient=me` | Bearer    | Hasil skrining sebagai FHIR R4 Bundle (`application/fhir+json`)  |
| `POST /api/v1/satusehat/sync`             | Bearer    | Kirim hasil yang disetujui ke SATUSEHAT (mode mock atau staging) |
| `GET /api/v1/facilities/{id}/aggregates`  | X-API-Key | Agregat anonim (k ≥ 10) untuk sistem mitra                       |

Bearer = token akses Supabase pengguna; `X-API-Key` = kunci `mk_live_...` yang dibuat admin faskes di
`/faskes/kunci-api` (hanya hash yang disimpan, nilai penuh tampil sekali). Semua jawaban memakai amplop
`{ data, error, meta }` dan membawa `X-Request-Id`; batas laju mengembalikan 429 dengan `Retry-After`. Contoh:

```bash
curl https://<situs>/api/v1/instruments
curl -H "Authorization: Bearer $TOKEN" "https://<situs>/api/v1/assessments?limit=5"
```

Pemeta FHIR (`lib/domain/fhir`) memakai LOINC `44261-6` (PHQ-9) dan `70274-6` (GAD-7); PSS-10 dan SRQ-20 memakai
sistem lokal. Mode SATUSEHAT bawaan `mock` tidak mengirim apa pun keluar dari server; `staging` butuh kredensial
sandbox Kemenkes dan nomor IHS pasien (belum dicoba). Kunci dan batas dijelaskan di
[`docs/DECISIONS.md`](DECISIONS.md) (Fase 3).

## Portal faskes, Teman cerita, dan Konsultasi (Fase 4)

- **Portal faskes** (`/faskes`, `/faskes/peta`, `/faskes/laporan`): hanya angka gabungan anonim (k ≥ 10) dari satu fungsi database,
  `facility_aggregate()`. Admin faskes wajib TOTP (aal2) yang ditegakkan di database; halaman keamanan di `/faskes/keamanan`.
  Peta memakai Leaflet dan ubin OpenStreetMap (butuh internet); laporan bulanan bisa diunduh sebagai CSV.
- **Teman cerita** (`/teman-cerita`): obrolan AI dengan balasan yang mengalir (SSE lewat `POST /api/v1/companion/chat`). Deteksi
  krisis berbasis aturan berjalan **sebelum** model dipanggil; saat krisis, balasan tetap ditampilkan dengan tombol telepon
  dan peringatan dikirim ke psikolog yang berizin. Batas 20 pesan per jam (pesan krisis dikecualikan). Butuh `ANTHROPIC_API_KEY`.
- **Konsultasi** (`/konsultasi`): direktori psikolog, pilih jam (WIB, sesi 50 menit), pesan. Bentrok ditolak database
  (constraint EXCLUDE), bukan aplikasi. Psikolog melihat jadwalnya di `/psikolog/jadwal`.

Alur Fase 4 dengan akun sungguhan ada di `../e2e/fase4.auth.spec.ts` (petunjuk di berkasnya; spec itu MENULIS data).

## Akun demo

Ada setelah `pnpm seed`. Semua berdomain `.test` (tidak bisa menerima email sungguhan) dan hanya berisi data sintetis.

| Peran        | Email                         | Masuk ke      |
| ------------ | ----------------------------- | ------------- |
| Pengguna     | `pengguna@demo.mindra.test`   | `/beranda`    |
| Psikolog     | `psikolog@demo.mindra.test`   | `/psikolog`   |
| Pendamping   | `pendamping@demo.mindra.test` | `/pendamping` |
| Admin faskes | `faskes@demo.mindra.test`     | `/faskes`     |
| Admin Mindra | `admin@demo.mindra.test`      | `/admin`      |
| Calon psikolog | `calon.psikolog@demo.mindra.test` | `/beranda` (permohonannya muncul di `/admin/verifikasi`) |

Kata sandi semuanya `Mindra-Demo-2026` (dapat diganti lewat `DEMO_PASSWORD` saat seed). Akun psikolog demo belum
memiliki faktor TOTP: saat masuk ia diarahkan memasangnya (atau matikan sakelar di atas untuk demo).

## Halaman pratinjau komponen

`/dev/ui` (katalog semua komponen), `/dev/shell` (kerangka aplikasi), dan pratinjau halaman berdata contoh
(`/dev/asesmen`, `/dev/beranda`, `/dev/jurnal`, `/dev/psikolog`, `/dev/klien`, `/dev/privasi`, `/dev/pendamping`,
`/dev/pendamping-detail`, `/dev/kunci-api`, `/dev/faskes`, `/dev/faskes-peta`, `/dev/faskes-laporan`, `/dev/teman-cerita`,
`/dev/konsultasi`, `/dev/konsultasi-detail`, `/dev/jadwal`, `/dev/profil`, `/dev/admin`, `/dev/layanan-terdekat`) aktif otomatis saat pengembangan. Di produksi semuanya 404 kecuali `ENABLE_DEV_PAGES=true` diatur. `/dev/psikolog` memakai klien Realtime palsu: tombol
"Simulasikan peringatan masuk" menunjukkan peringatan krisis baru muncul tanpa memuat ulang halaman.

## Struktur

```
app/              rute: (marketing: landing, tentang, bantuan, layanan-terdekat, syarat-penggunaan, kebijakan-privasi, developers) (auth) (user: (shell) dengan sidebar dan profil, (focus) mode fokus) (psychologist) (caregiver) (facility) (admin), developers, api/health, api/v1/* (API publik), auth/callback, dev/* (pratinjau)
components/ui/        komponen dasar (Button, Input, Dialog, Tabs, Toast, …)
components/layout/    AppShell, PortalShell, MarketingHeader/Footer, navigasi per peran
components/features/  komponen fitur (auth, assessment, journal, home, privacy, psychologist, caregiver)
lib/auth/         peran, guard rute, sesi server, Server Actions, penyaring ?next=
lib/assessment/   validasi + skoring server dan Server Action simpan skrining
lib/journal/      Server Action jurnal mood dan tidur
lib/api/          kerangka API: defineRoute (auth, batas laju, Zod, respons), kunci, kursor, OpenAPI, rute, layanan
lib/faskes/       Server Action kunci API admin faskes
lib/companion/    sisi klien Teman cerita: transport SSE, reducer keadaan, Server Action hapus percakapan
lib/consultation/ inti pemesanan (dipakai halaman dan API) dan Server Action konsultasi
lib/privacy/  lib/psychologist/  lib/caregiver/   Server Action: izin dan undangan, tandai peringatan dan catatan sesi, terima undangan
lib/supabase/     klien browser/server/middleware + tipe database
lib/server/       HANYA server: audit.ts (catat dulu, baru baca), pembacaan data psikolog/pendamping/privasi, klien service role (aturan lint menjaga)
lib/domain/       logika murni + tes: assessment (skoring, rekomendasi), crisis, insight, journal, privacy (izin, riwayat akses), psychologist, caregiver, fhir (Observation R4), faskes (dasbor, laporan, peta), companion (prompt, balasan krisis), consultation (slot, direktori, sesi), usability (skor SUS, laporan)
lib/security/     CSP dan header keamanan
instrumentation-client.ts   berjalan di browser sebelum aplikasi: mematikan percobaan eval Zod (CSP tanpa unsafe-eval)
lib/validation/   skema Zod bersama (form + Server Action)
scripts/          seed data demo, regenerasi tipe, audit Lighthouse, tangkapan layar, rekap SUS
load/             uji beban: read-endpoints.js (k6) dan node-load.mjs (padanan tanpa dependensi)
.github/workflows/ CI (lint, tipe, build, tes, e2e) dan pemeriksa uptime
design/           mockup HTML + tokens.css (acuan visual, bukan kode produksi)
docs/             PLAN, ARCHITECTURE, DESIGN, DECISIONS, TEMUAN-KEAMANAN, TESTING, UJI-PENGGUNA, PANDUAN-PENGEMBANG
e2e/  tests/      Playwright · tes token, middleware, RLS (PGlite), seed
../supabase/migrations/   migrasi database (milik bersama web + mobile)
```

## Dokumentasi

- [`CLAUDE.md`](../CLAUDE.md) — aturan proyek
- [`docs/PLAN.md`](PLAN.md) — urutan kerja per fase
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — data, API, keamanan
- [`docs/DESIGN.md`](DESIGN.md) — sistem desain
- [`docs/DECISIONS.md`](DECISIONS.md) — keputusan dan alasannya (bahan tanya jawab juri)
- [`docs/TEMUAN-KEAMANAN.md`](TEMUAN-KEAMANAN.md) — temuan keamanan pada skema aplikasi Flutter
- [`docs/TESTING.md`](TESTING.md) — bukti pengujian: Lighthouse, aksesibilitas, beban, uptime
- [`docs/UJI-PENGGUNA.md`](UJI-PENGGUNA.md) — protokol uji pengguna dan kuesioner SUS + UEQ-S
- `/developers` dan `/api/v1/openapi.json` — dokumentasi dan spesifikasi API publik (saat server berjalan)

## Menjalankan spec berakun terhadap situs yang sudah dideploy

`E2E_BASE_URL=https://<alamat>` membuat Playwright memakai situs itu alih-alih menjalankan server lokal. Hanya cocok untuk
spec yang tidak memakai halaman pratinjau `/dev/*` (di produksi memang 404), yaitu `*.auth.spec.ts`. Panduan deploy lengkap:
[`DEPLOY.md`](DEPLOY.md).

## Aplikasi mobile dan Teman cerita

Aplikasi Flutter tidak memegang kunci model. Isi `WEB_API_BASE_URL` di `.env` mobile (lihat `../.env.example`) dengan alamat
web; Teman cerita memanggil `POST <alamat>/api/v1/companion/chat` dengan token sesi Supabase. Kosong = fitur dinonaktifkan
dengan pesan yang jelas.
