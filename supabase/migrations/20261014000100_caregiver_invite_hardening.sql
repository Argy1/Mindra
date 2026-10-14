-- =============================================================================
-- Mindra — pengerasan undangan pendamping (menutup F1, F3, F4, F8)
-- =============================================================================
-- Lihat web/docs/TEMUAN-KEAMANAN.md. Ringkasan masalah pada skema bawaan Flutter:
--   F1  semua pengguna login bisa MEMBACA dan MENGUBAH semua undangan `pending`
--       (policy SELECT/UPDATE `or status = 'pending'`), lalu menerimanya atas nama sendiri.
--   F8  kode undangan dibuat aplikasi dari jam (millisecondsSinceEpoch): bisa ditebak.
--   F3  pendamping aktif membaca SELURUH baris profil pasien (email, tanggal lahir, nik_encrypted),
--       padahal izin yang diberikan pasien hanya mood/asesmen.
--   F4  `declineInvite` selalu gagal oleh RLS (UPDATE tanpa WITH CHECK).
--
-- Perbaikan:
--   1. Kode undangan SELALU dibuat server (trigger BEFORE INSERT) dari sumber acak; nilai kiriman
--      klien diabaikan. Status/caregiver_id/created_at pada INSERT dipaksa ke nilai aman.
--   2. Menerima/menolak undangan hanya lewat RPC accept_caregiver_invite / decline_caregiver_invite:
--      kode harus tepat, belum kedaluwarsa (14 hari), bukan undangan milik sendiri, dan percobaan
--      yang gagal dibatasi (5 per 15 menit per akun).
--   3. Policy SELECT/UPDATE dipersempit: hanya pasien dan pendamping terkait yang melihat/mengubah.
--   4. Policy "Caregivers can view patient profile" dihapus; nama pasien dibaca lewat RPC
--      caregiver_patient_names() yang hanya mengembalikan (patient_id, name).
--   5. Penjaga caregiver_relationships ditulis ulang agar aman terhadap NULL: sesi tanpa klaim JWT
--      (SQL Editor, migrasi) tidak ikut terblokir.
--
-- Berbeda dari migrasi web, berkas ini MENGHAPUS policy lama (drop policy) atas izin pemilik proyek.
-- Tabel, kolom, dan data tidak dihapus. Idempotent. Aplikasi Flutter versi lama masih bisa memuat
-- daftar tetapi tidak bisa menerima undangan sampai diperbarui (pesan "kode tidak valid").
-- =============================================================================


-- =============================================================================
-- 1. Log percobaan gagal (hanya dapat ditulis fungsi di bawah)
-- =============================================================================
create table if not exists public.caregiver_invite_attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_caregiver_invite_attempts_user
  on public.caregiver_invite_attempts (user_id, attempted_at desc);

alter table public.caregiver_invite_attempts enable row level security;
-- Sengaja tanpa policy dan tanpa hak tabel: pengguna tidak boleh membaca atau menghapus catatannya
-- sendiri (menghapus = mengulang jatah menebak).
revoke all on public.caregiver_invite_attempts from anon, authenticated;


-- =============================================================================
-- 2. Kode undangan dibuat server
-- =============================================================================
-- 8 karakter dari alfabet 32 huruf/angka tanpa karakter yang mudah tertukar (I, O, 0, 1), sama
-- dengan aplikasi. Tiap karakter memakai satu byte acak: 256 habis dibagi 32, jadi sebarannya rata.
-- Byte ke-6 dan ke-8 UUID v4 mengandung bit tetap (versi/varian), jadi dilewati.
create or replace function public.caregiver_relationships_assign_invite_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  c_alphabet constant text  := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c_positions constant int[] := array[0, 1, 2, 3, 4, 5, 10, 11];
  v_bytes bytea;
  v_code  text;
  v_pos   int;
  v_try   int := 0;
begin
  -- service_role, SQL Editor, migrasi, dan seed boleh menentukan sendiri. Bentuk `= 'authenticated'`
  -- (bukan `<>`) disengaja: tanpa klaim JWT auth.role() bernilai NULL dan harus dianggap bukan pengguna.
  if coalesce((select auth.role()), '') <> 'authenticated' then
    return new;
  end if;

  new.status       := 'pending';
  new.caregiver_id := null;
  new.created_at   := now();

  loop
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_code  := '';
    foreach v_pos in array c_positions loop
      v_code := v_code || substr(c_alphabet, (get_byte(v_bytes, v_pos) % 32) + 1, 1);
    end loop;
    exit when not exists (
      select 1 from public.caregiver_relationships r where r.invite_code = v_code
    );
    v_try := v_try + 1;
    if v_try >= 10 then
      raise exception 'Gagal membuat kode undangan yang unik.' using errcode = 'P0001';
    end if;
  end loop;

  new.invite_code := v_code;
  return new;
end;
$$;

drop trigger if exists trg_caregiver_relationships_assign_code on public.caregiver_relationships;
create trigger trg_caregiver_relationships_assign_code
  before insert on public.caregiver_relationships
  for each row execute function public.caregiver_relationships_assign_invite_code();

revoke execute on function public.caregiver_relationships_assign_invite_code()
  from public, anon, authenticated;


-- =============================================================================
-- 3. RPC menerima / menolak undangan
-- =============================================================================
create or replace function public.check_caregiver_invite_throttle(p_user uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*)
        from public.caregiver_invite_attempts a
       where a.user_id = p_user
         and a.attempted_at > now() - interval '15 minutes') >= 5 then
    raise exception 'Terlalu banyak percobaan kode. Coba lagi beberapa menit lagi.'
      using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.check_caregiver_invite_throttle(uuid) from public, anon, authenticated;

-- Mengembalikan baris relasi sebagai jsonb (bentuk yang sama dengan SELECT *), atau NULL bila kode
-- tidak cocok. Sengaja TIDAK membedakan "kode salah", "kedaluwarsa", dan "undangan milik sendiri".
create or replace function public.accept_caregiver_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_row  public.caregiver_relationships%rowtype;
begin
  if v_uid is null then
    raise exception 'Harus masuk terlebih dahulu.' using errcode = '28000';
  end if;

  perform public.check_caregiver_invite_throttle(v_uid);

  if length(v_code) between 4 and 32 then
    select * into v_row
      from public.caregiver_relationships r
     where r.invite_code = v_code
       and r.status = 'pending'
       and r.created_at > now() - interval '14 days'
       and r.patient_id <> v_uid
     for update;
  end if;

  if not found or v_row.id is null then
    insert into public.caregiver_invite_attempts (user_id) values (v_uid);
    delete from public.caregiver_invite_attempts where attempted_at < now() - interval '1 day';
    return null;
  end if;

  update public.caregiver_relationships r
     set caregiver_id = v_uid, status = 'active'
   where r.id = v_row.id
   returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.decline_caregiver_invite(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_id   uuid;
begin
  if v_uid is null then
    raise exception 'Harus masuk terlebih dahulu.' using errcode = '28000';
  end if;

  perform public.check_caregiver_invite_throttle(v_uid);

  if length(v_code) between 4 and 32 then
    select r.id into v_id
      from public.caregiver_relationships r
     where r.invite_code = v_code
       and r.status = 'pending'
       and r.created_at > now() - interval '14 days'
       and r.patient_id <> v_uid
     for update;
  end if;

  if v_id is null then
    insert into public.caregiver_invite_attempts (user_id) values (v_uid);
    return false;
  end if;

  update public.caregiver_relationships r set status = 'declined' where r.id = v_id;
  return true;
end;
$$;

revoke execute on function public.accept_caregiver_invite(text)  from public, anon;
revoke execute on function public.decline_caregiver_invite(text) from public, anon;
grant  execute on function public.accept_caregiver_invite(text)  to authenticated, service_role;
grant  execute on function public.decline_caregiver_invite(text) to authenticated, service_role;


-- =============================================================================
-- 4. Policy caregiver_relationships dipersempit (F1)
-- =============================================================================
drop policy if exists "View own or pending caregiver relationships" on public.caregiver_relationships;
drop policy if exists "View own caregiver relationships" on public.caregiver_relationships;
create policy "View own caregiver relationships"
  on public.caregiver_relationships for select to authenticated
  using (patient_id = (select auth.uid()) or caregiver_id = (select auth.uid()));

drop policy if exists "Caregiver or patient can update relationship" on public.caregiver_relationships;
drop policy if exists "Parties update own caregiver relationship" on public.caregiver_relationships;
create policy "Parties update own caregiver relationship"
  on public.caregiver_relationships for update to authenticated
  using (patient_id = (select auth.uid()) or caregiver_id = (select auth.uid()))
  with check (patient_id = (select auth.uid()) or caregiver_id = (select auth.uid()));


-- =============================================================================
-- 5. Nama pasien untuk pendamping, tanpa membuka seluruh profil (F3)
-- =============================================================================
drop policy if exists "Caregivers can view patient profile" on public.profiles;

create or replace function public.caregiver_patient_names()
returns table (patient_id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select cr.patient_id, p.name
    from public.caregiver_relationships cr
    join public.profiles p on p.id = cr.patient_id
   where cr.caregiver_id = (select auth.uid())
     and cr.status = 'active';
$$;

revoke execute on function public.caregiver_patient_names() from public, anon;
grant  execute on function public.caregiver_patient_names() to authenticated, service_role;


-- =============================================================================
-- 6. Penjaga UPDATE aman NULL (menggantikan versi di migrasi web)
-- =============================================================================
-- Versi lama memakai `if auth.role() <> 'authenticated' then return`: tanpa klaim JWT ekspresi itu
-- NULL (bukan true), sehingga SQL Editor ikut dianggap pengguna biasa dan diblokir.
create or replace function public.caregiver_relationships_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if coalesce((select auth.role()), '') <> 'authenticated' then
    return new;                      -- service_role, SQL Editor, migrasi
  end if;

  if v_uid is distinct from old.patient_id then
    -- Bukan pasien (pendamping atau penerima undangan):
    if new.permissions     is distinct from old.permissions
       or new.patient_id      is distinct from old.patient_id
       or new.invite_code     is distinct from old.invite_code
       or new.caregiver_phone is distinct from old.caregiver_phone then
      raise exception 'Hanya pasien yang dapat mengubah izin dan data undangan.' using errcode = '42501';
    end if;

    if new.caregiver_id is distinct from old.caregiver_id
       and new.caregiver_id is distinct from v_uid then
      raise exception 'Undangan hanya bisa diterima untuk akun sendiri.' using errcode = '42501';
    end if;

    if new.status is distinct from old.status then
      if not (
           (old.status = 'pending' and new.status = 'active' and new.caregiver_id = v_uid)
        or (old.status = 'pending' and new.status = 'declined')
        or (old.status = 'active'  and new.status = 'revoked' and old.caregiver_id = v_uid)
      ) then
        raise exception 'Perubahan status ini hanya boleh dilakukan pasien.' using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.caregiver_relationships_guard_update() from public, anon, authenticated;
