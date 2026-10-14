# Panduan deploy Mindra Web

> **Status 15 Okt 2026:** situs sudah berjalan di <https://web-omega-one-69.vercel.app> (proyek Vercel `web`, Root Directory
> `web`, deploy otomatis dari `main`). Langkah 1-3 selesai. Yang masih menunggu pemilik: bagian 4 (URL Auth Supabase),
> bagian 5 (SMTP dan templat), bagian 6 (kunci Anthropic baru dan pencabutan kunci lama), migrasi `…000700`, bagian 7
> (aplikasi mobile), dan bagian 9 (uptime, k6). Hasil pemeriksaan live ada di [`HANDOFF-FASE-6.md`](HANDOFF-FASE-6.md) bagian 13.

Urutan kerja dari repositori kosong sampai demo online. Yang ditandai **(kamu)** hanya bisa dilakukan pemilik akun
(membuat akun layanan, menyalin rahasia); sisanya sudah disiapkan di repositori. Rahasia **tidak pernah** ditulis ke
repositori, ke chat, atau ke berkas yang di-commit: tempel langsung di dasbor layanan terkait.

Arsitektur singkat: satu repositori (monorepo) `Argy1/Mindra`. Akar = aplikasi Flutter + `supabase/` (migrasi);
folder `web/` = aplikasi Next.js yang dideploy ke Vercel. Web dan aplikasi mobile memakai **satu proyek Supabase**.

## 0. Yang harus sudah ada

- Migrasi `supabase/migrations/…000000` sampai `…000600` sudah diterapkan di proyek Supabase (kamu sudah menempelkannya;
  verifikasi terakhir di cloud: 14 Okt 2026). **`…000700`** (ringkasan Teman cerita untuk psikolog, Gelombang 3) perlu
  ditempelkan juga; tanpa itu halaman detail klien psikolog yang klien-nya mengizinkan `ai_summary` menampilkan galat memuat.
- Akun demo sudah ada (`pnpm seed --yes` dan `pnpm seed --yes --add-accounts`). Data demo ada di proyek yang SAMA dengan
  aplikasi mobile; hanya baris `is_demo = true` yang disentuh seed.

## 1. Repositori GitHub

Repositori: <https://github.com/Argy1/Mindra>. Isinya (monorepo):

| Jalur                       | Isi                                                                   |
| --------------------------- | --------------------------------------------------------------------- |
| `web/`                      | Mindra Web (Next.js), dokumentasi di `web/docs/`                      |
| `lib/`, `android/`, `ios/`… | Aplikasi mobile Flutter                                               |
| `supabase/migrations/`      | Migrasi database bersama (Flutter dan web)                            |
| `.github/workflows/`        | CI (web dan Flutter) dan pemeriksa uptime                             |
| `.env.example`              | Contoh konfigurasi Flutter. `.env` asli diabaikan git (dibundel ke aplikasi) |

Yang **tidak** ikut ter-commit (ditolak `.gitignore`): `.env` Flutter, `web/.env.local`, `node_modules`, `.next`, `build/`,
`.dart_tool/`, `android/local.properties`, jawaban uji pengguna. Pemindaian rahasia dilakukan sebelum push pertama (tidak ada
kunci `sk-ant-`, JWT, atau kunci pribadi di berkas yang dilacak).

## 2. Akun layanan **(kamu)**

| Layanan   | Untuk apa                                   | Catatan                                                                 |
| --------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| Vercel    | Hosting web                                 | Paket Hobby cukup. Hubungkan akun GitHub.                               |
| Upstash   | Pembatas laju API (Redis)                   | Buat database Redis (wilayah Singapura), salin REST URL dan REST token. |
| Anthropic | Teman cerita                                | Buat kunci API **baru**, khusus server. Kunci lama (F7) dicabut.        |
| SMTP      | Email konfirmasi dan atur ulang sandi       | Resend, Brevo, Mailgun, atau SMTP lain. Lihat bagian 5.                 |

## 3. Vercel **(kamu)**

1. Vercel > Add New > Project > impor `Argy1/Mindra`.
   **Nama proyek menentukan alamat** (`<nama>.vercel.app`, siapa cepat dia dapat). Per 14 Okt 2026 `mindra.vercel.app` **sudah
   dipakai proyek lain** (bukan milik kita). Proyek kita diberi nama `web` dan Vercel menetapkan alamat
   `web-omega-one-69.vercel.app`. Bila ingin alamat lebih rapi (mis. `mindra-web.vercel.app`, kosong saat dicek), tambahkan
   di Settings > Domains, lalu ubah `NEXT_PUBLIC_SITE_URL` dan Site URL serta Redirect URLs di Supabase. Alamat final =
   nilai `NEXT_PUBLIC_SITE_URL`. Konektor Vercel di sesi pengembangan hanya-baca (membuat proyek ditolak 403), jadi proyek dibuat
   pemilik lewat dasbor.
2. **Root Directory: `web`**. Framework Next.js terdeteksi otomatis. Install command bawaan (`pnpm install`) dan build
   command bawaan (`next build`) sudah benar; Node.js 24.
3. Environment Variables (Production dan Preview). **Jangan** memberi awalan `NEXT_PUBLIC_` pada rahasia.

| Variabel                        | Rahasia | Nilai                                                                                          |
| ------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | tidak   | Supabase > Settings > API > Project URL                                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tidak   | Supabase > Settings > API > kunci `anon` (publik; RLS yang menjaga)                            |
| `NEXT_PUBLIC_SITE_URL`          | tidak   | Alamat produksi, mis. `https://web-omega-one-69.vercel.app` (lihat catatan di bawah)               |
| `SUPABASE_SERVICE_ROLE_KEY`     | **ya**  | Supabase > Settings > API > `service_role`. Hanya dipakai kode server (API mitra); jangan bagikan |
| `UPSTASH_REDIS_REST_URL`        | tidak   | Dari Upstash                                                                                   |
| `UPSTASH_REDIS_REST_TOKEN`      | **ya**  | Dari Upstash                                                                                   |
| `ANTHROPIC_API_KEY`             | **ya**  | Kunci Anthropic **baru**                                                                       |
| `ANTHROPIC_MODEL`               | tidak   | Boleh kosong (bawaan `claude-sonnet-5-5`)                                                      |
| `SATUSEHAT_MODE`                | tidak   | `mock` (simulasi lokal). `staging` hanya bila kredensial Kemenkes sudah ada                    |
| `ENABLE_DEV_PAGES`              | tidak   | **Kosongkan** di produksi (halaman `/dev/*` mati)                                              |
| `MFA_ENFORCEMENT`               | tidak   | **Kosongkan** (MFA wajib). Lihat bagian 8 untuk demo juri                                      |

Catatan `NEXT_PUBLIC_SITE_URL`: bila terlewat, di deployment **produksi** web memakai `VERCEL_PROJECT_PRODUCTION_URL` sebagai
cadangan (ditemukan saat pemeriksaan live: sitemap dan tautan email sempat mengarah ke localhost). Itu jaring pengaman; tetap
isi variabelnya. Nilai `NEXT_PUBLIC_*` ditanam saat build. Deploy pertama menghasilkan alamat
`*.vercel.app`; isi variabel ini dengan alamat itu lalu **redeploy** supaya tautan di email (konfirmasi dan atur ulang sandi)
mengarah ke situs yang benar.

4. Deploy. Pemeriksaan pertama: `https://<alamat>/api/health` harus menjawab `{"status":"ok"}` dengan kode 200.

## 4. Supabase Auth **(kamu)**

Dashboard > Authentication > URL Configuration:

- **Site URL**: alamat produksi yang sama dengan `NEXT_PUBLIC_SITE_URL`.
- **Redirect URLs**: tambahkan `https://<alamat>/auth/callback` (tanpa ini tautan konfirmasi dan atur ulang sandi ditolak).
  Pertahankan entri yang sudah dipakai aplikasi mobile.

Authentication > Policies (bila paketmu menyediakan): aktifkan **leaked password protection** dan kata sandi minimal 8
karakter.

## 5. Email (SMTP dan templat) **(kamu)**

Layanan email bawaan Supabase hanya untuk uji (jumlahnya sangat dibatasi). Untuk demo juri pakai SMTP sendiri:

1. Authentication > Emails > SMTP Settings > Enable custom SMTP. Isi host, port, pengguna, kata sandi, dan alamat pengirim
   (nama pengirim: `Mindra`).
2. Authentication > Emails > Templates. Untuk tiap templat, tempel isi berkas di `web/docs/email-templates/` dan isi subjek:

| Templat Supabase  | Berkas                         | Subjek                               |
| ----------------- | ------------------------------ | ------------------------------------ |
| Confirm sign up   | `konfirmasi-pendaftaran.html`  | `Konfirmasi emailmu di Mindra`       |
| Reset password    | `atur-ulang-sandi.html`        | `Atur ulang kata sandi Mindra`       |
| Change email      | `ganti-email.html`             | `Konfirmasi alamat email barumu`     |

Templat memakai variabel Supabase (`{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`), sapaan "kamu", tanpa tanda
seru atau emoji, dan mencantumkan SEJIWA (119 ext. 8) di email pendaftaran. Tautan mengarah ke
`<Site URL>/auth/callback` (PKCE), yang sudah ditangani web.

## 6. Anthropic dan kunci lama (F7) **(kamu)**

1. console.anthropic.com > API keys > buat kunci baru, tempel ke Vercel sebagai `ANTHROPIC_API_KEY`.
2. **Cabut kunci lama** (yang dulu ada di `.env` aplikasi mobile). Barisnya sudah dihapus dari `.env` lokal dan kodenya tidak
   lagi membacanya, tetapi kunci itu masih berlaku di Anthropic sampai dicabut, dan APK lama yang pernah dibuat masih memuatnya.
3. Teman cerita di Flutter kini memanggil web (`POST /api/v1/companion/chat`) dengan token sesi pengguna: tidak ada kunci
   model di aplikasi.

## 7. Aplikasi mobile

Isi alamat web di `.env` (atau `--dart-define`):

```bash
WEB_API_BASE_URL=https://<alamat>     # tanpa garis miring di akhir
```

Bangun ulang aplikasi. Kosong = Teman cerita dinonaktifkan dengan pesan yang jelas. Migrasi `…000600` mengubah perilaku
yang dipakai aplikasi: pemesanan konsultasi lewat `book_consultation`, profil dengan provinsi dan persetujuan statistik,
hapus akun. Pakai build Flutter yang baru (build lama tidak bisa memesan konsultasi di cloud karena tabelnya tidak ada).

## 8. Demo untuk juri

- **Akun demo** ada di README (kata sandi `Mindra-Demo-2026`, dapat diubah lewat `DEMO_PASSWORD` saat seed).
- **MFA psikolog, admin faskes, dan admin Mindra** wajib TOTP. Dua pilihan untuk demo:
  1. **Disarankan:** pasang TOTP sekali di aplikasi autentikator untuk setiap akun demo (psikolog, faskes, admin), simpan
     kode cadangan, dan beri juri video singkat atau tangkapan layar. Ini membuktikan MFA benar-benar menjaga data.
  2. Matikan dua sakelar sekaligus (`MFA_ENFORCEMENT=off` di Vercel dan `alter database postgres set app.psychologist_mfa =
     'off'` di SQL Editor). Hanya untuk demo; kembalikan dengan `alter database postgres reset app.psychologist_mfa;`.
     Sakelar ini melonggarkan MFA di seluruh proyek, jadi jangan dibiarkan menyala setelah penilaian.
- **Antrean admin**: akun `calon.psikolog@demo.mindra.test` menunggu di `/admin/verifikasi`. Setelah disetujui, ia perlu
  keluar lalu masuk lagi untuk berpindah ke portal psikolog. Untuk mengulang demo, hapus dan buat ulang akun itu
  (`pnpm seed --yes --add-accounts` hanya menambah akun yang belum ada).

## 9. Setelah deploy: bukti yang harus diukur ulang

```bash
cd web
pnpm lighthouse --base https://<alamat>     # tanpa --insecure; sertifikat Vercel sah
```

Spec Playwright yang memakai halaman pratinjau (`/dev/*`) hanya bisa dijalankan lokal terhadap build produksi
(`ENABLE_DEV_PAGES=true`), karena di produksi halaman itu sengaja 404. Terhadap situs yang sudah berjalan, jalankan spec
berakun sungguhan dengan `E2E_BASE_URL=https://<alamat>` (petunjuk dan variabel `E2E_*` di `docs/PANDUAN-PENGEMBANG.md`).

Lalu: perbarui tabel di `docs/TESTING.md`, isi tautan demo di `README.md`, set variabel repositori GitHub `DEMO_URL`
(Settings > Secrets and variables > Actions > Variables) supaya `uptime.yml` aktif, dan pasang monitor eksternal
(UptimeRobot, langkah di `docs/TESTING.md` bagian 5). Satu putaran lengkap dengan kunci Anthropic asli (termasuk pesan
krisis) wajib dilakukan sebelum penilaian.

## 10. Daftar periksa

- [ ] `/api/health` 200; landing, `/tentang`, `/syarat-penggunaan`, `/kebijakan-privasi`, `/developers` terbuka
- [ ] Daftar akun baru: email konfirmasi tiba (Indonesia), tautannya membawa ke `/beranda`
- [ ] Lupa sandi: email tiba, tautan membuka `/atur-sandi`
- [ ] `/profil`: simpan, unduh data, hapus akun uji (dengan akun yang baru dibuat, bukan akun demo)
- [ ] Teman cerita: satu pesan biasa dan satu pesan krisis (balasan tetap, banner krisis)
- [ ] `/admin/verifikasi`: setujui `calon.psikolog@demo.mindra.test`, lalu pulihkan seperti catatan di bagian 8
- [ ] `/dev/*` menjawab 404 di produksi; `robots.txt` menutup portal
- [ ] Header keamanan: `curl -I https://<alamat>/` memuat CSP, HSTS, `X-Content-Type-Options`
- [ ] Kunci Anthropic lama dicabut; kunci `service_role` tidak ada di bundel klien (`pnpm test` memeriksa ini)
- [ ] Aplikasi mobile: Teman cerita menjawab, pesan konsultasi berhasil, profil tersimpan

## Pemecahan masalah

| Gejala                                            | Penyebab umum                                                                          |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Tautan email membawa ke `localhost` atau ditolak  | `NEXT_PUBLIC_SITE_URL` belum diisi lalu redeploy, atau Redirect URLs belum memuat `/auth/callback` |
| Teman cerita menjawab "belum diaktifkan"          | `ANTHROPIC_API_KEY` kosong di Vercel (jalur krisis tetap jalan tanpa kunci)             |
| Batas laju tidak berlaku antar permintaan         | `UPSTASH_*` kosong: pembatas jatuh ke memori proses yang tidak dibagi antar instans     |
| Halaman portal mengarah ke verifikasi dua langkah | MFA wajib untuk psikolog, admin faskes, dan admin; pasang TOTP atau lihat bagian 8      |
| `/dev/*` 404                                      | Memang disengaja di produksi                                                           |
| Aplikasi mobile: Teman cerita tidak tersedia      | `WEB_API_BASE_URL` kosong atau salah di `.env` aplikasi                                |
