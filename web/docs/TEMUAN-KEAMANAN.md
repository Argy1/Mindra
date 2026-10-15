# Temuan keamanan pada skema aplikasi Flutter

Ditemukan saat menulis migrasi web (Fase 0b) dan membaca kode Dart (Fase 1), dengan membaca
`supabase/migrations/2024*.sql` dan kode aplikasi yang memakainya. Semua temuan **sudah ada sebelum
web**; web hanya memperluas jangkauannya karena `can_view()` membaca tabel `caregiver_relationships`
yang sama.

Setiap temuan punya bukti yang bisa dijalankan ulang: `pnpm test tests/db`. Pengujian memakai
Postgres sungguhan (PGlite) dengan role dan klaim JWT yang meniru Supabase, tanpa menyentuh
database mana pun. Perbaikannya diuji juga dengan **uji mutasi**: migrasi dirusak sengaja (11 cara
untuk pengerasan pendamping, 12 untuk integritas asesmen, 12 untuk migrasi ekosistem perawatan) dan suite harus gagal setiap kali.

| #   | Temuan                                                     | Tingkat | Status                                                              |
| --- | ---------------------------------------------------------- | ------- | ------------------------------------------------------------------- |
| F1  | Undangan pendamping bisa dibaca dan diambil alih siapa pun | Tinggi  | **Ditutup** (migrasi `…000100` + aplikasi Flutter diperbarui)       |
| F2  | Pendamping yang dicabut bisa mengaktifkan dirinya lagi     | Sedang  | Ditutup (trigger penjaga, migrasi web)                              |
| F3  | Pendamping membaca seluruh baris profil pasien             | Sedang  | **Ditutup** (migrasi `…000100` + aplikasi Flutter diperbarui)       |
| F4  | `declineInvite` gagal oleh RLS                             | Rendah  | **Ditutup** (RPC `decline_caregiver_invite`)                        |
| F5  | Policy psikolog lama membandingkan id yang tidak sepadan   | Rendah  | Jalur web **ditutup** (`…000300`); 4 policy lama **dihapus** oleh `…000400` (diterapkan dan diverifikasi di cloud, 14 Okt 2026) |
| F6  | Skor/kategori asesmen dipercaya dari klien                 | Rendah  | **Ditutup** (trigger migrasi `…000200`; web juga menghitung di server) |
| F7  | Kunci API dibundel di aset aplikasi mobile                 | Sedang  | Sisi kode **ditutup** (Gelombang 2); **tinggal pemilik mencabut kunci lama** di Anthropic |
| F8  | Kode undangan pendamping dibuat dari jam, bukan acak       | Sedang  | **Ditutup** (kode dibuat server; Dart memakai `Random.secure`)      |

> Status "ditutup" berarti kodenya ada dan teruji. Migrasi `…000100`–`…000300` sudah diterapkan dan diverifikasi di
> proyek cloud (14 Okt 2026). Migrasi `…000400` (penutup F5) juga sudah diterapkan dan diverifikasi.

## F1 — Pengambilalihan undangan pendamping (Tinggi)

**Lokasi.** Policy `"View own or pending caregiver relationships"` (SELECT) dan
`"Caregiver or patient can update relationship"` (UPDATE) pada `caregiver_relationships`, ditambah
`"Caregivers can view patient mood/assessments"`.

**Penyebab.** Agar `acceptInvite` di Dart bisa mencari undangan lewat `invite_code`, SELECT
mengizinkan **semua pengguna login** membaca **semua** baris `pending`. UPDATE mengizinkan hal yang
sama dan tidak punya `WITH CHECK`, sehingga baris baru boleh berisi apa saja.

**Skenario serangan** (hanya butuh satu akun biasa):

1. `select * from caregiver_relationships where status = 'pending'` → semua kode undangan, `patient_id`,
   dan nomor telepon pendamping.
2. `update caregiver_relationships set caregiver_id = <saya>, status = 'active', permissions = '{"mood_daily":true,"assessment_results":true,"emergency_alerts":true,"app_activity":true}' where id = <undangan korban>`.
3. Lewat policy "Caregivers can view patient …" penyerang membaca mood dan hasil skrining korban.

**Dampak.** Kebocoran data kesehatan mental pasien yang sedang mengundang pendamping.

**Perbaikan** (dua lapis, `20261014000000_web_ecosystem.sql` bagian 9, lalu `20261014000100_caregiver_invite_hardening.sql`):

- Penjaga UPDATE: penerima undangan tidak bisa menulis ulang `permissions`/`patient_id`/`invite_code`,
  tidak bisa mendaftarkan akun lain, dan pendamping yang dicabut tidak bisa aktif lagi.
- Policy SELECT dan UPDATE dipersempit: hanya pasien dan pendamping terkait yang melihat dan mengubah baris.
  Undangan `pending` orang lain **tidak terbaca sama sekali**.
- Menerima undangan hanya lewat RPC `accept_caregiver_invite(kode)`: kode harus tepat, belum kedaluwarsa
  (14 hari), bukan undangan milik sendiri, dan percobaan yang gagal dibatasi **5 per 15 menit per akun**.
  Hasilnya `null` untuk kode salah, kedaluwarsa, maupun undangan sendiri, jadi tidak membocorkan perbedaannya.
- Aplikasi Flutter (`caregiver_repository_impl.dart`) memakai RPC itu.

**Bukti.** `tests/db/caregiver-hardening.test.ts` (42 tes): penyerang tidak melihat undangan apa pun, UPDATE
langsung tidak mengenai baris, kode tebakan dibatasi, izin yang berlaku adalah pilihan pasien.

## F2 — Pendamping yang dicabut bisa mengaktifkan lagi dirinya (Sedang)

Setelah pasien mencabut (`status = 'revoked'`), `caregiver_id` tetap terisi, dan policy UPDATE
mengizinkan `auth.uid() = caregiver_id`: pendamping bisa mengubah `status` kembali ke `active`.
**Ditutup:** trigger hanya mengizinkan transisi `pending→active|declined` (untuk dirinya) dan
`active→revoked` (mundur) bagi non-pasien. Bukti: tes "SERANGAN: pendamping yang sudah DICABUT …".

## F3 — Pendamping membaca seluruh baris profil pasien (Sedang)

Policy `"Caregivers can view patient profile"` membuka **semua kolom** `profiles` bagi pendamping aktif,
termasuk `email`, `date_of_birth`, dan `nik_encrypted`, padahal izin yang diberikan pasien hanya mood
dan/atau hasil skrining. RLS tidak bisa membatasi kolom.

**Ditutup:** policy itu dihapus. Nama pasien kini dibaca lewat RPC `caregiver_patient_names()` yang hanya
mengembalikan `(patient_id, name)` untuk pasien yang hubungannya aktif; aplikasi Flutter memakainya di
daftar pasien dan ringkasan. Bukti: pendamping tidak melihat baris profil pasien, dan pendamping yang sudah
dicabut mendapat daftar kosong.

## F4 — `declineInvite` gagal oleh RLS (Rendah, fungsional)

`update … set status = 'declined' where invite_code = …` ditolak: tanpa `WITH CHECK`, `USING`
dipakai untuk baris baru, dan baris `declined` tidak lagi `pending` sementara `caregiver_id` masih null.
**Ditutup:** RPC `decline_caregiver_invite(kode)` (Dart `declineInvite` memakainya).
Bukti sebelum perbaikan: tes "declineInvite versi Dart … gagal … bahkan TANPA migrasi web".

## F5 — Policy psikolog lama tidak pernah benar (Rendah)

Policy lama pada `consultations`, `profiles`, dan `assessments` membandingkan `auth.uid()` dengan
`psychologists.id` (UUID acak milik tabel `psychologists`, bukan id akun). Tidak berbahaya, hanya
tidak berfungsi. Web memakai `psychologists.profile_id` dan `care_links` yang disetujui pasien.

**Ditutup** untuk `consultations` (migrasi `…000300`): psikolog yang tertaut (`care_links` aktif) dapat membaca
konsultasi kliennya dan memperbarui barisnya, tetapi trigger `consultations_guard_staff_update` membatasi
perubahannya HANYA pada `session_summary`, `notes_for_patient`, dan `updated_at`; jadwal, status, biaya, dan tautan
video tidak bisa diubah lewat jalur itu. Kedua policy juga mensyaratkan sesi aal2 (lihat bagian MFA di bawah).

**Sisa (diperiksa di cloud, 14 Okt 2026):** empat policy lama masih terpasang: `consultations` (SELECT dan UPDATE),
`assessments` (SELECT), dan `profiles` (SELECT), semuanya berbunyi `psychologist_id = auth.uid()`. Pada data sekarang
**tidak berlaku**: 0 dari 10 baris `psychologists` memiliki id yang sama dengan akun login, dan pengguna tidak bisa
menambah baris `psychologists` (hanya ada policy SELECT; aplikasi Flutter sendiri mencatatnya di
`demo_data_seeder.dart`). Bahayanya laten: bila suatu hari baris `psychologists` dibuat dengan service role memakai
id akun, policy itu membuka konsultasi, skrining, dan profil pasien **tanpa MFA dan tanpa persetujuan `care_links`**.
**Ditutup di kode (Fase 3):** migrasi `20261014000400_drop_inert_psychologist_policies.sql` menghapus keempat policy
(`drop policy if exists`, idempotent; aman bagi aplikasi Flutter karena tidak ada layar psikolog di sana).
`tests/db/legacy-policies.test.ts` (6 tes) membuktikan: celahnya memang ada sebelum migrasi (psikolog yang id-nya
sama dengan akun login membaca data tanpa MFA dan persetujuan), tertutup sesudahnya, jalur resmi (`care_links` + aal2)
tetap berfungsi, migrasi idempoten, dan hanya empat policy itu yang dihapus. Policy `consultation_messages` sengaja
tidak disentuh (di luar cakupan temuan). **Diterapkan di cloud 14 Okt 2026** dan diperiksa baca saja: keempat policy tidak ada lagi; policy yang masih
menyebut `psychologist_id` hanya `care_links` (2), `consultation_messages` (2, sengaja), dan `consultations` (2 policy
resmi dari `…000300`); data utuh (2190 skrining, 613 peringatan krisis, 8 tautan perawatan).

## F6 — Skor dan kategori asesmen dipercaya dari klien (Rendah)

Policy `"Users manage own assessments"` mengizinkan klien menyisipkan `total_score` dan `category`
apa saja. Dampak terbatas pada data milik sendiri (mis. memicu alert krisis untuk dirinya, atau
menyembunyikannya), tetapi hasil skoring bergantung pada kejujuran klien.

**Ditutup** di dua sisi: Server Action web menghitung skor dari jawaban dan tidak menerima skor dari klien;
dan trigger `assessments_enforce_integrity` (migrasi `…000200`) menghitung ulang `total_score` (PSS-10 item
4, 5, 7, 8 dibalik) dan `category` dari `answers` untuk **semua** sesi pengguna, termasuk aplikasi mobile,
serta menolak jawaban yang tidak lengkap atau di luar rentang. Aplikasi Flutter selalu mengirim jawaban
lengkap dengan total yang konsisten, jadi alurnya tidak berubah.

**Bukti.** `tests/db/assessment-parity.test.ts`: untuk setiap instrumen, 120 kombinasi jawaban acak + ekstrem
menghasilkan skor dan kategori database yang **sama persis** dengan kode web, dan `classify_assessment` (SQL)
sama dengan `categoryFor` (web) untuk setiap skor yang mungkin; alert krisis dari trigger sama dengan
detektor web.

## F8 — Kode undangan pendamping dapat ditebak (Sedang)

`CaregiverRepositoryImpl._generateCode()` menyusun kode 8 karakter dari `DateTime.now().millisecondsSinceEpoch`
yang digeser per 4 bit. Tidak ada sumber acak: kode adalah fungsi dari jam saat undangan dibuat. Siapa pun
yang tahu perkiraan waktunya (dan `created_at` tersimpan pada baris yang sama) bisa menurunkan kodenya,
sehingga menutup bocornya daftar undangan (F1) saja tidak cukup.

**Ditutup:** trigger `BEFORE INSERT` membuat kode di server dari sumber acak (`gen_random_uuid`) dan
**selalu menimpa** kode kiriman klien; Dart membaca balik kode yang berlaku dan memakai `Random.secure()`
untuk nilai sementaranya. Bukti: 200 undangan dalam satu pernyataan (waktu sama) menghasilkan 200 kode berbeda
dengan sebaran merata atas 32 simbol.

## F7 — Kunci API dibundel di aset aplikasi mobile (Sedang)

`pubspec.yaml` mendaftarkan `.env` sebagai aset (`flutter_dotenv`), sehingga isinya ikut terkemas di
APK. Nama kunci yang ada (nilainya tidak dibaca saat audit): `CLAUDE_API_KEY`, `GOOGLE_MAPS_API_KEY`,
`AGORA_APP_ID`, `SATUSEHAT_CLIENT_ID`, `SUPABASE_ANON_KEY`. Siapa pun yang membongkar APK dapat
membacanya. Kunci anon aman (RLS yang menjaga); `CLAUDE_API_KEY` **tidak**.
Rekomendasi (sudah di ARCHITECTURE §7): rotasi kunci, dan arahkan aplikasi mobile memanggil
`/api/v1/companion/chat` di web.

**Status (Gelombang 2, 14 Okt 2026):** aplikasi mobile kini memanggil `/api/v1/companion/chat` dengan token sesi Supabase
pengguna; klien Anthropic (`claude_api_service.dart`), konstanta `claudeApiKey`, dan baris `CLAUDE_API_KEY` di `.env`
dihapus, dan `.env.example` (yang masuk repositori) tidak memuat kunci apa pun. Perintah sistem, deteksi krisis, penyimpanan
percakapan, dan batas 20 pesan per jam kini satu sumber di server. **Yang tersisa hanya tindakan pemilik:** kunci lama
**masih berlaku** di Anthropic sampai dicabut, dan APK atau IPA yang pernah dibangun dengan `.env` lama masih memuatnya.
Cabut di console.anthropic.com, lalu buat kunci baru khusus server (variabel Vercel `ANTHROPIC_API_KEY`).

## Temuan tambahan saat memeriksa migrasi web

- **Penjaga yang tidak aman NULL.** Penjaga `caregiver_relationships` di migrasi web memakai
  `if auth.role() <> 'authenticated' then return`. Tanpa klaim JWT (SQL Editor, migrasi) `auth.role()` bernilai
  NULL sehingga ekspresinya NULL, bukan benar, dan sesi itu ikut diblokir. Diperbaiki di migrasi `…000100`
  (`coalesce(…, '')`); tes regresi membuktikan versi lama memang memblokir.
- **Pola yang sama dihindari** pada penjaga baru (`assessments_enforce_integrity`, trigger kode undangan).

## Temuan tambahan (Fase 2)

- **MFA hanya di layar tidak melindungi data.** Rancangan awal (docs/ARCHITECTURE §8) menyebut MFA wajib untuk
  psikolog, tetapi jika hanya layout web yang memeriksa, penyerang yang sudah memegang kata sandi bisa memakai token
  aal1 langsung ke PostgREST dan membaca data klien tanpa pernah melihat layar kita. Karena itu `can_view()` kini
  memanggil `psychologist_mfa_ok()`: cabang psikolog hanya benar bila klaim JWT `aal` = `aal2`. Cabang pemilik dan
  pendamping tidak berubah. Sakelar demo `app.psychologist_mfa = 'off'` gagal tertutup (hanya nilai persis `off`
  yang berlaku) dan 6 dari 12 uji mutasi menargetkan logika ini.
- **Layout dan halaman Next.js dirender bersamaan.** Gerbang MFA di layout saja tidak mencegah halaman mulai
  membaca data klien sebelum redirect berlaku. Setiap halaman portal psikolog memanggil `requireMfaPsychologist()`
  sebagai langkah pertama; layout menjadi lapisan kedua. Di database, `log_access()` juga menolak psikolog tanpa
  aal2, jadi pembacaan sebelum redirect gagal tertutup dan tidak meninggalkan jejak palsu.
- **Riwayat akses tidak bisa dipalsukan atau dipakai membanjiri orang lain.** `log_access()` menolak pemanggil yang
  `can_view`-nya salah, dan `log_access_batch()` gagal seluruhnya bila SATU subjek tidak berhak (psikolog tidak bisa
  menyelipkan id orang lain di antara kliennya). Pembukaan berulang dalam 5 menit dicatat sekali.
- **Unduhan CSV tidak boleh menjadi vektor injeksi rumus.** Nama pelaku berasal dari profil yang bisa diisi pengguna
  lain; sel yang diawali `= + - @` (atau tab/CR) diberi apostrof di depan. Rute unduhan sengaja tanpa `.csv` karena
  matcher middleware melewati path bertitik (peran dan sesi tidak diperiksa di sana).

## Temuan tambahan (Fase 3)

- **RLS saja tidak cukup untuk API.** Ada policy sah "psikolog/pendamping tertaut" pada tabel yang sama. Bila endpoint
  `GET /assessments` hanya mengandalkan RLS, token seorang psikolog (sesi aal2) akan ikut mengembalikan skrining
  klien-kliennya, **tanpa** catatan akses, karena jalur API tidak melewati `auditAccess`. Setiap kueri API karena itu
  memakai penyaring `user_id` eksplisit; uji pencatat kueri dan uji mutasi menjaga agar penyaring itu tidak hilang.
  Endpoint API hanya untuk data diri sendiri.
- **Kunci API.** Hanya SHA-256 yang disimpan; nilai penuh tampil sekali saat dibuat. Semua kegagalan autentikasi
  mengembalikan 401 yang persis sama (kunci tidak ada, salah, dicabut, salah bentuk, token pengguna di rute mitra), dan
  kunci yang berbentuk salah ditolak sebelum menyentuh database. Maksimal 5 kunci aktif per faskes. **Belum ada
  kedaluwarsa otomatis**: pencabutan manual oleh admin faskes.
- **Kursor paginasi masuk ke ekspresi `.or()` PostgREST** (menerima string mentah). Pertahanannya validasi ketat
  (waktu ISO + UUID) sebelum nilai menyentuh ekspresi itu; tes memastikan waktu berisi sintaks filter ditolak 422.
- **Pembatas laju dengan cadangan.** Upstash gagal = beralih ke memori proses, bukan menolak semua permintaan
  (gangguan pihak ketiga tidak boleh mematikan API). Tanpa Upstash di produksi, batas hanya per instans serverless.
- **SATUSEHAT mode mock sepenuhnya lokal.** ARCHITECTURE §6 awalnya mengirim ke server HAPI FHIR publik; itu berarti
  hasil skrining pengguna sungguhan keluar ke server uji publik. Dihentikan: tidak ada byte yang keluar dari server
  Mindra pada mode mock. Bundel FHIR tidak memuat jawaban per butir (butir 9 PHQ-9 tidak ikut keluar).
- **Belum tercakup:** pembacaan lewat token API tidak dicatat di `data_access_logs` (tidak perlu untuk data diri
  sendiri; tidak ada endpoint yang membaca data orang lain), dan MFA untuk `facility_admin` baru ditegakkan di Fase 4.

## Temuan tambahan (Fase 4)

- **Admin faskes membaca agregat tanpa TOTP.** Hingga Fase 3 hanya layar yang direncanakan menjaga MFA admin faskes, padahal
  token aal1 yang dipakai langsung ke PostgREST sudah cukup untuk memanggil `facility_aggregate()` dan membuat kunci API.
  Migrasi `…000500` mensyaratkan aal2 pada keduanya di database (tes: aal1 ditolak, aal2 diterima, salah ketik sakelar tetap
  wajib, service_role untuk API mitra tidak terpengaruh).
- **Sesi konsultasi bisa bertumpuk (aplikasi Flutter).** Tabel `consultations` tidak punya penjaga bentrok: dua pengguna
  (atau satu pengguna dua kali) bisa memesan jam yang sama dengan psikolog yang sama. Ditutup `EXCLUDE USING gist` untuk
  psikolog dan untuk pasien, berlaku bagi semua penulis. Aplikasi Flutter menampilkan galat umum saat ditolak.
- **Terbuka: penulisan langsung ke `consultations` oleh pengguna.** Policy lama "Users can insert own consultations" (dipakai
  Flutter) mengizinkan status, tarif, dan jam apa pun, termasuk di luar jadwal psikolog, dan jalur ini tidak kena batas
  3 sesi mendatang milik `book_consultation`. Akibatnya satu akun masih bisa "menduduki" banyak slot lewat PostgREST
  langsung. Penutupnya: aplikasi Flutter memakai `book_consultation` lalu policy insert dicabut (mengubah aplikasi mobile,
  jadi belum dilakukan).
- **Nama kota di profil adalah masukan tak tepercaya** dan kini muncul di tiga tempat baru: tooltip peta (Leaflet memakai
  `innerHTML`; diganti node `textContent`, dijaga tes), berkas CSV laporan (awalan rumus diberi apostrof, `csvCell`), dan
  grafik atau tabel (React meng-escape).
- **Data percakapan ke pihak ketiga.** Isi Teman cerita dikirim ke Anthropic; yang dikirim hanya perintah sistem dan isi
  percakapan (tanpa nama, email, atau id), kunci hanya di server. Deteksi krisis berbasis aturan berjalan di server
  sebelum model, sehingga jalur keselamatan tidak bergantung pada pihak ketiga. Pengguna dapat menghapus percakapan
  (hapus sungguhan); peringatan krisis yang sempat dibuat tetap ada sebagai catatan keselamatan. Kunci yang dibundel di
  aplikasi mobile (F7) tetap harus diputar.
- **Psikolog hanya melihat jam sesi** bagi klien yang belum menautkan akun; nama muncul setelah `care_links` aktif.
- **Batas 20 pesan per jam tidak boleh menahan orang yang sedang krisis.** Rancangan awal (batas dicek sebelum deteksi krisis,
  urutan di ARCHITECTURE §7) akan menjawab 429 tepat saat seseorang yang sudah lama menulis mengetik tanda bahaya. Kini pesan
  krisis dikecualikan dari batas per jam (`exemptWhen`), tetap dibatasi 30 permintaan tulis per menit dan per IP, dan jawabannya
  tidak memanggil model sehingga tidak ada biaya yang bisa dikuras. Percakapan yang hilang, rusak, atau penuh juga tidak boleh
  menggagalkan jawaban krisis: ia dijawab di percakapan baru.

## Temuan tambahan (Fase 5)

- **Bukan celah, tetapi perlu diketahui: Zod 4 memicu pelanggaran CSP.** Pustaka itu mencoba `Function("")` untuk
  mengompilasi pemeriksa; CSP produksi kita sengaja tanpa `unsafe-eval`, jadi browser mencatat `securitypolicyviolation`
  di setiap halaman berformulir (galat ditangkap Zod, fungsi tidak terganggu). Pelanggaran yang "wajar" seperti ini
  membuat pelanggaran sungguhan sulit dikenali di antara kebisingan. Ditutup dengan mode `jitless` di browser
  (`instrumentation-client.ts`) dan dijaga tes yang mendengarkan event pelanggaran di build produksi.
- **CAPTCHA (Turnstile) di daftar dan masuk belum ada.** ARCHITECTURE §8 semula menyebutnya sebagai pertahanan. Yang berlaku:
  batas laju Supabase Auth dan batas laju web. Dicatat sebagai proyeksi, bukan klaim.
- **Halaman publik diperiksa terhadap klaim.** Landing tidak lagi menyatakan data masuk ke rekam kesehatan nasional (mode
  SATUSEHAT masih simulasi lokal) dan tidak menyebut "gratis" untuk konsultasi berbayar.
- **`robots.txt` menutup portal berlogin, API, pratinjau, dan callback auth**, dengan daftar portal diambil dari sumber yang
  sama dengan guard rute. Ini mengurangi pengindeksan, **bukan** kontrol akses: akses tetap dijaga middleware, layout server,
  dan RLS.
- **Terbuka dari pemeriksaan sebelumnya:** nomor bantuan krisis belum diverifikasi manusia; penghapusan akun mandiri belum
  ada (**ditutup di Gelombang 1**, lihat bawah); kebijakan privasi masih rancangan tanpa tinjauan hukum.

## Temuan tambahan (Gelombang 1, sebelum deploy)

- **Pemesanan konsultasi di aplikasi Flutter tidak pernah berjalan terhadap proyek cloud.** Datasource-nya membaca dan
  menulis tabel `psychologist_slots`, yang tidak ada di database; selain itu ia memasukkan baris `consultations` langsung
  (jalur policy lama, lihat Fase 4). Ditutup di sisi aplikasi: daftar slot kini dari `psychologist_available_slots` dan
  pemesanan dari `book_consultation`, dua fungsi database yang sama dengan web, sehingga aturan (kisi jam WIB, 1 jam sampai
  30 hari, maks. 3 sesi, tidak bentrok) berlaku sama di kedua klien. Policy "Users can insert own consultations" **belum**
  dicabut: build Flutter lama yang masih terpasang akan rusak. Cabut setelah build baru dirilis (migrasi tersendiri).
- **Tabel lain yang dirujuk Flutter tetapi tidak ada:** `mental_health_facilities`, `crisis_resources`,
  `crisis_access_logs`. Pembacaan faskes dan sumber krisis jatuh ke data lokal bila tabelnya tidak ada (aplikasi tidak
  rusak); pemanggilan `logCrisisAccess` tidak pernah dipakai dan dihapus. Daftar faskes di Flutter masih daftar bawaan,
  bukan data web.
- **Statistik wilayah dihitung tanpa persetujuan (celah privasi, sedang).** `facility_aggregate()` sebelumnya menghitung
  setiap pengguna yang berkota, padahal kota termasuk data pribadi dan tujuannya (angka untuk puskesmas, dinas, mitra)
  berbeda dari tujuan pengguna mengisinya. Kini opt-in eksplisit: `profiles.share_region_stats` bawaan `false`, dijaga
  trigger (tanpa kota atau provinsi, otomatis mati), dan hanya pengguna yang setuju dihitung. Ambang k ≥ 10 dan lingkup
  provinsi tidak berubah. Dapat dicabut kapan saja di Profil; kebijakan privasi dan ketentuan layanan (bagian 10)
  menjelaskannya. Data demo/sintetis sengaja diberi persetujuan agar dashboard berisi.
- **Tidak ada jalan sah untuk menyetujui akun psikolog.** Pengguna bisa meminta peran psikolog (`requested_role`), tetapi
  kolom itu dan `role` dijaga trigger, sehingga persetujuan hanya mungkin lewat SQL manual. Portal admin minimal kini
  menjadi jalan resminya, dengan tiga pengaman: (1) admin wajib sesi aal2 **di database**, bukan hanya di UI; (2) perubahan
  peran, baris direktori, dan jadwal terjadi atomik dalam satu fungsi, tanpa service role di Next.js; (3) setiap
  keputusan tercatat di `admin_actions`. Trigger penjaga hanya terbuka bagi fungsi itu: "pintu" berupa variabel transaksi
  yang hanya berlaku bila pemanggil bukan `authenticated`/`anon`. Diuji bahwa fungsi `security definer` biasa yang mencoba
  `update ... set role = 'admin'` tetap ditolak (42501) dan bahwa penanda tidak menempel antar-perintah.
- **Admin hanya membuka yang diperlukan.** Antrean memuat nama, email, dan waktu permohonan; tidak ada akses ke catatan
  kesehatan. Peninjauan **tidak memverifikasi STR ke sumber resmi**: admin yang memeriksa nomornya secara manual dan
  menandainya terverifikasi (proyeksi: verifikasi otomatis).
- **Penghapusan akun mandiri ditutup, dengan batas yang disengaja.** `delete_my_account()` menghapus akun pengguna beserta
  seluruh datanya (cascade). Hanya peran `user`: peran lain punya keterikatan yang tidak ikut terhapus (`api_clients.owner_id`
  dan `crisis_alerts.acknowledged_by` bersifat NO ACTION; `psychologists.profile_id` SET NULL), sehingga penghapusannya
  perlu keputusan pengelola. Web memeriksa ulang kata sandi lewat klien terpisah tanpa cookie sebelum memanggil fungsi, dan
  meminta kata penegas HAPUS diketik. Salinan cadangan penyedia basis data dapat bertahan sampai siklusnya berakhir
  (tertulis di kebijakan privasi).
- **Salinan data (UU PDP):** `/profil/unduh` mengunduh JSON seluruh data pengguna (17 bagian + riwayat akses). Tidak ikut:
  NIK terenkripsi, token dan nama kanal video, kode undangan pendamping yang masih berlaku. Bagian yang gagal dibaca
  dicantumkan sebagai "dilewati", bukan dihilangkan diam-diam; bagian yang mencapai 5.000 baris ditandai terpotong.
- **Batas usia dan persetujuan hanya pernyataan sendiri.** Pendaftaran web dan Flutter meminta pengguna menyatakan berusia
  17 tahun ke atas dan menyetujui syarat; versi naskah dan waktunya disimpan di metadata akun (`terms_version`,
  `terms_accepted_at`). Tidak ada verifikasi usia. Akun lama belum memiliki catatan persetujuan.
- **Tetap terbuka:** F7 (kunci Flutter dibundel, perlu diputar); nomor bantuan krisis belum diverifikasi (label 119 ext. 8
  diperbaiki menjadi SEJIWA Kemenkes, tetapi "Yayasan Pulih (021) 788-42580" dan "Hotline Kemenkes 1500-454" di data
  bawaan Flutter belum diperiksa); alamat kontak di naskah hukum Flutter (privasi@ dan dukungan@mindra.app) belum
  dikonfirmasi pemilik sehingga tidak dicantumkan di web; kebijakan privasi belum ditinjau ahli hukum.

## Temuan tambahan (Gelombang 2)

- **Berkas `.env` mobile masuk repositori publik?** Tidak: `.gitignore` menolaknya, repositori memuat `.env.example` tanpa
  rahasia, dan pemindaian pola rahasia (`sk-ant-`, JWT, kunci pribadi, `sbp_`) atas seluruh pohon sebelum push pertama hanya
  menemukan `.env` lokal (diabaikan git) dan satu nilai contoh palsu di tes. Repositori dimulai tanpa riwayat commit lama,
  jadi tidak ada kunci yang tersisa di riwayat.
- **Teman cerita di mobile kini tunduk pada kontrol server** yang sama dengan web: deteksi krisis berbasis aturan sebelum
  model, balasan krisis tetap (tanpa model), batas 20 pesan per jam (pesan krisis dikecualikan), dan perintah sistem tanpa
  emoji. Konsekuensinya: Teman cerita di mobile tidak berfungsi sampai web dideploy dan `WEB_API_BASE_URL` diisi (dinonaktifkan
  dengan pesan yang jelas, bukan gagal diam-diam). Deteksi krisis lokal di aplikasi tetap menyalakan lapisan bantuan seketika.
- **CI di GitHub berjalan hijau** (`.github/workflows/ci.yml`: web, e2e web, Flutter; [putaran 2](https://github.com/Argy1/Mindra/actions/runs/38585195586)). Putaran pertama
  menemukan cacat bukan-keamanan: folder aset Flutter kosong yang tidak dilacak git membuat `flutter analyze` gagal di klon bersih
  (diperbaiki). CI tidak memakai rahasia sungguhan: variabel Supabase berisi nilai tiruan dan `.env` Flutter berasal dari `.env.example`.

## Temuan tambahan (Gelombang 3)

- **Lokasi pengguna di "layanan terdekat" tidak meninggalkan perangkat.** Koordinat dari peramban hanya dipakai menghitung jarak di
  halaman itu; e2e merekam semua permintaan jaringan setelah lokasi diizinkan dan tidak ada yang memuat koordinat, dan tautan peta
  hanya memuat koordinat faskes. Tidak ada yang disimpan (tanpa cookie atau penyimpanan lokal). Izin lokasi sepenuhnya di tangan
  peramban dan bisa ditolak tanpa mengurangi fungsi (daftar tetap bisa dipakai lewat provinsi dan pencarian).
- **Izin `ai_summary` hanya membuka hitungan, bukan isi.** Fungsi `client_companion_activity` mengembalikan lima angka/waktu dan tidak
  ada policy baru pada `ai_conversations` (diuji: psikolog berizin tetap melihat 0 baris di tabel itu). Pendamping tidak pernah
  bisa (jenis izin itu tidak dipetakan untuk mereka). Psikolog tanpa TOTP (aal1) ditolak di database. Aksesnya dicatat sebelum dibaca.
- **Metadata akun bisa diubah pemiliknya sendiri.** `user_metadata` (tempat `terms_version`, `terms_accepted_at`, dan kini
  `onboarding_done_at`) bisa ditulis pengguna lewat API Auth mereka sendiri. Untuk penanda panduan awal itu tidak masalah (hanya
  kenyamanan), tetapi **bukan bukti persetujuan yang kebal ubah**: catatan versi syarat yang disetujui sebaiknya pindah ke tabel
  yang hanya bisa ditulis server bila suatu hari dibutuhkan sebagai bukti. Dicatat sebagai batas, bukan celah baru.
- **Direktori layanan publik memuat data contoh.** RLS `Facilities are public` sengaja mengizinkan anon membaca tabel; isinya kini seed
  sintetis. Halaman menyatakannya ("Daftar ini masih contoh") dan mengarahkan ke SEJIWA dan IGD; bendera `FACILITY_DIRECTORY_VERIFIED`
  mencegah data karangan tampil sebagai fakta bila nanti data sungguhan dimuat tanpa pemeriksaan.
- **Nomor 112 ditambahkan ke sumber kontak krisis, belum diverifikasi manusia** (`verified: false`, sama seperti SEJIWA).
- **Ketidakcocokan id hidrasi acak (aksesibilitas, bukan kebocoran).** Pada halaman server asinkron, id `useId` di komponen klien
  kadang berbeda antara HTML server dan hidrasi (React: "won't be patched up"), sehingga `aria-describedby` dan `aria-labelledby`
  bisa menunjuk ke id yang tidak ada pada ±5% pemuatan dalam pengujian. Sudah ada sebelum Gelombang 3 (dibuktikan pada commit
  `ce7ea70`). Dampaknya pada pembaca layar: galat kolom atau nama dialog tidak terbaca sampai halaman dimuat ulang; fungsi formulir
  tetap jalan. Mitigasi: satu ulangan di tes; perbaikan yang diusulkan (id stabil dari properti) ada di DECISIONS Gelombang 3.

## Temuan tambahan (pemeriksaan situs live, 14-15 Okt 2026)

- **Tautan email dan sitemap mengarah ke localhost saat `NEXT_PUBLIC_SITE_URL` terlewat.** Ditemukan pada situs Vercel yang
  baru dideploy: `sitemap.xml`, `robots.txt`, dan tautan email Auth memakai `http://localhost:3000`. Bukan kebocoran data,
  tetapi email konfirmasi akan membawa pengguna ke alamat yang salah. Ditutup dengan cadangan alamat produksi Vercel (hanya di
  produksi dan hanya bila variabel kosong; host divalidasi), diuji dan diukur ulang di situs live. Detail di DECISIONS
  ("Deploy dan pemeriksaan situs live").
- **Terkonfirmasi di situs live (tanpa akun):** guard rute (307 ke `/masuk`), API tanpa token 401, `/dev/*` 404, CSP tanpa
  `unsafe-eval`, HSTS, `X-Frame-Options: DENY`; `/api/health` menyentuh database dan menjawab ok.
- **Masih bergantung pada pemilik:** Site URL dan Redirect URLs Supabase (tujuan tautan email), pencabutan kunci Anthropic lama
  (F7), SMTP kustom, pemasangan TOTP pada akun psikolog, admin faskes, dan admin, serta verifikasi nomor krisis.

## Temuan tambahan (riset proposal, 15 Okt 2026)

- **Hotline krisis dijanjikan "24 jam" padahal sumber resminya "pagi hingga malam hari" (keselamatan, sedang).** Web dan Flutter
  menulis "24 jam" untuk 119 ext. 8 di banyak tempat (pita krisis, tombol bantuan, balasan krisis Teman cerita, layar krisis,
  hasil skrining). Halaman resmi Kemenkes menyebut layanan beroperasi "dari pagi hingga malam hari". Orang yang menelepon tengah
  malam akan mengira layanan sedang bermasalah. **Ditutup:** jam layanan ditulis seperti sumber di web dan Flutter, balasan
  krisis tetap menyertakan cadangan 24 jam (112 atau IGD), dan tes penjaga gagal bila jam layanan itu memuat "24". Jam layanan
  sebaiknya dikonfirmasi langsung ke healing119.id karena halaman Kemenkes hanya menulis kalimat umum.
- **Nama layanan krisis salah di dua lapis.** Flutter semula melabeli 119 ext. 8 "Into The Light" (ditutup di Gelombang 1, menjadi
  SEJIWA); kini label mengikuti sumber resmi Kemenkes, Healing119.id. Hubungan dengan SEJIWA tidak dinyatakan resmi (lihat DECISIONS).
- **Batas usia 17 tahun versus definisi anak di bawah 18 tahun (kepatuhan, sedang, BELUM ditutup).** Pendaftaran web dan Flutter
  hanya meminta pernyataan berusia 17 tahun ke atas (tanpa verifikasi). Menurut ulasan media tentang PP 33/2026 (berlaku 16 Januari
  2027), pemrosesan data anak memerlukan persetujuan orang tua atau wali dan pengendali wajib mengidentifikasi pengguna anak
  (Pasal 38 menurut Katadata; naskah resmi belum diperiksa). Pengguna berusia 17 tahun bisa termasuk "anak". Belum ditelaah ahli
  hukum dan belum diubah (keputusan pemilik): naikkan ke 18 tahun, tambah persetujuan orang tua, atau telaah hukum dulu.
- **Kode FHIR PSS-10 semula lokal** padahal ada kode LOINC resmi `106860-0`; kini dipakai (diverifikasi ACTIVE di LOINC 2.82).
  Kode `44261-6` dan `70274-6` juga terverifikasi. Bundel belum divalidasi dengan validator HL7.
