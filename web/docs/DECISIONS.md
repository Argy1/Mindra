# Keputusan desain Mindra Web

Dokumen ini dibuat untuk latihan tanya jawab juri (40% nilai). Setiap fase ditutup dengan
ringkasan "apa dan kenapa". Tiap keputusan punya **bukti** (tes atau angka yang bisa dijalankan
ulang) dan **jawaban singkat** kalau juri bertanya.

---

## Fase 0a — Scaffold dan sistem desain (13 Okt 2026)

### 5 keputusan utama

#### 1. Token desain disalin setia; hanya dua nilai diubah, dan perubahannya dibuktikan dengan angka

**Apa.** `app/globals.css` memuat salinan `design/tokens.css` apa adanya (warna, bayangan,
gerak). Hanya dua nilai yang berbeda, ditandai jelas di bagian "Override aksesibilitas":

| Token                        | Desain asli                                   | Web                                  | Alasan                                                                                    |
| ---------------------------- | --------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `--fg-4` (teks meta/bantuan) | `neutral-500` `#837D74`: 3,81:1 di kanvas     | `#6E6960`: 5,09:1                    | CLAUDE.md mewajibkan teks ≥ 4,5:1. Di permukaan `sunken` aslinya hanya 3,49:1.            |
| `--border-control` (baru)    | `border-soft` 1,67:1 / `border-strong` 2,53:1 | `#8E887F`: 3,28:1 (kanvas) 3,51:1 (putih) | WCAG 1.4.11: batas kolom isian harus ≥ 3:1.                                                |

Dua penyesuaian turunan di komponen: tombol `sage` dan saklar nyala memakai `sage-600`
(teks putih di `sage-500` hanya 3,19:1; saklar `sage-500` hanya 2,97:1 terhadap kanvas).

**Kenapa.** Aksesibilitas bernilai 15% dan CLAUDE.md menetapkan WCAG 2.1 AA. Mengubah sesedikit
mungkin menjaga identitas visual dari desainer, tetapi tidak mengorbankan syarat teknis.

**Bukti.** `tests/design-tokens.test.ts` membaca `globals.css` dan `design/tokens.css` yang
sebenarnya, lalu: (a) memastikan 83 token warna sama dengan desain kecuali override yang
terdaftar, (b) menghitung kontras 33 pasangan teks/latar (≥ 4,5:1) dan 8 pasangan non-teks
(≥ 3:1), (c) memastikan nilai asli memang gagal (supaya alasan override tidak bisa hilang
diam-diam).

**Jika juri bertanya** _"Kenapa warnanya tidak persis desain?"_ → Dua nilai kami gelapkan karena
terukur gagal WCAG AA; angkanya ada di tes, dan sisanya identik dengan desain.

#### 2. Tema Tailwind "tertutup" dan tipografi dalam `rem`

**Apa.** Palet bawaan Tailwind dinonaktifkan (`--color-*: initial`); radius, bayangan, dan
breakpoint juga diganti nilai Mindra. Hanya warna dari token yang bisa dipakai di kelas
(`bg-biru-500`, `text-fg-1`). `rounded-lg` = 20px (bukan 8px), dan breakpoint `shell` (961px),
`nav` (861px), `wide` (1101px) meniru titik patah di mockup. Seluruh ukuran teks memakai `rem`,
bukan `px` seperti di `tokens.css`.

**Kenapa.** (1) Prinsip desain "merah hanya untuk krisis" ditegakkan oleh struktur: tidak ada
`red-500` yang bisa terpakai tanpa sengaja. (2) Ukuran `px` mengabaikan pengaturan ukuran font
browser (WCAG 1.4.4) dan membuat `profiles.font_size_preference` (0,9/1/1,15) tidak mungkin
diwujudkan; dengan `rem`, cukup mengubah ukuran root (`html[data-font-size]` sudah disiapkan).

**Bukti.** `/dev/ui` menampilkan semua token. Kelas warna di luar tema (mis. `bg-red-500`)
tidak menghasilkan CSS sama sekali (diuji langsung lewat PostCSS), jadi salah pakai tidak diam-diam
menambah warna baru; ia hanya tidak berefek dan langsung terlihat.

**Jika juri bertanya** _"Bagaimana menjaga konsistensi visual di tim?"_ → Sistem tokennya
tertutup: yang tidak ada di desain tidak bisa dipakai.

#### 3. Komponen dibuat aksesibel lewat tipe, memakai elemen native, dan tanpa pustaka UI tambahan

**Apa.** 22 berkas di `components/ui` (14 komponen dari PLAN + `Field`, `Switch`, `Alert`,
`CrisisBanner`, `Progress`, `CategoryBadge`, `CardHeader`, `SkeletonCard` yang dipakai mockup).
Yang penting:

- **Label wajib oleh compiler**: `label: string` adalah prop wajib di `Input`/`Textarea`/`Select`/
  `Switch`/`IconButton`/`TabsList`. Lupa label = galat TypeScript, bukan temuan audit di akhir.
- **Dialog memakai `<dialog>` native** (`showModal()`): browser yang mengurus latar inert, ESC, dan
  fokus kembali ke pemicu. Tab, Switch, dan Toast mengikuti pola ARIA (roving tabindex, panah/
  Home/End, `role="switch"`, wilayah `aria-live` yang selalu ada).
- **Area sentuh 44px tanpa mengubah tampilan** lewat utilitas `touch-target` (elemen semu
  `::after`), karena tombol `sm`, chip, dan tab di mockup berukuran 36–40px.
- **Tanpa Radix/shadcn**: CLAUDE.md melarang dependensi besar tanpa bertanya, dan perilaku
  aksesibel dijamin platform, bukan kode kita.

**Kenapa.** Kualitas teknis dan aksesibilitas berbobot 35% total; kode yang mudah dibaca juri
lebih berharga daripada pustaka yang tidak bisa kami jelaskan baris demi baris.

**Bukti.** 97 tes komponen (Testing Library) + audit axe (keputusan 5).

**Jika juri bertanya** _"Kenapa tidak pakai Radix/shadcn?"_ → Dialog memakai elemen native
sehingga fokus dan ESC dijamin browser; sisanya kecil dan teruji. Satu dependensi besar yang
tidak kami kuasai lebih berisiko daripada ±100 baris yang kami pahami.

#### 4. Keselamatan krisis dirancang ke dalam kerangka aplikasi, bukan ditambahkan belakangan

**Apa.**

- Nomor darurat hanya ada di **satu berkas**, `lib/domain/crisis/resources.ts` (aturan CLAUDE.md).
  `CrisisBanner`, `CrisisBand` landing, dan dialog bantuan semuanya mengimpor dari sana. Tes
  memastikan angka di tautan `tel:` sama dengan yang tertampil.
- Berkas itu menandai `verified: false`. CLAUDE.md mencatat aplikasi Flutter keliru melabeli
  "119 ext 8"; jadi kode **tidak** mengklaim nomor sudah benar. Tes mewajibkan tanggal verifikasi
  bila suatu hari diubah menjadi `true`.
- "Butuh bantuan sekarang" membuka **dialog di tempat** (tanpa pindah halaman) sehingga tidak
  bisa tersesat atau gagal dimuat saat orang sedang panik.
- **Penyimpangan dari mockup**: di mockup, tombol bantuan hanya ada di sidebar, padahal sidebar
  hilang di ≤ 960px, jadi pengguna ponsel (kemungkinan besar mayoritas) tidak punya akses krisis
  yang "selalu terlihat". Kami menambahkan ikon pelampung di topbar mobile.

**Kenapa.** Ini aplikasi kesehatan mental; satu-satunya fitur yang tidak boleh bergantung pada
fase berikutnya adalah akses cepat ke bantuan. Nilai "Inovasi dan relevansi" (30%) juga
menyangkut keselamatan pengguna.

**Bukti.** `AppShell.test.tsx` (dialog + tautan dari sumber tunggal), `resources.test.ts`,
e2e "bantuan krisis" di desktop **dan** mobile.

**Jika juri bertanya** _"Bagaimana jika pengguna dalam krisis?"_ → Bantuan tersedia di setiap
halaman dalam satu ketukan, nomornya dari satu sumber yang bisa diaudit, dan ada tanda eksplisit
bahwa nomor itu belum diverifikasi.

#### 5. Bukti berlapis: tes unit, Playwright di Chrome sungguhan, dan axe di dua viewport

**Apa.** 259 tes unit (Vitest, 14 berkas: 97 tes komponen, 124 tes token desain, sisanya utilitas,
kontak krisis, dan middleware) + 36 tes e2e (18 skenario × desktop 1440 dan mobile 390) yang mencakup audit **axe-core WCAG 2.1 A/AA + best-practice** pada `/`, `/dev/ui`,
`/dev/shell`, dan dialog yang sedang terbuka: **nol pelanggaran**. Pembagian tugas: jsdom untuk
logika dan atribut ARIA; browser sungguhan untuk hal yang jsdom tidak bisa (fokus, ESC, layout
responsif, kontras terhitung, area lengket).

**Kenapa.** "Aksesibel" tanpa bukti hanyalah klaim. Lapisan ini juga menangkap hal yang tidak
terlihat oleh `tsc` dan `eslint`. Selama Fase 0a, ia menemukan **empat masalah nyata**:

1. `next build` menolak `Button` karena memasang handler di Server Component → ditandai
   Client Component (tetap di-render server).
2. axe: logo dan blok pengguna di sidebar berada di luar landmark → sidebar menjadi `<aside>`.
3. `getInitials("O'Neil")` menghasilkan `"O'"` → hanya huruf yang dihitung.
4. Pemeriksaan produksi manual: `/dev/*` memang 404, tetapi respons 404 itu **masih membawa
   isi halaman** (payload RSC) → gerbang dipindah ke `middleware.ts` + tes.

**Jika juri bertanya** _"Bagaimana Anda tahu ini aksesibel?"_ → Ada audit axe otomatis di dua
ukuran layar dan tes keyboard (skip link, panah pada tab, ESC pada dialog); hasilnya nol
pelanggaran, dan bisa dijalankan ulang kapan saja dengan `pnpm test:e2e`.

---

### Keputusan kecil (satu baris)

- **Font via `next/font/google`**: diunduh saat build dan disajikan dari domain sendiri, sehingga
  pengguna tidak mengirim permintaan ke Google (penting untuk privasi). JetBrains Mono ikut tetapi
  tidak dipramuat.
- **Ikon**: seluruh impor dari `@phosphor-icons/react/ssr` (bebas konteks, aman di Server maupun
  Client Component). Entry utamanya tidak punya `"use client"`.
- **Versi dikunci sesuai kompatibilitas**: ESLint 9.39 dan TypeScript 5.9 (ESLint 10 dan TS 7 di
  luar rentang `eslint-config-next@15`).
- **pnpm**: build script `unrs-resolver` ditolak eksplisit (`allowBuilds: false` di
  `pnpm-workspace.yaml`); binding prebuilt-nya sudah ikut terpasang, jadi tidak diperlukan.
- **`/dev/*` hanya aktif di pengembangan**; di produksi 404 kecuali `ENABLE_DEV_PAGES=true`
  (middleware + layout dinamis). Berguna bila Anda ingin menunjukkan katalog komponen ke juri.
- **Fokus keyboard**: cincin solid 2px `biru-500` ditambah halo `--glow-biru` dari desain. Halo
  saja (opasitas 18%) terlalu samar bagi pengguna keyboard.
- **Navigasi per peran sebagai data** (`components/layout/nav-config.tsx`); `AppShell` hanya
  menerima `role` dan data yang bisa diserialisasi.
- **Playwright lokal memakai Google Chrome terpasang** (`channel: 'chrome'`), tanpa mengunduh
  browser; CI memakai Chromium bawaan.
- **"Satu komponen per file"** ditafsirkan: satu komponen utama per berkas; bagian pendamping yang
  tak bisa berdiri sendiri (`TabsList`/`TabsTrigger`, `ToastProvider`/`useToast`) tinggal bersama.
- **Perbedaan kecil lain dari mockup**: item "Keamanan (MFA aktif)" menjadi "Keamanan" (status MFA
  akan dinamis); label bottom nav memakai `fg-3` bukan `fg-4` (11px butuh kontras); daftar navigasi
  memakai `<ul>`; bayangan/radius tidak berubah.

### Yang belum ada (jujur)

- Belum tersambung ke Supabase, belum ada autentikasi dan guard rute (Fase 0b). `middleware.ts`
  sekarang hanya menjaga `/dev/*`; Fase 0b memperluasnya, bukan membuat yang kedua.
- Landing `/` baru bagian hero; diagram ekosistem dan seksi lain di Fase 5.
- Tautan ke `/masuk`, `/daftar`, `/tentang`, `/kebijakan-privasi`, `/syarat-penggunaan` belum punya
  halaman (404 sampai fasenya).
- Href navigasi psikolog dan faskes (mis. `/psikolog/klien`, `/faskes/peta`) adalah rute rencana
  dari mockup, belum final. Navigasi pendamping belum punya mockup, jadi sengaja minimal.
- Ikon lonceng di `/dev/shell` hanya hiasan; PLAN.md belum punya fitur notifikasi.

### Perlu tindakan Anda

1. **Verifikasi nomor krisis** di `lib/domain/crisis/resources.ts` ke sumber resmi, lalu ubah
   `verified: true` dan isi `verifiedAt`. Sampai itu terjadi, jangan dipamerkan sebagai nomor valid.
2. **Putuskan lokasi git.** Folder `Mindra/` dan `web/` belum merupakan repositori. Repo publik
   untuk juri sebaiknya berakar di `web/` atau di `Mindra/` (dengan Flutter di dalamnya)? Ini
   memengaruhi `.gitignore`, CI, dan README.
3. **Putuskan apakah katalog `/dev/ui` boleh terlihat juri di Vercel** (atur `ENABLE_DEV_PAGES=true`),
   atau tetap tersembunyi (bawaan).

### Catatan proses

- `prettier --write .` sempat ikut memformat ulang empat dokumen Markdown Anda (`CLAUDE.md`,
  `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/PLAN.md`): hanya perataan tabel dan `*miring*`
  menjadi `_miring_`, isi tidak berubah, blok kode tidak tersentuh. Karena tidak ada git untuk
  memulihkan, saya biarkan dan kini `docs/` dan `CLAUDE.md` dikecualikan dari Prettier.
  Centang Fase 0 di `docs/PLAN.md` (4 item) adalah satu-satunya perubahan isi.
- Jangan menjalankan `pnpm build` saat `pnpm dev` aktif: keduanya memakai folder `.next` dan saling
  merusak (server dev akan memberi "Internal Server Error" sampai `.next` dihapus).

---

## Fase 0b — Data dan autentikasi (13 Okt 2026)

### Temuan terpenting: "satu backend" belum benar saat ini

CLAUDE.md menyebut web dan aplikasi mobile memakai **project Supabase yang sama**. Per hari ini:

- `.env` aplikasi Flutter menunjuk ke **Supabase lokal** (`http://192.168.137.72:54321`, port `supabase start`),
  bukan ke proyek cloud.
- Proyek cloud **"Mindra"** (`ezadwmivhqjfpbismexl`, ap-southeast-1) terhubung ke tool dan **sudah memuat
  lima migrasi Flutter** (diterapkan Mei 2026; skemanya setara dengan berkas di repo, dibuktikan dengan
  perbandingan katalog dan hash keluaran `classify_assessment`). Ada 1 akun pengguna yang sudah ada;
  datanya tidak saya baca atau ubah.
- Koreksi: catatan awal saya menyebut proyek ini "kosong". Itu **salah**. Saya membacanya saat proyek masih
  `COMING_UP` sehingga daftar tabel dan migrasi belum terisi. Setelah status `ACTIVE_HEALTHY` terbaca benar.

Cerita "dua aplikasi, satu backend, data saling terhubung realtime" baru bisa didemokan setelah
(1) migrasi web diterapkan ke proyek cloud, dan (2) `.env` Flutter diarahkan ke sana.

**Pembaruan 13 Okt 2026 (malam):** langkah (1) selesai. Migrasi `20261014000000_web_ecosystem.sql`
diterapkan ke proyek "Mindra" lewat SQL Editor Supabase oleh pemilik proyek (percobaan lewat tool
`apply_migration` ditolak izin aplikasi, jadi tidak dipaksakan). Karena lewat SQL Editor, migrasi ini
**tidak tercatat** di riwayat `supabase_migrations` (itu tidak memengaruhi skema). Langkah (2), mengarahkan
`.env` Flutter ke proyek cloud, masih menunggu pemilik proyek.

Verifikasi pasca-terapan (baca-saja, ditambah satu tes dalam transaksi yang sengaja dibatalkan):

- 6 tabel baru ada dan semuanya ber-RLS; tidak ada tabel `public` tanpa RLS; semua 17 fungsi `public`
  ber-`search_path` kosong; 12 fungsi baru/diganti dan 7 trigger baru terpasang dan aktif; `crisis_alerts`
  masuk publikasi Realtime.
- Akun yang sudah ada (1) mendapat klaim `role = user` dan nilai bawaan kolom baru; konstrain terpasang.
- Tes langsung di database sungguhan (dibatalkan otomatis, tidak ada data tersisa): daftar dengan metadata
  `role: admin` menghasilkan peran `user` + `requested_role = psychologist` + klaim JWT `user`; menaikkan
  `role`/`is_demo`/`requested_role` dari sesi pengguna ditolak; update kolom biasa tetap jalan; PHQ-9 butir 9
  \> 0 menghasilkan tepat 1 alert `critical`; `log_access` dan `facility_aggregate` tanpa izin ditolak.
- `pnpm db:types` dijalankan lewat tool Supabase (tipe asli menggantikan yang ditulis tangan); lint,
  typecheck, 537 tes unit, build, dan 88 tes e2e lolos dengan Supabase sungguhan terhubung. `/api/health`
  menjawab `ok` dan login dengan kredensial salah menghasilkan pesan netral dari Supabase Auth.

### 5 keputusan utama

#### 1. Keamanan dijaga database, dan dibuktikan pada Postgres sungguhan

**Apa.** Migrasi `supabase/migrations/20261014000000_web_ecosystem.sql` (additive, idempotent): 6 tabel baru
ber-RLS, fungsi `can_view()`/`log_access()`/`facility_aggregate()`, dan trigger penjaga. Diuji dengan
**PGlite** (Postgres di dalam proses) yang memuat 5 migrasi Flutter + stub role/JWT Supabase: 101 tes
RLS/trigger/fungsi + 28 tes data seed, termasuk skenario penyerang.

**Kenapa.** Aplikasi bisa salah; database tidak boleh. Dan klaim "RLS aman" tanpa bukti hanya klaim.

**Bukti yang paling kuat.**

- `revoke update (role) … from authenticated` (yang tertulis di ARCHITECTURE awal) **tidak mencegah**
  eskalasi karena `authenticated` punya UPDATE tingkat tabel. Tes memperagakannya, dan trigger penjaga
  yang menggantikannya lolos tes yang sama.
- **Uji mutasi**: migrasi dirusak sengaja dengan 6 cara (hapus syarat link aktif, matikan trigger role,
  k=1, ambang krisis, matikan guard pendamping, izinkan pemilik menutup alert). Keenamnya terdeteksi suite.

**Jika juri bertanya** _"Bagaimana Anda tahu RLS-nya benar?"_ → Kami menjalankannya pada Postgres sungguhan
dengan role dan klaim JWT meniru Supabase, menyerangnya dari akun penyerang, lalu merusak kode sengaja
untuk memastikan tes benar-benar gagal.

#### 2. Peran: satu sumber kebenaran, tiga lapis pemeriksaan

`profiles.role` adalah sumber kebenaran. Trigger menyalinnya ke JWT (`app_metadata`, tidak bisa diubah
pengguna) sehingga **middleware** bisa menolak rute salah-peran tanpa query DB per navigasi. Setiap **layout
portal** memanggil `requireRole()` yang membaca database; **RLS** mengamankan data. Dua lapis pertama hanya
UX; RLS yang mengamankan. "Saya psikolog" saat daftar hanyalah `requested_role` (antrean verifikasi): peran
**tidak pernah** dibaca dari metadata signup (yang bisa dikendalikan pengguna). Tes: metadata `role: admin`
diabaikan; formulir menolak `accountType=admin`.

#### 3. Autentikasi: Server Action + Zod, tanpa membocorkan akun, dan tidak tumbang tanpa konfigurasi

Satu skema Zod untuk form dan action. Pesan galat memetakan **kode** Supabase (bukan teks aslinya) ke bahasa
ramah. Login memberi pesan sama untuk "email tak ada" dan "sandi salah"; pendaftaran dan lupa sandi menjawab
sama untuk email terdaftar atau tidak (anti-enumerasi). `?next=` disaring `safeNextPath` (tolak `//evil`,
`\`, skema, karakter kontrol, termasuk yang ter-encode). Tanpa env Supabase, situs publik tetap hidup dan
formulir menjawab "belum dikonfigurasi" dengan ramah.

#### 4. Agregat faskes: k-anonymity berlapis, dan itu satu-satunya jalan

`facility_aggregate()` dua lapis: grup kota-minggu < 10 pengguna → `suppressed` dengan **semua angka null**
(jumlah pengguna pun disembunyikan); di grup yang lolos, **setiap metrik** butuh ≥ 10 pengguna berbeda
(rata-rata PHQ-9 dari 3 orang di grup 12 orang tetap membocorkan skor). Tes struktural memastikan tipe
keluarannya tidak memuat kolom pengenal. Data seed sengaja menyertakan Kab. Cianjur (6 orang) untuk
memperagakannya.

#### 5. Skema bawaan Flutter ternyata punya celah, dan kami menutupnya tanpa merusak aplikasi mobile

Detail lengkap: [TEMUAN-KEAMANAN.md](./TEMUAN-KEAMANAN.md). Yang terpenting: undangan pendamping bisa diambil
alih dan izinnya ditulis ulang oleh akun biasa (F1). Trigger penjaga menutup eskalasi izin dan pengaktifan
ulang; alur Flutter (`acceptInvite`, `updatePermissions`) tetap berjalan (diuji dengan pernyataan SQL yang
sama persis dengan yang dikirim Dart). Sisa celah (enumerasi undangan) butuh RPC dan perubahan aplikasi
mobile, yaitu keputusan Anda.

### Bug yang tertangkap oleh pengujian/pemeriksaan (bahan cerita "kualitas teknis")

| Ditemukan                                                            | Oleh                           | Perbaikan                                           |
| -------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------- |
| Portal terprerender statis: `redirect('/masuk')` ikut "terpanggang"  | tabel rute `next build`        | `force-dynamic` + `connection()`; tes penjaga build |
| `readPublicEnv()` melempar untuk URL salah format → middleware 500   | tes env                        | `try/catch` di dalam `refine`                       |
| `safeNextPath` menerima `/%0d%0aLocation:…`                          | tes open-redirect              | periksa juga bentuk setelah decode                  |
| Kotak persetujuan tereset setelah galat validasi                     | uji manual di browser          | `defaultChecked` dari state                         |
| Sebaran data seed terlalu sempit (hanya 5 pengguna "berat")          | tes jumlah ideasi              | `spread` ternyata setengah rentang, bukan σ         |
| axe gagal sesekali pada dialog di mobile                             | e2e                            | tunggu animasi selesai (opasitas = 1), bukan sleep  |
| `declineInvite` Dart gagal oleh RLS bawaan                           | tes (bukan akibat migrasi web) | didokumentasikan sebagai temuan F4                  |

### Keputusan kecil

- **`/api/health`** memakai kunci anon: RLS yang menolak anon (`42501`) justru bukti database menjawab → 200.
  Respons tidak pernah memuat URL/kunci. Selalu `no-store`.
- **`/atur-sandi`, `/akun-bermasalah`, `/auth/callback`** ditambahkan (di luar daftar PLAN) karena alur lupa
  sandi tanpa halaman pembuat sandi baru tidak lengkap, dan akun tanpa baris profil akan terpental
  `/masuk` ↔ beranda tanpa akhir.
- **Klien service role** hanya di `lib/server/`; aturan lint menolak impornya dari `app/` (diuji dua arah).
- **Tipe database kini dihasilkan dari proyek sungguhan** (`lib/supabase/database.types.ts`, masuk
  `.prettierignore`). Konsekuensinya kolom seperti `role` bertipe `string` (CHECK constraint tidak menjadi
  union), jadi kode memvalidasi nilai dari database (`isUserRole` di `lib/auth/roles.ts`) alih-alih
  mempercayai tipenya.
- **Rate limit (Upstash) dan CAPTCHA (Turnstile)** belum dipasang: ketiganya masuk Fase 3/5 menurut PLAN.
  Pembatasan laju bawaan Supabase Auth masih berlaku dan pesannya sudah dipetakan.
- **CSP tanpa nonce dan cookie tidak `HttpOnly`**: dua penyimpangan dari tulisan ARCHITECTURE §8, alasannya
  dicatat di sana (nonce meniadakan halaman statis di CDN; Realtime butuh token di browser).

### Yang belum ada (jujur)

- Alur **daftar sukses**, konfirmasi email, dan pemulihan sandi **belum diuji end-to-end** dengan Supabase
  sungguhan (akan membuat akun dan mengirim email sungguhan). Yang sudah diuji langsung: koneksi
  (`/api/health`), guard rute, dan penolakan kredensial salah. Lapisan database diuji lewat PGlite dan
  lewat tes dalam transaksi yang dibatalkan.
- `pnpm db:types` (skrip Management API) belum dijalankan; tipe dibuat lewat tool Supabase dengan isi setara.
- Deploy Vercel, konfigurasi URL redirect Supabase, dan template email (bahasa Indonesia) belum dikerjakan.
- MFA psikolog masuk Fase 2.

### Seed demo (13 Okt 2026)

`pnpm seed --yes` dijalankan ke proyek "Mindra". Hasil diverifikasi di database: 304 profil demo (300
sintetis + 4 akun demo), 20 faskes, 10 psikolog, 2.190 asesmen, 613 alert krisis (dibuat oleh trigger, bukan
disisipkan manual), 8 care link aktif; 1 profil non-demo milik pemilik proyek tidak tersentuh. Klaim JWT cocok
dengan `profiles.role` untuk semua akun (0 ketidakcocokan). `facility_aggregate` pada data sungguhan:
Kab. Cianjur (6 orang) disembunyikan seluruhnya di 9 dari 9 minggu, Bandung/Bogor/Depok tampil, dan **tidak ada
satu pun baris tersembunyi yang masih membawa angka**. Seed bersifat aditif; `pnpm seed --reset` hanya menghapus
baris `is_demo` dan ID tetap.

Login memakai akun demo (kata sandi di README) belum saya uji lewat browser: itu berarti memasukkan kata sandi
ke layanan Supabase di cloud, jadi saya serahkan ke pemilik proyek.

### Hasil advisor Supabase (13 Okt 2026, setelah migrasi)

Keamanan (2 peringatan):

- **`authenticated_security_definer_function_executable`** untuk `app_role`, `can_view`, `log_access`,
  `facility_aggregate`: **disengaja**. Ini dibutuhkan agar RLS dan Server Action memanggilnya; masing-masing
  memeriksa wewenang sendiri (`facility_aggregate` menolak non-admin faskes, `log_access` menolak tanpa
  `can_view`, `can_view` dan `app_role` hanya menjawab untuk pemanggil). `anon` tidak punya EXECUTE.
- **`auth_leaked_password_protection`** mati: pengaturan Auth di dashboard (Authentication > Sign In /
  Providers > Password). **Disarankan dihidupkan** oleh pemilik proyek; saya tidak mengubah pengaturan keamanan.

Performa (bukan masalah baru dari web, kecuali yang disebut):

- `auth_rls_initplan` (35): seluruhnya **policy bawaan Flutter** yang memakai `auth.uid()` tanpa `(select …)`.
  Tidak ada satu pun dari policy web. Memperbaikinya berarti menulis ulang policy milik aplikasi mobile;
  ditunda (tidak memengaruhi kebenaran, hanya kecepatan pada data besar).
- `unindexed_foreign_keys` (4): 3 milik web (`api_clients.facility_id`, `crisis_alerts.acknowledged_by`,
  `facility_admins.facility_id`), 1 milik Flutter. Berdampak kecil pada skala demo; bisa ditambahkan lewat
  migrasi aditif bila perlu.
- `multiple_permissive_policies` (29) dan `unused_index` (52): konsekuensi menambah policy PERMISSIVE di atas
  policy Flutter, dan belum ada lalu lintas. Tidak diubah.

### Perlu tindakan Anda

1. **Arahkan `.env` Flutter** ke URL dan anon key proyek "Mindra" (migrasi web sudah diterapkan). Cek aplikasi
   Flutter sekali sesudahnya (PLAN: "Risiko & mitigasi"): terutama masuk, simpan asesmen, dan undangan pendamping.
2. ~~Isi `SUPABASE_SERVICE_ROLE_KEY`~~ Selesai: pemilik proyek memberikannya dan seed dijalankan (lihat
   "Seed demo" di atas). Kunci itu kini ada di `.env.local` (ter-ignore git) dan di riwayat percakapan; jangan
   membagikan transkrip sesi ini, dan putar ulang kuncinya bila transkrip pernah bocor.
3. Di Supabase Dashboard > Authentication > URL Configuration, tambahkan `http://localhost:3000/auth/callback`
   (dan alamat Vercel nanti) ke Redirect URLs. _(Selesai, dikonfirmasi pemilik proyek.)_
4. ~~Putuskan nasib F1~~ Selesai pada Fase 1 (lihat di bawah). Yang tersisa: rotasi **F7** (`CLAUDE_API_KEY`).
5. ~~Jalankan `pnpm seed --yes`~~ Selesai (lihat "Seed demo").

---

## Fase 1: Fitur pengguna dan perbaikan celah skema (13 Okt 2026, malam)

Diselesaikan dalam satu sesi, urutan: perbaikan F1/F3/F4/F6/F8 (migrasi + Dart + tes), port logika domain,
Server Action, halaman, tes. Rincian temuan ada di [TEMUAN-KEAMANAN.md](./TEMUAN-KEAMANAN.md).

**Perubahan di folder aplikasi Flutter** (izin pemilik proyek; dicatat sesuai CLAUDE.md): satu berkas,
`lib/features/caregiver/data/repositories/caregiver_repository_impl.dart`. `acceptInvite` dan `declineInvite`
memanggil RPC, `inviteCaregiver` membaca balik kode buatan server, `_generateCode` memakai `Random.secure()`,
dan nama pasien dibaca lewat `caregiver_patient_names`. `flutter analyze` tanpa galat baru dan 109 tes Flutter
lolos. Tidak ada tes Dart untuk repositori ini (butuh Supabase tiruan); perilakunya dibuktikan di sisi SQL
(`tests/db/caregiver-hardening.test.ts`, termasuk pernyataan yang sama persis dengan yang dikirim Dart).

### 5 keputusan utama

#### 1. Satu logika klinis, tiga implementasi yang dipaksa sepakat

Skoring, kategori, deteksi krisis, dan insight mingguan diport dari Dart ke `lib/domain/**` sebagai fungsi murni.
Kesepakatan web = mobile = database tidak hanya diklaim, tetapi diuji:

- `instruments.test.ts` **membaca berkas Dart aslinya** dan membandingkan id, teks, skala jawaban, dan butir
  terbalik untuk 46 pertanyaan; `detector.test.ts` membandingkan 43 kata kunci krisis dengan `crisis_detector.dart`.
- `scoring.test.ts` memuat kasus uji Flutter apa adanya, plus pembanding independen (ditulis ulang dari Dart)
  untuk **setiap skor yang mungkin** di keempat instrumen.
- `tests/db/assessment-parity.test.ts` menjalankan Postgres: `classify_assessment` (SQL) = `categoryFor` (web) untuk
  setiap skor; 120 jawaban acak per instrumen menghasilkan skor yang sama di trigger database dan di kode web;
  alert krisis dari trigger sama dengan detektor web.

**Jika juri bertanya** _"Bagaimana Anda memastikan hasil web dan mobile sama?"_ → Kami membaca kode Dart-nya di
dalam tes dan membandingkannya, lalu mengadu tiga implementasi pada ribuan jawaban acak.

#### 2. Skor tidak pernah datang dari klien (menutup F6)

Klien hanya mengirim jenis instrumen dan jawaban mentah. `prepareAssessment` memvalidasi ketat (lengkap, bulat,
dalam rentang opsi, tanpa kunci asing) lalu menghitung skor dan kategori di server. Database menjadi lapisan kedua:
trigger `assessments_enforce_integrity` menghitung ulang dan menolak jawaban tidak lengkap untuk **semua**
sesi pengguna, termasuk aplikasi mobile. `user_id` selalu dari sesi, bukan dari badan permintaan (diuji).
Satu detail yang hanya terlihat dari membaca Dart: aplikasi menyimpan jawaban **mentah** tetapi `total_score`
**sudah dibalik** untuk PSS-10 item 4, 5, 7, 8; web dan trigger mengikuti aturan yang sama.

#### 3. Krisis ditangani di tiga tempat, dan nomornya satu sumber

(a) Saat butir krisis dijawab > 0, muncul catatan lembut `role="status"` dengan nomor layanan, tanpa menunggu hasil
(pengguna bisa saja menutup halaman). (b) Halaman hasil mendeteksi ulang dari jawaban **tersimpan** (bukan parameter
URL) dan menampilkan banner `role="alert"` sebagai elemen pertama, berfokus. (c) Trigger database membuat alert untuk
psikolog. Semua nomor berasal dari `lib/domain/crisis/resources.ts`. Flutter menulis "119 ext. 8 (Into The Light)"
langsung di teks rekomendasi; itu keliru (layanan SEJIWA Kemenkes) dan tidak diikuti. Nomor tetap `verified: false`
sampai pemilik proyek memeriksanya.

#### 4. Insight mingguan: aturan yang sama, tetapi jujur tentang yang berbeda

`WeeklyInsightEngine` diport dengan seluruh ambang dan 28 kasus uji Flutter. Penyimpangan disengaja, semuanya diuji:
jendela = 7 hari terakhir berakhir hari ini (sesuai desain), bukan minggu kalender; tidur dikelompokkan menurut
**hari bangun**; streak tidak langsung nol di pagi hari sebelum check-in; saran "latihan CBT / refleksi malam"
**tidak ditampilkan** di web (fiturnya belum ada di web), padahal latihan dari aplikasi mobile tetap ikut dihitung
untuk narasi dan lencana. Beranda melempar galat (halaman galat ramah) bila ada kueri yang gagal, daripada
menampilkan "belum ada data" yang menyesatkan.

#### 5. Aksesibilitas dibuktikan, bukan diklaim

Skrining selesai hanya dengan keyboard (tombol angka memilih, Enter melanjutkan, fokus pindah ke pertanyaan baru).
Grafik minggu ini dibuat dari HTML/CSS, bukan pustaka grafik, dan satu `role="img"` memuat ringkasan teks tiap hari.
Tombol hapus meminta konfirmasi lewat tombol (bukan `window.confirm`). 128 hasil e2e (32 skenario × desktop dan
mobile, dijalankan dua kali untuk mencari flake) termasuk axe WCAG 2.1 A/AA + best-practice pada runner, hasil
(dengan dan tanpa krisis), beranda, jurnal, 404, dan keadaan galat; tanpa overflow horizontal di 390px.

### Penyimpangan copy dari Flutter (aturan CLAUDE.md untuk web)

Logika tidak berubah; hanya teks: kata "gangguan" diganti "indikasi" pada label/penjelasan/deskripsi SRQ-20 (butir
pertanyaan "gangguan pencernaan" tetap karena itu teks instrumen terjemahan Kemenkes); tanda seru dihapus dari
insight; emoji lencana diganti ikon Phosphor; desimal memakai koma ("7,5 jam"); tombol rekomendasi hanya mengarah
ke rute yang sudah ada (jurnal, skrining, telepon krisis), fitur lain tampil sebagai saran tanpa tautan mati;
kalimat pengantar periode ("Dalam 2 minggu terakhir…") ditambahkan di atas pertanyaan sesuai desain.

### Yang ditangkap oleh pemeriksaan (bahan cerita "kualitas teknis")

| Ditemukan                                                                           | Oleh                         | Perbaikan                                       |
| ----------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------- |
| Penjaga `caregiver_relationships` salah memblokir sesi tanpa JWT (`<>` dengan NULL) | membaca ulang migrasi sendiri | ditulis ulang null-safe + tes regresi           |
| Kode undangan pendamping dibuat dari jam (F8)                                       | membaca kode Dart            | kode dibuat server dari sumber acak             |
| Data contoh `2026-010-06` memecahkan halaman beranda pratinjau                      | pemeriksaan visual di browser | padStart bulan                                  |
| Banner krisis menggulirkan halaman saat menerima fokus                              | pemeriksaan visual           | `focus({ preventScroll: true })`                |
| Tes menekan tombol sebelum hidrasi selesai (balapan, hanya di desktop)              | e2e berulang                 | penanda `data-ready`, bukan menebak waktu       |
| Next.js memasang `role="alert"` bawaan di tiap halaman                              | e2e                          | locator mengecualikan `#__next-route-announcer__` |
| `aria-invalid` pada radio tidak didukung ARIA                                       | lint `jsx-a11y`              | dipindah ke fieldset; fokus lewat selector fieldset |
| Hasil tes lama menyisakan tipe `.next` yang menunjuk rute yang sudah dipindah       | typecheck                    | `.next` dibersihkan sebelum build/typecheck     |

### Yang belum ada (jujur)

- ~~Migrasi `20261014000100` dan `20261014000200` belum diterapkan ke proyek cloud.~~ **Sudah diterapkan pemilik
  proyek (14 Okt 2026) dan diverifikasi** (lihat "Verifikasi di cloud" pada bagian Fase 2). Aplikasi Flutter versi
  lama tidak bisa menerima undangan sampai dibangun ulang.
- Alur dengan **akun sungguhan** (simpan skrining, hasil, jurnal, beranda berdata) belum saya jalankan: masuk ke
  Supabase cloud dengan kata sandi bukan sesuatu yang saya lakukan. Spec `e2e/fase1.auth.spec.ts` siap dijalankan
  pemilik proyek dengan `E2E_USER_EMAIL` dan `E2E_USER_PASSWORD` (akun uji, karena spec menulis data).
- Banner krisis belum memuat "Kabari psikologmu" atau "Kontak daruratku" (butuh `care_links` dan kontak darurat,
  Fase 2). Catatan "psikolog sudah menerima pemberitahuan" sengaja tidak ditampilkan karena belum tentu benar.
- Semua jam dan pengelompokan harian memakai **WIB**; pengguna di WITA/WIT melihat batas hari bergeser 1–2 jam.
- Batas 12 skrining per jam per akun adalah pencegah sementara; rate limit sungguhan (Upstash) di Fase 3.
- `error.tsx` menangkap kegagalan memuat, tetapi belum ada pelaporan galat (Sentry) dan sengaja tidak mencatat
  detail galat karena bisa menyentuh data kesehatan.

## Fase 2: Ekosistem perawatan (14 Okt 2026)

Urutan kerja: migrasi `20261014000300_care_ecosystem.sql` (+ 12 uji mutasi), domain murni (izin, riwayat akses,
ringkasan klien, peringatan, tampilan pendamping, keputusan MFA), lapisan server dan Server Action, halaman,
pratinjau `/dev/*`, tes. Tidak ada perubahan di folder aplikasi Flutter pada fase ini.

### 5 keputusan utama

#### 1. MFA ditegakkan di database, bukan hanya di layar

Rancangan awal hanya memeriksa MFA di layout web. Itu tidak melindungi apa pun: penyerang yang memegang kata sandi
psikolog bisa memakai token aal1 langsung ke API PostgREST dan membaca data klien tanpa melewati satu layar pun.
Karena itu `can_view()` memanggil `psychologist_mfa_ok()` pada cabang psikolog: benar hanya bila klaim JWT `aal` =
`aal2` (TOTP terverifikasi). Cabang pemilik dan pendamping tidak berubah. Akibatnya semua jalur ikut terlindungi,
termasuk `log_access()`, RLS `crisis_alerts`, dan Realtime (yang menerapkan RLS milik pelanggannya).
Layar web (`requireMfaPsychologist`) hanya mengarahkan ke pendaftaran TOTP atau verifikasi supaya pengguna tidak
melihat layar galat. Gerbang itu dipasang di **setiap halaman**, bukan hanya layout, karena layout dan halaman
Next.js dirender bersamaan.

Sakelar demo ada dua dan keduanya harus dimatikan untuk melewati MFA: `MFA_ENFORCEMENT=off` di server dan
`alter database postgres set app.psychologist_mfa = 'off'` di database. Keduanya gagal tertutup: hanya nilai
persis `off` yang berlaku, salah ketik tetap mewajibkan MFA.

**Jika juri bertanya** _"Bagaimana Anda memastikan akun psikolog yang dibobol tidak membuka data klien?"_ →
Pembatasannya ada di database, bukan di antarmuka; token tanpa TOTP ditolak oleh `can_view()` walau dipakai langsung
ke API, dan setiap pembukaan data tercatat serta bisa dilihat klien.

#### 2. "Catat dulu, baru baca", dan gagal mencatat berarti tidak membaca

Setiap pembacaan data milik orang lain memanggil `auditAccess` **sebelum** kuerinya dikirim, dan hanya untuk jenis data
yang memang diizinkan dan akan dibaca. Bila pencatatan gagal, `AuditError` dilempar dan halaman menampilkan galat,
bukan data klien tanpa jejak. Penegakan sebenarnya di database: `log_access()` menolak pemanggil yang `can_view`-nya
salah, dan `log_access_batch()` (dasbor, maksimal 200 klien) gagal seluruhnya bila satu subjek tidak berhak, sehingga
psikolog tidak bisa menyelipkan id orang lain di antara kliennya. Pembukaan berulang dalam 5 menit dicatat sekali.
Jenis data yang tidak dibagikan klien **tidak diminta sama sekali** (bukan diminta lalu dibuang), dan halaman Klien
tidak mencatat akses ke peringatan krisis karena memang tidak menampilkannya.

Cakupan pencatatan: dasbor (skrining, mood, peringatan krisis), detail klien (skrining, mood, tidur, peringatan),
detail pendamping (mood, skrining, peringatan), dan penandaan peringatan ("acknowledge"). Dibuktikan oleh
`lib/server/psychologist.test.ts`, `lib/server/caregiver.test.ts`, dan `lib/psychologist/actions.test.ts` yang memeriksa
urutan kejadian pada klien Supabase tiruan, lalu diuji ulang dengan mutasi (hapus audit, lepas penyaring izin, lepas
penyaring pemilik): semua perusakan membuat tes gagal.

#### 3. Alert krisis realtime yang bisa dipercaya

Alur: Supabase Realtime mengirim baris `crisis_alerts` baru (RLS milik sesi psikolog berlaku, jadi hanya klien yang
berizin dan hanya sesi aal2); payload divalidasi Zod, bukan dipercaya; kartu sementara tampil seketika dan diumumkan
lewat wilayah `role="alert"` tanpa mencuri fokus; lalu `router.refresh()` memuat rincian (skor skrining) dari server,
yang pada saat itu mencatat aksesnya. Kartu sementara memuat nama dan tingkat saja, tidak ada isi yang belum tercatat.
Bila koneksi langsung putus, halaman dimuat ulang tiap 30 detik dan saat tab kembali terlihat, dan status koneksi
ditulis sebagai teks ("Terhubung langsung" / "Koneksi langsung terputus…"), bukan hanya warna titik. Bunyi peringatan
hanya aktif setelah psikolog menyalakannya di sesi itu (kebijakan autoplay browser), jadi tidak ada janji palsu
"bunyi aktif" setelah muat ulang.

Komponen menerima pabrik klien realtime (`createRealtimeClient`), sehingga alur yang sama bisa diuji tanpa
jaringan: 14 tes komponen dan e2e `/dev/psikolog` (tombol "Simulasikan peringatan masuk" mengirim payload palsu dan
memeriksa bahwa dokumen tidak dimuat ulang).

#### 4. Izin dibaca persis seperti database membacanya

`readPermissions` meniru SQL (`permissions ->> kunci = 'true'`): hanya boolean `true` atau teks `"true"` yang berarti
diizinkan; kunci hilang, angka, atau teks lain berarti tidak. Dengan begitu layar privasi menampilkan persis apa yang
dibaca `can_view()`. Mengubah satu izin menulis ulang **seluruh** objek izin yang sudah dinormalkan (kunci asing dan
nilai aneh dari data lama tidak terbawa) dan selalu dibatasi `patient_id` milik pemanggil. Tiga pilihan produk:

- **Cabut akses satu klik, tanpa dialog konfirmasi.** Mencabut adalah arah yang melindungi privasi dan bisa dibalik
  (hubungkan lagi atau undang lagi), jadi hambatannya sengaja sekecil mungkin; hasilnya diumumkan lewat toast.
- **Menghubungkan kembali psikolog yang pernah dicabut memakai izin awal, bukan izin lama**: itu persetujuan baru.
  Izin awal: skrining, mood, tidur, dan peringatan krisis menyala; ringkasan teman cerita mati.
- **"Tidak dibagikan" berbeda dari "belum ada data".** Bagian yang dimatikan klien ditulis terang sebagai pilihan klien
  di portal psikolog dan pendamping; keduanya tidak boleh tertukar bagi yang melihat.

#### 5. Pendamping melihat lebih sedikit daripada aplikasi Flutter

Semua perbedaan ke arah lebih sedikit data, diuji di `lib/domain/caregiver/caregiver.test.ts` dan
`lib/server/caregiver.test.ts`: hanya **kategori** skrining terakhir yang tampil (tidak pernah skor atau jawaban);
tidak ada "terakhir aktif" tersendiri (itu turunan mood, jadi mengikuti izin mood); bagian tanpa izin ditandai tidak
diizinkan dan **tabelnya tidak diminta**. Undangan hanya bisa diterima lewat RPC `accept_caregiver_invite` (celah F1
yang ditutup di Fase 1); pesan galatnya sama untuk kode salah, kedaluwarsa, dan undangan milik sendiri, dan batas 5
percobaan gagal per 15 menit ditampilkan apa adanya. Copy sisi pengguna memakai "orang yang kamu dampingi", bukan
"pasien" (aturan CLAUDE.md).

### Penyimpangan dari mockup

- Navigasi psikolog hanya memuat halaman yang **sudah ada** (Ringkasan, Klien, Keamanan). Jadwal, Catatan sesi, dan
  Profil praktik dari mockup belum dibangun, jadi tidak ditautkan (menghindari tautan mati).
- Tombol "Hubungi klien" pada kartu krisis tidak ada: psikolog tidak punya akses ke nomor ponsel klien (RLS profil
  dan celah F3 sengaja menutup itu). Yang ada: "Buka profil" dan "Tandai sudah ditangani".
- Riwayat akses tidak menampilkan "web/aplikasi" dan tidak memuat baris faskes: `data_access_logs` tidak punya kolom
  sumber, dan data agregat faskes (k-anonymity) memang tidak dicatat per pengguna.
- Kartu jadwal berada di samping tabel klien hanya pada layar ≥ 1440px (mockup memakai 1100px); pada lebar di bawah itu
  tabel klien tidak muat tanpa scroll horizontal.

### Yang ditangkap oleh pemeriksaan (bahan cerita "kualitas teknis")

| Ditemukan                                                                                        | Oleh                                | Perbaikan                                                                         |
| ------------------------------------------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------- |
| Handler realtime membaca `payload.new` tanpa menjaga payload `null`                              | tes komponen                        | `parseRealtimePayload` berbasis Zod; bentuk tak dikenal diabaikan                 |
| Dasbor melebar di 390px: grid satu kolom tanpa `grid-cols-1`, tabel melebarkan kartu              | e2e overflow mobile                 | `grid-cols-1` (kolom `minmax(0,1fr)`)                                             |
| Halaman privasi melebar 7px di 390px: baris dengan tombol `nowrap` memaksa lebar minimum          | e2e overflow mobile + JS di browser | baris `flex-wrap` dengan `basis` teks                                             |
| Tabel klien memunculkan scroll horizontal di 1440px                                              | pemeriksaan visual                  | kartu jadwal di samping hanya ≥ 1440px, kolom nama dilebarkan                     |
| Matcher middleware melewati path bertitik, jadi `/privasi/riwayat.csv` tidak dijaga middleware   | membaca konfigurasi                 | rute unduhan `/privasi/riwayat` + penjaga peran sendiri                           |
| `'error' in ctx` tidak mempersempit tipe gabungan; `ctx.error` bertipe `string \| undefined`      | typecheck                           | tipe gabungan berdiskriminan `ok`                                                 |
| SDK memberi tipe AAL terbuka (`string & {}`)                                                     | typecheck                           | `normalizeMfaLevel`: selain `aal1`/`aal2` dianggap tak terbaca (gagal tertutup)   |
| Gerbang MFA di layout saja tidak mencegah halaman membaca data lebih dulu                         | membaca model render Next.js        | `requireMfaPsychologist()` di tiap halaman + layout                               |
| `autoFocus` ditolak lint `jsx-a11y`                                                              | lint                                | fokus lewat `ref` + efek                                                          |

Uji mutasi: 12 perusakan migrasi `…000300` (MFA dilepas, `aal` kosong dianggap aal2, daftar klien membuka tautan
dicabut, kode undangan terlihat untuk semua status, riwayat membuka semua orang, batas 200 dilepas, penjaga konsultasi
dimatikan, dan seterusnya) dan 12 perusakan lapisan server dan Server Action: semuanya membuat tes gagal, dan berkas
dipulihkan identik.

Hasil: 1162 tes unit, komponen, dan database lolos (25 dilewati: penjaga hasil build, yang berjalan setelah
`pnpm build`, lolos 25 dari 25 pada build yang sama); 188 hasil e2e lolos (18 dilewati: spec berakun), termasuk 36
hasil Fase 2 (18 skenario × desktop 1440 dan mobile 390, dengan axe WCAG 2.1 A/AA + best-practice dan pemeriksaan
overflow horizontal). `pnpm typecheck`, `pnpm lint`, dan `pnpm build` bersih; semua rute baru berstatus dinamis.

### Yang belum ada (jujur)

- ~~Migrasi `…000100`, `…000200`, `…000300` belum diterapkan.~~ **Sudah diterapkan dan diverifikasi di cloud
  (14 Okt 2026)**; rincian pemeriksaannya di bagian berikut.
- **Alur berakun belum saya jalankan.** Masuk ke Supabase cloud dengan kata sandi bukan sesuatu yang saya lakukan. Dua
  skenario wajib dari PLAN ada di `e2e/fase2.auth.spec.ts` (dilewati tanpa kredensial): "PHQ-9 butir 9 > 0 → alert muncul
  di dasbor psikolog tanpa reload" dan "pendamping tanpa izin `assessment_results` tidak bisa melihat hasil skrining".
  Yang sudah terbukti tanpa akun: logika dan urutan audit (tes dengan klien tiruan), RLS dan MFA di Postgres
  sungguhan (PGlite), dan perilaku komponen realtime (klien palsu).
- **Realtime pada Supabase sungguhan belum diuji ujung ke ujung.** Asumsinya: Realtime menerapkan RLS memakai klaim JWT
  pelanggan, termasuk `aal`. Itulah yang diperiksa skenario pertama di spec berakun; bila ternyata tidak, panel
  tetap bekerja lewat muat ulang 30 detik.
- **MFA tanpa kode pemulihan.** Supabase tidak menyediakannya untuk TOTP. Mitigasinya perangkat cadangan (faktor TOTP
  kedua, bisa ditambah dari halaman Keamanan saat sesi aal2); bila semua perangkat hilang, faktor dihapus lewat dasbor
  Supabase oleh admin. Pendaftaran memakai klien Supabase di browser; QR berasal dari Supabase (SVG data URI) dan
  secret tidak pernah lewat server Mindra.
- MFA untuk `facility_admin` sudah dimodelkan di `decideMfa` tetapi baru ditegakkan saat portal faskes dibangun (Fase 4).
- Halaman Jadwal, Catatan sesi, dan Profil praktik psikolog belum ada. Izin `ai_summary` tersimpan dan ditampilkan,
  tetapi belum ada layar yang membaca ringkasan teman cerita (fitur itu belum ada di web).
- Saklar SATUSEHAT hanya mencatat persetujuan; tidak ada data yang dikirim sebelum Fase 3.
- Unduhan riwayat akses dibatasi 500 baris terakhir. Dasbor membaca maksimal 1000 skrining dan 2000 catatan mood klien
  terbaru (batas pengaman, cukup untuk puluhan klien).
- Halaman portal psikolog memuat sekitar 220 kB JavaScript awal karena klien Realtime Supabase; wajar untuk portal
  kerja, tetapi belum dioptimalkan (mis. memuat Realtime setelah halaman interaktif).

### Verifikasi di cloud (14 Okt 2026, setelah pemilik proyek menempelkan migrasi)

Semua kueri baca saja pada proyek Mindra (`ezadwmivhqjfpbismexl`). Perilaku diuji dengan klaim JWT simulasi di dalam
satu transaksi tanpa tulisan (`set local role authenticated` + `request.jwt.claims`), sehingga yang diuji adalah RLS
dan fungsi yang sebenarnya, bukan tiruan.

| Pemeriksaan                                                                                   | Hasil                                                                              |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 15 fungsi baru/diganti ada, `security definer` ber-`search_path` kosong, `anon` tanpa hak eksekusi | sesuai; fungsi trigger dan `check_caregiver_invite_throttle` tidak bisa dieksekusi `authenticated` |
| 4 trigger penjaga aktif (kode undangan, penjaga update hubungan, integritas asesmen, penjaga konsultasi) | sesuai                                                                    |
| Policy lama berbahaya dihapus (`Caregivers can view patient profile`, pembacaan undangan `pending` terbuka) | sesuai; policy `caregiver_relationships` kini 4 dan terbatas pada pihak terkait |
| `caregiver_invite_attempts`: RLS aktif, tanpa policy, tanpa hak tabel                           | sesuai; `authenticated` mendapat "permission denied" saat mencoba membacanya       |
| `can_view()` memuat `psychologist_mfa_ok()`; `profiles.satusehat_consent` ada; `crisis_alerts` di publikasi Realtime | sesuai                                                                |
| Data demo utuh                                                                                | 304 profil, 2190 skrining, 613 peringatan, 8 tautan psikolog                       |
| **Psikolog demo, sesi aal1**                                                                  | `psychologist_mfa_ok` = false; 0 klien, 0 skrining, 0 peringatan, 0 mood, 0 konsultasi |
| **Psikolog demo, sesi aal2**                                                                  | 8 klien, 56 skrining, 21 peringatan, 282 mood, 1 konsultasi                        |
| `log_access` oleh psikolog aal1                                                               | ditolak `42501` "Tidak ada izin untuk data ini"                                    |
| **Pendamping demo**                                                                           | 1 profil (miliknya sendiri), 1 hubungan, 1 nama via RPC, **0 skrining** (izin hasil skrining mati), 6 mood (izin mood menyala) |
| Pengguna demo                                                                                 | 1 tautan psikolog, 1 pendamping, 4 skrining sendiri, `satusehat_consent` = false   |
| Advisor keamanan                                                                              | tanpa temuan baru: 11 fungsi `security definer` sengaja dapat dipanggil (otorisasi di dalam fungsi), RLS tanpa policy pada `caregiver_invite_attempts` sengaja, leaked-password protection masih mati (tindakan pemilik) |
| Advisor performa                                                                              | hanya catatan umum Flutter (`auth_rls_initplan`, indeks belum terpakai); tidak ditindaklanjuti pada fase ini |

Skenario wajib "pendamping tanpa izin `assessment_results` tidak bisa melihat hasil skrining" kini terbukti pada
database sungguhan (0 skrining), bukan hanya di PGlite. Yang masih menunggu akun sungguhan di peramban hanyalah lapisan
web di atasnya (`e2e/fase2.auth.spec.ts`).

**Temuan baru dari pemeriksaan ini:** empat policy psikolog lama (`consultations` ×2, `assessments`, `profiles`)
masih terpasang dan membandingkan `psychologist_id` dengan `auth.uid()`. Pada data sekarang tidak berlaku (0 dari 10
id psikolog sama dengan akun login; pengguna tidak bisa menambah baris `psychologists`), tetapi bila suatu hari berlaku
ia melewati MFA dan persetujuan `care_links`. Penghapusannya digabung dengan migrasi Fase 3. Lihat F5 di
[TEMUAN-KEAMANAN.md](./TEMUAN-KEAMANAN.md).

**Tipe database:** `pnpm db:types` tidak bisa dijalankan (tidak ada `SUPABASE_ACCESS_TOKEN` di `.env.local`); tipe yang
ditulis tangan untuk fungsi baru sudah dicocokkan dengan `pg_get_function_arguments` dan `pg_get_function_result` di
cloud dan sama.

### Perlu tindakan Anda

1. ~~Terapkan migrasi `…000100`–`…000300`.~~ Selesai. Bangun ulang aplikasi Flutter (migrasi `…000100` mengubah
   cara menerima undangan).
2. Siapkan satu akun psikolog uji dan pasien tertaut, lalu jalankan `e2e/fase2.auth.spec.ts` (petunjuk di berkasnya).
   Untuk demo juri tanpa perangkat autentikator bersama, pilih: (a) daftarkan TOTP pada akun demo dan pakai satu
   ponsel di panggung, atau (b) matikan kedua sakelar MFA di atas (jangan lupa menyalakannya lagi).
3. Putar `CLAUDE_API_KEY` yang terbundel di aplikasi mobile (F7) dan aktifkan leaked-password protection di
   Supabase Auth (belum bisa saya lakukan dari sini).

---

## Fase 3: Interoperabilitas (14 Okt 2026)

Urutan kerja: penutupan celah lama (migrasi `20261014000400_drop_inert_psychologist_policies.sql` + 6 tes DB), kerangka
API (`lib/api/*`), inti bersama antara halaman web dan API (`lib/assessment/submit.ts`, `lib/journal/entries.ts`,
`lib/data/weekly-insight.ts`), 12 operasi `/api/v1`, pemeta FHIR dan klien SATUSEHAT, OpenAPI + halaman `/developers`,
manajemen kunci API untuk admin faskes, tes (unit, kontrak, HTTP, mutasi, Playwright). Tidak ada perubahan di folder
aplikasi Flutter pada fase ini.

### 5 keputusan utama

#### 1. Satu pintu untuk setiap endpoint: `defineRoute`

Semua rute `/api/v1/*` dibuat lewat `defineRoute` (`lib/api/handler.ts`) dan dipasang ke Next.js lewat `mount()`.
Urutannya tetap dan tidak bisa dilewati oleh pembuat rute: batas laju per IP → autentikasi (Bearer atau `X-API-Key`)
→ batas laju per kredensial → validasi Zod (jalur, query, badan) → handler → respons `{ data, error, meta }`.
Handler tidak pernah menerima data yang belum divalidasi dan tidak pernah dipanggil tanpa prinsipal.

**Penyimpangan kecil dari CLAUDE.md** ("validasi Zod → auth → rate limit"): validasi sengaja diletakkan **setelah**
autentikasi. Penelepon tanpa kredensial hanya melihat satu jawaban (401 seragam) dan tidak bisa menggali bentuk skema
lewat pesan galat 422. Batas laju per IP dipasang paling depan supaya tebakan kunci tetap murah ditolak.

Satu tes pencatat (`tests/api/route-registry.test.ts`) membaca berkas `app/api/v1/**/route.ts` dan membandingkannya
dengan daftar operasi yang dibaca OpenAPI: rute tanpa dokumentasi, dokumentasi tanpa rute, rute yang ditulis tangan
(`NextResponse`, `request.json()`, `createClient`), dan rute yang tidak `force-dynamic` semuanya membuat tes gagal.

**Jika juri bertanya** _"Bagaimana Anda memastikan tidak ada endpoint yang lupa diautentikasi?"_ → Tidak ada cara
membuat endpoint selain `defineRoute`, dan tes menggagalkan build bila ada berkas rute yang tidak memakainya.

#### 2. Setiap kueri API memakai penyaring `user_id` eksplisit, bukan hanya RLS

RLS sudah menjaga pembacaan, tetapi ada policy "pendamping/psikolog tertaut" yang sah di tabel yang sama. Bila
endpoint hanya mengandalkan RLS, token seorang psikolog yang memanggil `GET /assessments` akan ikut mengembalikan
skrining klien-kliennya, **tanpa** pencatatan akses (jalur API tidak melewati `auditAccess`). Maka setiap kueri API
menambahkan `.eq('user_id', principal.userId)`, dan tes pencatat kueri (`tests/helpers/fake-supabase.ts`) memeriksa
bahwa penyaring itu ada; uji mutasi yang melepasnya membuat tes gagal. Endpoint API hanya untuk data diri sendiri;
pembacaan data orang lain tetap lewat portal yang mencatat akses.

Paginasi memakai kursor keyset (waktu, `id`). Nilai kursor memang masuk ke ekspresi `.or()` PostgREST yang menerima
string mentah, jadi pertahanannya ada di validasi: kursor buram (base64url dari JSON) dibongkar dan harus lolos Zod
ketat (waktu berbentuk ISO dengan mikrodetik, `id` UUID) sebelum menyentuh ekspresi itu. Waktu yang berisi sintaks filter
(mis. `),user_id.neq.`) dan kursor rusak ditolak 422, tidak diabaikan diam-diam.

#### 3. Pembatas laju dengan cadangan yang tidak mematikan API

Empat aturan: per IP 120/menit (semua rute, sebelum autentikasi), publik 60/menit per IP, pengguna 120/menit baca dan
30/menit tulis, kunci API 60/menit. Jendela geser di Upstash Redis bila `UPSTASH_REDIS_REST_URL` dan `_TOKEN` diisi,
di memori proses bila tidak. Bila Upstash gagal (jaringan), pembatas **membuka sementara** ke memori proses, bukan
menolak semua permintaan: gangguan pihak ketiga tidak boleh mematikan API kita. Konsekuensinya jujur: memori proses
tidak dibagi antar instans serverless, jadi di produksi tanpa Upstash batasnya hanya kasar. Kunci batas memuat IP atau
id pengguna dan tidak pernah ditulis ke log. Jawaban 429 membawa `Retry-After`, `X-RateLimit-*`, dan galat berkode
`rate_limited`; IP lain tidak terkena (dibuktikan di Playwright).

#### 4. Kunci API: hash, tampil sekali, prefiks, dan lima kunci aktif

Format `mk_live_` + 32 karakter acak. Yang disimpan hanya SHA-256 dan prefiks 8 karakter (untuk dikenali di daftar);
nilai lengkap hanya muncul satu kali saat dibuat. Satu organisasi maksimal 5 kunci aktif (`MAX_ACTIVE_API_KEYS`);
pencabutan langsung berlaku. Cakupan (`scope`) sama dengan `CHECK` di database (`api_clients_scopes_known`), dan
rute meminta cakupannya sendiri: kunci yang sah tetapi tanpa cakupan yang diminta mendapat 403, bukan 401. Semua
kegagalan autentikasi (kunci tidak ada, salah, dicabut, format salah, token pengguna di rute mitra) menghasilkan
401 yang **sama persis**, supaya penelepon tidak bisa membedakan "kunci benar tetapi dicabut" dari "tidak pernah ada".
Kunci yang berbentuk salah ditolak sebelum menyentuh database.
`createServiceClient` dipakai hanya untuk dua hal terdokumentasi: mencari kunci dan menulis `last_used_at`, serta
memanggil `facility_aggregate` (yang menerapkan ambang k≥10) untuk klien API.

#### 5. FHIR R4 dan SATUSEHAT: nyata di pemetaan, jujur di jaringan

Pemeta (`lib/domain/fhir/observation.ts`, fungsi murni) mengeluarkan `Observation` R4: PHQ-9 = LOINC `44261-6`,
GAD-7 = LOINC `70274-6`, PSS-10 dan SRQ-20 memakai sistem lokal `https://mindra.app/fhir/instrument` (tidak ada satu
kode LOINC total-skor yang disepakati untuk keduanya). Bundel `application/fhir+json`, galat sebagai `OperationOutcome`.
**Jawaban per butir tidak pernah dimasukkan** (hanya skor total dan kategori): lebih sedikit data keluar, dan butir 9
PHQ-9 tidak ikut terkirim ke sistem luar. Dua mode pemetaan: `export` (untuk Bundel hasil pencarian) memuat `id`
logis; `create` (untuk `POST` ke SATUSEHAT) tanpa `id` karena server tujuan yang memberinya. Bila `organizationId`
diberikan, `performer` dan `identifier` SATUSEHAT ikut dipasang.

Klien SATUSEHAT punya dua mode lewat `SATUSEHAT_MODE`: `mock` (bawaan) dan `staging` (OAuth2 client credentials, lalu
`POST /Observation`). **Penyimpangan dari ARCHITECTURE §6:** mode `mock` di sana mengirim ke server HAPI FHIR publik.
Saya menjadikannya simulasi lokal sepenuhnya, karena mengirim hasil skrining pengguna sungguhan ke server uji publik
melanggar prinsip privasi proyek ini walau datanya pseudonim. Mode salah ketik (`stagin`) ditolak, tidak diam-diam jatuh
ke mock. Sinkronisasi hanya berjalan bila pengguna menyalakan persetujuan di Privasi dan izin; hasilnya tercatat di
`satusehat_sync_log` dan dapat diulang tanpa menggandakan (status `already_synced`).

### Bug yang tertangkap oleh pengujian/pemeriksaan (bahan cerita "kualitas teknis")

- **Celah MFA laten.** Pemeriksaan di cloud menemukan empat policy psikolog lama yang masih terpasang dan
  membandingkan `psychologist_id` dengan `auth.uid()`. Pada data sekarang tidak berlaku, tetapi bila suatu hari
  berlaku ia melewati MFA dan persetujuan. Ditutup oleh migrasi `…000400` dengan tes DB yang membuktikan celahnya
  ada sebelum migrasi, tertutup sesudahnya, jalur resmi tidak terganggu, dan migrasi idempoten.
- **Tanggal mustahil lolos.** `Date.parse('2026-02-31')` menerima tanggal itu; kini ada `isRealDateKey` dan refine Zod.
- **Kiriman skor dari klien.** Badan `POST /assessments` yang memuat kolom tak dikenal (mis. `total_score`) ditolak
  422 oleh skema ketat, bukan diabaikan diam-diam, supaya tidak ada klien yang mengira skornya dipercaya. Skor selalu
  dihitung server; tes salah saya sendiri yang mengira kolom itu "diabaikan" ditangkap dan diperbaiki.
- **Uji mutasi.** Perusakan yang disengaja pada kerangka API (batas laju, pemeriksaan bentuk kunci dan token,
  Content-Type, ukuran badan, X-Request-Id, penyaring `user_id`, validasi kursor, persetujuan SATUSEHAT, mode mock)
  diuji ulang; semua yang bertahan di putaran pertama diperbaiki sampai tesnya menangkap.
- **Rute Next.js 15.** Pemeriksa tipe rute menuntut argumen kedua `{ params: Promise<...> }` tidak opsional;
  `mount()` membungkusnya sekali alih-alih menyalin tanda tangan ke tiap berkas.
- **Penyintas uji mutasi.** Satu mutasi (mode SATUSEHAT salah ketik) lolos karena tes tidak mengisi lingkungan staging
  lengkap; tesnya diperbaiki sampai mutasi itu mati.
- **Aksesibilitas `/developers`.** axe menemukan `landmark-unique`; wilayah berlabel di dalam bagian diganti
  `role="group"`. Halaman `/developers` (dan dua halaman Fase 2) juga meluap horizontal di 390px karena grid satu
  kolom memuai ke min-content; diperbaiki dengan `grid-cols-1` dan `flex-wrap`.

### Keputusan kecil

- **OpenAPI dibangkitkan dengan `z.toJSONSchema` bawaan Zod 4**, bukan `zod-openapi` seperti di ARCHITECTURE §5, dan
  halaman `/developers` dibuat sendiri (komponen server, tanpa JS tambahan) alih-alih Scalar seperti di PLAN: satu
  dependensi lebih sedikit, nol beban JavaScript, dan tema serta aksesibilitas ikut sistem desain. Dokumen mesin
  tetap ada di `/api/v1/openapi.json` sehingga Scalar, Swagger UI, atau Postman bisa dipakai dari luar.
- **Tes kontrak OpenAPI.** Dokumen yang dibangkitkan diperiksa terhadap daftar rute dan terhadap skema yang dipakai
  handler, sehingga dokumentasi tidak bisa menyimpang dari perilaku.
- **Respons seragam.** `{ data, error, meta }` dengan kode galat tetap (`unauthorized`, `forbidden`,
  `validation_failed`, `rate_limited`, `payload_too_large`, `unsupported_media_type`, `invalid_json`, ...), `X-Request-Id`
  di semua jawaban (id masuk dipakai bila bentuknya aman), batas badan 32 kB, dan hanya `application/json`.
- **Inti bersama.** Halaman web dan API memanggil fungsi yang sama (`submitAssessment`, `saveMood`, `saveSleep`,
  `buildWeeklyInsight`), sehingga skoring, deteksi krisis, dan validasi tidak punya dua versi yang bisa berbeda.
  Satu-satunya perubahan perilaku: halaman Beranda kini lewat `getHomeData`.
- **Kunci API di UI faskes** (`/faskes/kunci-api`): buat, lihat prefiks dan terakhir dipakai, cabut. Nilai penuh hanya
  tampil sekali dan tidak pernah ada di HTML yang bisa di-cache (halaman dipaksa dinamis, dijaga tes build).
- Contoh curl di `/developers` dibangkitkan dari definisi rute yang sama, bukan ditulis tangan, jadi ikut berubah
  bersama kontraknya.

### Verifikasi (14 Okt 2026)

| Pemeriksaan                                                                                        | Hasil                                                                        |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm typecheck`, `pnpm lint`, `prettier --check`                                                  | bersih                                                                       |
| Vitest (unit, jsdom, kontrak OpenAPI, penjaga build, 6 berkas uji DB di PGlite)                    | 1435 tes lulus (35 penjaga hasil build aktif setelah `pnpm build`)                                                               |
| `pnpm build` (Next.js 15, semua rute `/api/v1/*` dan portal ditandai dinamis)                      | berhasil                                                                     |
| Playwright desktop 1440 dan mobile 390 (+ axe), termasuk `/developers`, `/faskes/kunci-api`, API HTTP | 226 lulus, 38 dilewati (spec berakun menunggu kredensial), 0 gagal         |
| Uji mutasi kerangka API dan layanan Fase 3                                                         | semua penyintas diperbaiki sampai tesnya menangkap                           |
| Cloud, migrasi `…000100`–`…000300` (baca saja, klaim JWT simulasi)                                 | sesuai; rincian di bagian Fase 2                                             |
| Cloud, migrasi `…000400`                                                                           | diterapkan pemilik proyek dan diverifikasi baca saja: 4 policy hilang, jalur resmi utuh, data utuh                               |

Satu tes Playwright (batas laju) sempat gagal hanya saat seluruh suite berjalan, karena 61 permintaan berurutan ke
server dev melewati 30 detik; logikanya benar (lulus sendiri dan di dua putaran lain). Batas waktunya dinaikkan
(120 detik per tes, 30 detik per permintaan) dan suite penuh lulus bersih.

### Yang belum ada (jujur)

- **Alur berakun lewat HTTP belum saya jalankan.** Masuk dengan kata sandi ke Supabase cloud bukan sesuatu yang saya
  lakukan. Skenario ada di `e2e/fase3.auth.spec.ts` (dilewati tanpa kredensial): masuk, buat GAD-7, PHQ-9 butir 9 > 0
  (krisis terdeteksi), mood, tidur, insight, Bundel FHIR, sinkronisasi SATUSEHAT, dan token pengguna ditolak di rute
  mitra. Yang sudah terbukti tanpa akun: seluruh logika handler dengan klien tiruan, kontrak dengan OpenAPI, dan
  perilaku HTTP tanpa kredensial (401, 422, 429, 404) di Playwright terhadap server sungguhan.
- **Staging SATUSEHAT belum dicoba.** Butuh organization id, client id, client secret, dan **nomor IHS pasien**
  (hasil lookup NIK ke SATUSEHAT); web belum mengumpulkan NIK. Dalam mode staging tanpa IHS, sinkronisasi gagal
  sebagai `failed` tidak-bisa-diulang dengan alasan yang jelas, bukan mengirim `Patient` palsu. Yang dipakai demo
  adalah mode `mock`, dan UI menyebut modenya.
- **Bundel FHIR belum divalidasi dengan validator resmi** (HL7 validator). Strukturnya diperiksa tes, bukan profil
  lengkap R4. Kode LOINC PHQ-9 dan GAD-7 berasal dari aplikasi Flutter dan belum saya cek ulang ke loinc.org;
  lakukan sebelum dikutip sebagai fakta di proposal.
- **Upstash wajib di produksi.** Tanpa itu batas laju hanya per instans.
- **Pembacaan lewat API tidak dicatat di `data_access_logs`.** Memang tidak perlu untuk data diri sendiri; endpoint
  yang membaca data orang lain tidak ada (agregat k≥10 bukan data individu).
- **MFA untuk `facility_admin`** baru ditegakkan saat portal faskes dibangun (Fase 4).
- Tidak ada koleksi Postman dan tes beban k6 di fase ini; `/api/v1/openapi.json` dapat diimpor ke Postman.
- Endpoint direktori psikolog, slot, booking, faskes terdekat, dan teman cerita di ARCHITECTURE §5 adalah Fase 4.

### Perlu tindakan Anda

1. ~~Terapkan migrasi `20261014000400_drop_inert_psychologist_policies.sql`.~~ Selesai dan diverifikasi (14 Okt 2026).
2. Siapkan satu akun pengguna uji lalu jalankan `e2e/fase3.auth.spec.ts` (petunjuk di berkasnya; spec itu **menulis**
   data ke proyek Supabase, pakai akun khusus uji).
3. Untuk produksi: isi `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN`. Untuk staging SATUSEHAT: daftar akun
   sandbox, isi `SATUSEHAT_*`, dan putuskan cara mendapatkan IHS number.
4. Masih tertunda dari fase sebelumnya: putar `CLAUDE_API_KEY` di aplikasi mobile (F7) dan aktifkan
   leaked-password protection di Supabase Auth.

---

## Fase 4: Faskes, Teman cerita, Konsultasi (14 Okt 2026)

Urutan kerja: verifikasi migrasi `…000400` di cloud, migrasi `20261014000500_facility_mfa_and_booking.sql` (+ 44 tes DB dan
25 uji mutasi), portal faskes (domain, server, halaman, peta, laporan), Teman cerita (domain, layanan, adaptor model,
SSE, UI), Konsultasi (slot, direktori, pemesanan, API, jadwal psikolog), pratinjau `/dev/*`, tes (unit, DB, Playwright),
uji mutasi (112 perusakan, semua tertangkap kecuali satu yang setara). Tidak ada perubahan di folder aplikasi Flutter.

### 5 keputusan utama

#### 1. Dasbor faskes hanya melihat agregat, dan itu dibuktikan tiga cara

Aturan besinya: angka kesehatan hanya lewat `public.facility_aggregate()` (k ≥ 10, otorisasi di dalam fungsi). Bukti:
(a) **pemindaian kode** (`tests/faskes/aggregate-only.test.ts`): berkas portal tidak boleh menyebut tabel data pengguna,
tidak boleh memakai klien service role, hanya boleh `from('facility_admins')`/`from('facilities')` dan satu rpc;
(b) **klien Supabase tiruan** (`lib/server/faskes-dashboard.test.ts`) mencatat tabel dan rpc yang benar-benar dipanggil;
(c) **Postgres sungguhan** (`tests/db/facility-booking.test.ts`): admin faskes dengan sesi aal2 yang sah membaca 0 baris dari
`assessments`, `mood_entries`, `sleep_entries`, `crisis_alerts`, `care_links`, `consultations`, `ai_conversations`,
`data_access_logs`, dan hanya profilnya sendiri.

**MFA admin faskes ditegakkan di database**, seperti psikolog: `facility_aggregate()` kini mensyaratkan sesi aal2 pada
cabang pengguna (service_role untuk API mitra tidak terpengaruh), begitu pula membuat dan mencabut `api_clients`. Fungsi
`psychologist_mfa_ok()` dipakai ulang (namanya historis); sakelar demo tetap dua lapis. Halaman keamanan dan verifikasi
dipakai bersama psikolog (`MfaSecurityView`).

Dua penyimpangan dari mockup yang disengaja:
- **Lingkup = provinsi, kota faskes disorot.** `facility_aggregate()` menjawab semua kota di provinsi faskes (itu juga
  yang membuat "Dibanding kota lain" bermakna). Kartu ringkasan dan grafik memakai kota faskes bila ada pekan yang
  tampil; bila seluruh pekan kotanya tertekan, jatuh ke gabungan kota lain yang tampil, dengan keterangan yang jelas.
- **Tidak ada "sebaran per usia".** Fungsi agregat tidak punya dimensi usia, dan menambahnya berarti k-anonymity per sel
  usia dan kota (risiko re-identifikasi lebih tinggi). Diganti sebaran kategori per kota. Per usia masuk proyeksi.

Sel yang disembunyikan database tidak pernah dijumlahkan, dikurangkan, atau digambar sebagai nol: pekan tertekan membuat
garis terputus, kota tertekan ditulis "disembunyikan". Ringkasan memakai **pekan lengkap terakhir** (pekan berjalan yang
baru dua hari tidak adil dibandingkan) dan selisihnya hanya dengan pekan tepat sebelumnya yang tampil.

#### 2. Teman cerita: aturan dulu, model belakangan, dan jalur krisis tidak butuh model

Urutan di `lib/server/companion.ts` (ARCHITECTURE §7 persis): batas laju → deteksi krisis **berbasis aturan** pada pesan
terbaru → bila krisis: simpan percakapan, buat peringatan krisis, jawab dengan balasan **tetap** (`buildCrisisReply`),
**model tidak dipanggil**; bila aman: alirkan balasan model, simpan setelah selesai. Jalur krisis tetap bekerja walau
`ANTHROPIC_API_KEY` belum diisi, **dan tidak ditahan batas 20 pesan per jam**: pesan krisis dikecualikan dari batas itu
(tetap kena batas per menit dan per IP; jawabannya tidak memanggil model, jadi tidak ada biaya yang bisa dikuras), dan percakapan
yang hilang, rusak, atau penuh dijawab di percakapan baru alih-alih galat.
Peringatan dari chat (`crisis_alerts.source = 'ai_chat'`) tidak diulang bila masih ada yang terbuka dalam 6 jam.

Keputusan terkait:
- **Web memakai API publik yang sama.** Halaman memanggil `POST /api/v1/companion/chat` dengan token sesi sebagai Bearer
  (SSE: `meta`, `delta`, `crisis`, `done`, `error`). `defineRoute` diperluas dengan hasil `stream` dan batas tambahan
  per pengguna; semua tahap sebelum handler (laju, auth, validasi) tetap berlaku.
- **Yang dikirim ke Anthropic hanya perintah sistem dan isi percakapan**, tanpa nama, email, atau id. Perintah sistem
  diturunkan dari aplikasi Flutter dengan perubahan: tanpa emoji dan tanda seru, nomor krisis dari sumber tunggal,
  bagian "keamanan" (curhat bukan instruksi untuk mengubah peran). Cara Flutter meminta model "mengisi flag
  crisis_detected" diganti deteksi aturan, karena flag dari model tidak bisa dijadikan satu-satunya penjaga.
- **Kegagalan tidak menyimpan setengah jadi.** Galat model, balasan kosong, atau konflik penulisan menghasilkan satu
  peristiwa `error` generik (pesan asli tidak bocor ke pengguna maupun log); teks pengguna dikembalikan ke kolom tulis.
  Penulisan memakai penjaga `updated_at` supaya dua tab tidak saling menimpa.
- **Format simpanan sama dengan Flutter** (`ai_conversations.messages`: `id`, `role`, `content`, `timestamp`,
  `crisis_detected?`), kolom tak dikenal dipertahankan. Aplikasi mobile bisa membuka percakapan dari web dan sebaliknya.
- **Aksesibilitas**: balasan yang sedang mengalir disembunyikan dari pembaca layar dan dibacakan sekali setelah selesai;
  log percakapan bisa difokus untuk digulir; indikator menulis, tombol Berhenti, dan penghormatan `prefers-reduced-motion`.

#### 3. Bentrok jadwal ditolak database, bukan aplikasi

Constraint `EXCLUDE USING gist` pada `consultations`: tidak ada dua sesi aktif (`pending`, `confirmed`, `ongoing`) yang
tumpang-tindih untuk **psikolog yang sama** maupun **pasien yang sama**. Dua permintaan serentak untuk slot yang sama
hanya menghasilkan satu yang berhasil; yang lain mendapat `slot_taken` (HTTP 409). Berlaku untuk **semua penulis**,
termasuk aplikasi Flutter (yang tidak bisa lagi membuat sesi bertumpuk begitu migrasi diterapkan). Fungsi `book_consultation` (security
definer) memeriksa kisi jadwal, jarak (1 jam sampai 30 hari), batas 3 sesi mendatang, dan memetakan pelanggaran ke token
tetap; `psychologist_booked_slots` memberi jam terisi **tanpa identitas siapa pun**.

Slot di layar dihitung kode TypeScript (`lib/domain/consultation/slots.ts`) dengan aturan yang sama; `tests/db/consultation-parity.test.ts`
menguji ratusan slot terhadap fungsi database di Postgres sungguhan: setiap slot "tersedia" diterima, setiap jam di luar
kisi ditolak. Zona waktu jadwal dibaca sebagai WIB (kolom `psychologist_schedules` tidak punya zona). Sesi langsung
`confirmed` karena tidak ada alur pembayaran atau konfirmasi yang akan mengubahnya; tarif hanya dicatat dan layar
menyatakan "pembayaran belum tersedia di Mindra Web".

Privasi: psikolog hanya melihat **jam** sesi. Nama klien muncul di `/psikolog/jadwal` hanya bila klien itu menautkan akunnya
(`care_links` aktif), sama dengan nama yang sudah diberikan `psychologist_clients()`; memesan saja tidak membuka identitas.

#### 4. Peta: Leaflet dan OpenStreetMap, dengan tabel yang setara

Peta (`/faskes/peta`) menaruh satu gelembung per kota di **titik tengah faskes publik kota itu** (tabel `facilities`
punya koordinat; profil pengguna tidak punya lokasi lebih halus dari nama kota dan tidak dipakai). Warna mengikuti pita
PHQ-9 (0–4, 5–9, 10–14, 15+), ukuran mengikuti pengguna aktif, kota yang disembunyikan digambar sebagai cincin putus-putus.
Tabel angka dan daftar faskes di bawah peta memuat semua informasi yang sama, jadi peta hanyalah tampilan tambahan.
**Nama kota berasal dari isian pengguna dan Leaflet memasukkan string tooltip ke `innerHTML`**, maka tooltip selalu
berupa node DOM (`textContent`); `tests/faskes/map-safety.test.ts` menjaganya. CSP `img-src` ditambah host ubin OSM.
Grafik tren digambar sebagai SVG tangan sendiri (konsisten dengan Fase 1–2, tanpa dependensi dan tanpa JavaScript klien),
bukan Recharts.

#### 5. Verifikasi berlapis, termasuk yang bukan sekadar "tes hijau"

Perusakan sengaja (uji mutasi) dijalankan pada migrasi (25), Teman cerita (35, ditambah 5 untuk perbaikan krisis di bawah),
Konsultasi (27), dan faskes (20): 112 perusakan. Semua tertangkap kecuali R03 (validasi format bulan di `monthlyReport` yang ternyata berlebihan karena bulan
yang tak valid tidak akan cocok dengan baris mana pun; dipertahankan sebagai pertahanan berlapis). Playwright 102 tes di
desktop 1440 dan mobile 390, termasuk axe di setiap keadaan penting dan pemeriksaan overflow horizontal.

### Yang ditangkap oleh pemeriksaan (bahan cerita "kualitas teknis")

- **Rancangan saya sendiri bisa meninggalkan orang yang sedang krisis tanpa bantuan.** Urutan ARCHITECTURE §7 menaruh batas laju
  sebelum deteksi krisis, sehingga pesan ke-21 dalam satu jam, termasuk yang berisi tanda bahaya, dijawab 429. Ditemukan saat
  menulis dokumentasi dan ditutup sebelum dipakai siapa pun: pesan krisis dikecualikan dari batas per jam (batas dicek setelah
  validasi supaya pengecualian bisa membaca badan), dan percakapan yang hilang, rusak, atau penuh tidak lagi menggagalkan
  jawaban krisis. Lima uji mutasi baru menjaganya.
- **Admin faskes bisa membaca agregat tanpa MFA** (Fase 3 belum menegakkannya di database). Ditutup `…000500` dengan tes
  aal1 ditolak, aal2 diterima, salah ketik sakelar tetap wajib, dan service_role tidak terpengaruh.
- **Aplikasi Flutter bisa membuat sesi yang bertumpuk** dengan psikolog yang sama. Kini ditolak constraint (tes: penulisan
  langsung `23P01`, sesi rapat 10.50 diterima, sesi selesai atau batal tidak memblokir).
- **Nama kota di profil bisa menjadi HTML di tooltip peta** (Leaflet memakai `innerHTML`). Ditutup sebelum ada pengguna,
  dengan tes terhadap nama `<img onerror=...>`.
- **Radio `sr-only` memperlebar halaman sampai 2279px** (elemen absolut di dalam wadah geser mengabaikan `overflow`).
  Ditemukan lewat tangkapan layar penuh; wadahnya dijadikan `relative`.
- **axe: log percakapan yang bisa digulir tidak bisa difokus** (`scrollable-region-focusable`) dan **teks tanggal di daftar
  riwayat kurang kontras saat disorot** (latar sunken). Diperbaiki (`tabIndex`, latar sorot lebih terang, teks `fg-3`).
- **Bug uji milik saya sendiri** yang ditangkap tes: batas tepat 30 hari (`from > latest`) ternyata menyisakan dua slot
  hari terakhir; `withSession` selalu me-rollback sehingga keadaan awal tes pemesanan harus ditanam lewat superuser;
  `time + interval` melewati tengah malam dihindari dengan menghitung menit bulat di fungsi pemesanan.

### Keputusan kecil

- Kode galat API baru `conflict` (409). Pemesanan: `slot_taken`, `patient_busy`, `limit_reached` → 409; di luar kisi,
  terlalu dekat atau jauh → 422 dengan `issues[0].path = startsAt`; psikolog tidak aktif → 404.
- Batas pemesanan 10 per jam per akun (di atas batas 3 sesi mendatang); batas chat 20 pesan per jam.
- Laporan bulanan: satu pekan dihitung pada bulan tempat pekan itu dimulai (Senin); unduhan CSV lewat rute tanpa `.csv`
  (matcher middleware melewati path bertitik), dengan penjaga peran dan MFA sendiri dan `csvCell` anti injeksi rumus
  (dipindah ke `lib/utils/csv.ts`, dipakai juga oleh riwayat akses).
- Daftar psikolog di API butuh token (RLS `psychologists` hanya membuka bagi pengguna yang masuk), berbeda dari
  ARCHITECTURE §5 yang menulis "tanpa autentikasi". Nomor lisensi dan STR tidak pernah dibaca.
- Foto psikolog tidak dimuat (avatar inisial): tidak ada permintaan gambar ke pihak ketiga.
- `maxDuration = 60` pada rute chat supaya balasan panjang tidak terpotong di platform serverless.

### Verifikasi (14 Okt 2026)

| Pemeriksaan                                                                               | Hasil                                                                      |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Cloud, migrasi `…000400` (baca saja)                                                      | 4 policy lama hilang, jalur resmi utuh, data utuh                          |
| `pnpm typecheck`, `pnpm lint`, `prettier --check`                                         | bersih                                                                     |
| Vitest (unit, jsdom, kontrak OpenAPI, DB di PGlite)                                       | 1770 dari 1770 lulus setelah `pnpm build` (tanpa build, 52 penjaga hasil build dilewati) |
| Tes DB baru: `facility-booking` (44), `consultation-parity` (2, ratusan slot)             | lulus                                                                      |
| Uji mutasi migrasi, Teman cerita, konsultasi, faskes                                      | 107 perusakan; 1 setara (R03)                                              |
| Playwright `e2e/fase4.spec.ts` (desktop 1440 dan mobile 390, axe, overflow)               | 102 lulus                                                                  |
| Seluruh suite Playwright (Fase 0 sampai 4, kedua viewport)                                | 328 lulus, 56 dilewati (spec berakun menunggu kredensial), 0 gagal         |
| Cloud, migrasi `…000500`                                                                  | diterapkan dan diverifikasi (14 Okt 2026), lihat di bawah                  |

#### Verifikasi di cloud: migrasi `…000500` (14 Okt 2026, setelah pemilik proyek menempelkannya)

Struktur (baca saja): lima fungsi ada, semuanya `search_path` kosong, `anon` tanpa hak eksekusi, `authenticated` dan
`service_role` berhak; dua constraint `EXCLUDE USING gist` terpasang dengan klausa `WHERE status IN (pending, confirmed,
ongoing)`; ekstensi `btree_gist` 1.7 di skema `extensions`; `facility_aggregate()` memuat `psychologist_mfa_ok()`; policy
`api_clients` insert dan update memuat `psychologist_mfa_ok()`. Advisor keamanan: tiga fungsi `security definer` baru
muncul di daftar "dapat dieksekusi pengguna masuk" (sama seperti sebelas yang sengaja ada; otorisasi di dalam fungsi), tanpa
temuan lain.

Perilaku (satu blok `DO` yang diakhiri `RAISE EXCEPTION`, jadi seluruhnya dibatalkan; jumlah baris sesudahnya tidak berubah:
1 konsultasi, 0 kunci API, 0 percakapan), dengan klaim JWT simulasi pada data demo:

| Skenario                                                              | Hasil                                      |
| --------------------------------------------------------------------- | ------------------------------------------ |
| Admin faskes demo, sesi aal1, `facility_aggregate`                    | `42501` "Tidak berwenang membaca agregat" |
| Admin faskes demo, sesi aal2, `facility_aggregate` (90 hari)          | 36 baris (kota-pekan)                      |
| Membuat kunci API: aal2 / aal1                                        | berhasil (dibatalkan) / `42501`            |
| Pengguna demo memesan psikolog demo, Jumat 10.00 WIB                  | `confirmed`, 50 menit, tarif Rp 100.000    |
| Jam di luar kisi (10.30)                                              | `slot_not_offered`                         |
| Pengguna yang sama, psikolog lain, jam yang sama                      | `patient_busy`                             |
| Pengguna demo lain, psikolog dan jam yang sama                        | `slot_taken`                               |
| Penulisan langsung tumpang-tindih (jalur seperti aplikasi Flutter)    | `23P01` (constraint)                       |
| Pengguna lain melihat jam terisi lewat `psychologist_booked_slots`    | ya, hanya waktu dan lama (2 baris)         |
| Anon memanggil `book_consultation`                                    | `42501`                                    |

Dua tes Fase 3 ikut diperbaiki di putaran ini: daftar jalur OpenAPI di `e2e/fase3.spec.ts` kini memuat endpoint baru, dan tes
batas laju mengirim permintaan berkelompok paralel (secara berurutan, server dev yang sibuk bisa membutuhkan lebih dari 60 detik
untuk 61 permintaan sehingga jendela geser sudah melepas yang awal; 429 tidak terjadi, dan itu perilaku yang benar).

### Yang belum ada (jujur)

- ~~Migrasi `…000500` belum diterapkan ke cloud.~~ **Sudah diterapkan dan diverifikasi** (lihat "Verifikasi di cloud"). Yang
  masih belum: halaman web di atasnya belum dijalankan dengan akun sungguhan di peramban.
- **Teman cerita belum pernah memanggil Anthropic sungguhan** (tidak ada kunci di lingkungan ini). Yang teruji: urutan dan
  jalur krisis dengan model tiruan, adaptor dengan klien SDK tiruan, aliran SSE ujung ke ujung lewat rute asli, dan UI
  dengan transport berskrip. Mutu balasan model, latensi, dan perilaku streaming di Vercel belum dicoba.
- **Alur berakun belum saya jalankan** (`e2e/fase4.auth.spec.ts`, dilewati tanpa kredensial): chat krisis dan aman,
  pemesanan, penolakan bentrok, penulisan langsung bertumpuk, pembersihan.
- **Pendaftaran dan verifikasi TOTP untuk admin faskes belum dicoba dengan autentikator sungguhan.** Komponennya sama
  dengan psikolog dan DB-nya diuji, tetapi alur layar belum dijalankan.
- **Penulisan langsung ke `consultations` masih dibuka** oleh policy lama "Users can insert own consultations" (dipakai
  Flutter): pengguna bisa menyisipkan status, tarif, atau jam di luar jadwal, dan bisa "menduduki" banyak slot lewat
  jalur itu (RPC membatasi 3 sesi, jalur langsung tidak). Menutupnya butuh aplikasi Flutter memakai `book_consultation`
  lalu policy insert dicabut; ditunda karena mengubah aplikasi mobile.
- Belum ada: pembayaran, konfirmasi atau penjadwalan ulang oleh psikolog, panggilan video, pengingat, pengelolaan jadwal
  praktik oleh psikolog (jadwal diatur di luar web), ringkasan Teman cerita untuk psikolog (izin `ai_summary` ada, layar
  pembacanya belum), sebaran per usia, dan kapasitas lebih dari satu orang per slot (`max_slots_per_slot` > 1 dianggap 1).
- Ubin peta berasal dari server OpenStreetMap publik: cukup untuk demo, tetapi pemakaian berat sebaiknya memakai penyedia
  ubin sendiri. Batas 20 pesan per jam hanya berlaku lintas instans bila Upstash dikonfigurasi.
- Lighthouse dan uji beban k6 belum dijalankan (Fase 5).

### Perlu tindakan Anda

1. ~~Terapkan migrasi `…000500`.~~ Selesai dan diverifikasi. Dampak ke aplikasi mobile: sesi yang bertumpuk kini ditolak
   database (Flutter menampilkan galat umum); bangun ulang dan uji alur pemesanan di aplikasi mobile bila dipakai di demo.
2. Isi `ANTHROPIC_API_KEY` (dan opsional `ANTHROPIC_MODEL`) di `.env.local` dan di Vercel agar Teman cerita menjawab.
   **Jangan** memakai kunci yang dibundel di aplikasi mobile; putar `CLAUDE_API_KEY` itu (F7).
3. Untuk demo faskes tanpa autentikator: matikan kedua sakelar MFA (README, "MFA psikolog"); atau daftarkan TOTP pada akun
   faskes demo di `/faskes/keamanan`.
4. Siapkan akun pengguna uji untuk `e2e/fase4.auth.spec.ts` (spec ini menulis data; petunjuk di berkasnya).
5. Masih tertunda: aktifkan leaked-password protection; isi Upstash di produksi; kredensial staging SATUSEHAT.

## Fase 5: Bukti dan poles (14 Okt 2026)

Urutan kerja: verifikasi angka I-NAMHS ke sumbernya, landing penuh sesuai `design/landing.html` + `/tentang` +
`/kebijakan-privasi` + `robots`/`sitemap`, audit aksesibilitas lintas rute (axe WCAG 2.2 AA dan jalan-jalan keyboard),
Lighthouse semua halaman utama, uji beban, alat uji pengguna (SUS), CI dan pemeriksa uptime, README untuk juri,
`docs/TESTING.md`. Tidak ada perubahan di folder aplikasi Flutter dan tidak ada migrasi baru.

### 5 keputusan utama

#### 1. Landing: setiap klaim diperiksa terhadap kenyataan, bukan disalin dari mockup

`design/landing.html` adalah mockup; teksnya memuat klaim yang belum benar atau belum bersumber. Perubahan yang disengaja:

- **Angka I-NAMHS** diverifikasi lewat pencarian. "1 dari 3 remaja punya masalah kesehatan mental dalam setahun" cocok
  (survei nasional remaja 10-17 tahun, 2022). "Hanya sekitar 2,6% pernah mendapat bantuan profesional" tidak tepat: ringkasan
  UGM menyebut 2,6% dari remaja dengan masalah kesehatan mental **mengakses layanan** dalam 12 bulan; publikasi jurnal 2025
  yang membandingkan tiga negara melaporkan angka berbeda (4,7% dari yang punya gangguan, 2,2% dari yang subambang)
  karena penyebutnya lain. Landing memakai rumusan UGM ("mengakses layanan bantuan atau konseling"), memuat sumber dengan
  tautan, dan menyebut bahwa angka itu gambaran populasi, bukan diagnosis siapa pun. Kalimat mockup tentang alasan
  ("malu, atau layanannya jauh") tak bersumber dan dibuang; diganti temuan yang bersumber (banyak keluarga memilih
  menangani sendiri atau bersama orang terdekat).
- **Langkah "Tercatat"** di mockup berbunyi hasil skrining "masuk ke rekam kesehatan nasional SATUSEHAT". Itu tidak benar
  selama mode `mock`. Teksnya kini: bisa dikirim atas persetujuan, "di versi demo ini, pengiriman tersebut masih
  berjalan sebagai simulasi". Diagram ekosistem tetap "menunggu persetujuanmu".
- **"Gratis"** di mockup menjadi "Skrining dan jurnalnya gratis": konsultasi punya tarif.
- **"Kalau ada tanda bahaya, mereka langsung tahu"** diberi syarat "dan kamu mengizinkannya" (izin `crisis_alerts`).
- **"Keluarga: hanya mood harian"** pada diagram menjadi "sesuai izinmu" (bawaan memang mood harian, tetapi bisa diubah).
- **Contoh API** memakai alamat dari `NEXT_PUBLIC_SITE_URL` (fungsi baru `siteUrl()` di `lib/env/public.ts`, tidak melempar
  walau variabel Supabase belum diisi) dan bentuk respons yang benar-benar dikembalikan `GET /api/v1/fhir/Observation`
  (Bundle `searchset`), bukan alamat karangan seperti `mindra.vercel.app`. Contoh itu ditandai "dipersingkat".
- Pernyataan statistik dibuat `<h2>` (di mockup `<p>`), sehingga pengguna pembaca layar bisa melompat ke sana, dan bagian
  itu mendapat nama yang sebenarnya.
- Landing tetap **statis** (○ di tabel rute build); penjaga hasil build kini memeriksa `/`, `/tentang`, `/kebijakan-privasi`,
  dan `/developers`, plus `robots.txt` dan `sitemap.xml`.

#### 2. Kebijakan privasi: menggambarkan sistem yang ada, ditandai rancangan, tidak menjanjikan yang belum ada

Teksnya ditulis dari kode dan ARCHITECTURE, bukan templat: data yang disimpan, siapa melihat apa (tiga tabel bernama), layanan
pihak ketiga yang sungguh dipakai (Supabase wilayah Singapura, Vercel, Upstash, Anthropic, OpenStreetMap untuk admin faskes),
kendali pengguna (cabut izin, riwayat akses CSV, matikan SATUSEHAT, hapus catatan jurnal), keamanan, cookie (hanya sesi).
Yang sengaja **tidak** dijanjikan: penghapusan akun (belum ada fitur mandiri; tertulis demikian), kontak resmi (belum ada;
tertulis akan dicantumkan), retensi data (belum ditentukan). Kotak "Rancangan untuk versi demo, belum ditinjau ahli hukum"
tampil di atas. **Syarat penggunaan tidak dibuat**: PLAN tidak menjadwalkannya, naskah hukum tidak pantas dikarang untuk karya
lomba, dan tautan mati di footer dihapus (`MarketingFooter`) alih-alih diarahkan ke halaman kosong. _(Diperbarui: `/syarat-penggunaan` dibuat di Gelombang 1,
dari naskah aplikasi mobile.)_

#### 3. Audit aksesibilitas yang bisa gagal, diukur lebih ketat dari target

`e2e/fase5.spec.ts` menjalankan axe (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, **`wcag22aa`**, `best-practice`) pada semua
27 rute (8 publik dan autentikasi + 19 pratinjau berlogin) di kedua viewport, ditambah audit keyboard: Tab melewati seluruh
halaman, setiap fokus punya cincin, tidak ada `tabindex` positif, tidak ada jebakan. Hasil pertama: 0 pelanggaran, yang justru
patut dicurigai, jadi dibuat **kontrol negatif** (suntik elemen berkontras buruk dan tombol tanpa nama; axe melaporkan
`color-contrast` dan `button-name`). Batasnya ditulis di TESTING.md: tidak ada uji pembaca layar sungguhan.

#### 4. Uji beban: dua alat, dan yang bukan k6 tidak diberi nama k6

k6 tidak terpasang di mesin ini dan memasang biner sistem butuh izin pemilik. Dibuat `load/read-endpoints.js` (k6 asli, untuk
Argy) **dan** `load/node-load.mjs` (tanpa dependensi; profil, bobot, jeda, dan ambang yang sama). Hasil Node ditulis sebagai
"bukan k6, satu mesin, server dan penguji berbagi CPU", bukan sebagai hasil k6. Endpoint yang diuji hanya yang tidak membaca
database (halaman statis, `/api/v1/instruments`, `/api/v1/openapi.json`): proyek Supabase cloud dipakai bersama aplikasi
mobile dan tidak patut dibebani 200 pengguna. Skrip memakai IP acak per permintaan (`x-real-ip`) supaya yang diukur kapasitas
aplikasi, bukan batas laju; tahap terpisah membuktikan batas laju bertahan: satu IP, 200 koneksi paralel, 600 permintaan →
tepat 60 lolos dan 540 ditolak 429.

#### 5. Alat uji pengguna dibuat siap pakai, hasilnya tidak dikarang

Protokol (`docs/UJI-PENGGUNA.md`): persetujuan, akun demo (tak ada data pribadi), tugas per peran, SUS 10 butir dalam bahasa
Indonesia, tiga pertanyaan terbuka, aturan berhenti bila responden tertekan. Alat rekap `pnpm usability:report`: penilai SUS
sebagai fungsi murni (`lib/domain/usability`, dihitung tangan di tes), selang kepercayaan distribusi t, penyelesaian tugas
per peran, butir yang paling menurunkan skor, dan baris cacat yang **ditolak dengan alasan** alih-alih diperbaiki diam-diam.
Templat CSV disediakan dan berkas jawaban responden masuk `.gitignore`. Tidak ada data contoh yang tampak seperti hasil.

### Yang ditangkap oleh pemeriksaan (bahan cerita "kualitas teknis")

| Temuan | Bagaimana tertangkap | Perbaikan |
| ------ | -------------------- | --------- |
| **Pelanggaran CSP di setiap halaman berformulir**: Zod 4 mencoba `Function("")` untuk JIT, CSP tanpa `unsafe-eval` menolaknya (galat tertangkap, tak terlihat pengguna, tetapi tercatat sebagai `securitypolicyviolation`) | Lighthouse: Praktik terbaik 96 di halaman berformulir ("inspector issues"); lalu mendengarkan event `securitypolicyviolation` | `z.config({ jitless: true })` di `instrumentation-client.ts` (dibaca saat skema dibuat, jadi harus sebelum modul skema); tes CSP di `e2e/fase5.spec.ts` (bermakna pada build produksi) |
| Galat konsol "Failed to fetch RSC payload" di pratinjau pada build produksi lewat HTTP | Lighthouse: Praktik terbaik 93; ditelusuri sampai pengalihan 307 ke `/masuk` yang dinaikkan `upgrade-insecure-requests` ke `https://localhost` | Bukan cacat aplikasi (hanya muncul bila build produksi dibuka lewat HTTP). Dibuktikan dengan mengukur ulang lewat proxy HTTPS lokal: galat hilang. Angka di TESTING.md adalah angka lewat HTTPS |
| Nilai t untuk jumlah responden di atas 31 memakai 1,96 (selang terlalu sempit) | Uji mutasi: mengganti 1,96 tidak membuat tes gagal | Tabel nilai t diperluas (df 40, 60, 120, memakai df tabel terdekat di bawahnya); tes batas pada setiap ambang |
| Selang kepercayaan SUS di ujung 0 dan 100, urutan prioritas butir, jawaban terbuka kosong tak diuji | Uji mutasi (4 dari 5 yang lolos pada putaran pertama) | Tes ditambah; mutasi kelima (CRLF dihitung dua baris) setara perilaku karena baris kosong dibuang |
| Tugas psikolog dan pengguna memakai kolom `t1..t6` yang sama; menggabungkan penyelesaiannya akan menyesatkan | Telaah rancangan laporan | Penyelesaian tugas dihitung **per peran** |
| `robots.txt` bisa menyimpang dari daftar portal | Telaah | Daftar ditutup diambil dari `PORTAL_PREFIXES` (satu sumber dengan guard rute); tes memastikan semuanya tercakup |
| Klaim "CAPTCHA (Turnstile) di daftar/masuk" ada di ARCHITECTURE §8 padahal belum dipasang | Telaah dokumen terhadap kode | Baris dikoreksi; masuk daftar "belum ada" |

Uji mutasi Fase 5: 42 perusakan (SUS 18, laporan 7, CSV 8, `siteUrl` 3, robots/sitemap 6). Lima lolos di putaran pertama:
empat celah tes yang ditutup (satu di antaranya menunjukkan kekeliruan kode di atas), satu setara perilaku. Semua perusakan
lain tertangkap.

### Keputusan kecil

- Lighthouse dijalankan lewat `pnpm dlx lighthouse@12.8.2`, bukan dependensi proyek (dependensi besar tidak ditambah tanpa
  bertanya); versi 13.5.0 gagal dimuat di Node 24 (`SyntaxError` pada `lib/cdt/SDK.js`) sehingga versinya dikunci.
- Laporan Lighthouse lengkap (±800 KB per halaman) tidak masuk repositori; ringkasan JSON/Markdown dan tangkapan layar skor
  (`docs/img/lighthouse/`) masuk.
- `pnpm test:e2e` menerima `E2E_PORT` agar suite bisa dijalankan terhadap build produksi yang sudah berjalan.
- `packageManager: pnpm@12.11.2` dipasang di `package.json` supaya CI memakai versi yang sama dengan mesin pengembangan.
- `.github/workflows/ci.yml` (lint, tipe, format, build, tes, e2e) dan `uptime.yml` ditulis sebelum ada repositori; semua
  perintah di dalamnya dijalankan lokal. _(Diperbarui di Gelombang 2: repositori GitHub adalah folder induk, workflow dipindah ke
  akar, dan CI sudah berjalan; lihat bagian Gelombang 2.)_
- Contoh respons FHIR di landing memakai kode LOINC `44261-6` (PHQ-9), yang berasal dari aplikasi Flutter dan **belum
  diverifikasi ulang ke loinc.org** (catatan lama di ARCHITECTURE §6 tetap berlaku).

### Verifikasi (14 Okt 2026)

| Pemeriksaan | Hasil |
| ----------- | ----- |
| `tsc --noEmit`, `eslint --max-warnings=0`, `prettier --check` | bersih |
| Vitest setelah `pnpm build` | 1834 dari 1834 lulus (96 berkas) |
| Playwright, seluruh suite, terhadap build produksi (`E2E_PORT=3200`) | 484 lulus, 56 dilewati (spec berakun), 0 gagal |
| axe WCAG 2.2 AA, 27 rute x 2 viewport | 0 pelanggaran; kontrol negatif mendeteksi pelanggaran yang disuntikkan |
| Lighthouse 12.8.2 (48 pengukuran, lewat proxy HTTPS lokal) | Aksesibilitas 100 di semua; publik P 93-100, BP 100, SEO 100; pratinjau: lihat TESTING.md |
| Uji beban lokal (Node, bukan k6), 200 VU, dua putaran | 25,4 ribu permintaan, 0 galat, p95 ≈ 11 ms; batas laju: 60 lolos dari 600 pada satu IP |
| Uji mutasi Fase 5 | 42 perusakan; semua tertangkap setelah perbaikan, kecuali satu yang setara |

Rincian dan keterbatasannya: [`TESTING.md`](TESTING.md).

### Yang belum ada (jujur)

- **Belum dideploy**: tidak ada demo online, ukuran performa produksi, uptime, atau tangkapan layar monitor.
- **k6 asli belum dijalankan** (skrip siap). Angka beban yang ada dari penguji Node di satu mesin.
- **Uji pengguna belum dilaksanakan**: tidak ada skor SUS. Alat dan protokol siap.
- **Teman cerita belum pernah memanggil Anthropic sungguhan.** **SATUSEHAT hanya simulasi lokal.** **Alur berakun
  (`*.auth.spec.ts`, 56 kasus) belum dijalankan.** **TOTP admin faskes belum dicoba dengan autentikator sungguhan.**
- **CAPTCHA (Turnstile) belum dipasang** (rencana Fase 3/5 tidak terlaksana); perlindungan daftar/masuk bergantung pada
  batas laju Supabase Auth dan batas laju kita. Masuk proyeksi pengembangan.
- **Penghapusan akun mandiri**, **syarat penggunaan**, dan **kontak resmi pengelola data** belum ada. _(Diperbarui: penghapusan
  akun dan syarat penggunaan ada sejak Gelombang 1; kontak resmi masih belum.)_
- **Nomor krisis (119 ext. 8) belum diverifikasi** ke sumber resmi (`lib/domain/crisis/resources.ts`, `verified: false`).
- Belum ada uji pembaca layar sungguhan, perbesaran 200% di perangkat nyata, dan uji dengan pengguna disabilitas.
- Performa `/dev/psikolog` mobile (P 89, bundel 243 kB karena klien Realtime) dan `/dev/faskes-peta` mobile (P 84, ubin peta
  pihak ketiga) di bawah target 90; dicatat di TESTING.md, belum dioptimasi.
- Policy lama Flutter "Users can insert own consultations" masih terbuka (lihat Fase 4); F7 (kunci Flutter) belum diputar.

### Perlu tindakan Anda

1. **Deploy ke Vercel** (repo GitHub + proyek Vercel + variabel lingkungan dari `.env.example`; set `NEXT_PUBLIC_SITE_URL`;
   tambahkan `<url>/auth/callback` ke Redirect URLs Supabase; isi Upstash; `ENABLE_DEV_PAGES` biarkan kosong). Setelah itu:
   isi tautan demo di README, ukur ulang Lighthouse dengan `pnpm lighthouse --base https://<url>`, dan isi `DEMO_URL`
   (variabel repositori) agar `uptime.yml` aktif.
2. **Pasang monitor uptime eksternal** (UptimeRobot, langkah di TESTING.md bagian 5) dan tangkap layarnya setelah beberapa hari.
3. **Jalankan k6**: `winget install k6`, lalu `pnpm load:k6` (lokal) dan terhadap demo; tempelkan p(95) dan galat ke TESTING.md.
4. **Uji pengguna 24-26 Okt**: ikuti `docs/UJI-PENGGUNA.md`, simpan jawaban di `docs/uji-pengguna/respons.csv`, jalankan
   `pnpm usability:report docs/uji-pengguna/respons.csv --out docs/uji-pengguna/hasil.md`, perbaiki tiga masalah teratas.
5. **Verifikasi nomor krisis**, putar kunci Flutter (F7), aktifkan leaked-password protection, isi `ANTHROPIC_API_KEY`,
   tinjau kebijakan privasi (dan cantumkan kontak resmi) sebelum dirilis untuk umum.
6. Setelah deploy, satu kali **uji berakun dari awal ke akhir** (spec `*.auth.spec.ts`) dan satu percakapan Teman cerita
   dengan kunci asli (termasuk jalur krisis).

## Gelombang 1: sebelum deploy (14 Okt 2026)

Latar: setelah Fase 5, telaah kesenjangan web dan aplikasi mobile (Flutter) menemukan hal-hal yang harus ada sebelum
deploy: pengguna tidak punya tempat mengubah profil, menghapus akun, atau mengambil datanya; kota dihitung dalam angka
wilayah tanpa persetujuan; akun psikolog yang mendaftar tidak punya jalan resmi untuk disetujui; syarat penggunaan tidak
ada dan pendaftaran tidak meminta persetujuan; dan pemesanan konsultasi di aplikasi Flutter memakai tabel yang tidak ada.
Pemilik proyek memutuskan (14 Okt): (1) statistik wilayah **opt-in**, (2) bangun halaman admin minimal, (3) boleh mengubah
semua folder bila perlu (tercatat di sini; `flutter analyze` dan `flutter test` tetap hijau), (4) Gelombang 1 dahulu, lalu deploy.
Satu migrasi baru: `20261014000600_region_optin_admin_review.sql` (belum diterapkan di cloud).

### 6 keputusan utama

#### 1. Statistik wilayah opt-in, dijaga di database (bukan hanya di formulir)

`profiles.share_region_stats boolean not null default false`. Pengguna menyalakannya di Profil dengan penjelasan: apa yang
dibagikan (kota dan provinsi, tanpa nama), kepada siapa (puskesmas, dinas, mitra di provinsinya), syarat angka tampil
(kelompok minimal 10 orang), dan bahwa ia bisa mati kapan saja. Tiga lapis: (1) skema Zod menolak "ikut" tanpa kota
dan provinsi dengan pesan di kolom masing-masing; (2) trigger `trg_profiles_region_stats` membuat persetujuan otomatis `false`
bila kota atau provinsi kosong, sehingga aplikasi Flutter atau klien lain tidak bisa menyisakan persetujuan tanpa wilayah;
(3) `facility_aggregate()` hanya menghitung pengguna yang setuju **dan** berkota. Ambang k ≥ 10 dan lingkup provinsi
tidak diubah. Data demo dan sintetis diberi persetujuan lewat backfill (hanya `is_demo`) dan lewat seed, supaya dashboard
faskes tetap berisi; pengguna nyata tidak tersentuh. Alternatif yang ditolak: opt-out (kota adalah data pribadi, tujuan
angka wilayah berbeda dari tujuan pengguna mengisinya, dan UU PDP menuntut dasar pemrosesan yang jelas).
Daftar provinsi (38) ada di satu tempat (`lib/domain/region/provinces.ts`) dengan penulisan yang sama dengan data faskes dan
seed ("DKI Jakarta", "DI Yogyakarta"); Flutter memiliki salinan yang dijaga tes kesetaraan (membaca berkas TypeScript itu).

#### 2. Persetujuan akun psikolog di database dalam satu transaksi, bukan service role di Next.js

Dua rancangan dipertimbangkan. **A.** Server Action memakai service role: sederhana, tetapi kunci sakti hidup di aplikasi web,
tiga langkah (naikkan peran, buat baris direktori, buat jadwal) bisa berhenti di tengah, dan kunci itu melompati RLS sehingga
semua kesalahan menjadi fatal. **B (dipilih).** Fungsi `admin_review_psychologist(...)` (`security definer`, `search_path = ''`)
memeriksa admin dan aal2 sendiri, memvalidasi masukan, lalu dalam satu transaksi: menaikkan peran, mengosongkan
`requested_role`, menambah baris `psychologists` (dengan `profile_id`), jadwal, dan baris `admin_actions`. Konsekuensi yang
harus dipecahkan: trigger penjaga kolom istimewa (`protect_profile_privileged_columns`) menolak ubah peran dari sesi
`authenticated`, dan fungsi definer dijalankan atas nama pemilik fungsi tetapi `auth.role()` tetap `authenticated`. Pemecahan:
"pintu peninjauan", variabel transaksi `app.profile_review = 'on'` yang hanya dihargai bila `current_user` bukan
`authenticated` atau `anon`. Pengguna biasa bisa saja memanggil `set_config('app.profile_review','on', true)` tetapi tidak
berpengaruh, karena `current_user`-nya tetap `authenticated`. Uji yang menjaga ini: (a) fungsi definer biasa yang
mencoba menaikkan peran tetap ditolak 42501; (b) penanda tidak menempel setelah keputusan; (c) peran selain `user` tidak bisa
diputuskan (`not_pending`); (d) aal1 dan non-admin ditolak 42501 untuk antrean maupun keputusan; (e) kegagalan di tengah
(spesialisasi tak valid) tidak meninggalkan perubahan setengah jadi. Halaman `/admin/verifikasi` hanya menggambar antrean
dan mengirim keputusan; admin memeriksa nomor STR sendiri (tidak ada verifikasi otomatis, tertulis di dokumen).

#### 3. Hapus akun: fungsi database + pemeriksaan sandi ulang, hanya untuk peran user

`delete_my_account()` menghapus baris `auth.users` pemanggil; tabel data pengguna ikut terhapus lewat `ON DELETE CASCADE`.
Dibatasi ke peran `user`: `api_clients.owner_id` dan `crisis_alerts.acknowledged_by` NO ACTION (akan menggagalkan hapus
untuk admin faskes dan psikolog), dan `psychologists.profile_id` SET NULL meninggalkan baris direktori yatim; menghapus akun
peran lain butuh keputusan pengelola. Di web: kata penegas HAPUS diketik sendiri, lalu kata sandi diperiksa ULANG lewat klien
Supabase terpisah tanpa cookie (sesi berjalan tidak tersentuh, sesi yang dicuri saja tidak cukup), lalu fungsi dipanggil,
lalu keluar dan arahkan ke `/masuk?galat=akun_dihapus`. Kata sandi tidak pernah dikembalikan ke formulir.

#### 4. Unduh data sebagai JSON, bagian yang gagal dicantumkan

`/profil/unduh` (rute tanpa ekstensi agar lolos middleware, `force-dynamic`) membaca 17 bagian milik pengguna lewat klien
bersesi (RLS menjaga), ditambah riwayat akses (`my_access_log`). Kolom yang bukan data pengguna dibuang: `nik_encrypted`,
`agora_token`, `agora_channel_name`, `invite_code`. Bagian yang gagal dibaca (mis. tabel tidak ada di proyek ini) masuk
`bagian_dilewati` alih-alih menggagalkan seluruh unduhan atau hilang diam-diam; bagian yang mencapai 5.000 baris ditandai
`bagian_terpotong`. Tes memastikan setiap tabel dan kolom pemilik di `EXPORT_SECTIONS` ada di `database.types.ts`.

#### 5. Naskah hukum satu sumber untuk web dan Flutter, versi dicatat saat mendaftar

Aplikasi Flutter sudah memiliki `docs/terms_of_service.md` dan `docs/privacy_policy.md` (v1.0.0). Naskah itu dijadikan dasar
(bukan dikarang baru), diperbarui ke **v1.1.0** (14 Okt 2026) untuk mencakup web, statistik wilayah (bagian 10), penghapusan
dan unduh data, pemroses (Supabase, Vercel, Upstash, Anthropic), akses psikolog berbasis izin, dan admin. Web
(`/syarat-penggunaan`, `/kebijakan-privasi`) dan Flutter memakai versi yang sama. Pendaftaran di kedua klien meminta
pernyataan berusia 17+ dan persetujuan secara aktif (kotak centang, bukan teks pasif), dan menyimpan `terms_version` dan
`terms_accepted_at` di metadata akun. Alamat kontak di naskah Flutter (privasi@mindra.app, dukungan@mindra.app) **tidak
dicantumkan di web** karena belum dikonfirmasi pemilik. Ini tetap naskah rancangan yang belum ditinjau ahli hukum.

#### 6. Perbaikan Flutter berdasarkan kenyataan database, bukan asumsi

Dibaca-saja terhadap proyek cloud: tabel `psychologist_slots`, `mental_health_facilities`, `crisis_resources`, dan
`crisis_access_logs` **tidak ada**. Akibatnya pemesanan konsultasi di Flutter tidak mungkin berhasil. Diubah: daftar slot dari
`psychologist_available_slots` dan pemesanan dari `book_consultation` (aturan sama dengan web; kesetaraan dengan kode slot
TypeScript diuji di `consultation-parity.test.ts`), dengan pemetaan token galat database ke kalimat Indonesia
(`booking_rpc.dart`, 11 tes). Label "119 ext 8" diperbaiki menjadi **SEJIWA (Kemenkes)** di seluruh aplikasi. Profil: layar
edit sungguhan (nama, kota, provinsi, opt-in statistik) dan hapus akun lewat fungsi yang sama dengan web. Pembacaan faskes
dan sumber krisis ke tabel yang tidak ada **dibiarkan** (jatuh ke data lokal; tidak merusak aplikasi).

### Perubahan di folder induk (aplikasi Flutter), sesuai izin 14 Okt

| Berkas | Perubahan |
| ------ | --------- |
| `lib/features/telemedicine/data/booking_rpc.dart` (baru), `telemedicine_remote_datasource.dart`, repositori dan provider terkait | Slot dan pemesanan lewat fungsi database; `time_slot_model.dart` dihapus |
| `lib/features/profile/**` | Entitas dan model memuat provinsi dan persetujuan statistik; `region.dart` (38 provinsi, validator); layar edit; dialog Hapus Akun |
| `lib/features/auth/**`, `lib/core/constants/legal.dart` (baru) | Kotak centang usia dan persetujuan; versi naskah dicatat |
| `lib/features/crisis/**`, `assessment_provider.dart` | Label SEJIWA (Kemenkes); `logCrisisAccess` yang tidak dipakai dihapus |
| `docs/terms_of_service.md`, `docs/privacy_policy.md`, `CHANGELOG.md` | v1.1.0 |
| `test/features/telemedicine/booking_rpc_test.dart` (baru), `test/features/profile/region_test.dart` (baru) | 28 tes baru (109 menjadi 137) |

**Kekeliruan yang dicatat:** satu kali `dart format` dijalankan pada direktori (bukan berkas) sehingga ±18 berkas yang tidak
terkait ikut diformat ulang dan memunculkan lint `curly_braces_in_flow_control_structures` di dua berkas. Lint diperbaiki
(kurung kurawal ditambahkan di `register_screen.dart` dan `emergency_contacts_screen.dart`); format ulang berkas lain adalah
perubahan kosmetik tanpa efek perilaku dan dibiarkan. `flutter analyze`: 0 galat, 0 peringatan, 115 info (sama dengan sebelum
Gelombang 1); `flutter test`: 137 lulus.

### Yang ditangkap oleh pemeriksaan (bahan cerita "kualitas teknis")

| Temuan | Bagaimana tertangkap | Perbaikan |
| ------ | -------------------- | --------- |
| Setelah galat validasi, **semua isian persetujuan admin hilang** (nama, STR, tarif, hari, jam) | e2e gagal: kolom kosong setelah kirim | React 19 mengosongkan kolom tak-terkendali setelah aksi formulir; aksi kini mengembalikan `values` (hari sebagai "1,3,5") dan formulir memakainya sebagai `defaultValue` |
| `buttonVariants` dari modul `'use client'` tidak bisa dipanggil dari Server Component | Build/tes halaman Profil | Dipindah ke `components/ui/button-variants.ts` |
| Tes DB yang membaca sebagai sesi ber-RLS mengembalikan 0 baris dan "lulus" tanpa membuktikan apa pun | Telaah tes + uji mutasi | Pembacaan verifikasi memakai pemilik (`reset role`) atau sesi yang sama; kasus uji menambah baris awal |
| `withSession` selalu di-rollback sehingga tes dua sesi berurutan tidak bermakna | Telaah tes | Pembaruan dan pembacaan dalam satu sesi |
| Tes hapus akun tidak membuktikan akun **orang lain** utuh (mutan `delete from auth.users where true` lolos) | Uji mutasi SQL | Tes menghitung akun lain sebelum dan sesudah, dalam satu transaksi |
| Jejak `admin_actions` bisa dibuka semua orang (mutan `using (true)` lolos) | Uji mutasi SQL | Baris jejak disemai lewat pemilik; pengguna biasa, psikolog, dan admin aal1 harus melihat 0 baris |
| Slot kurang dari 1 jam dan psikolog tak aktif tidak diuji | Uji mutasi SQL | Dua tes baru; tes batas 1 jam tidak bergantung jam berjalan (jadwal sehari penuh) |
| Pemohon berperan non-user yang masih menyimpan `requested_role` bisa diputuskan | Uji mutasi SQL | Fungsi dikunci ke `role = 'user'`; tes psikolog dengan permintaan lama harus `not_pending` |
| Sembilan celah tes pada logika web: batas kota dan tarif hanya diuji lewat konstanta yang ikut berubah, jam 24:00 diterima, pesan tarif 8 digit, kotak "terverifikasi", batas 5000 baris ekspor, daftar 17 bagian ekspor, opsi klien pemeriksa sandi (`persistSession: false`), isian formulir admin hilang saat galat database | Uji mutasi web (9 dari 84 lolos pada putaran pertama) | Tes dengan angka literal, tes batas (4999 / 5000, 24:00, 12345678), tes pesan, tes opsi klien, dan tes isian pada galat database |

### Uji mutasi Gelombang 1

- **Migrasi SQL: 33 perusakan.** Putaran pertama 25 tertangkap, 8 lolos; setelah tes ditambah, 32 tertangkap dan satu **setara
  perilaku**: G06 (pengisian otomatis tak memeriksa kota) tidak mengubah hasil karena trigger `trg_profiles_region_stats`
  dibuat sebelum backfill dan sudah mematikan persetujuan bila kota kosong. Pemeriksaan di backfill dipertahankan sebagai
  lapis kedua yang disengaja.
- **Logika web: 84 perusakan** (validasi profil 18, provinsi 5, peninjauan admin 18, ekspor data 13, aksi profil 17, aksi admin
  13). Putaran pertama 75 tertangkap, 9 lolos (semuanya celah tes, tidak ada yang setara perilaku); setelah tes ditambah,
  semua tertangkap.

### Keputusan kecil

- Ukuran teks tersimpan di `profiles.font_size_preference` (kolom sudah ada dari Flutter, nilai CHECK sama) dan diterapkan
  lewat `html[data-font-size]` oleh layout; tidak ada kolom baru.
- Daftar kota yang dikenal (`getKnownCities`) membantu pengisian tetapi nama kota tetap masukan bebas yang divalidasi
  (huruf, angka, spasi, dan `. ' , ( ) / -`), karena kota di luar data demo harus tetap bisa ditulis.
- Navigasi: pengguna mendapat "Akun > Profil" di bilah samping dan "Saya" di bilah bawah; admin mendapat navigasi sendiri.
  Akun yang sudah meminta peran psikolog melihat pemberitahuan "menunggu peninjauan" di beranda.
- `/admin` dan `/dev/admin`, `/profil` dan `/dev/profil` dimasukkan ke penjaga hasil build (dinamis, tidak boleh statis),
  daftar rute e2e, dan Lighthouse.
- Akun demo bertambah dua: `admin@demo.mindra.test` (peran admin) dan `calon.psikolog@demo.mindra.test` (`requested_role =
  psychologist`). Seed **belum dijalankan ulang** terhadap cloud karena butuh migrasi `…000600` lebih dahulu.
- `database.types.ts` diperbarui **dengan tangan** (kolom, tabel, dan tiga fungsi baru); `pnpm db:types` butuh token yang
  belum ada di mesin ini. Regenerasi setelah migrasi diterapkan akan menghapus selisih bila ada.

### Yang belum ada (jujur)

- **Migrasi `…000600` belum diterapkan di cloud**; semua pengujiannya memakai Postgres tiruan (PGlite). Setelah ditempel:
  verifikasi terhadap cloud (simulasi JWT yang di-rollback), `pnpm seed --yes`, dan bangun ulang aplikasi Flutter.
- **Flutter belum dijalankan di perangkat** terhadap fungsi baru; yang diuji adalah pemetaan, logika, dan analisis statis.
- **Belum ada kontak resmi pengelola data** di naskah hukum web, dan naskah belum ditinjau ahli hukum.
- **Nomor krisis belum diverifikasi** (SEJIWA 119 ext. 8 sudah diberi label benar; "Yayasan Pulih (021) 788-42580" dan
  "Hotline Kemenkes 1500-454" di data bawaan Flutter belum diperiksa). Perlu Argy.
- **Policy "Users can insert own consultations" belum dicabut** (menunggu build Flutter baru tersebar).
- **Hapus akun hanya untuk peran `user`**; peran lain lewat pengelola. **STR tidak diverifikasi otomatis.**
- **Rencana berikutnya (belum dikerjakan):** Gelombang 2 (deploy, Upstash, kunci Anthropic baru, SMTP dan templat email
  Indonesia, Flutter memakai endpoint AI web, putar kunci F7, uji berakun), Gelombang 3 opsional (`/bantuan`, faskes
  terdekat untuk pengguna, pembaca `ai_summary` untuk psikolog, onboarding).

### Perlu tindakan Anda

1. **Tempel `supabase/migrations/20261014000600_region_optin_admin_review.sql`** di Supabase SQL Editor (seluruh isi berkas,
   satu kali; idempotent). Beri tahu saya; saya verifikasi di cloud, jalankan ulang seed, lalu lanjut ke deploy.
2. **Konfirmasi alamat kontak** pengelola data (privasi@ dan dukungan@ di naskah Flutter) agar bisa dicantumkan di web.
3. **Verifikasi nomor krisis** (terutama dua nomor di data bawaan Flutter) sebelum dirilis untuk umum.
4. Putar kunci Flutter (F7), aktifkan leaked-password protection, siapkan SMTP dan templat email (Gelombang 2).

### Verifikasi (14 Okt 2026)

| Pemeriksaan | Hasil |
| ----------- | ----- |
| `tsc --noEmit`, `eslint --max-warnings=0`, `prettier --check` | bersih |
| Vitest setelah `pnpm build` | 2030 dari 2030 lulus (103 berkas) |
| Playwright, seluruh suite, terhadap build produksi (`E2E_PORT=3200`) | 552 lulus, 56 dilewati (spec berakun), 0 gagal (satu spec lama, jumlah tautan sidebar, disesuaikan karena menu Profil ditambah) |
| axe WCAG 2.2 AA | 30 rute x 2 viewport + dialog terbuka: 0 pelanggaran |
| Uji mutasi SQL (migrasi `…000600`) | 33 perusakan; 32 tertangkap, 1 setara perilaku (G06) |
| Uji mutasi logika web | 84 perusakan; semua tertangkap setelah 9 celah tes ditutup |
| `flutter analyze` | 0 galat, 0 peringatan, 115 info (sama dengan sebelum Gelombang 1) |
| `flutter test` | 137 lulus (109 sebelum Gelombang 1) |

Rincian dan keterbatasannya: [`TESTING.md`](TESTING.md).

## Gelombang 2: persiapan deploy (14 Okt 2026)

Urutan kerja: verifikasi migrasi `…000600` di cloud setelah pemilik menempelkannya, akun demo tambahan, Teman cerita di aplikasi
mobile lewat web (menutup F7 di sisi kode), repositori GitHub dan CI, panduan deploy, templat email Indonesia. Yang
membutuhkan akun layanan pemilik (Vercel, Upstash, Anthropic, SMTP) **belum dikerjakan** dan dijelaskan di
[`DEPLOY.md`](DEPLOY.md).

### 5 keputusan utama

#### 1. Migrasi diverifikasi terhadap cloud dengan transaksi yang selalu di-rollback

Setelah pemilik menempelkan `…000600`, pemeriksaan dilakukan lewat katalog (hanya baca) dan sesi simulasi (`set local role
authenticated` + klaim JWT) di dalam `begin … rollback`:

| Pemeriksaan | Hasil di cloud |
| ----------- | -------------- |
| Kolom `share_region_stats`, bawaan, trigger | ada; bawaan `false`; `trg_profiles_region_stats` aktif |
| Enam fungsi baru | semua `security definer` dengan `search_path = ""`; `anon` dan `public` tidak boleh menjalankan, `authenticated` boleh |
| `admin_actions` | RLS aktif, satu policy baca; hak tulis `authenticated` tercabut (tersisa `SELECT`, `REFERENCES`, `TRIGGER` bawaan Supabase, sama dengan tabel lain, tidak terjangkau lewat PostgREST) |
| Data | 304 akun demo ikut statistik (backfill) dan satu akun non-demo tidak |
| `psychologist_available_slots` (pengguna biasa) | 70 slot untuk 14 hari; slot pertama 15 Okt 09.00 WIB |
| `admin_pending_psychologists` oleh pengguna biasa | ditolak 42501 |
| Mencoba `set_config('app.profile_review','on')` lalu `update … set role = 'admin'` dari sesi pengguna | ditolak 42501 (pintu hanya terbuka bagi fungsi definer) |
| `admin_actions` dibaca pengguna biasa | 0 baris |
| `facility_aggregate` oleh admin faskes aal2 | berjalan (Kota Bandung 48 pengguna); dengan 48 persetujuan Bandung dimatikan di transaksi, kota itu **hilang** dari hasil (27 baris tersisa); setelah rollback 48 persetujuan utuh |
| `admin_review_psychologist` oleh admin aal2 untuk calon psikolog | satu transaksi: peran `psychologist`, `requested_role` kosong, 1 baris direktori, 3 jadwal, 1 jejak; setelah rollback calon tetap menunggu |

#### 2. Akun demo tambahan tanpa mengulang seluruh seed

`pnpm seed` menolak berjalan bila data demo ada, dan `--reset` menghapus 304 akun demo lalu membuat ulang dengan id baru
(termasuk faktor TOTP bila sudah dipasang di akun demo). Ditambahkan mode `--add-accounts`: membaca profil menurut email dan
hanya membuat akun demo yang belum ada. Aditif dan idempoten (menjalankannya dua kali tidak membuat apa-apa). Dipakai untuk
`admin@demo.mindra.test` dan `calon.psikolog@demo.mindra.test`; keduanya diperiksa di cloud (peran, `requested_role`,
persetujuan statistik).

#### 3. Teman cerita di Flutter: server memegang alur, aplikasi hanya menampilkan peristiwa

Sebelumnya aplikasi mobile memanggil Anthropic langsung dengan kunci yang dibundel (F7), memegang perintah sistem sendiri,
dan menyimpan percakapan sendiri. Kini: `CompanionApiService` memanggil `POST /api/v1/companion/chat` dengan token sesi
Supabase; server (yang sudah ada dan teruji) mendeteksi krisis berbasis aturan SEBELUM model, menjawab krisis dengan balasan
tetap, menyimpan percakapan, membuat peringatan krisis, dan menegakkan batas 20 pesan per jam. Bentuk simpanan percakapan
sudah sama dengan Flutter (`ChatMessageModel.toJson`), jadi riwayat lama tetap terbaca.

- **Peristiwa sebagai tipe tertutup** (`sealed class CompanionEvent`: `Meta`, `Delta`, `Crisis`, `Done`, `StreamError`) di lapisan
  domain, dan pembaca SSE (`parseCompanionSse`) di lapisan data. Pembaca tahan terhadap potongan yang terbelah di mana saja,
  CRLF, komentar, peristiwa dan kolom tak dikenal, dan data bukan JSON (diabaikan, tidak menjatuhkan aliran). `done` hanya
  dianggap tersimpan bila `saved == true`; nilai hilang atau aneh dianggap belum tersimpan (tidak menebak).
- **Deteksi krisis lokal dipertahankan** hanya untuk satu hal: lapisan bantuan muncul seketika, sebelum jaringan menjawab.
  Keputusan resminya ada di server; bila server memutuskan krisis (peristiwa `crisis`), balasan tetapnya yang ditampilkan dan
  lapisan bantuan dinyalakan walau deteksi lokal tidak menangkapnya.
- **Galat**: jawaban HTTP bukan 200 dibaca dari amplop `{ data, error }` (pesan server berbahasa Indonesia dan tanpa isi pesan
  pengguna dipakai bila ada; bila tidak, pesan bawaan; badan bukan JSON tidak pernah dibocorkan ke layar). Peristiwa `error`
  di tengah aliran menjadi pengecualian yang sama. Kode `not_found`, `conversation_corrupt`, `conversation_full` membuat pesan
  berikutnya memulai percakapan baru.
- **Perubahan perilaku yang disengaja**: perintah sistem kini satu sumber di server (tanpa emoji, sapaan "kamu", pengingat AI
  tiap 5 pesan), menggantikan perintah sistem lama di Dart yang memakai emoji.
- **Konsekuensi**: tanpa web yang dideploy dan `WEB_API_BASE_URL` terisi, Teman cerita di mobile dinonaktifkan dengan pesan
  yang jelas, bukan gagal diam-diam. 23 tes baru (pembaca SSE, layanan dengan klien HTTP tiruan, pemetaan galat); total
  Flutter 160 lulus, analisis tetap 0 galat, 0 peringatan, 115 info.

#### 4. F7: kunci dihapus dari kode, `.env` lokal, dan templat

`claude_api_service.dart` dan `AppConstants.claudeApiKey` dihapus; baris `CLAUDE_API_KEY` dihapus dari `.env` lokal
(nilainya tidak pernah dibaca atau dicetak); `.env.example` baru (tanpa kunci apa pun) ikut repositori. **Kunci lama masih
berlaku di Anthropic dan APK lama masih memuatnya**: hanya pemilik yang bisa mencabutnya (console.anthropic.com). Ini satu-satunya
bagian F7 yang tersisa.

#### 5. Satu repositori (monorepo) `Argy1/Mindra`, dengan CI dan README akar

Folder induk (Flutter + `supabase/`) dan `web/` adalah satu cerita dan berbagi migrasi, jadi satu repositori dengan Vercel
Root Directory = `web`. Konsekuensinya: `.github/` dipindah dari `web/` ke akar (CI web memakai `working-directory: web`;
ditambah job Flutter yang memakai `.env.example` sebagai `.env`), README lama di akar (sistem desain) dipindah ke
`docs/design-system.md` dan README akar baru memperkenalkan proyek (`SKILL.md` diperbarui agar menunjuk ke sana). Repositori
dimulai **tanpa riwayat lama**, jadi tidak ada rahasia yang tersisa di riwayat; pemindaian pola rahasia atas seluruh pohon
dilakukan sebelum commit pertama. **CI putaran pertama** (commit `57a8d8b`): job web dan e2e + axe hijau di Ubuntu, job Flutter
gagal. Penyebabnya `flutter analyze` memberi peringatan `asset_directory_does_not_exist`: `pubspec.yaml` mendaftarkan
`assets/lottie/`, folder itu kosong, dan git tidak melacak folder kosong, jadi hanya klon bersih yang gagal (mesin pengembangan
tidak). Ditemukan dengan mereproduksi klon bersih dari GitHub secara lokal, diperbaiki dengan `assets/lottie/.gitkeep`
(commit `4751e0d`); **putaran kedua hijau seluruhnya** ([https://github.com/Argy1/Mindra/actions/runs/38585195586](https://github.com/Argy1/Mindra/actions/runs/38585195586)).

### Keputusan kecil

- `playwright.config.ts` menerima `E2E_BASE_URL` (tanpa menjalankan server) untuk spec berakun terhadap situs yang sudah
  dideploy. Spec yang memakai pratinjau `/dev/*` tidak bisa terhadap produksi (404 disengaja).
- `e2e/gelombang1.auth.spec.ts`: profil (simpan, persetujuan, ukuran teks, unduh data) dan hapus akun dengan akun sekali pakai.
  Dilewati tanpa kredensial dan **belum dijalankan** (menulis data ke cloud dan butuh akun uji khusus). Portal admin tidak
  dicakup (butuh TOTP); dibuktikan lewat tes basis data dan pemeriksaan cloud di atas.
- Templat email (`docs/email-templates/`): konfirmasi pendaftaran, atur ulang sandi, ganti email; tabel HTML dengan gaya
  sebaris, sapaan "kamu", tanpa tanda seru dan emoji, dan SEJIWA (119 ext. 8) di email pendaftaran. **Belum dipasang di Supabase**
  (dilakukan pemilik di Dashboard; langkahnya di `DEPLOY.md`).
- Tidak ada rahasia yang dimasukkan ke layanan mana pun oleh asisten: variabel Vercel, kunci Anthropic, token Upstash, dan kata
  sandi SMTP dipasang pemilik langsung di dasbor masing-masing.

### Verifikasi (14 Okt 2026)

| Pemeriksaan | Hasil |
| ----------- | ----- |
| `tsc --noEmit`, `eslint --max-warnings=0`, `prettier --check` (web) | bersih |
| Vitest (web) | lulus setelah `pnpm build` (angka di `TESTING.md`) |
| `flutter analyze` | 0 galat, 0 peringatan, 115 info (sama dengan sebelumnya) |
| `flutter test` | 160 lulus (137 sebelum Gelombang 2) |
| Migrasi `…000600` di cloud | tabel di atas |
| CI GitHub Actions (web, e2e + axe, Flutter) di Ubuntu | hijau pada putaran kedua ([https://github.com/Argy1/Mindra/actions/runs/38585195586](https://github.com/Argy1/Mindra/actions/runs/38585195586)); putaran pertama menemukan satu cacat konfigurasi Flutter, lihat keputusan 5 |

### Yang belum ada (jujur)

- **Belum dideploy.** Vercel, Upstash, kunci Anthropic baru, dan SMTP butuh akun pemilik ([`DEPLOY.md`](DEPLOY.md)).
- **Kunci Anthropic lama belum dicabut** (F7 tinggal ini).
- **Teman cerita di mobile belum dicoba di perangkat** dan belum pernah memanggil model sungguhan (web juga belum); yang diuji
  adalah pembaca SSE, layanan dengan klien tiruan, dan server yang sudah ada.
- Spec berakun Gelombang 1 belum dijalankan; templat email belum dipasang.
- Lighthouse belum mengukur `/profil`, `/admin/*`, `/syarat-penggunaan`; ukur ulang terhadap URL demo setelah deploy.

### Perlu tindakan Anda

Urutan di [`DEPLOY.md`](DEPLOY.md): akun Vercel dan impor repositori (Root Directory `web`), variabel lingkungan, Redirect URLs
Supabase, Upstash, kunci Anthropic baru lalu **cabut yang lama**, SMTP dan templat email, isi `WEB_API_BASE_URL` di aplikasi
mobile, pasang TOTP pada akun demo psikolog, admin faskes, dan admin, lalu ukur ulang bukti terhadap URL demo.

## Gelombang 3: bantuan, layanan terdekat, panduan awal, ringkasan Teman cerita (14 Okt 2026)

Hasil dari saran Gelombang 3 yang disetujui pemilik ("kalau bisa lanjut"). Empat hal yang semuanya menjawab kebutuhan pengguna
(bobot 20%) dan keselamatan: bantuan yang bisa dibuka siapa saja saat panik, menemukan layanan di dekatnya tanpa menyerahkan
lokasi, panduan awal agar pengguna baru tidak tersesat, dan psikolog yang bisa melihat apakah kliennya memakai Teman cerita
(tanpa membaca isi curhatnya). Satu migrasi baru: `20261014000700_companion_activity_summary.sql` (belum diterapkan di cloud).

### 4 keputusan utama

#### 1. `/bantuan`: halaman publik statis, latihan yang berjalan sepenuhnya di perangkat

Bantuan krisis tidak boleh menuntut masuk akun, jadi halamannya publik, statis (○ di tabel rute, bisa dari CDN), tanpa cookie
dan tanpa kolom isian. e2e membuktikan: tidak ada cookie, tidak ada `localStorage` atau `sessionStorage`, tidak ada
`input/textarea/select/form` di dalam `<main>`. Isinya: kontak krisis dari sumber tunggal (`lib/domain/crisis/resources.ts`,
kini SEJIWA 119 ext. 8 dan **112**, keduanya `verified: false` sampai Argy memeriksanya), napas terpandu, grounding 5-4-3-2-1,
jalan ke Teman cerita, psikolog, dan layanan terdekat, serta panduan menemani orang lain (dengarkan, tanyakan langsung, tetap
bersama, jauhkan benda berbahaya, bantu menghubungi bantuan, jaga dirimu).

- **Napas 4-4-6, 5 siklus.** `breathPosition(waktuBerlalu)` fungsi murni: posisi dihitung dari selisih waktu (`Date.now()`),
  bukan dari hitungan tik pewaktu, sehingga tab yang tertahan di latar belakang tidak membuat latihan melenceng.
  Batas fase diuji tepat (3999 ms tarik, 4000 ms tahan; 70.000 ms = selesai).
- **Pembaca layar.** Hanya pergantian fase yang diumumkan ("Tarik napas. Siklus 1 dari 5."), bukan tiap detik; hitungan mundur
  `aria-hidden`. Diuji: dalam 12 detik hanya 3 teks pengumuman berbeda.
- **Gerak dikurangi.** Lingkaran napas bertransisi `transform` selama durasi fase; di bawah `prefers-reduced-motion` aturan
  global CSS meniadakan transisi, dan petunjuk teks (label fase dan hitungan) tetap lengkap. e2e memeriksa durasi transisi
  terhitung < 0,01 detik.
- **Nomor 112 ditambahkan ke sumber tunggal** dan otomatis tampil di dialog "Butuh bantuan sekarang" (yang kini juga menautkan
  `/bantuan` dan `/layanan-terdekat`). Deskripsinya membedakan: SEJIWA untuk bicara dengan konselor, 112 untuk bahaya yang sedang
  terjadi; IGD terdekat disebut sebagai cadangan karena cakupan 112 bisa berbeda antar-daerah.

#### 2. `/layanan-terdekat`: direktori publik, lokasi tidak pernah meninggalkan perangkat

RLS `Facilities are public` memang dibuat untuk pengunjung ("halaman faskes terdekat juga untuk pengguna", migrasi pertama),
jadi halaman ini publik. Server hanya membaca kolom yang tampil (`id, name, type, city, province, address, phone, lat, lng`,
dibatasi 1000 baris, hanya `has_mental_health_service`); semua penyaringan dan pengurutan terjadi di peramban.
Jarak memakai haversine (garis lurus, bukan rute; ditulis "garis lurus" di tampilan). Tombol "Urutkan dari lokasiku" memakai
Geolocation API dengan `enableHighAccuracy: false`; **koordinat pengguna tidak dikirim ke mana pun**. e2e merekam semua
permintaan jaringan setelah lokasi diizinkan dan memastikan tidak ada yang memuat koordinat; tautan "Lihat di peta" (OpenStreetMap)
hanya memuat koordinat faskes. Penolakan izin, galat lokasi, waktu habis, dan peramban tanpa dukungan masing-masing punya pesan
yang jelas dan daftar tetap bisa dipakai lewat provinsi dan pencarian.

- **Direktori dinyatakan contoh.** Data faskes bawaan berasal dari seed sintetis (nama dan koordinat karangan). Konstanta
  `FACILITY_DIRECTORY_VERIFIED = false` menampilkan catatan "Daftar ini masih contoh" yang mengarahkan ke SEJIWA dan IGD; ubah ke
  `true` hanya setelah data sungguhan dimuat dan diperiksa manusia (pola yang sama dengan `verified` pada kontak krisis).
- **Kegagalan memuat tidak berupa daftar kosong.** Galat database, lingkungan belum diisi, atau pengecualian menghasilkan
  `ok: false` dan tampilan peringatan yang menyebut SEJIWA, bukan "tidak ada layanan" yang menyesatkan.

#### 3. Panduan awal: penanda di metadata akun, tanpa migrasi

Tiga langkah opsional di Beranda (kenali perasaan, pegang kendali atas data, tahu ke mana mencari bantuan) dengan satu tombol
"Sembunyikan panduan ini". Penandanya `onboarding_done_at` di `user_metadata` akun (`auth.updateUser`), bukan di perangkat, jadi
tidak muncul lagi di perangkat lain, dan tidak butuh migrasi. Aksi membaca metadata yang ada lalu menggabungkannya (nama dan versi
syarat yang disetujui tidak hilang, apa pun perilaku server Auth), hanya untuk peran `user`, dan galatnya ditampilkan tanpa
menyembunyikan panduan. Status dibawa oleh `getSessionState` (tanpa panggilan tambahan).

#### 4. Izin `ai_summary` akhirnya dibaca: hitungan penggunaan, bukan isi curhat

Izin itu ada sejak migrasi pertama tetapi tidak ada yang membacanya. Rancangan yang dipilih: fungsi database
`client_companion_activity(klien, hari)` yang mengembalikan HANYA hitungan (percakapan, pesan, hari aktif menurut tanggal WIB,
percakapan bertanda krisis, waktu terakhir). Izinnya diperiksa `can_view` (psikolog harus aal2, tautan aktif, izin menyala;
pendamping tidak pernah, karena jenis ini tidak dipetakan untuk mereka). Tidak ada policy baru pada `ai_conversations`, jadi tidak
ada jalur untuk membaca teks; web mencatat akses sebelum memanggil. Ditolak: **ringkasan isi buatan model** (risiko keliru
menyimpulkan kondisi seseorang dan menyimpan turunan baru dari data sangat sensitif; bisa menjadi proyeksi pengembangan dengan
persetujuan per ringkasan). Jawaban database yang tak masuk akal (hitungan negatif, pecahan, krisis lebih banyak dari
percakapan) tidak ditampilkan sebagai angka; halaman memberi galat memuat.

### Yang ditangkap oleh pemeriksaan (bahan cerita "kualitas teknis")

| Temuan | Bagaimana tertangkap | Perbaikan |
| ------ | -------------------- | --------- |
| `formatDistance(0.999)` menghasilkan "1000 m" dan `9.95` menjadi "9,9 km" (galat pembulatan `toFixed`) | Tes batas yang ditulis dari nilai tepi | Pembulatan ke 10 m dulu, satuan km bila 1000 m atau lebih, desimal dari `Math.round(km * 10)` |
| Pratinjau layanan tanpa `<main>`: `landmark-one-main` dan `region` | axe di e2e | Pratinjau dibungkus `<main>` |
| Judul kartu layanan `h3` langsung setelah `h1` saat catatan "contoh" tidak tampil: `heading-order` | axe pada keadaan "gagal" | Judul tersembunyi `h2` "Daftar layanan"; keadaan kosong dan gagal memakai `h2` |
| `color-contrast` pada tombol saat axe berjalan | axe mengukur warna di tengah transisi hover | Pointer dijauhkan dan transisi dibiarkan selesai sebelum axe |
| axe menggantung saat jam palsu Playwright dibekukan | Tes macet | `page.clock.resume()` sebelum axe; jam dibekukan hanya untuk bagian yang menguji waktu |
| `userEvent` menggantung di bawah jam palsu Vitest | Tes macet | `fireEvent` di dalam `act` untuk tes berwaktu |
| Tes regex dengan `\\b` ditulis sebagai karakter backspace oleh skrip penyunting | Mutan "Anda" tetap lolos | Ditulis ulang dengan karakter garis miring yang benar; dipindai tidak ada `\\x08` di sumber |
| Dialog bantuan krisis kini memuat dua tombol "Hubungi": tes lama yang mengandaikan satu tombol gagal | Playwright | Tes memeriksa dua tombol (SEJIWA dan 112) |
| 6 mutan SQL ringkasan lolos: batas 365 hari, batas bawah 1 hari, bawaan 30 hari, hari aktif WIB vs UTC, waktu terakhir | Uji mutasi | Data uji ditambah (percakapan 400 hari, 3 jam, dan 20 hari lalu; dua waktu yang sama menurut WIB tetapi berbeda menurut UTC) dan waktu terakhir diperiksa persis |

#### Temuan sampingan: ketidakcocokan id hidrasi acak (sudah ada sebelum Gelombang 3, belum diperbaiki)

Saat memverifikasi, tiga tes dialog dan formulir di `gelombang1.spec.ts` gagal secara acak (1 sampai 3 dari ±680 pada satu putaran).
Diselidiki sampai akar: `aria-describedby` menunjuk ke id yang tidak ada (`..._R_p5ai..-error`) padahal kolomnya ber-id `_R_34la..`. Di
server dev React melaporkan *"A tree hydrated but some attributes of the server rendered HTML didn't match... This won't be patched
up"*: id hasil `useId` di komponen klien berbeda antara HTML server dan hidrasi. Pola yang terukur (dev, tanpa interaksi apa pun):

| Halaman uji | Ketidakcocokan |
| ----------- | -------------- |
| Halaman server **statis** berisi dua `HelpButton` | 0 dari 60 |
| Halaman server **async** (menunggu sebentar) berisi hal yang sama | 3 dari 60 |
| Halaman yang membaca `searchParams` (juga async) | 4 dari 60 |
| Dua `Dialog` telanjang pada halaman async | 0 dari 40 |

Dibuktikan **sudah ada sebelum Gelombang 3**: commit `ce7ea70` (tanpa kode Gelombang 3) dibangun di worktree terpisah dan menghasilkan
laju yang sama (4 dari 40 pada tes pengganggu). Menunggu hidrasi (`networkidle`) menurunkan laju tetapi tidak menghilangkannya, jadi
bukan sekadar klik yang terlalu cepat. Dugaan kuat: antarmuka React/Next di sekitar komponen server asinkron (data RSC tiba
setelah hidrasi dimulai, lalu konteks pohon `useId` dipulihkan berbeda); tidak ditemukan penyebab di kode kita (tidak ada cabang
`window`, `Date.now`, atau `Math.random` pada komponen yang terdampak).

- **Dampak nyata:** pada sebagian kecil pemuatan halaman server asinkron, hubungan label/galat/nama-dialog lewat id bisa tidak sinkron
  sampai halaman dimuat ulang. Fungsi formulir tetap jalan; yang terdampak adalah pembacaan galat dan nama dialog oleh pembaca layar.
- **Yang dilakukan sekarang:** satu ulangan Playwright secara lokal (`retries: 1`; CI sudah 2), dan temuan dicatat di
  `TEMUAN-KEAMANAN.md`. Tes yang lulus pada ulangan ditandai "flaky" oleh Playwright, bukan disembunyikan.
- **Perbaikan yang layak bila waktu ada:** id stabil dari properti (bukan posisi pohon) untuk `Dialog` dan `Field`, dengan lingkup
  (`scope`) untuk komponen yang berulang pada satu halaman (kartu antrean admin, daftar catatan sesi). Sengaja belum dikerjakan:
  menyentuh sekitar 15 formulir dan berisiko menimbulkan id ganda bila lingkup salah.

### Uji mutasi Gelombang 3

**139 perusakan**: logika napas (13), grounding (8), layanan terdekat (21), sumber kontak krisis (3), komponen napas, grounding, dan
layanan (10 + 5 + 13), pembaca server layanan (7), migrasi SQL ringkasan Teman cerita (17), domain dan aksi panduan awal (7 + 9),
kartu panduan awal (4), ringkasan Teman cerita di web (10 + 5 + 7). Putaran pertama meloloskan 7 + 8; semuanya celah tes yang
ditutup (angka tepi 80/70/365 hari, teks kosong yang menjadi nol, "Anda" pada ajakan, pencarian lewat kota saja, label tipe,
mengatur ulang halaman saat mengganti provinsi dan mengetik pencarian, judul tersembunyi, waktu terakhir yang tepat, batas jendela
1 dan 365 hari, bawaan 30 hari, tanggal WIB berbanding UTC) **kecuali dua yang setara perilaku**: Q03 (pemeriksaan klien null
berlebih karena `can_view(null)` sudah salah) dan K21 (galat RPC diabaikan di satu tempat tetapi tertangkap oleh pemeriksaan bentuk
jawaban yang melempar galat yang sama). Satu perusakan (B08, `Math.max(0, ...)` pada hitungan mundur) membuktikan kode yang
berlebih: pembatas dihapus karena `ceil` dari angka positif selalu 1 atau lebih.

### Verifikasi (14 Okt 2026)

| Pemeriksaan | Hasil |
| ----------- | ----- |
| `tsc --noEmit`, `eslint --max-warnings=0`, `prettier --check` (web) | bersih |
| Vitest setelah `pnpm build` bersih | 2235 dari 2235 lulus (116 berkas) |
| Playwright, seluruh suite, build produksi (`E2E_PORT=3200`) | 614 lulus, 68 dilewati (spec berakun), 0 gagal |
| axe WCAG 2.2 AA | 33 rute x 2 viewport (11 publik + 22 pratinjau), ditambah keadaan berubah: napas berjalan dan selesai, grounding, lokasi aktif, daftar kosong dan gagal, panduan awal setelah galat |
| Uji mutasi Gelombang 3 | 139 perusakan; semua tertangkap kecuali 2 yang setara perilaku |
| Migrasi `…000700` | teruji di PGlite (19 tes) dan 17 uji mutasi SQL; **belum diterapkan di cloud** |

### Yang belum ada (jujur)

- **Migrasi `…000700` belum diterapkan di cloud.** Sampai ditempel, halaman detail klien psikolog yang kliennya mengizinkan
  `ai_summary` menampilkan galat memuat (klien yang tidak mengizinkan tidak terpengaruh).
- **Daftar layanan masih data contoh** (seed sintetis), ditandai di halaman. Belum ada sumber data layanan sungguhan.
- **Nomor 112 dan SEJIWA belum diverifikasi manusia** (`verified: false`).
- **Latihan napas dan grounding belum dicoba dengan pembaca layar sungguhan** (NVDA, TalkBack, VoiceOver); yang terbukti adalah
  struktur, pengumuman di wilayah live, dan axe.
- **Lokasi di peramban seluler sungguhan** belum dicoba; diuji dengan lokasi palsu Playwright.
- **Ringkasan isi Teman cerita** untuk psikolog sengaja tidak dibuat (hanya hitungan).
- **Ketidakcocokan id hidrasi acak** (lihat di atas) belum diperbaiki, hanya dikurangi dampaknya pada tes.

### Perlu tindakan Anda

1. **Tempel `supabase/migrations/20261014000700_companion_activity_summary.sql`** di Supabase SQL Editor (idempotent). Setelah itu
   saya verifikasi di cloud (simulasi JWT yang di-rollback).
2. Verifikasi nomor SEJIWA 119 ext. 8 dan 112 ke sumber resmi, lalu ubah `verified` dan isi `verifiedAt` di
   `lib/domain/crisis/resources.ts`.
3. Bila punya data layanan kesehatan jiwa yang sungguhan (puskesmas, rumah sakit, biro psikologi di wilayah demo), muat ke tabel
   `facilities`, periksa, lalu ubah `FACILITY_DIRECTORY_VERIFIED` menjadi `true`.

---

## Deploy dan pemeriksaan situs live (14-15 Okt 2026)

Pemilik membuat proyek Vercel (`web`, Root Directory `web`, deploy otomatis dari `main`); alamatnya
<https://web-omega-one-69.vercel.app>. Konektor Vercel di sesi pengembangan hanya-baca, jadi variabel lingkungan tidak bisa
dibaca dan isinya disimpulkan dari perilaku situs. Pemeriksaan dilakukan tanpa akun dan tanpa memasukkan rahasia apa pun.

### Apa yang diperiksa dan hasilnya

| Pemeriksaan | Hasil |
| ----------- | ----- |
| Halaman publik, `robots.txt`, `sitemap.xml`, API publik | 200 |
| `/api/health` | ok; kueri `head` ke database, jadi URL dan kunci anon Supabase terpasang benar |
| `/layanan-terdekat` | memuat 20 faskes dari tabel `facilities` lewat RLS |
| 11 rute berlogin | 307 ke `/masuk?next=...` |
| `/dev/*` | 404 (sengaja) |
| API tanpa token | 401 |
| Header | CSP tanpa `unsafe-eval`, HSTS 2 tahun, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| Lighthouse produksi (20 pengukuran) | Performa 98-100, Aksesibilitas 100, Praktik terbaik 100, SEO 100 |

### Satu temuan: alamat situs mengarah ke localhost

`NEXT_PUBLIC_SITE_URL` belum diisi di Vercel. Akibatnya `sitemap.xml`, baris `Sitemap:` di `robots.txt`, dan (lewat
`readPublicEnv`) tautan email konfirmasi dan atur ulang sandi memakai `http://localhost:3000`. Tidak ada yang rusak secara
fungsi, tetapi email pendaftaran akan membawa pengguna ke alamat yang salah.

**Keputusan.** Perbaiki di kode, bukan hanya mengingatkan pemilik: pada deployment **produksi** (`VERCEL_ENV=production`) dan
**hanya bila** `NEXT_PUBLIC_SITE_URL` kosong, `siteUrl()` dan `readPublicEnv()` memakai `VERCEL_PROJECT_PRODUCTION_URL` (host
divalidasi: huruf, angka, titik, tanda hubung, wajib mengandung titik; selalu `https`). Nilai yang diisi pemilik selalu menang;
preview dan development tidak terpengaruh. Variabel `NEXT_PUBLIC_VERCEL_*` ikut dibaca agar nilainya tertanam di bundel klien.

**Mengapa aman.** Host yang tidak wajar ditolak (jatuh ke localhost seperti sebelumnya, tidak pernah ke alamat karangan), dan
cadangan tidak berlaku di luar produksi sehingga alamat preview tidak bocor ke tautan email produksi.

**Bukti.** 15 tes baru di `lib/env/env.test.ts` (Vitest sekarang **2250 dari 2250 lulus**, 116 berkas), 9 uji mutasi semuanya
tertangkap, dan pemeriksaan live setelah deploy `0bc57bd`: `sitemap.xml` memuat 7 alamat berawalan alamat Vercel dan tidak ada
`localhost`. Ini jaring pengaman; pemilik tetap sebaiknya mengisi `NEXT_PUBLIC_SITE_URL`.

### Alat: `--summary` pada `scripts/lighthouse-audit.mjs`

Ukuran produksi ditulis ke `docs/lighthouse/produksi/` agar tidak menimpa hasil lokal di `docs/lighthouse/`. Dua jebakan yang
ditemui: `--out` dengan jalur absolut bergaris miring di Bash membuat berkas kosong bernama `C` dan skrip berhenti saat
membaca laporan yang tidak ada; jalankan lewat PowerShell dengan `--out` folder sederhana.

### Migrasi `…000700` diterapkan dan diverifikasi di cloud (15 Okt 2026)

Pemilik menempelkan berkasnya di SQL Editor; saya memverifikasinya terhadap proyek cloud tanpa mengubah data: katalog (`security
definer`, `stable`, `search_path=""`, hak hanya `authenticated` dan `service_role`) dan perilaku lewat simulasi JWT dalam satu blok
yang diakhiri `raise exception` agar semua data uji dan perubahan izin dibatalkan. Hasil: pemilik dan psikolog aal2 berizin
mendapat angka yang sama; psikolog tanpa izin, aal1, pendamping, klien tanpa tautan, `null`, dan `anon` ditolak (42501);
rentang hari dijepit 1 sampai 365; psikolog tetap melihat 0 baris di `ai_conversations`. Sesudahnya tidak ada baris uji tersisa
dan izin `ai_summary` demo tetap `false`. Tabel lengkap di [TESTING.md](TESTING.md), bagian 3b. Catatan: izin `ai_summary`
pada tautan demo sengaja tetap mati; nyalakan lewat `/privasi` bila ingin mendemokan bagian "Teman cerita" di detail klien.

### Yang belum diverifikasi (butuh pemilik)

Daftar dan masuk dengan akun nyata, email (SMTP dan templat), Site URL dan Redirect URLs Supabase, Teman cerita dengan kunci
Anthropic asli, MFA TOTP, dan portal psikolog, faskes, serta admin. Daftar tindakan lengkap dengan urutan prioritas ada di
[`HANDOFF-FASE-6.md`](HANDOFF-FASE-6.md) bagian 15.

---

## UEQ-S berdampingan dengan SUS, dan SUS versi Indonesia (15 Okt 2026)

Permintaan dari riset proposal: tambahkan UEQ-S ke protokol dan alat rekap, pakai butir Indonesia resmi, dan pakai SUS
versi Indonesia (Sharfina dan Santoso, 2016). Target responden naik menjadi minimal 30.

### Keputusan

| Keputusan | Alasan |
| --------- | ------ |
| **Butir UEQ-S disalin persis** dari berkas resmi `UEQS_Items.pdf` (bagian "Indonesian version", halaman 3, dibaca 15 Okt 2026), dan dijaga tes yang membandingkan delapan pasangan kata | Permintaan "jangan menerjemahkan sendiri"; tes mencegah butir berubah diam-diam |
| **Butir SUS diganti** dari terjemahan bebas saya sebelumnya ke adaptasi Indonesia (Sharfina dan Santoso, 2016), label skala "Ragu-ragu" menggantikan "Netral" | Permintaan eksplisit; terjemahan bebas tidak teruji sebagai instrumen. Cara menilai tidak berubah (butir ganjil positif, genap negatif) |
| **Jawaban UEQ-S di CSV adalah angka formulir 1-7**, bukan -3..+3; alat mengubahnya (nilai - 4) | Google Form tidak bisa skala negatif, dan menerima kedua bentuk akan ambigu (1, 2, 3 ada di kedua rentang). Nilai di luar 1-7, termasuk -3, ditolak dengan alasan |
| **Kutub kiri = negatif = titik 1** | Begitu berkas resmi UEQ-S menyusunnya (kiri selalu negatif); bila polaritas diacak, penilaian harus diubah |
| **Kolom `ueq1`-`ueq8` opsional**: kosong seluruhnya = responden tanpa UEQ-S; terisi sebagian = ditolak | Berkas lama (hanya SUS) tetap terbaca; data setengah jadi tidak ditebak |
| **Kategori benchmark dihitung dari rata-rata yang dibulatkan ke dua desimal** | Tabel di makalah memakai dua desimal tanpa celah; tanpa pembulatan rata-rata 1,545 jatuh di celah antara "1,54" dan "1,55" |
| **n di bawah 20 diberi catatan "indikatif"** | UEQ memerlukan sekitar 20-30 responden; angka kecil jangan terbaca seolah pasti |
| Tabel nilai t dipindah ke `stats.ts` dan dipakai bersama SUS dan UEQ-S | Satu sumber untuk selang kepercayaan 95% (t, bukan normal), tes SUS lama tetap lulus |

### Yang diverifikasi ke sumber

- **Patokan UEQ-S** dibaca langsung dari makalah (Hinderks, Schrepp, dan Thomaschewski, 2018, WEBIST, hlm. 373-377, bagian 4):
  semua 15 ambang sama dengan yang diminta. Penulisnya menyebut benchmark itu **diturunkan dari benchmark UEQ penuh** (9.905
  responden, 246 produk) karena data UEQ-S langsung belum cukup, jadi dicatat sebagai batas di laporan dan di dokumen.
- **Butir Indonesia UEQ-S**: lihat atas. Atribusi penerjemah (Harry B. Santoso) **tidak tertulis di berkas itu**, jadi tidak
  dicantumkan sebagai fakta.
- **Butir SUS Indonesia**: tersedia di satu kutipan sekunder (blog metodologi) yang menyebut Sharfina dan Santoso; butir 1 dan
  2 cocok dengan sumber kedua. Makalah aslinya (IEEE Xplore) tidak bisa diakses otomatis, jadi **belum dibandingkan kata demi
  kata**. Ditandai di kode, di protokol, dan di daftar periksa.

### Bukti

151 tes di `lib/domain/usability` (hitungan tangan; ambang tepat, satu langkah di atas, dan satu langkah di bawah untuk ketiga
skala; penolakan jawaban di luar skala; kesamaan butir dokumen dengan kode; templat CSV sama dengan kolom yang dibaca) dan 27
perusakan sengaja, semuanya tertangkap. Dicoba juga ujung ke ujung dengan CSV sintetis bertitik koma lewat
`pnpm usability:report`. Perbaikan kecil sepanjang jalan: rentang skor SUS di laporan sebelumnya ditulis "92.5" (titik), kini
"92,5". **Belum ada responden dan belum ada skor.**

---

## Revisi dari riset proposal: Healing119.id, LOINC PSS-10, PP 33/2026 (15 Okt 2026)

Riset proposal (Claude Cowork) meminta tiga perubahan di kode. Semuanya dikerjakan setelah **tiap klaim diperiksa ke sumbernya**.
Pemeriksaan itu menghasilkan tiga keputusan yang menyimpang dari bahan riset; penulis proposal harus mengikuti keputusan ini
(ringkasannya untuk penulis ada di [`HANDOFF-FASE-6.md`](HANDOFF-FASE-6.md) bagian 0a).

### 1. Kontak krisis: label Healing119.id, tetapi bukan "24 jam", dan bukan "berganti nama dari SEJIWA"

**Yang diminta.** Ganti semua label SEJIWA menjadi Healing119.id; `verified: true` dengan `sourceUrl` dan `verifiedAt` 2026-10-15;
sebut layanan "24 jam, gratis".

**Yang ditemukan di sumber** (halaman Ditjen Kesehatan Primer dan Komunitas Kemenkes, 7 Agustus 2025, dibaca utuh lewat peramban):

| Klaim | Isi halaman |
| ----- | ----------- |
| 119 ext. 8 dan WhatsApp lewat healing119.id | **Benar**: "Hubungi 119 ekstensi 8 dari ponsel Anda", dan "Kunjungi www.healing119.id dan klik tombol WhatsApp" |
| Gratis | **Benar**: "disediakan secara gratis" |
| 24 jam | **Tidak ada.** "Layanan ini akan beroperasi dari pagi hingga malam hari, dan akan terus diperluas jangkauannya" |
| Pertolongan pertama psikologis, bukan terapi | Halaman menulis "dukungan psikologis awal" dan membuka "tindak lanjut dan rujukan ke layanan profesional jika dibutuhkan". "Bukan terapi" tidak tertulis |
| SEJIWA berganti nama menjadi Healing119.id | Halaman **tidak menyebut SEJIWA**. Ia menyebut Kemenkes "mengembangkan kembali" (reaktivasi) layanan healing119.id |

**Keputusan.**

- **Label diganti sesuai permintaan** (Healing119.id), karena sumber resmi memang mengonfirmasi 119 ext. 8 sebagai akses Healing119.id.
  `verified: true`, `verifiedAt: 2026-10-15`, `sourceUrl` ke halaman itu. 112 tetap `verified: false`.
- **Jam layanan ditulis seperti sumber: "pagi hingga malam hari".** Klaim 24 jam pada layanan krisis berbahaya: orang yang menelepon
  pukul 02.00 dijanjikan layanan yang tidak ada. Frasa "24 jam" untuk hotline ini dihapus di web dan Flutter (enam tempat di
  Flutter: lima teks dan bendera `isAvailable24h`). Tes penjaga (`resources.test.ts`) gagal bila jam layanan itu memuat "24".
- **Cadangan 24 jam ditambahkan di balasan krisis tetap Teman cerita**: "Kalau belum ada yang menjawab, hubungi 112 atau datang ke
  unit gawat darurat (IGD) terdekat; keduanya buka 24 jam." Overlay krisis Flutter sudah punya kalimat serupa.
- **Hubungan dengan SEJIWA tidak ditulis sebagai fakta resmi.** Penghubungnya hanya media dan direktori (Kontan, Media Asuransi,
  TherapyRoute); SEJIWA diluncurkan 29 April 2020 oleh Kominfo, Kemenkes, dan KemenPPPA; pengumuman pergantian nama tidak
  ditemukan. Di dokumen hidup, SEJIWA hanya muncul sebagai "sebelumnya dikenal sebagai ... menurut sejumlah media". Catatan bertanggal
  di bagian lain `DECISIONS.md`, `TEMUAN-KEAMANAN.md`, dan `PLAN.md` yang menyebut SEJIWA **tidak ditulis ulang** (itu riwayat).
- Deskripsi memakai kata sumber ("dukungan psikologis awal ... Gratis"), WhatsApp disebut di teks tanpa tombol baru.
- Nama dan nomor di `FacilityDirectory` kini dibaca dari sumber tunggal (sebelumnya ditulis langsung di komponen, yang membuat
  penggantian nama seperti ini rawan terlewat).
- Templat email pendaftaran memuat nama, jam layanan, dan 112. **Bila templat lama sudah ditempel di Supabase, tempel ulang.**

### 2. FHIR: PSS-10 memakai LOINC 106860-0

Diperiksa lewat server terminologi publik tx.fhir.org (memuat LOINC 2.82), karena `loinc.org` menjawab 403 untuk akses otomatis:
`106860-0` = "Perceived stress scale-10 total score [PSS-10]", ACTIVE; `44261-6` (PHQ-9) dan `70274-6` (GAD-7) juga ACTIVE. Kode lokal
`pss10-total` diganti di `observation.ts` dan `fhir_mappers.dart` (entri `pss` dan `pss10`). SRQ-20 tetap kode lokal, dan
`Observation.code.text` sudah terisi untuk semua instrumen sejak awal (tidak perlu penambahan). Tes paritas yang membaca berkas Dart
asli tetap lulus dan ditambah tes bahwa `pss10-total` tidak dipakai lagi. LOINC mencatat hak cipta RST Assessments, LLC pada entri
PSS-10: hanya kodenya yang dipakai, bukan teks butir. Baris `satusehat_sync_log` lama tidak diubah. Bundel **belum** divalidasi
dengan validator HL7. Catatan: bahan riset menyebut "ARCHITECTURE §7.5"; di `ARCHITECTURE.md` bagian itu adalah §6, dan §7.5 ada di
`HANDOFF-FASE-6.md`; keduanya diperbarui.

### 3. Kebijakan privasi: rujukan PP No. 33 Tahun 2026, versi naskah 1.1.1

PP 33/2026 diperiksa lewat ulasan media dan firma hukum (Meridian Hukum, Katadata, Bisnis.com, Veritask), bukan naskah resmi
JDIH Setneg: "PP No. 33 Tahun 2026 tentang Peraturan Pelaksanaan UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi", ditetapkan
dan diundangkan 16 Juli 2026, **berlaku 16 Januari 2027**, LN 2026 No. 88. Rujukannya ditambahkan **satu kalimat** di
`/kebijakan-privasi` dan `docs/privacy_policy.md`, dengan kata kerja yang jujur: naskah "dirancang dengan memperhatikan" UU PDP dan
peraturan pelaksanaannya, bukan "mematuhi" (PP itu belum berlaku, dan naskah belum ditinjau ahli hukum). Substansi lain tidak
berubah. Versi naskah naik **1.1.0 menjadi 1.1.1**, tanggal 15 Oktober 2026, di konstanta web, konstanta Flutter, dan kedua
dokumen (ketentuan layanan ikut karena versinya satu untuk web dan mobile). Pengguna lama tetap tercatat setuju versi 1.1.0 dan
tidak diminta setuju ulang, karena perubahannya hanya rujukan. Tes baru `lib/legal/legal-sync.test.ts` menjaga versi, tanggal,
dan rujukan itu sama di semua tempat.

### Temuan baru: batas usia 17 tahun

Sambil memeriksa PP 33/2026 muncul risiko yang tidak diminta: pendaftaran memakai batas 17 tahun (diwarisi dari ketentuan aplikasi
mobile), sedangkan "anak" dalam hukum Indonesia umumnya di bawah 18 tahun dan ulasan media menyebut PP itu mewajibkan persetujuan
orang tua atau wali untuk data anak (Pasal 38 menurut Katadata; naskah belum diperiksa). **Tidak diubah di kode**: batas usia adalah
keputusan produk dan hukum milik pemilik. Opsi: naikkan ke 18 tahun (perubahan kecil di web dan Flutter, direkomendasikan), tambah
alur persetujuan orang tua (besar), atau telaah hukum dulu. Dicatat di `TEMUAN-KEAMANAN.md` dan `HANDOFF-FASE-6.md` agar proposal
tidak menulis "sesuai UU PDP" tanpa batas ini.

### Bukti

`resources.test.ts` (jam layanan, sumber, tanpa SEJIWA di data), `companion.test.ts` (balasan krisis memuat jam apa adanya dan
cadangan 112/IGD, "24 jam" hanya sekali), `observation.test.ts` (LOINC PSS-10, kode lokal lama hilang, SRQ-20 tetap lokal dengan
`code.text`, paritas Dart), `legal-sync.test.ts`, serta tes dan e2e yang menyebut nama layanan diperbarui. Flutter: `flutter analyze`
0 galat dan 0 peringatan (115 info, sama seperti sebelumnya) dan `flutter test` 160 lulus.

## Revisi dari uji live 15 Okt 2026 (temuan #2 sampai #19)

Penguji (Claude Cowork, lewat peramban pemilik) menjalankan enam akun di situs live dan menemukan 18 hal yang perlu diperbaiki
dan satu catatan informasi. Semuanya dikerjakan dalam empat kelompok commit. Yang sengaja diputuskan, dan alasannya:

### A. Data demo yang masuk akal (#2, #4)

**Akar masalah.** Seed lama membuat riwayat skrining untuk ratusan pengguna sintetis **tanpa menyentuh waktu**: tiap skrining
berat memicu `create_crisis_alert_from_assessment`, dan semua peringatan itu bertanda waktu seed, jadi psikolog melihat 22
peringatan terbuka "baru saja" dan satu faskes dengan 65 pengguna menghitung 130 peringatan dalam dua pekan.

**Keputusan.**

- Peringatan tetap dibuat oleh pemicu (itu perilaku produksi yang benar), lalu `created_at`-nya diset ke waktu skrining
  penyebabnya. Tiap klien demo hanya boleh punya **paling banyak 3 peringatan terbuka** (yang terbaru); sisanya ditandai sudah
  ditangani oleh psikolog demo beberapa jam setelah dibuat. Peringatan tidak pernah dibuka kembali. Pengguna sintetis non-klien
  hanya punya peringatan terbuka bila skriningnya dalam 2 hari terakhir. Rasio per pengguna di agregat faskes jadi wajar.
- Butir 9 PHQ-9 (pikiran menyakiti diri) tidak lagi terisi acak: pada pengguna tanpa tanda ideasi hanya terisi bila semua butir lain
  sudah penuh. Dulu satu butir acak cukup membuat peringatan krisis.
- Mood, tidur, dan skrining pengguna demo diisi **7 hari terakhir relatif terhadap waktu seed**, tidak pernah ke masa depan.
- 10 psikolog demo punya bio singkat orang pertama (tanpa gelar, lembaga, atau klaim klinis) dan rating contoh 4,5 sampai 4,9 dengan
  7 sampai 42 ulasan. **Ini data contoh**, bukan ulasan nyata; proposal tidak boleh menyebutnya sebagai penilaian pengguna.
- `pnpm seed --refresh` menyegarkan semua itu **tanpa membuat ulang akun**. `--refresh --dry-run` hanya melaporkan rencana.

**TOTP aman (syarat pemilik).** Pemilik sudah memasang TOTP di akun psikolog, faskes, dan admin demo. Akun tanpa kode dari ponsel
itu tidak bisa dipakai, jadi seed dijaga berlapis: (1) mode refresh menerima `DataClient = Pick<SupabaseClient, 'from'>`, jadi
tipe dan penjaga saat berjalan menolak `auth`/`rpc`; hanya `deleteUser` di mode `--reset` yang menghapus TOTP; (2) `--reset` menolak
berjalan bila ada faktor TOTP terverifikasi atau bila daftar faktor tidak bisa dibaca, kecuali ditambah `--hapus-totp`; (3) refresh
mencetak jumlah TOTP sebelum dan sesudah dan **gagal** bila berkurang. Tes: `tests/seed/totp.test.ts`, `tests/seed/refresh.test.ts`.

Perintah yang disarankan setelah deploy: `pnpm seed --refresh --dry-run --yes`, lalu `pnpm seed --refresh --yes`.

### B. UX MFA dan navigasi (#3, #8)

Setelah TOTP berhasil dipasang, halaman Keamanan dimuat ulang dengan `?berhasil=1` dan menampilkan pesan sukses serta tombol
**Lanjut ke dasbor** (hanya bila TOTP benar-benar aktif dan sesi sudah aal2; parameter palsu tidak menghasilkan pesan palsu). Tombol
tetap berputar selama halaman berpindah, jadi jeda 5 sampai 8 detik tidak terlihat macet. `loading.tsx` (skeleton) ditambahkan untuk
portal psikolog, faskes, admin, dan detail psikolog di konsultasi. Nama perangkat TOTP kini berformat WIB, mis. "Perangkat 16 Okt
2026, 00.24 WIB" (sebelumnya jam UTC tanpa keterangan).

### C. Konsistensi angka dan label (#5, #6, #7)

- **Faskes (#5).** Dua angka PHQ-9 yang tampak bertentangan sebenarnya dua hal berbeda: kartu memakai **satu pekan lengkap
  terakhir** (dan selisih dengan pekan sebelumnya), "Dibanding kota lain" memakai **rata-rata seluruh periode**. Kini tiap kartu
  menulis periodenya ("pekan 5–11 Okt", "12 minggu terakhir"), perbandingan kota menulis "rata-rata PHQ-9, 12 minggu terakhir" dan
  satu kalimat bahwa angkanya bisa berbeda dari kartu, dan catatan otomatis menulis periode serta kedua angka ujungnya (dua pekan
  pertama dan dua pekan terakhir). Selisih yang tertulis dihitung dari angka yang tertulis itu, jadi tidak bisa terbaca bertentangan
  karena pembulatan.
- **"Skor memburuk" (#6).** Definisi lama hanya "naik 3 poin atau lebih dari skrining sebelumnya", sehingga klien yang naik 13 ke 15
  (masuk kategori Berat) dihitung stabil. Kini memburuk = naik 3 poin atau lebih **atau pindah ke kategori yang lebih berat**; arah
  sebaliknya memakai aturan yang sama ("membaik"). Kategori tersimpan yang rusak tidak ditebak: bila salah satu titik tidak punya
  kategori sah, hanya selisih skor yang dipakai.
- **Status sesi (#7).** Satu sumber label (`lib/domain/consultation/sessions.ts`): `confirmed` = "Terjadwal" di dasbor, detail klien,
  Jadwal, dan halaman sesi pengguna. `tests/consistency/session-status.test.ts` menggagalkan build bila ada peta label kedua atau
  kata "Terkonfirmasi" muncul lagi.

### D. Tata letak dan teks kecil (#9 sampai #18)

| #   | Perubahan |
| --- | --------- |
| 9   | Sidebar `overflow-x-hidden`; nama dan peran `truncate` dengan `title` penuh |
| 10  | Header halaman publik (`MarketingAuthActions`) menampilkan **Ke dasbor** bila ada cookie sesi. Halaman publik tetap statis (tes `dynamic-portals` menjaganya): yang dibaca hanya ADA-TIDAKNYA cookie `sb-*-auth-token` setelah hidrasi, bukan isinya, dan bukan pemeriksaan keamanan. Tombol mengarah ke `/masuk`, yang bagi pengguna yang sudah masuk dialihkan middleware ke beranda perannya |
| 11  | `pre code` tanpa latar dan padding (urutan setelah aturan `code` sebaris) |
| 12  | Jam praktik di dialog admin memakai `<select>` 24 jam per 30 menit, bukan `<input type="time">` yang mengikuti locale perangkat (AM/PM). Nilai kiriman form tetap `HH:MM`, jadi skema dan fungsi database tidak berubah |
| 13  | Nomor STR diminta saat mendaftar sebagai psikolog (wajib, 5 sampai 60 karakter, huruf/angka/spasi/titik/garis miring/tanda hubung). Disimpan di `profiles.requested_str_number` lewat metadata signup dan `handle_new_user`; dialog persetujuan sudah terisi, admin tinggal mencocokkan dengan sumber resmi. Migrasi **aditif**: `20261016000000_psychologist_str_at_signup.sql` (kolom baru, `handle_new_user` dengan satu kolom tambahan, fungsi antrean baru `admin_pending_psychologist_applications`; fungsi lama tidak diubah). Kode web aman di-deploy sebelum SQL ditempel: bila fungsi baru belum ada (`PGRST202`/`42883`) antrean lama dipakai tanpa kolom STR |
| 14  | Banner pendamping menyebut bahwa tombol menelepon Healing119.id (119 ext. 8) untuk meminta saran, **bukan** menghubungi orang yang didampingi |
| 15  | Titik ganda "M.Psi.." hilang: nama dan tarif ditulis di baris terpisah tanpa tanda baca tambahan |
| 16  | Pemilih hari membedakan **libur** (tidak ada jadwal), **penuh** (semua jam dipesan), dan **tidak tersedia** (terlalu dekat atau terlalu jauh) |
| 17  | `<summary>` privasi `flex w-full`, jadi seluruh kotak bisa diklik |
| 18  | Kolom hanya-baca (email profil) berlatar redup dengan `aria-readonly` |

Klaim STR dari pemohon bukan bukti: itu hanya isian untuk dicocokkan. Sumber kebenaran STR yang sudah diverifikasi tetap
`psychologists.str_number`, diisi `admin_review_psychologist`. Kolom `requested_str_number` tidak dijaga trigger seperti
`requested_role` karena tidak memberi hak apa pun.

### #19. Jam layanan Healing119.id: FAQ Kemenkes menyebut 24 jam, teks sengaja TIDAK diubah

Penguji menemukan dua sumber resmi yang bertentangan: halaman Kesprimkom Kemenkes (7 Agustus 2025) menulis layanan beroperasi
"dari pagi hingga malam hari", sedangkan FAQ Kemenkes (berkas PDF) menurut laporan penguji menulis "24 jam". **Halaman Kesprimkom
dibaca langsung; FAQ PDF belum dibaca.** Teks di aplikasi dipertahankan ("pagi hingga malam hari") dengan alasan:

1. Salah ke sisi aman. Bila layanan sebenarnya 24 jam dan kita menulis "pagi hingga malam", pengguna paling buruk menelepon 112/IGD
   yang memang kita tulis sebagai cadangan 24 jam. Bila kita menulis "24 jam" padahal tidak, orang dalam krisis bisa menelepon
   tengah malam dan tidak dijawab.
2. Dua sumber resmi yang bertentangan tidak bisa dibereskan dari sini; yang bisa membereskannya adalah Kemenkes/healing119.id.
3. Jam layanan Healing119.id **tidak diubah** dalam revisi ini.

**Tindak lanjut untuk pemilik:** konfirmasi langsung ke healing119.id (atau Kemenkes) jam layanan terkini. Setelah itu cukup ubah
`availability` dan `verifiedAt` di `lib/domain/crisis/resources.ts` (sumber tunggal). **Untuk proposal:** jangan menulis "24 jam"
untuk Healing119.id selama konfirmasi itu belum ada; tulis "pagi hingga malam hari (sumber: Kemenkes, 7 Agustus 2025)" dan 112/IGD
sebagai cadangan 24 jam.

### Hasil di cloud (16 Okt 2026)

Migrasi `20261016000000` ditempel pemilik dan diverifikasi (kolom, constraint, `handle_new_user` baru dengan `search_path` kosong, fungsi antrean). `pnpm seed --refresh --yes` dijalankan terhadap data demo: peringatan 614 menjadi 169 (terbuka 6, paling banyak 3 per pengguna), 10 psikolog ber-bio dan berulasan contoh, tanpa catatan di masa depan, 306 akun demo tidak berubah, dan **TOTP terverifikasi tetap 3** (dihitung dari `auth.mfa_factors` sebelum dan sesudah, selain hitungan di keluaran seed). Kota Bogor kini 70 pengguna dengan 15 peringatan dalam 14 hari.

### Bukti

Uji mutasi pada logika baru: 25 perusakan seed, 9 perusakan MFA, 13 perusakan konsistensi angka dan label, dan 30 perusakan
kelompok D (termasuk 5 perusakan SQL yang dijalankan di PGlite): semuanya tertangkap setelah tes diperkuat (beberapa perusakan
awalnya lolos dan dipakai untuk memperkuat tes).
