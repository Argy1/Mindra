# Mindra

**Ruang aman untuk perasaanmu, terhubung ke yang bisa membantu.**

Ekosistem kesehatan mental digital untuk masyarakat Indonesia: **aplikasi web** (Next.js) dan **aplikasi mobile**
(Flutter) memakai **satu backend Supabase**, sehingga catatan yang dibuat di satu tempat langsung terlihat di tempat lain,
dengan aturan izin yang sama. Web dibuat untuk **UINIC 8.0 Web Development Competition 2026**, tema _Engineering
Interconnected Web Solutions to Empower Digital Ecosystems_, subtema Kesehatan (+ AI).

|                      |                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **Aplikasi web**     | [`web/`](web/README.md): fitur, arsitektur, keamanan, bukti pengujian, akun demo                   |
| **Demo online**      | _Belum dideploy._ Alamatnya dicantumkan di [`web/README.md`](web/README.md) setelah deploy ke Vercel |
| **Aplikasi mobile**  | Flutter, folder `lib/`, `android/`, `ios/` di akar repositori ini                                  |
| **Database bersama** | [`supabase/migrations/`](supabase/migrations): migrasi aplikasi mobile dan web (urut, additive)    |
| **Panduan deploy**   | [`web/docs/DEPLOY.md`](web/docs/DEPLOY.md)                                                         |
| **Keputusan teknis** | [`web/docs/DECISIONS.md`](web/docs/DECISIONS.md) · [`web/docs/ARCHITECTURE.md`](web/docs/ARCHITECTURE.md) |
| **Temuan keamanan**  | [`web/docs/TEMUAN-KEAMANAN.md`](web/docs/TEMUAN-KEAMANAN.md)                                       |

## Dua aplikasi, satu cerita

- **Pengguna** mengenali kondisinya (skrining PHQ-9, GAD-7, PSS-10, SRQ-20; jurnal mood dan tidur), bercerita ke **Teman
  cerita** (AI yang dijalankan di server, dengan deteksi krisis berbasis aturan sebelum model), dan memesan konsultasi.
- **Psikolog dan pendamping** melihat hanya yang diizinkan pengguna, dan setiap pembukaan data tercatat dan bisa dibaca
  pengguna. Bila ada tanda bahaya, yang berizin melihatnya langsung.
- **Layanan kesehatan** hanya menerima angka gabungan anonim (k ≥ 10, hanya dari pengguna yang memilih ikut), dan hasil
  skrining bisa diekspor dalam standar **FHIR R4** lewat API terbuka.
- **Admin Mindra** meninjau permohonan akun psikolog; MFA wajib dan ditegakkan di database.

## Menjalankan

| Bagian | Perintah                                                                                   | Rincian                                                                 |
| ------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Web    | `cd web && pnpm install && cp .env.example .env.local && pnpm dev`                         | [`web/README.md`](web/README.md), [`web/docs/PANDUAN-PENGEMBANG.md`](web/docs/PANDUAN-PENGEMBANG.md) |
| Mobile | `cp .env.example .env && flutter pub get && flutter run` (isi `SUPABASE_URL` dan kunci anon) | Isi `WEB_API_BASE_URL` agar Teman cerita aktif                          |
| Tes    | `cd web && pnpm build && pnpm test` · `flutter analyze && flutter test`                    | [`web/docs/TESTING.md`](web/docs/TESTING.md)                            |

Aplikasi mobile **tidak menyimpan kunci model AI**: Teman cerita memanggil web (`POST /api/v1/companion/chat`) dengan token
sesi pengguna. Berkas `.env` mobile dibundel ke aplikasi, jadi hanya nilai yang aman publik yang boleh diisi
(lihat [`.env.example`](.env.example)).

## Isi repositori

| Jalur                  | Isi                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `web/`                 | Mindra Web (Next.js 15, TypeScript strict, Tailwind v4, Supabase, Zod)               |
| `lib/`, `test/`        | Aplikasi mobile Flutter dan tesnya                                                   |
| `supabase/migrations/` | Skema, RLS, dan fungsi database yang dipakai bersama                                 |
| `docs/`                | Naskah syarat penggunaan dan kebijakan privasi (v1.1.0), panduan integrasi, sistem desain |
| `.github/workflows/`   | CI (web dan Flutter) dan pemeriksa ketersediaan                                      |
| `design_bundle/`, `preview/`, `ui_kits/`, `assets/`, `fonts/` | Sistem desain dan aset merek                          |

## Catatan jujur

Hasil pengujian dan yang **belum** terbukti (belum dideploy, SATUSEHAT hanya simulasi, uji pengguna belum dilaksanakan,
k6 asli belum dijalankan) dicatat apa adanya di [`web/docs/TESTING.md`](web/docs/TESTING.md) dan
[`web/README.md`](web/README.md#status-dan-keterbatasan).

Mindra adalah teman digital untuk kesehatan mental, **bukan layanan darurat** dan bukan pengganti psikolog atau
psikiater. Bila kamu atau seseorang yang kamu kenal dalam keadaan darurat, hubungi **119 lalu tekan 8** (SEJIWA,
Kementerian Kesehatan).
