# Mindra Web — Arsitektur

Dokumen ini adalah sumber kebenaran teknis. Bagian "Arsitektur Sistem" di proposal diambil dari sini.

## 1. Gambaran besar

```
┌──────────────────────┐      ┌───────────────────────────────────────────┐
│ Mindra App (Flutter) │──┐   │                 Vercel (Edge + CDN)        │
│ Android / iOS        │  │   │  ┌──────────────────────────────────────┐  │
└──────────────────────┘  │   │  │ Mindra Web — Next.js 15 (App Router) │  │
                          │   │  │  • Portal pengguna  /beranda …        │  │
┌──────────────────────┐  │   │  │  • Portal psikolog  /psikolog …       │  │
│ Browser (pengguna,   │──┼──▶│  │  • Portal pendamping /pendamping …    │  │
│ psikolog, pendamping,│  │   │  │  • Dashboard faskes /faskes …         │  │
│ admin faskes)        │  │   │  │  • API publik       /api/v1 …         │  │
└──────────────────────┘  │   │  └──────────────┬───────────────────────┘  │
                          │   └─────────────────┼──────────────────────────┘
┌──────────────────────┐  │                     │            │           │
│ Sistem mitra (SIMRS, │──┘ (API key)           ▼            ▼           ▼
│ Puskesmas)           │            ┌─────────────────┐ ┌─────────┐ ┌──────────────┐
└──────────────────────┘            │ Supabase         │ │ Upstash │ │ Anthropic API│
                                    │ Postgres + RLS   │ │ Redis   │ │ (AI teman    │
                                    │ Auth · Realtime  │ │ (rate   │ │  cerita)     │
                                    │ Storage          │ │  limit) │ └──────────────┘
                                    └────────┬─────────┘ └─────────┘
                                             │ FHIR R4 (OAuth2 client credentials)
                                             ▼
                                    ┌──────────────────┐
                                    │ SATUSEHAT        │
                                    │ (Kemenkes RI)    │
                                    └──────────────────┘
```

**Pesan utama untuk juri:** satu sumber data (Supabase) dipakai oleh dua aplikasi dan
dibagikan, dengan izin pengguna, ke tiga pihak (psikolog, pendamping, faskes) serta ke sistem
kesehatan nasional (SATUSEHAT) memakai standar terbuka (FHIR R4 + OpenAPI).

## 2. Peran (role) dan apa yang bisa mereka lihat

| Role             | Rute                                                                          | Akses data                                                                                      |
| ---------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `user`           | `/beranda`, `/asesmen`, `/jurnal`, `/teman-cerita`, `/konsultasi`, `/privasi`, `/profil` (plus halaman publik `/bantuan` dan `/layanan-terdekat`) | Hanya datanya sendiri                                                                           |
| `psychologist`   | `/psikolog/*`                                                                 | Data klien yang **memberi izin** lewat `care_links` (sesuai `permissions`)                      |
| `caregiver`      | `/pendamping/*`                                                               | Data orang yang didampingi lewat `caregiver_relationships` (tabel lama, sesuai `permissions`)   |
| `facility_admin` | `/faskes/*`                                                                   | **Hanya agregat anonim** (k-anonymity ≥ 10) untuk wilayah faskesnya. Tidak pernah data individu |
| `admin`          | `/admin`, `/admin/verifikasi`, `/admin/keamanan`                              | Meninjau permohonan akun psikolog (aal2 wajib). Tidak membuka catatan kesehatan siapa pun; tiap keputusan tercatat di `admin_actions` |

Satu akun bisa punya satu role utama (`profiles.role`). Role **tidak bisa diubah sendiri oleh
pengguna** (lihat §4.2).

## 3. Struktur folder

```
web/
├─ app/
│  ├─ (marketing)/            # landing, tentang, kebijakan privasi — statis/ISR
│  ├─ (auth)/masuk, daftar, lupa-sandi
│  ├─ (user)/beranda, asesmen, asesmen/[tipe], asesmen/hasil/[id],
│  │         jurnal, teman-cerita, konsultasi, privasi, profil
│  │         (dua grup rute: (shell) = di dalam AppShell; (focus) = mode fokus tanpa navigasi,
│  │          dipakai asesmen/[tipe]. Keduanya memeriksa peran dari DB; URL tidak berubah)
│  ├─ (psychologist)/psikolog (gerbang MFA di grup (portal)), psikolog/klien, psikolog/klien/[id],
│  │               psikolog/keamanan + psikolog/verifikasi (di LUAR gerbang MFA: tujuan redirect), psikolog/jadwal (rencana)
│  ├─ (caregiver)/pendamping, pendamping/[id]
│  ├─ (facility)/faskes
│  ├─ (marketing)/developers/ # dokumentasi API: halaman server dari dokumen OpenAPI (bukan Scalar)
│  ├─ api/v1/**/route.ts      # API publik (lihat §5)
│  └─ api/health/route.ts
├─ components/
│  ├─ ui/                     # Button, Card, Chip, Input, Dialog, Badge, Tabs, EmptyState…
│  ├─ charts/                 # MoodChart, SleepChart, ScoreTrend, RegionBar
│  ├─ layout/                 # AppShell (sidebar), MarketingHeader, Footer
│  └─ features/<fitur>/       # komponen khusus fitur
├─ lib/
│  ├─ domain/                 # LOGIKA MURNI + unit test
│  │  ├─ assessment/          # instruments.ts, scoring.ts, recommendations.ts
│  │  ├─ crisis/              # detector.ts, resources.ts
│  │  ├─ insight/             # weekly-insight.ts
│  │  └─ fhir/                # observation-mapper.ts (LOINC codes)
│  ├─ supabase/               # server.ts, client.ts, middleware.ts, database.types.ts
│  ├─ server/                 # hanya server: audit.ts, ratelimit.ts, satusehat-client.ts, ai.ts
│  ├─ api/                    # handler.ts (defineRoute/mount), auth, ratelimit, errors, keys, cursor, openapi, docs, routes/, services/
│  └─ validation/             # skema Zod bersama (dipakai form + API)
├─ middleware.ts              # refresh sesi + guard rute per role
├─ scripts/seed.ts            # data demo (semua sintetis, ditandai is_demo)
├─ instrumentation-client.ts  # berjalan di browser sebelum aplikasi: Zod jitless (CSP tanpa unsafe-eval)
├─ tests/  e2e/  load/        # vitest, playwright, k6 (read-endpoints.js) + node-load.mjs
├─ .github/workflows/         # ci.yml (lint, tipe, build, tes, e2e), uptime.yml
├─ design/                    # mockup HTML + tokens.css (referensi visual)
└─ docs/                      # PLAN, ARCHITECTURE, DESIGN, API, TESTING
```

## 4. Data

### 4.1 Tabel yang sudah ada (dipakai ulang, JANGAN diubah strukturnya)

`profiles`, `assessments`, `mood_entries`, `sleep_entries`, `night_reflections`,
`caregiver_relationships`, `psychologists`, `psychologist_schedules`, `consultations`,
`consultation_messages`, `ai_conversations`, `satusehat_sync_log`, `emergency_contacts`,
`activity_logs`, `notifications_log`, `exercise_sessions`, `thought_records`, `voice_journals`,
`reflection_questions`. Fungsi: `classify_assessment`, `get_latest_mood`, `handle_new_user`.

### 4.2 Migrasi baru: `../supabase/migrations/20261014000000_web_ecosystem.sql`

Semua additive. Ringkasan (Claude Code menulis SQL lengkapnya):

```sql
-- Role pengguna
alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('user','psychologist','caregiver','facility_admin','admin')),
  add column if not exists is_demo boolean not null default false,
  add column if not exists requested_role text; -- hanya 'psychologist' (antrean verifikasi)
-- Cegah pengguna mengubah role sendiri: TRIGGER `protect_profile_privileged_columns`, BUKAN
-- `revoke update (role, is_demo) ... from authenticated`. Revoke kolom tidak efektif karena
-- `authenticated` sudah punya UPDATE tingkat TABEL di Supabase (dibuktikan di
-- tests/db/web-ecosystem.test.ts). Peran juga disalin ke JWT (`app_metadata.role`) oleh trigger
-- supaya middleware tidak perlu query DB per navigasi; sumber kebenaran tetap `profiles.role`.

-- Hubungkan akun login ke data psikolog
alter table public.psychologists
  add column if not exists profile_id uuid unique references public.profiles(id) on delete set null;

-- Izin klien → psikolog (mirip caregiver_relationships)
create table public.care_links (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  psychologist_id uuid not null references public.psychologists(id) on delete cascade,
  permissions jsonb not null default
    '{"assessments":true,"mood":true,"sleep":true,"crisis_alerts":true,"ai_summary":false}',
  status text not null default 'active' check (status in ('pending','active','revoked')),
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (patient_id, psychologist_id)
);

-- Alert krisis (Realtime aktif)
create table public.crisis_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('assessment','ai_chat','mood','manual')),
  source_id uuid,
  severity text not null check (severity in ('high','critical')),
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  acknowledged_by uuid references public.profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);
alter publication supabase_realtime add table public.crisis_alerts;

-- Jejak audit: siapa melihat data siapa (bisa dilihat pemilik data di /privasi)
create table public.data_access_logs (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  actor_role text not null,
  resource text not null,          -- 'assessments' | 'mood_entries' | 'sleep_entries' | ...
  action text not null default 'read',
  created_at timestamptz not null default now()
);

-- Fasilitas kesehatan + admin-nya
create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('puskesmas','rumah_sakit','klinik','biro_psikologi')),
  city text not null, province text not null,
  address text, phone text, lat double precision, lng double precision,
  has_mental_health_service boolean not null default true
);
create table public.facility_admins (
  profile_id uuid references public.profiles(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete cascade,
  primary key (profile_id, facility_id)
);

-- Klien API untuk sistem mitra (key disimpan sebagai hash SHA-256)
create table public.api_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id),
  facility_id uuid references public.facilities(id),
  key_prefix text not null,        -- 8 karakter pertama, untuk identifikasi
  key_hash text not null unique,
  scopes text[] not null default '{aggregates:read}',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
```

Fungsi helper (semua `security definer`, `set search_path = ''`):

- `public.app_role() returns text` — role dari `profiles` untuk `auth.uid()` (jangan dinamai
  `current_role`, itu kata kunci SQL).
- `public.can_view(subject uuid, resource text) returns boolean` — true jika pemilik, atau ada
  `care_links` aktif dengan `permissions->>resource = true`, atau `caregiver_relationships` aktif
  dengan izin yang sesuai (`assessments`→`assessment_results`, `mood`→`mood_daily`).
- `public.facility_aggregate(p_facility uuid, p_from date, p_to date) returns table(...)` —
  agregasi per kota/minggu: jumlah pengguna aktif, rata-rata skor PHQ-9/GAD-7/PSS-10, distribusi
  kategori, jumlah alert krisis. **Grup dengan < 10 pengguna disembunyikan (k-anonymity)**.
  Hanya boleh dipanggil oleh `facility_admin` faskes tersebut atau API client ber-scope `aggregates:read`.
- Trigger `after insert on assessments` → jika PHQ-9 item 9 > 0 atau kategori `severe`,
  buat baris `crisis_alerts`. (Jadi alert juga terbit saat asesmen diisi dari **aplikasi mobile**.)

Policy RLS baru (tambahan, bukan pengganti policy lama):

- `assessments`, `mood_entries`, `sleep_entries`: `for select using (public.can_view(user_id, '<resource>'))`.
- `crisis_alerts`: pemilik dapat select; psikolog/caregiver dengan izin `crisis_alerts`/`emergency_alerts` dapat select & update status.
- `data_access_logs`: pemilik data (`subject_id = auth.uid()`) dapat select; insert hanya lewat fungsi `public.log_access()`.
- `care_links`: pasien dapat insert/update (memberi/mencabut izin); psikolog dapat select miliknya.
- `facilities`: select publik (direktori); write hanya `admin`.
- `api_clients`: hanya `owner_id` dan `admin`.

### 4.2b Migrasi lanjutan (Fase 1): pengerasan undangan pendamping dan integritas asesmen

Dua migrasi tambahan setelah `web_ecosystem`. Berbeda dari aturan "additive only", migrasi pertama **menghapus
policy lama** (atas izin pemilik proyek) karena celahnya ada di policy itu sendiri; tabel, kolom, dan data tidak
dihapus. Ringkasan di [TEMUAN-KEAMANAN.md](./TEMUAN-KEAMANAN.md).

| Objek                                                 | Fungsi                                                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `accept_caregiver_invite(kode)` (RPC)                 | Satu-satunya jalan menerima undangan: kode tepat, ≤ 14 hari, bukan milik sendiri, 5 gagal/15 menit |
| `decline_caregiver_invite(kode)` (RPC)                | Menolak undangan dengan aturan yang sama                                                       |
| `caregiver_patient_names()` (RPC)                     | Hanya `(patient_id, name)` pasien aktif, menggantikan akses ke seluruh baris profil           |
| trigger `trg_caregiver_relationships_assign_code`     | Kode undangan dibuat server (acak); kode kiriman klien selalu ditimpa                          |
| tabel `caregiver_invite_attempts`                     | Catatan percobaan gagal; RLS tanpa policy dan tanpa hak tabel, hanya fungsi di atas yang menulis |
| trigger `trg_assessments_enforce_integrity`           | Menghitung ulang `total_score` (PSS-10 item 4, 5, 7, 8 dibalik) dan `category` dari `answers`; menolak jawaban tidak lengkap |

Server Action web menghitung skor di server dan tidak pernah menerima skor dari klien; trigger di atas adalah
lapisan kedua dan berlaku juga untuk aplikasi mobile.

### 4.2c Migrasi Fase 2: ekosistem perawatan (`20261014000300_care_ecosystem.sql`)

| Objek                                                       | Fungsi                                                                                                         |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `psychologist_mfa_ok()`                                     | Benar bila klaim JWT `aal` = `aal2`, atau sakelar demo `app.psychologist_mfa = 'off'`; selain itu gagal tertutup |
| `can_view()` (diganti)                                      | Sama seperti sebelumnya, ditambah `and psychologist_mfa_ok()` pada cabang psikolog. Pemilik dan pendamping tidak berubah |
| `psychologist_clients()` (RPC)                              | Klien aktif psikolog yang masuk: hanya `(id, nama, sejak, izin)`; baris profil tidak pernah terbuka            |
| `patient_caregivers()` (RPC)                                | Pendamping milik pasien (aktif dan menunggu) beserta nama; kode undangan hanya untuk yang menunggu             |
| `my_access_log(limit)` (RPC)                                | Riwayat "siapa membuka datamu": hanya baris milik pemanggil, 1–500 baris                                       |
| `log_access_batch(subjek[], resource, aksi)`                | Mencatat akses banyak klien sekaligus (maks. 200); gagal seluruhnya bila satu subjek tidak berhak              |
| policy `consultations` + trigger `consultations_guard_staff_update` | Psikolog tertaut membaca konsultasi kliennya dan hanya boleh mengubah `session_summary`, `notes_for_patient`, `updated_at` |
| kolom `profiles.satusehat_consent`                          | Persetujuan sinkronisasi SATUSEHAT (Fase 3 memakainya)                                                         |

Semua fungsi `security definer` memakai `search_path = ''`, dicabut dari `public`/`anon`, dan diberikan ke
`authenticated` dan `service_role`. Uji: `tests/db/care-ecosystem.test.ts` (Postgres sungguhan, tanpa menyentuh
cloud) + 12 uji mutasi.

**Pembacaan data orang lain** (`lib/server/psychologist.ts`, `caregiver.ts`) selalu: (1) daftar subjek dari RPC/RLS,
(2) `auditAccess` untuk jenis data yang akan dibaca, (3) baru kueri, dan hanya untuk jenis yang diizinkan izinnya.

### 4.2d Migrasi Fase 3: penutup F5 (`20261014000400_drop_inert_psychologist_policies.sql`)

Hanya empat `drop policy if exists` pada policy psikolog lama yang membandingkan `psychologist_id` dengan
`auth.uid()` dan tidak pernah dipakai web: `assessments` ("Psychologists can view patient assessments"), `profiles`
("Psychologists can view patient profiles"), dan `consultations` (SELECT dan UPDATE). Jalur resmi (`can_view()` +
`care_links` + aal2, dan policy `consultations` dari `…000300`) tidak berubah. Policy `consultation_messages` tidak
disentuh. Uji: `tests/db/legacy-policies.test.ts`. Rincian: [TEMUAN-KEAMANAN.md](./TEMUAN-KEAMANAN.md), F5.

### 4.2e Migrasi Fase 4: MFA admin faskes dan pemesanan konsultasi (`20261014000500_facility_mfa_and_booking.sql`)

| Objek                                                 | Fungsi                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `facility_aggregate()` (diganti)                      | Cabang pengguna login mensyaratkan `psychologist_mfa_ok()` (aal2); service_role (API mitra) tidak terpengaruh |
| policy `api_clients` insert dan update                | Membuat dan mencabut kunci API mensyaratkan aal2                                                              |
| `consultation_span()` (immutable)                     | Rentang waktu sesi untuk constraint EXCLUDE                                                                   |
| `consultations_no_psychologist_overlap` / `_patient_` | `EXCLUDE USING gist`: tidak ada dua sesi aktif yang tumpang-tindih untuk psikolog atau pasien yang sama       |
| `psychologist_booked_slots()`                         | Jam terisi satu psikolog (waktu dan lama saja, tanpa identitas); rentang maks. 62 hari                        |
| `book_consultation()`                                 | Pemesanan terjaga: kisi jadwal WIB, 1 jam sampai 30 hari, maks. 3 sesi mendatang; galat berupa token tetap     |
| `psychologist_schedule()`                             | Jadwal milik psikolog yang masuk (aal2); nama klien hanya bila `care_links` aktif                              |

Butuh ekstensi `btree_gist` (skema `extensions`). Uji: `tests/db/facility-booking.test.ts` (44), `tests/db/consultation-parity.test.ts`
(kode slot TypeScript melawan fungsi database), dan 25 uji mutasi.

### 4.2f Migrasi Gelombang 1: statistik wilayah opt-in, peninjauan admin, hapus akun (`20261014000600_region_optin_admin_review.sql`)

| Objek                                                       | Fungsi                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| kolom `profiles.share_region_stats` (default `false`)       | Persetujuan eksplisit agar kota dan provinsi pengguna dihitung dalam angka gabungan wilayah                         |
| trigger `trg_profiles_region_stats`                         | Kota atau provinsi kosong membuat persetujuan otomatis `false` (tidak ada persetujuan tanpa wilayah)               |
| `facility_aggregate()` (diganti)                            | Hanya menghitung pengguna yang `share_region_stats` DAN punya kota; k ≥ 10 dan lingkup provinsi tetap               |
| `psychologist_available_slots(psikolog, dari, sampai)`      | Daftar slot kosong dengan aturan SAMA seperti `book_consultation` (kisi 60 menit WIB, sesi 50 menit, 1 jam sampai 30 hari); dipakai web dan Flutter |
| `delete_my_account()`                                       | Pengguna (peran `user`) menghapus akunnya sendiri; seluruh data ikut terhapus lewat `ON DELETE CASCADE`             |
| tabel `admin_actions`                                       | Jejak keputusan admin; RLS hanya admin aal2 yang membaca, tidak ada policy tulis, hak tulis dicabut                |
| `admin_pending_psychologists()`                             | Antrean pemohon (nama, email, waktu); menolak (42501) selain admin dengan aal2                                       |
| `admin_review_psychologist(...)`                            | Satu transaksi: validasi, ubah peran, buat baris direktori `psychologists` (dengan `profile_id`), jadwal, jejak     |
| `protect_profile_privileged_columns` (diganti)              | Ditambah "pintu peninjauan": variabel transaksi `app.profile_review` HANYA berlaku bila pemanggil bukan `authenticated`/`anon`, yaitu fungsi definer di atas |

Keputusan desain: persetujuan akun psikolog dikerjakan **di database dalam satu transaksi**, bukan dengan service role di
Next.js. Admin tidak memegang kunci sakti, tidak ada jalan "setengah jadi" (peran naik tetapi baris direktori tidak ada),
dan penjaga kolom istimewa pada `profiles` tetap menolak semua jalan lain. Uji: `tests/db/region-admin.test.ts` (33) dan
6 uji kesetaraan slot di `consultation-parity.test.ts`, plus 33 uji mutasi SQL.

### 4.2g Migrasi Gelombang 3: ringkasan penggunaan Teman cerita (`20261014000700_companion_activity_summary.sql`)

| Objek                                    | Fungsi                                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `client_companion_activity(klien, hari)` | Hitungan penggunaan Teman cerita (percakapan, pesan, hari aktif WIB, percakapan bertanda krisis, waktu terakhir) untuk 1 sampai 365 hari (bawaan 30). Menolak 42501 bila `can_view(klien, 'ai_summary')` salah: psikolog harus aal2, tautan aktif, dan izin menyala; pendamping tidak pernah (jenis ini tidak dipetakan untuk mereka) |

**Isi percakapan tidak pernah keluar** dari fungsi ini, dan tidak ada policy baru pada `ai_conversations`, jadi psikolog tidak
bisa membaca teks lewat jalur lain (diuji: psikolog berizin tetap melihat 0 baris di tabel itu). Web mencatat akses ke
`data_access_logs` SEBELUM memanggilnya. Uji: `tests/db/companion-activity.test.ts` (19) dan 22 uji mutasi.

### 4.3 Data demo

`scripts/seed.ts` (service role) membuat: 6 akun demo (pengguna, psikolog, pendamping, admin
faskes, admin Mindra, dan calon psikolog yang menunggu peninjauan) dengan kata sandi di README, ±300 pengguna sintetis tersebar di ~8 kota dengan riwayat
mood/tidur/asesmen 8 minggu, 10 psikolog, 20 faskes. Semua `is_demo = true` dan semua pengguna demo/sintetis
memberi persetujuan statistik wilayah (`share_region_stats = true`) agar dashboard faskes berisi. Hapus dengan
`pnpm seed --reset`.

## 5. API publik `/api/v1`

Gaya: REST + JSON, versi di path, respons `{ "data": ..., "error": null }` atau
`{ "data": null, "error": { "code", "message" } }`. Spesifikasi OpenAPI 3.1 di
`/api/v1/openapi.json` (dibangkitkan dari skema Zod yang sama dengan validasi, lewat `z.toJSONSchema` bawaan Zod 4;
tanpa `zod-openapi`), dokumentasi di `/developers` (halaman server sendiri, bukan Scalar).

Autentikasi:

- **Pengguna / aplikasi Mindra**: `Authorization: Bearer <Supabase access token>` → RLS berlaku.
- **Sistem mitra**: `X-API-Key: mk_live_...` → di-hash, dicocokkan ke `api_clients`, dicek scope.

| Method   | Path                                  | Auth    | Keterangan                                                                  |
| -------- | ------------------------------------- | ------- | --------------------------------------------------------------------------- |
| GET      | `/api/health`                         | —       | Status app + DB (dipakai uptime monitor)                                    |
| GET      | `/api/v1/instruments`                 | —       | Daftar instrumen & pertanyaan (PHQ-9, GAD-7, PSS-10, SRQ-20)                |
| POST     | `/api/v1/assessments`                 | Bearer  | Kirim jawaban → skoring di server → simpan → kembalikan hasil + rekomendasi |
| GET      | `/api/v1/assessments`                 | Bearer  | Riwayat (paginasi kursor)                                                   |
| GET/POST | `/api/v1/mood-entries`                | Bearer  |                                                                             |
| GET/POST | `/api/v1/sleep-entries`               | Bearer  |                                                                             |
| GET      | `/api/v1/insights/weekly`             | Bearer  | Ringkasan mingguan                                                          |
| GET      | `/api/v1/fhir/Observation?patient=me` | Bearer  | Hasil asesmen sebagai **FHIR R4 Bundle**                                    |
| POST     | `/api/v1/satusehat/sync`              | Bearer  | Kirim asesmen yang disetujui ke SATUSEHAT                                   |
| GET      | `/api/v1/psychologists`               | Bearer  | Direktori (filter spesialisasi, bahasa, q); Bearer karena RLS `psychologists` |
| GET      | `/api/v1/psychologists/{id}/slots`    | Bearer  | Slot dari `psychologist_schedules` − sesi aktif (`psychologist_booked_slots`) |
| POST     | `/api/v1/consultations`               | Bearer  | Booking (bentrok ditolak constraint EXCLUDE di DB → 409), 10 per jam         |
| GET      | `/api/v1/facilities?near=lat,lng`     | —       | Faskes terdekat                                                             |
| GET      | `/api/v1/facilities/{id}/aggregates`  | API key | Agregat anonim untuk sistem mitra                                           |
| POST     | `/api/v1/companion/chat`              | Bearer  | Streaming (SSE) AI teman cerita                                             |

Aplikasi Flutter **bisa** memakai endpoint yang sama di masa depan (sebut di proposal sebagai proyeksi).

**Status implementasi (Fase 3–4):** health, instruments, assessments (GET/POST), mood-entries, sleep-entries,
insights/weekly, fhir/Observation, satusehat/sync, facilities/{id}/aggregates, openapi.json, companion/chat (SSE),
psychologists, psychologists/{id}/slots, dan consultations (POST) sudah ada. `GET /api/v1/facilities?near=` belum (peta di
web memakai tabel `facilities` publik langsung).

Alur pada setiap rute (`defineRoute`, `lib/api/handler.ts`): batas laju per IP → autentikasi → batas laju per
kredensial → validasi Zod (jalur, query, badan) → handler → `{ data, error, meta }`.

| Aturan laju                  | Batas                      | Kunci                  |
| ---------------------------- | -------------------------- | ---------------------- |
| Semua rute (sebelum auth)    | 120 per menit              | IP                     |
| Rute publik                  | 60 per menit               | IP                     |
| Pengguna (Bearer), baca      | 120 per menit              | id pengguna            |
| Pengguna (Bearer), tulis     | 30 per menit               | id pengguna            |
| Kunci API                    | 60 per menit               | id klien API           |

Jendela geser; Upstash bila dikonfigurasi, memori proses sebagai cadangan. Galat memakai kode tetap
(`invalid_json` 400, `unauthorized` 401, `forbidden` 403, `not_found` 404, `payload_too_large` 413,
`unsupported_media_type` 415, `validation_failed` 422, `rate_limited` 429, `internal_error` 500, `upstream_error` 502,
`not_configured` 503). Badan maksimal 32 kB dan hanya `application/json`. Seluruh kueri API menyaring `user_id`
secara eksplisit (RLS saja tidak cukup; lihat TEMUAN-KEAMANAN, Fase 3).

## 6. SATUSEHAT

- Alur: pengguna menyetujui (consent) → asesmen dipetakan ke `Observation` FHIR R4
  (PHQ-9 = LOINC `44261-6`, GAD-7 = LOINC `70274-6`; PSS-10/SRQ-20 memakai coding lokal) →
  token OAuth2 client credentials → POST ke SATUSEHAT → catat di `satusehat_sync_log`.
- Butuh kredensial **sandbox/staging** SATUSEHAT (organization id, client id, client secret)
  dan IHS number pasien. **Jika kredensial belum ada**, `lib/server/satusehat-client.ts` memakai
  adapter `SATUSEHAT_MODE=mock` supaya alur tetap bisa didemokan. Tulis dengan jujur di proposal mode mana yang dipakai.
- **Penyimpangan dari rancangan awal (Fase 3):** mode `mock` adalah simulasi **lokal** (struktur Observation
  diperiksa, dijawab dengan id tiruan `mock-...`, tidak ada permintaan jaringan), bukan kiriman ke server HAPI FHIR
  publik: mengirim hasil skrining pengguna sungguhan ke server uji publik melanggar prinsip privasi proyek ini. Mode
  `staging` memakai OAuth2 client credentials lalu `POST /Observation`; tanpa IHS number pasien ia gagal sebagai
  kegagalan yang tidak bisa diulang, tidak mengirim `Patient` palsu. Nilai `SATUSEHAT_MODE` yang salah ketik ditolak.
- Sinkronisasi hanya untuk pengguna yang menyalakan persetujuan (`profiles.satusehat_consent`); hasilnya dicatat di
  `satusehat_sync_log` dan tidak digandakan bila diulang. Bundel FHIR tidak memuat jawaban per butir.
- Verifikasi kode LOINC sebelum dipakai di proposal (belum dicek ulang ke loinc.org).

## 7. AI teman cerita

- Route Handler server-side, streaming SSE. API key di env server (`ANTHROPIC_API_KEY`), model
  dari env `ANTHROPIC_MODEL`.
- Urutan: rate limit (20 pesan/jam/pengguna) → deteksi krisis **berbasis aturan** (port
  `crisis_detector.dart`) **sebelum** memanggil model → jika krisis: buat `crisis_alerts`,
  kirim respons krisis tetap (bukan dari model) + tampilkan overlay → jika aman: panggil model
  dengan system prompt dari `../lib/features/ai_companion/data/datasources/companion_remote_datasource.dart`.
- Simpan percakapan di `ai_conversations` (tabel lama, kompatibel dengan mobile).
- **Terimplementasi (Fase 4):** `lib/server/companion.ts` (urutan di atas), `lib/domain/companion/*` (prompt, balasan krisis,
  bentuk pesan), `lib/server/companion-model.ts` (adaptor Anthropic, default `claude-sonnet-5-5`), `lib/api/sse.ts`. Peringatan krisis dari
  chat tidak diulang selama 6 jam bila masih terbuka. Rute chat memakai `defineRoute` dengan hasil `stream`. **Pengecualian
  dari urutan di atas:** pesan yang memuat tanda krisis dikecualikan dari batas 20 pesan per jam (batas per menit dan per IP
  tetap berlaku); orang yang sedang krisis tidak boleh mendapat 429.
- **Penting:** aplikasi Flutter saat ini membundel API key di `.env` aset. Key itu harus dirotasi
  dan aplikasi mobile sebaiknya memanggil endpoint web ini. Masukkan sebagai temuan keamanan +
  perbaikan di proposal (menunjukkan kesadaran keamanan).

## 8. Keamanan (untuk bab proposal & tanya jawab juri)

| Ancaman                      | Mitigasi                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| Akses data orang lain        | RLS di setiap tabel + `can_view()`; role tidak bisa diubah sendiri                              |
| Input berbahaya / injection  | Zod di semua batas; query lewat Supabase client (terparameter); React escape output             |
| XSS                          | CSP via `next.config` headers (tanpa nonce, lihat catatan), tanpa penyisipan HTML mentah        |
| CSRF                         | Server Actions (origin check bawaan Next.js), cookie `SameSite=Lax` (tidak `HttpOnly`, lihat catatan) |
| Brute force / abuse          | Upstash rate limit per IP + per user + per API key. CAPTCHA (Turnstile) **belum dipasang** (proyeksi) |
| Kebocoran secret             | Secret hanya di server env; `server-only` import guard                                          |
| Penyalahgunaan data psikolog | `data_access_logs` + halaman `/privasi` tempat pengguna melihat siapa mengakses & mencabut izin |
| Re-identifikasi data agregat | k-anonymity ≥ 10, tidak ada data individu di dashboard faskes/API mitra                         |
| Akun psikolog dibobol        | MFA (TOTP Supabase) wajib untuk `psychologist`, **ditegakkan di database** lewat `can_view()` (token aal1 ditolak walau dipakai langsung ke API); `facility_admin` ikut ditegakkan di database (`facility_aggregate()` dan kunci API butuh aal2, migrasi `…000500`) |
| Eskalasi hak lewat portal admin | Admin wajib aal2 **di database** (`psychologist_mfa_ok()` di setiap fungsi admin); satu-satunya jalan menaikkan peran adalah fungsi definer yang membuka "pintu peninjauan" di trigger penjaga; fungsi definer biasa tetap ditolak (diuji); semua keputusan tercatat di `admin_actions` |
| Data wilayah dipakai tanpa persetujuan | `share_region_stats` bawaan mati, dijaga trigger (tanpa kota atau provinsi, otomatis mati), dan `facility_aggregate()` hanya menghitung yang setuju; dapat dicabut kapan saja di Profil |
| Akun sulit dihapus / data tertinggal | `delete_my_account()` + kata sandi diperiksa ulang lewat klien terpisah + kata penegas HAPUS; unduh salinan JSON di Profil (`/profil/unduh`, tanpa NIK, token video, kode undangan) |
| Lokasi pengguna bocor lewat "layanan terdekat" | Lokasi hanya dipakai di peramban untuk menghitung jarak; tidak ada permintaan jaringan yang memuat koordinat pengguna (diuji dengan merekam semua permintaan), tautan peta hanya memuat koordinat faskes, dan tidak ada yang disimpan |
| Psikolog membaca isi curhat | Izin `ai_summary` hanya membuka HITUNGAN penggunaan lewat fungsi database; tidak ada policy baca pada `ai_conversations` untuk psikolog |
| Header keamanan              | HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors 'none'       |

Catatan keputusan (Fase 0b):

- **CSP tanpa nonce.** `script-src` memakai `'unsafe-inline'` karena CSP bernonce memaksa render
  dinamis di setiap permintaan, yang meniadakan halaman marketing statis di CDN (§9). Yang tetap
  berlaku: `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri`/`form-action`
  `'self'`, dan `connect-src` hanya ke diri sendiri + Supabase. Jalur peningkatan: nonce lewat
  middleware khusus rute berdata.
- **Zod berjalan `jitless` di browser** (`instrumentation-client.ts`). Zod 4 menguji dukungan `eval` lewat `Function("")`; CSP kita
  menolaknya dan browser mencatatnya sebagai pelanggaran CSP walau galatnya tertangkap. Di server JIT tetap menyala.
- **Cookie sesi tidak `HttpOnly`.** Klien Supabase di browser membaca token dari cookie untuk
  Realtime (alert krisis psikolog). Mitigasi: `SameSite=Lax`, `Secure` di produksi, CSP di atas,
  dan seluruh alur masuk/keluar lewat Server Action.
- **Peran berlapis.** Middleware membaca peran dari klaim JWT (cepat, bisa basi sampai token
  diperbarui); layout portal memanggil `requireRole()` yang membaca `profiles.role`; RLS menjaga
  data. Dua lapis pertama hanya UX, RLS yang mengamankan.
- **Temuan pada skema aplikasi Flutter** (undangan pendamping bisa diambil alih, dsb.) ada di
  [`TEMUAN-KEAMANAN.md`](./TEMUAN-KEAMANAN.md).

## 9. Skalabilitas & ketersediaan (bukti, bukan klaim)

- **Render:** halaman marketing statis/ISR di CDN Vercel; dashboard pakai RSC + streaming (`loading.tsx`).
- **Database:** indeks `(user_id, created_at desc)` di tabel time-series; agregasi faskes via
  fungsi SQL (bisa diganti materialized view yang di-refresh tiap jam jika data besar).
- **Stateless:** tidak ada state di server Next.js → bisa diskalakan horizontal otomatis oleh Vercel.
- **Rate limit + caching** respons publik (`/instruments`, `/psychologists`, `/facilities`) dengan `revalidate`.
- **Monitoring:** `/api/health` + uptime monitor gratis (mis. UptimeRobot) → screenshot uptime untuk proposal.
  Catatan: Supabase free tier bisa _pause_ jika tidak aktif ±7 hari — monitor ini sekaligus
  menjaganya tetap hidup selama masa penilaian (31 Okt–27 Nov).
- **Bukti:** laporan k6 (target: 200 VU, p95 < 500 ms, error < 1% di endpoint baca), skor
  Lighthouse, hasil Playwright. Ada di [`TESTING.md`](./TESTING.md): Lighthouse dan uji beban lokal (padanan Node) sudah;
  k6 asli, uptime, dan ukuran di produksi menunggu deploy.

## 10. Variabel lingkungan (`web/.env.local`, contoh di `.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only
ANTHROPIC_API_KEY=                # server only
ANTHROPIC_MODEL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SATUSEHAT_MODE=mock               # mock | staging
SATUSEHAT_AUTH_URL=
SATUSEHAT_BASE_URL=
SATUSEHAT_ORG_ID=
SATUSEHAT_CLIENT_ID=
SATUSEHAT_CLIENT_SECRET=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
MFA_ENFORCEMENT=                  # kosong = wajib; hanya persis "off" yang melonggarkan (demo)
```
