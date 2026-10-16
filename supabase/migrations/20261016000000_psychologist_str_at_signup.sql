-- =============================================================================
-- Mindra Web — nomor STR diminta saat pendaftaran calon psikolog
-- (temuan #13, laporan uji live 15 Okt 2026: kolom STR kosong di dialog persetujuan, admin harus mengetiknya sendiri).
--
-- ADITIF dan aman diterapkan sebelum maupun sesudah kode web di-deploy:
--   1. profiles.requested_str_number : nomor STR yang DIISI PEMOHON saat daftar. Hanya klaim untuk dicocokkan admin
--      dengan sumber resmi; bukan bukti. Sumber kebenaran STR yang diverifikasi tetap psychologists.str_number
--      (diisi admin_review_psychologist).
--   2. handle_new_user : bentuk sama persis dengan migrasi web (20261014000000), ditambah SATU kolom. Nilai hanya
--      disalin bila pemohon meminta peran psikolog; aplikasi Flutter tidak mengirim metadata itu, jadi perilakunya
--      tidak berubah. `set search_path = ''` ditulis ulang karena CREATE OR REPLACE menghapus pengaturan fungsi.
--   3. admin_pending_psychologist_applications : antrean admin DENGAN kolom STR. Fungsi lama
--      admin_pending_psychologists() TIDAK diubah atau dihapus (kode web yang belum diperbarui tetap jalan; migrasi
--      hanya boleh menambah).
-- =============================================================================

alter table public.profiles
  add column if not exists requested_str_number text;

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'profiles_requested_str_check'
                   and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles
      add constraint profiles_requested_str_check
      check (requested_str_number is null or char_length(requested_str_number) between 1 and 60);
  end if;
end $$;

comment on column public.profiles.requested_str_number is
  'Nomor STR yang diisi calon psikolog saat mendaftar (klaim; dicocokkan admin dengan sumber resmi sebelum disetujui).';

-- ── handle_new_user: salin permintaan peran DAN klaim STR dari metadata signup ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wants_psychologist boolean := coalesce(new.raw_user_meta_data->>'requested_role', '') = 'psychologist';
begin
  insert into public.profiles (id, email, name, requested_role, requested_str_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case when v_wants_psychologist then 'psychologist' else null end,
    case when v_wants_psychologist
         then nullif(left(btrim(coalesce(new.raw_user_meta_data->>'requested_str', '')), 60), '')
         else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ── Antrean admin dengan klaim STR ─────────────────────────────────────────────
create or replace function public.admin_pending_psychologist_applications()
returns table (id uuid, name text, email text, created_at timestamptz, str_number text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.app_role() = 'admin' and public.psychologist_mfa_ok()) then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;

  return query
  select p.id, p.name, p.email, p.created_at, p.requested_str_number
    from public.profiles p
   where p.requested_role = 'psychologist'
     and p.role = 'user'
   order by p.created_at;
end;
$$;

revoke execute on function public.admin_pending_psychologist_applications() from public, anon;
grant  execute on function public.admin_pending_psychologist_applications() to authenticated, service_role;
