-- =============================================================================
-- Mindra Web — Fase 2: ekosistem perawatan (psikolog, pendamping, privasi)
-- =============================================================================
-- Idempotent. Menambah objek; satu-satunya yang diganti adalah fungsi `can_view` (CREATE OR REPLACE,
-- perilaku sama kecuali syarat MFA di cabang psikolog).
--
--   1. MFA di DATABASE: akses psikolog ke data klien butuh sesi aal2 (TOTP terverifikasi). Layout
--      server hanya UX; tanpa ini penyerang yang punya kata sandi bisa memanggil PostgREST langsung
--      dengan token aal1 dan membaca data klien. Sakelar demo: `app.psychologist_mfa = 'off'`.
--   2. RPC daftar klien (psikolog), daftar pendamping dan riwayat akses (pasien).
--   3. log_access_batch: catat akses banyak klien dalam satu panggilan (dasbor ringkasan).
--   4. Catatan sesi: psikolog boleh membaca konsultasinya dan HANYA mengubah session_summary dan
--      notes_for_patient (policy lama membandingkan psychologists.id dengan auth.uid(): tidak pernah benar, F5).
--   5. profiles.satusehat_consent: persetujuan pengguna untuk sinkronisasi SATUSEHAT (Fase 3).
-- =============================================================================


-- =============================================================================
-- 1. MFA: syarat aal2 untuk psikolog
-- =============================================================================
-- Klaim `aal` ada di setiap JWT Supabase ('aal1' = hanya kata sandi, 'aal2' = TOTP terverifikasi).
-- Sakelar `app.psychologist_mfa` ('off') hanya untuk demo juri tanpa perangkat authenticator bersama:
--   alter database postgres set app.psychologist_mfa = 'off';
-- Tanpa pengaturan itu (bawaan) MFA WAJIB: gagal tertutup.
create or replace function public.psychologist_mfa_ok()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('app.psychologist_mfa', true), ''), 'required') = 'off'
      or coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
$$;

revoke execute on function public.psychologist_mfa_ok() from public, anon;
grant  execute on function public.psychologist_mfa_ok() to authenticated, service_role;

-- can_view: sama dengan versi migrasi web, ditambah `and psychologist_mfa_ok()` pada cabang psikolog.
-- Cabang pemilik dan pendamping TIDAK berubah.
create or replace function public.can_view(p_subject uuid, p_resource text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(p_subject = (select auth.uid()), false)
    or exists (
      select 1
        from public.care_links cl
        join public.psychologists ps on ps.id = cl.psychologist_id
       where cl.patient_id = p_subject
         and cl.status = 'active'
         and ps.profile_id = (select auth.uid())
         and (cl.permissions ->> p_resource) = 'true'
         and public.psychologist_mfa_ok()
    )
    or exists (
      select 1
        from public.caregiver_relationships cr
       where cr.patient_id = p_subject
         and cr.caregiver_id = (select auth.uid())
         and cr.status = 'active'
         and (cr.permissions ->> case p_resource
                when 'assessments'   then 'assessment_results'
                when 'mood'          then 'mood_daily'
                when 'crisis_alerts' then 'emergency_alerts'
                else '__tidak_dipetakan__'
              end) = 'true'
    );
$$;

revoke execute on function public.can_view(uuid, text) from public, anon;
grant  execute on function public.can_view(uuid, text) to authenticated, service_role;


-- =============================================================================
-- 2. RPC daftar
-- =============================================================================
-- Klien aktif milik psikolog yang sedang masuk. Hanya (id, nama, sejak kapan, izin): nama dibagikan
-- karena pasien sendiri yang menghubungkan akunnya. Baris profil lain tidak pernah terbuka (lihat F3).
create or replace function public.psychologist_clients()
returns table (patient_id uuid, name text, linked_at timestamptz, permissions jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select cl.patient_id, p.name, cl.consented_at, cl.permissions
    from public.care_links cl
    join public.psychologists ps on ps.id = cl.psychologist_id
    join public.profiles p on p.id = cl.patient_id
   where ps.profile_id = (select auth.uid())
     and cl.status = 'active'
     and public.psychologist_mfa_ok()
   order by p.name;
$$;

-- Pendamping milik pasien yang sedang masuk (aktif dan undangan menunggu), lengkap dengan nama
-- pendamping (pasien tidak boleh membaca profil orang lain). Kode undangan hanya untuk yang menunggu.
create or replace function public.patient_caregivers()
returns table (
  id              uuid,
  caregiver_id    uuid,
  caregiver_name  text,
  caregiver_phone text,
  status          text,
  permissions     jsonb,
  invite_code     text,
  created_at      timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select cr.id, cr.caregiver_id, p.name, cr.caregiver_phone, cr.status, cr.permissions,
         case when cr.status = 'pending' then cr.invite_code end,
         cr.created_at
    from public.caregiver_relationships cr
    left join public.profiles p on p.id = cr.caregiver_id
   where cr.patient_id = (select auth.uid())
     and cr.status in ('pending', 'active')
   order by cr.created_at desc;
$$;

-- Riwayat "siapa membuka datamu": hanya baris milik pemanggil. Nama pelaku diambil dari data psikolog
-- bila ada (lengkap dengan gelar), kalau tidak dari profil.
create or replace function public.my_access_log(p_limit integer default 50)
returns table (
  id         bigint,
  actor_id   uuid,
  actor_name text,
  actor_role text,
  resource   text,
  action     text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.actor_id, coalesce(ps.full_name, pr.name), l.actor_role, l.resource, l.action, l.created_at
    from public.data_access_logs l
    join public.profiles pr on pr.id = l.actor_id
    left join public.psychologists ps on ps.profile_id = l.actor_id
   where l.subject_id = (select auth.uid())
   order by l.created_at desc, l.id desc
   limit least(greatest(coalesce(p_limit, 50), 1), 500);
$$;

revoke execute on function public.psychologist_clients()        from public, anon;
revoke execute on function public.patient_caregivers()          from public, anon;
revoke execute on function public.my_access_log(integer)        from public, anon;
grant  execute on function public.psychologist_clients()        to authenticated, service_role;
grant  execute on function public.patient_caregivers()          to authenticated, service_role;
grant  execute on function public.my_access_log(integer)        to authenticated, service_role;


-- =============================================================================
-- 3. log_access_batch
-- =============================================================================
-- Memanggil log_access untuk tiap subjek. Gagal tertutup: bila SATU subjek tidak berhak, seluruh
-- panggilan gagal (psikolog tidak bisa menyelipkan id orang lain di antara kliennya).
create or replace function public.log_access_batch(
  p_subjects uuid[],
  p_resource text,
  p_action   text default 'read'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject uuid;
begin
  if p_subjects is null or cardinality(p_subjects) = 0 then
    return;
  end if;
  if cardinality(p_subjects) > 200 then
    raise exception 'Terlalu banyak subjek dalam satu panggilan.' using errcode = '22023';
  end if;
  foreach v_subject in array p_subjects loop
    perform public.log_access(v_subject, p_resource, p_action);
  end loop;
end;
$$;

revoke execute on function public.log_access_batch(uuid[], text, text) from public, anon;
grant  execute on function public.log_access_batch(uuid[], text, text) to authenticated, service_role;


-- =============================================================================
-- 4. Catatan sesi (consultations)
-- =============================================================================
drop policy if exists "Linked psychologists view consultations" on public.consultations;
create policy "Linked psychologists view consultations"
  on public.consultations for select to authenticated
  using (
    exists (select 1 from public.psychologists ps
             where ps.id = consultations.psychologist_id
               and ps.profile_id = (select auth.uid()))
    and public.psychologist_mfa_ok()
  );

drop policy if exists "Linked psychologists write session notes" on public.consultations;
create policy "Linked psychologists write session notes"
  on public.consultations for update to authenticated
  using (
    exists (select 1 from public.psychologists ps
             where ps.id = consultations.psychologist_id
               and ps.profile_id = (select auth.uid()))
    and public.psychologist_mfa_ok()
  )
  with check (
    exists (select 1 from public.psychologists ps
             where ps.id = consultations.psychologist_id
               and ps.profile_id = (select auth.uid()))
    and public.psychologist_mfa_ok()
  );

-- Selain pasien pemilik konsultasi, siapa pun yang mengubah baris ini (psikolog) hanya boleh mengubah
-- catatan sesi. Jadwal, status, biaya, dan tautan video tidak bisa diubah lewat jalur ini.
create or replace function public.consultations_guard_staff_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') = 'authenticated'
     and (select auth.uid()) is distinct from old.user_id then
    if (to_jsonb(new) - 'session_summary' - 'notes_for_patient' - 'updated_at')
       is distinct from
       (to_jsonb(old) - 'session_summary' - 'notes_for_patient' - 'updated_at') then
      raise exception 'Psikolog hanya boleh mengubah catatan sesi.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_consultations_guard_staff_update on public.consultations;
create trigger trg_consultations_guard_staff_update
  before update on public.consultations
  for each row execute function public.consultations_guard_staff_update();

revoke execute on function public.consultations_guard_staff_update() from public, anon, authenticated;


-- =============================================================================
-- 5. Persetujuan SATUSEHAT
-- =============================================================================
alter table public.profiles
  add column if not exists satusehat_consent boolean not null default false;
