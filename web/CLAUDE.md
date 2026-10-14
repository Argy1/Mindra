# Mindra Web — instruksi untuk Claude Code

Baca file ini dulu, lalu `docs/PLAN.md` (urutan kerja), `docs/ARCHITECTURE.md`
(data model, API, keamanan) dan `docs/DESIGN.md` + `design/*.html` (tampilan).

## Konteks

- **Mindra** = ekosistem kesehatan mental digital untuk masyarakat Indonesia.
- Folder induk (`../`) berisi **aplikasi Flutter (mobile)** yang SUDAH JADI. Jangan ubah
  apa pun di `../lib`, `../android`, `../ios`, `../test`, `../pubspec.yaml`.
  **Pengecualian (izin pemilik proyek, 13 Okt 2026):** perubahan di folder induk boleh bila perlu, dengan
  syarat dicatat di `docs/DECISIONS.md` dan `flutter analyze` + `flutter test` tetap hijau. Perubahan
  pertama: perbaikan celah undangan pendamping di `lib/features/caregiver/data/repositories/caregiver_repository_impl.dart`.
- Folder ini (`web/`) adalah **Mindra Web (Next.js)** untuk lomba **UINIC 8.0 Web Development
  Competition 2026**. Tema: _"Engineering Interconnected Web Solutions to Empower Digital
  Ecosystems"_. Subtema: Kesehatan (+ AI).
- Web dan aplikasi mobile memakai **project Supabase yang sama**. Ini inti ceritanya:
  dua aplikasi, satu backend, data saling terhubung secara realtime, plus terhubung ke SATUSEHAT.
- **Tenggat keras: 30 Oktober 2026 23.59 WIB** (proposal + repo + demo online).
  Batas internal: 29 Oktober. Fitur yang tidak selesai → masuk "proyeksi pengembangan".

## Kriteria juri (prioritaskan sesuai bobot)

1. Inovasi & relevansi solusi — 30%
2. Kesesuaian dengan kebutuhan pengguna — 20%
3. Kualitas teknis: validasi input, autentikasi, kode modular & maintainable — 20%
4. UI/UX: konsistensi, usability, **accessibility** — 15%
5. Dokumentasi & kelengkapan proposal — 15%

Juri akan membuka repo GitHub. Kode harus rapi, punya README, dan mudah dibaca.

## Stack (sudah diputuskan — jangan diganti tanpa bertanya)

- Next.js 15 (App Router, React Server Components, Server Actions, Route Handlers), TypeScript strict
- Tailwind CSS v4 dengan token dari `design/tokens.css` (turunan `../colors_and_type.css`)
- Supabase: Postgres + RLS, Auth, Realtime, Storage — via `@supabase/ssr`
- Zod untuk SEMUA validasi input (form, Server Action, Route Handler)
- Recharts untuk grafik, Leaflet + OpenStreetMap untuk peta
- Anthropic SDK (`@anthropic-ai/sdk`) untuk AI companion — **hanya di server**
- Upstash Ratelimit (`@upstash/ratelimit` + Redis) untuk rate limiting
- Vitest (unit), Playwright (e2e), k6 (load test)
- Ikon: `@phosphor-icons/react`
- Deploy: Vercel. Package manager: **pnpm**.

## Aturan wajib

### Database

- Migrasi baru ditaruh di `../supabase/migrations/` dengan nama `2026MMDDHHMMSS_*.sql`.
- **Migrasi hanya ADDITIVE** (add table/column/policy/function). Jangan drop/rename apa pun yang
  dipakai aplikasi Flutter. Aplikasi mobile harus tetap jalan.
- Setiap tabel baru WAJIB `enable row level security` + policy. Tidak ada tabel tanpa RLS.
- Fungsi `security definer` wajib `set search_path = ''` dan nama objek fully-qualified.
- Setelah migrasi berubah, regenerasi tipe: `pnpm db:types` → `lib/supabase/database.types.ts`.

### Keamanan

- Secret (service role key, ANTHROPIC_API_KEY, SATUSEHAT secret, Upstash token) hanya di env
  server. Tidak pernah memakai prefix `NEXT_PUBLIC_`. Tidak pernah dikirim ke client.
- `createServiceClient()` (service role) hanya boleh dipakai di `lib/server/**` untuk kasus yang
  terdokumentasi (seed, sinkronisasi SATUSEHAT, agregasi). Semua akses data pengguna lewat client
  yang membawa sesi pengguna supaya RLS yang menjaga.
- Setiap akses psikolog/caregiver/faskes ke data milik orang lain → catat ke `data_access_logs`
  lewat `lib/server/audit.ts`.
- Semua Route Handler `/api/v1/*`: validasi Zod → auth → rate limit → handler → respons
  terstandar `{ data, error }`. Gunakan helper `lib/api/handler.ts`.
- Jangan pernah `console.log` data kesehatan pengguna.

### Kode

- Logika domain murni (skoring asesmen, deteksi krisis, insight, mapper FHIR) ada di `lib/domain/**`
  sebagai fungsi murni tanpa I/O, masing-masing punya unit test Vitest. Port dari Dart:
  - `../lib/features/assessment/data/assessment_model.dart` dan
    `../lib/features/assessment/presentation/providers/assessment_provider.dart` (instrumen, skoring, kategori, rekomendasi)
  - SQL `public.classify_assessment` di `../supabase/migrations/` (kategori di sisi DB)
  - `../lib/features/ai_companion/data/crisis_detector.dart`
  - `../lib/features/home/domain/weekly_insight_engine.dart`
  - `../lib/features/satusehat/data/fhir_mappers.dart`
    Hasil skoring web dan mobile HARUS identik.
- Server Component secara default; `"use client"` hanya untuk interaksi.
- Satu komponen per file, nama PascalCase. Komponen UI dasar di `components/ui/`.
- Jangan pakai `any`. Jangan menonaktifkan aturan lint tanpa komentar alasan.

### Bahasa & copy (penting — ini aplikasi kesehatan mental)

- Semua teks UI dalam **Bahasa Indonesia**, menyapa pengguna dengan **"kamu"** (bukan "Anda").
- Sentence case. Tidak ada tanda seru di copy biasa. Tidak ada emoji di UI sistem.
- Hindari kata klinis: "gangguan", "diagnosa", "pasien" di sisi pengguna (di portal psikolog boleh "klien").
- Jangan meremehkan perasaan ("tenang aja", "pasti bisa"). Validasi: "Hari ini terasa berat. Itu valid."
- Hasil asesmen selalu disertai catatan: ini skrining, bukan diagnosis.
- Saat krisis terdeteksi: tampilkan banner krisis (warna danger) dengan tombol langsung ke
  layanan darurat — lihat `design/app-asesmen.html`. Daftar kontak krisis disimpan di satu file
  `lib/domain/crisis/resources.ts` (sumber tunggal). Catatan: aplikasi Flutter melabeli
  "119 ext 8" sebagai Into The Light, padahal 119 ext 8 adalah layanan SEJIWA (Kemenkes).
  Argy wajib memverifikasi ulang setiap nomor sebelum rilis.

### Aksesibilitas (bobot 15%)

- Target WCAG 2.1 AA: kontras ≥ 4.5:1, semua elemen bisa dipakai dengan keyboard,
  focus ring terlihat (`--glow-biru`), `aria-live` untuk alert, label pada setiap input.
- Hormati `prefers-reduced-motion`. Target tap ≥ 44×44px.
- Target Lighthouse: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

## Perintah

```bash
pnpm dev            # jalankan lokal
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest
pnpm test:e2e       # playwright
pnpm db:types       # supabase gen types
pnpm seed           # isi data demo (lihat scripts/seed.ts)
```

## Definition of done (setiap tugas)

1. `pnpm lint && pnpm typecheck && pnpm test` lolos.
2. Fitur dicoba di browser (desktop 1440px dan mobile 390px).
3. Tampilan sesuai `design/*.html` dan token di `design/tokens.css`.
4. Jika ada tabel/endpoint baru: RLS + validasi + entri di `docs/ARCHITECTURE.md` / OpenAPI.
5. Centang tugas di `docs/PLAN.md` dan commit dengan pesan konvensional (`feat:`, `fix:`, `docs:`).

## Cara kerja dengan pemilik proyek (Argy)

Argy harus bisa menjelaskan setiap keputusan teknis di babak final (40% nilai = tanya jawab).
Jadi: sebelum mengerjakan fitur besar, jelaskan rencana singkat; setelah selesai, rangkum
_apa_ yang dibuat dan _kenapa_ desainnya begitu dalam 3–5 poin. Jangan menambah dependency
besar atau mengubah arsitektur tanpa bertanya.
