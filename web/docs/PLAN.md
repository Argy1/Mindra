# Mindra Web — Rencana Kerja UINIC 8.0

**Hari ini: Selasa 13 Okt 2026 · Batas internal: Kamis 29 Okt · Tenggat: Jumat 30 Okt 23.59 WIB**

Cara pakai: kerjakan fase berurutan. Setiap fase punya **prompt siap tempel** untuk Claude Code
(jalankan Claude Code dari folder `Mindra/web`). Centang `[x]` saat selesai.
Kalau sebuah fase molor lebih dari 1 hari, potong dari Lapis 3 dulu, lalu Lapis 2 — jangan Lapis 1.

## Ringkasan jadwal

| Tanggal   | Fase                 | Hasil                                                                             |
| --------- | -------------------- | --------------------------------------------------------------------------------- |
| 13–14 Okt | 0. Fondasi           | Proyek Next.js, token desain, komponen UI, auth + role, migrasi, deploy pertama   |
| 15–17 Okt | 1. Pengguna          | Asesmen + krisis, jurnal mood/tidur, beranda insight                              |
| 18–21 Okt | 2. Ekosistem         | Portal psikolog + alert realtime, portal pendamping, audit log, halaman privasi   |
| 22–23 Okt | 3. Interoperabilitas | API v1 + OpenAPI + `/developers`, FHIR, sinkronisasi SATUSEHAT                    |
| 24–25 Okt | 4. Lapis 2           | Dashboard faskes, AI teman cerita, booking konsultasi                             |
| 24–27 Okt | 5. Bukti & poles     | Hardening, e2e, load test, Lighthouse, **uji pengguna SUS**, landing page         |
| 24–29 Okt | 6. Proposal          | Ditulis paralel bersama Claude (chat), maks. 30 halaman                           |
| 30 Okt    | Submit               | PDF `UINIC8#2026_WEBDEV_[Nama_Tim]_[Nama Instansi].pdf` + link demo + link GitHub |

## Checklist administrasi (jangan sampai lupa)

- [ ] Daftar gelombang 2 (Rp65.000/tim) via Google Form + bukti follow IG + scan KTM semua anggota (.pdf)
- [ ] Konfirmasi ke CP maksimal 1×24 jam setelah daftar, format `UINIC8#2026_WEBDEV_[Nama TIM]_[Nama Instansi]`
- [ ] Surat Pernyataan Orisinalitas (bermeterai 10.000, ditandatangani ketua)
- [ ] Repo GitHub **publik** dan tetap aktif sampai lomba selesai
- [ ] Demo online (Vercel) — akun demo per role tercantum di README & proposal
- [ ] Siapkan kredensial: Supabase (sudah), Anthropic API key **baru** (rotasi yang lama), Upstash (gratis), Vercel, SATUSEHAT sandbox (jika bisa didapat), Cloudflare Turnstile

---

## Fase 0 — Fondasi (13–14 Okt)

- [x] Scaffold Next.js 15 + TS strict + Tailwind v4 + ESLint + Prettier + Vitest + Playwright (pnpm)
- [x] `app/globals.css` memetakan `design/tokens.css` ke tema Tailwind; font via `next/font` (Plus Jakarta Sans, Instrument Serif)
- [x] Komponen `components/ui/`: Button, IconButton, Card, Chip, Input, Textarea, Select, Badge, Tabs, Dialog, Toast, EmptyState, Skeleton, Avatar
- [x] Layout: `MarketingHeader`/`Footer`, `AppShell` (sidebar desktop, bottom nav mobile) sesuai `design/app-beranda.html`
- [x] Supabase SSR (`lib/supabase/*`), `middleware.ts` guard rute per role
- [x] Migrasi `20261014000000_web_ecosystem.sql` (lihat ARCHITECTURE §4.2) + `pnpm db:types` — _diuji di PGlite (101 tes), diterapkan ke proyek "Mindra" lewat SQL Editor pada 13 Okt 2026, diverifikasi langsung di database sungguhan; tipe asli sudah menggantikan yang ditulis tangan_
- [x] Halaman `/masuk`, `/daftar`, `/lupa-sandi` (Zod + pesan error ramah) — _plus `/atur-sandi` dan `/auth/callback`; koneksi `/api/health` dan penolakan kredensial salah sudah diuji ke Supabase sungguhan_
- [x] `scripts/seed.ts` + akun demo — _dijalankan ke proyek "Mindra" 13 Okt 2026: 300 pengguna sintetis + 4 akun demo, diverifikasi di database (k-anonymity Kab. Cianjur terbukti pada data sungguhan)_
- [ ] Header keamanan + `/api/health` + deploy pertama ke Vercel — _header dan `/api/health` selesai; deploy Vercel menunggu Anda_

**Prompt Claude Code — Fase 0a (scaffold & desain):**

```
Baca CLAUDE.md, docs/ARCHITECTURE.md §3, docs/DESIGN.md dan semua file di design/.
Kerjakan Fase 0 bagian scaffold: buat proyek Next.js 15 di folder ini (pnpm, TS strict,
Tailwind v4, ESLint, Prettier, Vitest, Playwright). Petakan design/tokens.css ke tema Tailwind,
pasang font via next/font, lalu buat semua komponen components/ui yang terdaftar di PLAN.md
Fase 0 dan AppShell + MarketingHeader/Footer persis seperti design/app-beranda.html dan
design/landing.html. Buat halaman /dev/ui yang menampilkan semua komponen untuk dicek.
Jangan sambungkan ke Supabase dulu. Akhiri dengan ringkasan keputusan desain dalam 5 poin.
```

**Prompt Claude Code — Fase 0b (data & auth):**

```
Lanjut Fase 0 bagian data & auth. Baca ../supabase/migrations/ untuk memahami skema yang ada.
Tulis migrasi ../supabase/migrations/20261014000000_web_ecosystem.sql sesuai
docs/ARCHITECTURE.md §4.2 (additive saja, RLS di setiap tabel baru, fungsi security definer
dengan search_path kosong). Jelaskan setiap policy sebelum menulisnya. Lalu: setup
@supabase/ssr, middleware guard per role, halaman /masuk /daftar /lupa-sandi dengan Zod,
scripts/seed.ts sesuai §4.3, header keamanan di next.config, dan /api/health.
Buat juga .env.example. Beri tahu saya langkah manual yang harus saya lakukan
(menjalankan migrasi, mengisi env, deploy Vercel).
```

## Fase 1 — Fitur pengguna (15–17 Okt) · Lapis 1

- [x] `lib/domain/assessment` — port instrumen PHQ-9, GAD-7, PSS-10 (item terbalik 4,5,7,8), SRQ-20 + kategori + rekomendasi; unit test memakai kasus yang sama dengan Flutter — _plus tes yang membaca berkas Dart asli dan membandingkan 46 pertanyaan_
- [x] `lib/domain/crisis` — detektor (PHQ-9 item 9 > 0, SRQ-20 item 17 = ya, kata kunci chat) + `resources.ts`
- [x] `/asesmen` (pilih instrumen) → `/asesmen/[tipe]` (satu pertanyaan per layar, progres, bisa kembali, keyboard-friendly) → `/asesmen/hasil/[id]` (skor, kategori, penjelasan, rekomendasi, tren, banner krisis bila perlu)
- [x] `/jurnal` — check-in mood (7 glyph `assets/mood`), energi, pemicu, catatan; catat tidur
- [x] `lib/domain/insight` — port `weekly_insight_engine.dart`
- [x] Perbaikan celah skema F1, F3, F4, F6, F8 (migrasi `…000100`, `…000200` + aplikasi Flutter) — _diterapkan ke Supabase cloud dan diverifikasi 14 Okt 2026_
- [x] `/beranda` — sapaan, check-in cepat, kartu insight mingguan, grafik mood 7 hari, grafik tidur, asesmen terakhir, pintasan bantuan krisis

**Prompt Claude Code — Fase 1:**

```
Kerjakan Fase 1 di docs/PLAN.md. Mulai dari lib/domain/assessment dan lib/domain/crisis:
port logika dari file Dart yang disebut di CLAUDE.md, tulis unit test Vitest yang membuktikan
hasilnya identik dengan aplikasi Flutter (termasuk item terbalik PSS-10 dan batas kategori).
Setelah test hijau, bangun halaman /asesmen, /asesmen/[tipe], /asesmen/hasil/[id], /jurnal,
/beranda sesuai design/app-asesmen.html dan design/app-beranda.html. Penyimpanan lewat
Server Actions dengan validasi Zod; skoring dihitung di server, bukan dari nilai client.
Pastikan alur asesmen bisa diselesaikan hanya dengan keyboard dan banner krisis memakai
role="alert".
```

## Fase 2 — Ekosistem perawatan (18–21 Okt) · Lapis 1

- [x] `/privasi` (pengguna): kelola izin psikolog (`care_links`) & pendamping, cabut izin satu klik, **riwayat siapa mengakses datamu** (`data_access_logs`), kelola persetujuan SATUSEHAT — _plus unduh riwayat sebagai CSV (dinetralkan dari injeksi rumus), hubungkan psikolog, undang pendamping_
- [x] `lib/server/audit.ts` + pemanggilan di setiap pembacaan data orang lain — _gagal tertutup: gagal mencatat = data tidak dibaca; tes membuktikan urutan "catat dulu, baru baca"; uji mutasi: 12 perusakan migrasi SQL dan 12 perusakan lapisan server/Server Action, semuanya terdeteksi_
- [x] `/psikolog`: ringkasan (klien aktif, alert terbuka, jadwal hari ini), **panel alert krisis realtime** (Supabase Realtime, bunyi/visual, tombol "Tandai ditangani"), daftar klien dengan tren skor
- [x] `/psikolog/klien/[id]`: timeline asesmen, grafik mood/tidur, catatan sesi (`consultations.session_summary`)
- [x] `/pendamping` & `/pendamping/[id]`: hanya data sesuai `permissions`, panduan tanda bahaya, alert darurat
- [x] MFA TOTP wajib untuk psikolog — _ditegakkan di DATABASE (`can_view` butuh sesi aal2), bukan hanya di layar_
- [x] Migrasi `…000100`, `…000200`, `…000300` diterapkan ke Supabase cloud dan diverifikasi (MFA aal1/aal2, pendamping tanpa izin skrining) — _14 Okt 2026_
- [ ] Alur berakun di peramban (`e2e/fase2.auth.spec.ts`) — _menunggu akun uji dari pemilik proyek_

**Prompt Claude Code — Fase 2:**

```
Kerjakan Fase 2 di docs/PLAN.md sesuai design/psikolog-dashboard.html dan
design/app-privasi.html. Semua pembacaan data milik orang lain wajib lewat RLS (client sesi
pengguna) dan dicatat dengan lib/server/audit.ts. Alert krisis memakai Supabase Realtime
pada tabel crisis_alerts; uji skenario: akun demo pengguna mengisi PHQ-9 dengan item 9 > 0
→ alert muncul di dashboard psikolog tanpa reload. Tulis tes Playwright untuk skenario itu
dan untuk "pendamping tanpa izin assessment_results tidak bisa melihat hasil asesmen".
```

## Fase 3 — Interoperabilitas (22–23 Okt) · Lapis 1

- [x] `lib/api/handler.ts` (IP → auth Bearer/API key → batas per kredensial → Zod → handler → format respons; urutan dan alasannya di DECISIONS Fase 3)
- [x] Endpoint di ARCHITECTURE §5 (health, instruments, assessments, mood, sleep, insights, fhir/Observation, satusehat/sync, facilities/{id}/aggregates, openapi.json). Direktori psikolog, slot, booking, faskes terdekat, dan teman cerita menunggu Fase 4
- [x] OpenAPI 3.1 dari Zod (`z.toJSONSchema`) + halaman `/developers` + contoh curl (halaman sendiri, bukan Scalar; alasan di DECISIONS Fase 3)
- [x] `lib/domain/fhir` mapper + test; `lib/server/satusehat-client.ts` (mode mock lokal / staging; staging belum dicoba, butuh kredensial dan IHS number)
- [x] Manajemen API key untuk admin faskes (buat, lihat prefix, cabut) di `/faskes/kunci-api`
- [x] Penutupan F5: migrasi `…000400` (diterapkan di cloud dan diverifikasi, 14 Okt 2026)

**Prompt Claude Code — Fase 3:**

```
Kerjakan Fase 3 di docs/PLAN.md. Buat lib/api/handler.ts lebih dulu dan pakai untuk semua
route /api/v1. Rate limit dengan Upstash (fallback in-memory saat dev). Bangkitkan OpenAPI
3.1 dari skema Zod, tampilkan di /developers dengan Scalar. FHIR: port fhir_mappers.dart,
keluarkan Bundle R4 yang valid (cek dengan validator FHIR jika memungkinkan). SATUSEHAT:
adapter dengan SATUSEHAT_MODE=mock|staging seperti ARCHITECTURE §6. Tambahkan test untuk
handler (401, 403, 422, 429) dan mapper FHIR.
```

## Fase 4 — Lapis 2 (24–25 Okt)

- [x] `/faskes`: filter periode, kartu ringkasan, grafik tren skor per minggu, perbandingan antar kota, peta sebaran (`/faskes/peta`), distribusi kategori (per kota; per usia tidak ada di fungsi agregat), laporan bulanan CSV — **semua agregat k≥10**, label jelas "data anonim"; MFA admin faskes di database
- [x] `/teman-cerita`: chat streaming (SSE), disclaimer, banner krisis, riwayat percakapan, hapus percakapan. Belum dicoba dengan kunci Anthropic sungguhan
- [x] `/konsultasi`: direktori psikolog (filter), pilih slot, konfirmasi booking (bentrok ditolak database), sesi saya + batalkan; psikolog melihat jadwal di `/psikolog/jadwal`
- [x] Migrasi `…000500` diterapkan ke cloud dan diverifikasi (14 Okt 2026)

**Prompt Claude Code — Fase 4:**

```
Kerjakan Fase 4 di docs/PLAN.md sesuai design/faskes-dashboard.html dan
design/app-teman-cerita.html. Dashboard faskes hanya boleh memanggil
public.facility_aggregate (tidak ada query data individu) — buktikan dengan test.
AI teman cerita: ikuti ARCHITECTURE §7 persis (deteksi krisis berbasis aturan SEBELUM
memanggil model, streaming SSE, rate limit 20/jam). Booking: cegah bentrok slot di level
database. Kerjakan berurutan faskes → teman cerita → konsultasi; berhenti dan lapor jika
waktu tidak cukup.
```

## Fase 5 — Bukti & poles (24–27 Okt)

- [x] Landing page `/` sesuai `design/landing.html` (+ `/tentang`, `/kebijakan-privasi`; klaim mockup dikoreksi, lihat DECISIONS Fase 5)
- [x] Audit aksesibilitas (axe WCAG 2.2 AA di Playwright, kini 30 rute x 2 viewport), keyboard walkthrough, kontras (belum: uji pembaca layar sungguhan)
- [x] Lighthouse semua halaman utama → screenshot ke `docs/TESTING.md` (lokal; ukur ulang terhadap URL demo setelah deploy)
- [ ] k6: `load/read-endpoints.js` (200 VU, 2 menit) → laporan + grafik (skrip siap, **k6 belum dijalankan**; padanan Node `load/node-load.mjs` sudah menghasilkan laporan + grafik, lihat TESTING.md)
- [ ] Uptime monitor terpasang (`/api/health` + `uptime.yml` siap; monitor eksternal menunggu URL demo)
- [x] README repo: deskripsi, arsitektur, cara menjalankan, akun demo, link demo, tangkapan layar (link demo diisi setelah deploy)
- [ ] **Uji pengguna (24–26 Okt) (alat dan protokol siap: `docs/UJI-PENGGUNA.md`, `pnpm usability:report`; sesi dan responden menunggu):** 20–30 responden (mahasiswa + minimal 1–2 psikolog/konselor kampus bila bisa), tugas terstruktur + kuesioner **SUS** + 3 pertanyaan terbuka. Rekap skor SUS & temuan → perbaiki 3 masalah teratas

**Prompt Claude Code — Fase 5:**

```
Kerjakan Fase 5 di docs/PLAN.md. Buat landing page sesuai design/landing.html. Tambahkan tes
aksesibilitas axe-core di Playwright untuk semua rute utama dan perbaiki pelanggarannya.
Tulis skrip k6 di load/ dan docs/TESTING.md berisi cara menjalankan + tempat hasil.
Rapikan README untuk juri (bahasa Indonesia): ringkasan, fitur, arsitektur (diagram dari
ARCHITECTURE.md), stack, cara menjalankan, akun demo, struktur folder, keamanan, pengujian.
```

## Gelombang 1 — Sebelum deploy (14 Okt, tambahan di luar rencana awal)

Hasil telaah kesenjangan web + aplikasi mobile sebelum deploy; keputusan dan alasannya di `docs/DECISIONS.md` (Gelombang 1).

- [x] Halaman `/profil`: nama, kota + provinsi, **statistik wilayah anonim opt-in**, ukuran teks, unduh data (JSON), hapus akun
- [x] Syarat penggunaan `/syarat-penggunaan` + kebijakan privasi disatukan dengan naskah aplikasi mobile (v1.1.0); pendaftaran: pernyataan 17+ dan persetujuan (web dan Flutter)
- [x] Portal admin minimal `/admin/verifikasi`: setujui atau tolak permohonan psikolog (atomik di database, MFA wajib, jejak `admin_actions`)
- [x] Perbaikan Flutter: pemesanan lewat fungsi server, label SEJIWA, profil dan hapus akun, persetujuan saat daftar
- [x] Migrasi `…000600` ditulis dan diuji (Postgres tiruan + 33 uji mutasi SQL). **Belum diterapkan di cloud** (menunggu pemilik menempelkannya di SQL Editor)

## Gelombang 2 — Deploy (menunggu pemilik)

- [x] Migrasi `…000600` diterapkan di cloud dan diverifikasi (14 Okt 2026); akun admin dan calon psikolog ditambahkan (`pnpm seed --yes --add-accounts`)
- [ ] Bangun ulang aplikasi Flutter dan coba di perangkat
- [x] Flutter memakai `POST /api/v1/companion/chat` (kunci Anthropic dihapus dari aplikasi); templat email Indonesia (`docs/email-templates/`); panduan deploy (`docs/DEPLOY.md`); CI di akar repositori
- [ ] **(pemilik)** Vercel + Upstash + kunci Anthropic baru + SMTP; cabut kunci lama (F7); isi `WEB_API_BASE_URL` di aplikasi mobile
- [ ] Uji berakun dari awal ke akhir (`*.auth.spec.ts`, termasuk `gelombang1.auth.spec.ts` yang baru), Lighthouse terhadap URL demo, monitor uptime

## Gelombang 3 — Opsional

- [ ] `/bantuan` (napas, grounding, kontak krisis), faskes terdekat untuk pengguna, pembaca `ai_summary` untuk psikolog, onboarding

## Fase 6 — Proposal (24–29 Okt, di chat bersama Claude)

Struktur wajib guidebook (a–o): anggota tim, judul, latar belakang, tujuan & manfaat, analisis
(target pengguna, batasan produk, platform), metodologi (Agile/Scrum 2-mingguan dengan sprint
sesuai fase di atas), arsitektur, skenario, user flow, fitur unggulan, UI/UX preview, hasil
pengujian (SUS + k6 + Lighthouse + keamanan), kesimpulan, daftar pustaka, lampiran.
Maks. 30 halaman, Bahasa Indonesia baku, logo UINIC 8.0 di sampul.

## Di luar lingkup (sebut sebagai "proyeksi pengembangan")

Voice journal & video call di web, latihan CBT lengkap di web, peta faskes (jika Lapis 3 tidak
sempat), ekspor PDF, PWA, aplikasi mobile memakai API v1, integrasi SIMRS nyata, verifikasi STR
psikolog otomatis, model ML prediksi risiko.

## Risiko & mitigasi

| Risiko                                                | Mitigasi                                                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Kredensial SATUSEHAT sandbox tidak keluar tepat waktu | Mode mock ke HAPI FHIR, jelaskan jujur di proposal                                                        |
| Waktu habis                                           | Urutan potong: Lapis 3 → booking → AI teman cerita. Lapis 1 tidak boleh dipotong                          |
| Supabase free tier pause saat penilaian               | Uptime monitor ping `/api/health` tiap 5 menit                                                            |
| Migrasi merusak aplikasi Flutter                      | Additive saja; jalankan aplikasi Flutter sekali setelah migrasi untuk cek                                 |
| Juri bertanya detail teknis                           | Setiap fase diakhiri ringkasan "apa & kenapa"; kumpulkan di `docs/DECISIONS.md` untuk latihan tanya jawab |
