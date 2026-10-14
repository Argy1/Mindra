-- =============================================================================
-- Mindra — menghapus policy psikolog lama yang tidak berlaku (menutup sisa F5)
-- =============================================================================
-- Lihat web/docs/TEMUAN-KEAMANAN.md (F5). Idempotent.
--
-- Skema bawaan aplikasi Flutter memberi psikolog akses lewat empat policy yang membandingkan
-- `auth.uid()` dengan `consultations.psychologist_id`. Kolom itu merujuk `psychologists.id` (UUID acak milik
-- tabel psikolog), BUKAN id akun login, jadi pada data nyata ekspresinya tidak pernah benar: policy ini
-- tidak berfungsi dan tidak berbahaya SEKARANG (diperiksa di cloud: 0 dari 10 baris `psychologists` punya id
-- yang sama dengan akun login; pengguna biasa tidak bisa menambah baris `psychologists`).
--
-- Bahayanya laten. Bila suatu hari satu baris `psychologists` dibuat (oleh service role) dengan id yang sama
-- dengan sebuah akun login, keempat policy ini membuka SKRINING, PROFIL LENGKAP, dan KONSULTASI pasien yang
-- punya konsultasi terjadwal dengannya, tanpa persetujuan `care_links` dan tanpa syarat MFA (aal2) yang
-- ditegakkan `can_view()`. Jalur resmi untuk psikolog sudah ada dan benar:
--   * data klien      : `can_view()` lewat policy "Linked viewers read …" (care_links + MFA)
--   * konsultasi      : "Linked psychologists view consultations" / "… write session notes" (migrasi 000300)
-- Maka keempat policy lama dihapus. Tidak ada layar psikolog di aplikasi Flutter yang bergantung padanya.
--
-- Tidak disentuh (sengaja): policy `consultation_messages` yang juga membandingkan `psychologist_id` dengan
-- `auth.uid()`. Ia hanya mengatur obrolan di dalam satu konsultasi (bukan data kesehatan klien yang
-- dibagikan lewat izin), dan memperbaikinya adalah fitur obrolan psikolog yang belum ada di web.
-- =============================================================================

drop policy if exists "Psychologists can view patient assessments" on public.assessments;
drop policy if exists "Psychologists can view patient profiles"    on public.profiles;
drop policy if exists "Psychologists can view their consultations" on public.consultations;
drop policy if exists "Psychologists can update their consultations" on public.consultations;
