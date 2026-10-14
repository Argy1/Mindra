-- =============================================================================
-- Mindra Web — ekosistem perawatan (UINIC 8.0)
-- =============================================================================
-- ADDITIVE ONLY: hanya menambah tabel/kolom/policy/fungsi/trigger. Tidak ada drop atau
-- rename pada apa pun yang dipakai aplikasi Flutter. Aman dijalankan berulang (idempotent).
--
-- Prasyarat: migrasi 20240101000000 … 20240604000000 sudah diterapkan.
--
-- Isi (urutan penting karena saling bergantung):
--   1. profiles            : role, is_demo, requested_role + trigger penjaga + sinkron ke JWT
--   2. psychologists       : profile_id (menghubungkan akun login ke data psikolog)
--   3. care_links          : izin klien → psikolog
--   4. fungsi helper       : app_role(), can_view()
--   5. crisis_alerts       : alert krisis (Realtime) + trigger dari asesmen
--   6. data_access_logs    : jejak "siapa membuka data siapa" + log_access()
--   7. facilities, facility_admins, api_clients, facility_aggregate() (k-anonymity)
--   8. SELECT tambahan     : assessments / mood_entries / sleep_entries via can_view()
--   9. Pengamanan tambahan : trigger penjaga caregiver_relationships (kompatibel Flutter)
--
-- Konvensi keamanan:
--   * Setiap tabel baru: ENABLE ROW LEVEL SECURITY + policy. Semua policy `to authenticated`
--     (kecuali direktori faskes yang publik) sehingga anon tidak pernah menjalankan fungsi helper.
--   * Semua fungsi security definer: `set search_path = ''` dan nama objek fully-qualified.
--   * auth.uid() / auth.role() dibungkus (select …) agar dievaluasi sekali per query (initplan).
-- =============================================================================


-- =============================================================================
-- 1. profiles — role, is_demo, requested_role
-- =============================================================================
alter table public.profiles
  add column if not exists role           text    not null default 'user',
  add column if not exists is_demo        boolean not null default false,
  add column if not exists requested_role text;

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'profiles_role_check'
                   and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('user', 'psychologist', 'caregiver', 'facility_admin', 'admin'));
  end if;

  if not exists (select 1 from pg_constraint
                 where conname = 'profiles_requested_role_check'
                   and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles
      add constraint profiles_requested_role_check
      check (requested_role is null or requested_role = 'psychologist');
  end if;
end $$;

create index if not exists idx_profiles_city_lower on public.profiles (lower(btrim(city)));
create index if not exists idx_profiles_demo       on public.profiles (is_demo) where is_demo;

-- ── Penjaga kolom istimewa ────────────────────────────────────────────────────
-- ARCHITECTURE awalnya memakai `revoke update (role, is_demo) … from authenticated`. Itu TIDAK
-- efektif: di Supabase `authenticated` sudah punya UPDATE tingkat TABEL, dan REVOKE kolom tidak
-- mencabutnya. Trigger ini bekerja apa pun grant-nya (dan tetap benar bila kolom baru ditambah).
--   * sesi pengguna (JWT role = authenticated): role/is_demo/requested_role tidak bisa diubah;
--     pada INSERT dipaksa ke nilai aman.
--   * service_role, postgres, dan sesi tanpa JWT (migrasi, SQL editor, seed): bebas.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' then
    if tg_op = 'INSERT' then
      new.role           := 'user';
      new.is_demo        := false;
      new.requested_role := case when new.requested_role = 'psychologist'
                                 then 'psychologist' else null end;
    elsif new.role           is distinct from old.role
       or new.is_demo        is distinct from old.is_demo
       or new.requested_role is distinct from old.requested_role then
      raise exception 'Kolom role, is_demo, dan requested_role hanya bisa diubah oleh sistem.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_privileged on public.profiles;
create trigger trg_profiles_protect_privileged
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

revoke execute on function public.protect_profile_privileged_columns() from public, anon, authenticated;

-- ── handle_new_user: salin PERMINTAAN peran dari metadata signup ───────────────
-- Perilaku lama dipertahankan persis (id, email, name). Peran TIDAK pernah dibaca dari
-- metadata (bisa dikendalikan pengguna); hanya `requested_role = 'psychologist'` yang
-- disalin sebagai antrean verifikasi. `set search_path` WAJIB ditulis ulang: CREATE OR
-- REPLACE menghapus pengaturan fungsi yang dipasang oleh migrasi hardening sebelumnya.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, requested_role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data->>'requested_role' = 'psychologist'
         then 'psychologist' else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ── Sinkron peran → JWT (app_metadata.role) ───────────────────────────────────
-- app_metadata hanya bisa diubah server-side (bukan oleh pengguna), jadi aman dipakai
-- middleware untuk guard cepat tanpa query DB per navigasi. Sumber kebenaran tetap
-- profiles.role; RLS dan layout server memeriksanya langsung.
create or replace function public.sync_profile_role_to_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                             || jsonb_build_object('role', new.role)
   where id = new.id
     and (raw_app_meta_data ->> 'role') is distinct from new.role;
  return null;
end;
$$;

drop trigger if exists trg_profiles_sync_role on public.profiles;
create trigger trg_profiles_sync_role
  after insert or update of role on public.profiles
  for each row execute function public.sync_profile_role_to_auth();

revoke execute on function public.sync_profile_role_to_auth() from public, anon, authenticated;

-- Isi ulang untuk pengguna yang sudah ada (aplikasi Flutter): semuanya 'user'.
update auth.users u
   set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
  from public.profiles p
 where p.id = u.id
   and (u.raw_app_meta_data ->> 'role') is distinct from p.role;


-- =============================================================================
-- 2. psychologists.profile_id
-- =============================================================================
-- Tabel psychologists punya id sendiri (bukan id akun), jadi policy lama
-- `auth.uid() = psychologist_id` tidak pernah benar. Kolom ini memperbaikinya untuk web.
alter table public.psychologists
  add column if not exists profile_id uuid unique references public.profiles(id) on delete set null;


-- =============================================================================
-- 3. care_links — pasien memberi izin ke psikolog
-- =============================================================================
create table if not exists public.care_links (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  psychologist_id uuid not null references public.psychologists(id) on delete cascade,
  permissions     jsonb not null default
    '{"assessments":true,"mood":true,"sleep":true,"crisis_alerts":true,"ai_summary":false}',
  status          text not null default 'active' check (status in ('pending', 'active', 'revoked')),
  consented_at    timestamptz not null default now(),
  revoked_at      timestamptz,
  unique (patient_id, psychologist_id),
  constraint care_links_permissions_is_object check (jsonb_typeof(permissions) = 'object')
);

create index if not exists idx_care_links_patient      on public.care_links (patient_id, status);
create index if not exists idx_care_links_psychologist on public.care_links (psychologist_id, status);

alter table public.care_links enable row level security;

-- Pasien melihat semua link miliknya (termasuk yang sudah dicabut, untuk riwayat).
drop policy if exists "Patients view own care links" on public.care_links;
create policy "Patients view own care links"
  on public.care_links for select to authenticated
  using (patient_id = (select auth.uid()));

-- Psikolog melihat link yang ditujukan kepadanya (lewat psychologists.profile_id).
drop policy if exists "Psychologists view own care links" on public.care_links;
create policy "Psychologists view own care links"
  on public.care_links for select to authenticated
  using (exists (
    select 1 from public.psychologists ps
    where ps.id = care_links.psychologist_id
      and ps.profile_id = (select auth.uid())
  ));

-- HANYA pasien yang boleh memberi izin, dan hanya ke psikolog yang aktif.
drop policy if exists "Patients grant care links" on public.care_links;
create policy "Patients grant care links"
  on public.care_links for insert to authenticated
  with check (
    patient_id = (select auth.uid())
    and status in ('pending', 'active')
    and exists (select 1 from public.psychologists ps
                where ps.id = care_links.psychologist_id and ps.is_active)
  );

-- Pasien mengubah/mencabut izin miliknya. Psikolog TIDAK punya policy update.
drop policy if exists "Patients update own care links" on public.care_links;
create policy "Patients update own care links"
  on public.care_links for update to authenticated
  using (patient_id = (select auth.uid()))
  with check (patient_id = (select auth.uid()));

-- Tidak ada policy DELETE: riwayat persetujuan adalah jejak audit. Pencabutan = status 'revoked'.

-- revoked_at / consented_at selalu jujur, apa pun yang dikirim klien.
create or replace function public.care_links_maintain_audit_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'revoked' and old.status is distinct from 'revoked' then
    new.revoked_at := now();
  elsif new.status <> 'revoked' and old.status = 'revoked' then
    new.revoked_at   := null;
    new.consented_at := now();   -- persetujuan baru
  end if;
  -- identitas link tidak boleh dipindahkan
  new.patient_id      := old.patient_id;
  new.psychologist_id := old.psychologist_id;
  return new;
end;
$$;

drop trigger if exists trg_care_links_audit_fields on public.care_links;
create trigger trg_care_links_audit_fields
  before update on public.care_links
  for each row execute function public.care_links_maintain_audit_fields();

revoke execute on function public.care_links_maintain_audit_fields() from public, anon, authenticated;


-- =============================================================================
-- 4. Fungsi helper
-- =============================================================================

-- Peran pengguna saat ini (dari profiles — sumber kebenaran). Bukan `current_role`: itu
-- kata kunci SQL.
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

-- Bolehkah pengguna saat ini melihat data `p_resource` milik `p_subject`?
--   p_resource ∈ assessments | mood | sleep | crisis_alerts | ai_summary
-- Pemilik: selalu. Psikolog: care_link aktif dengan permissions[p_resource] = true.
-- Pendamping: caregiver_relationships aktif (tabel Flutter) dengan izin yang sepadan
-- (assessments→assessment_results, mood→mood_daily, crisis_alerts→emergency_alerts).
-- `= 'true'` (teks) menggantikan cast ::boolean: JSON izin berasal dari klien dan cast
-- bisa melempar error yang menjatuhkan seluruh query.
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

revoke execute on function public.app_role()            from public, anon;
revoke execute on function public.can_view(uuid, text)  from public, anon;
grant  execute on function public.app_role()            to authenticated, service_role;
grant  execute on function public.can_view(uuid, text)  to authenticated, service_role;


-- =============================================================================
-- 5. crisis_alerts
-- =============================================================================
create table if not exists public.crisis_alerts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  source          text not null check (source in ('assessment', 'ai_chat', 'mood', 'manual')),
  source_id       uuid,
  severity        text not null check (severity in ('high', 'critical')),
  status          text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  acknowledged_by uuid references public.profiles(id),
  acknowledged_at timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_crisis_alerts_user_created on public.crisis_alerts (user_id, created_at desc);
create index if not exists idx_crisis_alerts_open         on public.crisis_alerts (created_at desc) where status = 'open';
-- Satu alert per sumber (asesmen yang sama tidak menghasilkan alert ganda).
create unique index if not exists uidx_crisis_alerts_source
  on public.crisis_alerts (source, source_id) where source_id is not null;

alter table public.crisis_alerts enable row level security;

-- Pemilik, psikolog (izin crisis_alerts), dan pendamping (izin emergency_alerts) bisa melihat.
drop policy if exists "Linked viewers read crisis alerts" on public.crisis_alerts;
create policy "Linked viewers read crisis alerts"
  on public.crisis_alerts for select to authenticated
  using (public.can_view(user_id, 'crisis_alerts'));

-- Pengguna boleh membuat alert untuk DIRINYA (mis. dari teman cerita AI via sesi pengguna).
drop policy if exists "Users raise own crisis alerts" on public.crisis_alerts;
create policy "Users raise own crisis alerts"
  on public.crisis_alerts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'open'
    and acknowledged_by is null
  );

-- Hanya PIHAK LAIN (psikolog/pendamping berizin) yang menangani alert. Pemilik sengaja
-- tidak bisa menutup alert-nya sendiri: itu akan menyembunyikannya dari psikolog.
drop policy if exists "Responders handle crisis alerts" on public.crisis_alerts;
create policy "Responders handle crisis alerts"
  on public.crisis_alerts for update to authenticated
  using (user_id <> (select auth.uid()) and public.can_view(user_id, 'crisis_alerts'))
  with check (user_id <> (select auth.uid()) and public.can_view(user_id, 'crisis_alerts'));

-- Responder hanya boleh mengubah status; kolom lain beku, penangan dicatat otomatis.
create or replace function public.crisis_alerts_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' then
    if new.user_id    is distinct from old.user_id
       or new.source     is distinct from old.source
       or new.source_id  is distinct from old.source_id
       or new.severity   is distinct from old.severity
       or new.created_at is distinct from old.created_at then
      raise exception 'Hanya status alert yang boleh diubah.' using errcode = '42501';
    end if;
    if old.status <> 'open' and new.status = 'open' then
      raise exception 'Alert yang sudah ditangani tidak bisa dibuka kembali.' using errcode = '42501';
    end if;
    if new.status is distinct from old.status then
      new.acknowledged_by := (select auth.uid());
      new.acknowledged_at := now();
    else
      new.acknowledged_by := old.acknowledged_by;
      new.acknowledged_at := old.acknowledged_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_crisis_alerts_guard_update on public.crisis_alerts;
create trigger trg_crisis_alerts_guard_update
  before update on public.crisis_alerts
  for each row execute function public.crisis_alerts_guard_update();

revoke execute on function public.crisis_alerts_guard_update() from public, anon, authenticated;

-- Realtime (RLS tetap berlaku untuk pelanggan). Dilindungi agar tidak gagal di database
-- tanpa publikasi supabase_realtime (mis. lingkungan uji).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime'
                       and schemaname = 'public' and tablename = 'crisis_alerts') then
    alter publication supabase_realtime add table public.crisis_alerts;
  end if;
end $$;

-- ── Trigger: asesmen (dari web ATAU mobile) → alert krisis ─────────────────────
-- Aturan sama dengan assessment_provider.dart: PHQ-9 item 9 > 0 atau SRQ-20 item 17 > 0
-- → critical; kategori 'severe' → high. Parsing sengaja defensif (tanpa cast yang bisa
-- melempar error): trigger yang gagal akan MEMBLOKIR penyimpanan asesmen dari aplikasi.
create or replace function public.create_crisis_alert_from_assessment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ideation boolean := false;
  v_severity text;
begin
  if jsonb_typeof(new.answers) = 'array' then
    select exists (
      select 1
        from jsonb_array_elements(new.answers) as a(item)
       where jsonb_typeof(a.item) = 'object'
         and (
              (new.type = 'phq9'  and a.item ->> 'question_id' = 'phq9_9')
           or (new.type = 'srq20' and a.item ->> 'question_id' = 'srq20_17')
         )
         and case when jsonb_typeof(a.item -> 'score') = 'number'
                  then (a.item ->> 'score')::numeric else 0 end > 0
    ) into v_ideation;
  end if;

  v_severity := case
    when v_ideation then 'critical'
    when new.category = 'severe' then 'high'
    else null
  end;

  if v_severity is not null then
    insert into public.crisis_alerts (user_id, source, source_id, severity)
    values (new.user_id, 'assessment', new.id, v_severity)
    on conflict (source, source_id) where source_id is not null do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assessments_crisis_alert on public.assessments;
create trigger trg_assessments_crisis_alert
  after insert on public.assessments
  for each row execute function public.create_crisis_alert_from_assessment();

revoke execute on function public.create_crisis_alert_from_assessment() from public, anon, authenticated;


-- =============================================================================
-- 6. data_access_logs + log_access()
-- =============================================================================
create table if not exists public.data_access_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  actor_role text not null,
  resource   text not null,        -- 'assessments' | 'mood' | 'sleep' | 'crisis_alerts' | 'ai_summary'
  action     text not null default 'read' check (action in ('read', 'export', 'acknowledge')),
  created_at timestamptz not null default now()
);

create index if not exists idx_data_access_logs_subject on public.data_access_logs (subject_id, created_at desc);
create index if not exists idx_data_access_logs_actor   on public.data_access_logs (actor_id, subject_id, resource, action, created_at desc);

alter table public.data_access_logs enable row level security;

-- Pemilik data melihat siapa yang mengakses datanya. TIDAK ada policy tulis: satu-satunya
-- jalan masuk adalah log_access() di bawah.
drop policy if exists "Subjects read their access log" on public.data_access_logs;
create policy "Subjects read their access log"
  on public.data_access_logs for select to authenticated
  using (subject_id = (select auth.uid()));

-- Pertahanan berlapis (RLS sudah menolak): cabut hak tulis langsung.
revoke all on public.data_access_logs from anon;
revoke insert, update, delete, truncate on public.data_access_logs from authenticated;

-- Mencatat bahwa pengguna saat ini membuka data milik orang lain.
--   * Ditolak jika pengguna sebenarnya tidak berhak (can_view = false): log tak bisa dipalsukan
--     atau dipakai membanjiri riwayat orang lain.
--   * Akses ke data sendiri tidak dicatat.
--   * Pembukaan berulang dalam 5 menit dicatat sekali (refresh halaman ≠ banyak entri).
create or replace function public.log_access(
  p_subject  uuid,
  p_resource text,
  p_action   text default 'read'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_role  text;
begin
  if v_actor is null then
    raise exception 'Harus masuk terlebih dahulu.' using errcode = '28000';
  end if;
  if v_actor = p_subject then
    return;
  end if;
  if p_action not in ('read', 'export', 'acknowledge') then
    raise exception 'Aksi tidak dikenal.' using errcode = '22023';
  end if;
  if not public.can_view(p_subject, p_resource) then
    raise exception 'Tidak ada izin untuk data ini.' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.data_access_logs l
     where l.actor_id = v_actor and l.subject_id = p_subject
       and l.resource = p_resource and l.action = p_action
       and l.created_at > now() - interval '5 minutes'
  ) then
    return;
  end if;

  select p.role into v_role from public.profiles p where p.id = v_actor;

  insert into public.data_access_logs (actor_id, subject_id, actor_role, resource, action)
  values (v_actor, p_subject, coalesce(v_role, 'user'), p_resource, p_action);
end;
$$;

revoke execute on function public.log_access(uuid, text, text) from public, anon;
grant  execute on function public.log_access(uuid, text, text) to authenticated, service_role;


-- =============================================================================
-- 7. Faskes, kunci API, agregat anonim
-- =============================================================================
create table if not exists public.facilities (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  type                      text not null check (type in ('puskesmas', 'rumah_sakit', 'klinik', 'biro_psikologi')),
  city                      text not null,
  province                  text not null,
  address                   text,
  phone                     text,
  lat                       double precision,
  lng                       double precision,
  has_mental_health_service boolean not null default true
);

create index if not exists idx_facilities_province on public.facilities (lower(btrim(province)));

create table if not exists public.facility_admins (
  profile_id  uuid references public.profiles(id)   on delete cascade,
  facility_id uuid references public.facilities(id)  on delete cascade,
  primary key (profile_id, facility_id)
);

create table if not exists public.api_clients (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  owner_id     uuid not null references public.profiles(id),
  facility_id  uuid references public.facilities(id),
  key_prefix   text not null,            -- 8 karakter pertama, untuk identifikasi
  key_hash     text not null unique,     -- SHA-256 dari kunci lengkap; kunci asli tidak disimpan
  scopes       text[] not null default '{aggregates:read}',
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz,
  constraint api_clients_scopes_known check (scopes <@ array['aggregates:read']::text[])
);

create index if not exists idx_api_clients_owner on public.api_clients (owner_id);

alter table public.facilities      enable row level security;
alter table public.facility_admins enable row level security;
alter table public.api_clients     enable row level security;

-- Direktori faskes bersifat publik (halaman "faskes terdekat" juga untuk pengunjung).
drop policy if exists "Facilities are public" on public.facilities;
create policy "Facilities are public"
  on public.facilities for select to anon, authenticated
  using (true);

drop policy if exists "Admins manage facilities" on public.facilities;
create policy "Admins manage facilities"
  on public.facilities for all to authenticated
  using ((select public.app_role()) = 'admin')
  with check ((select public.app_role()) = 'admin');

-- Admin faskes melihat keanggotaannya sendiri; hanya admin sistem yang mengatur.
drop policy if exists "Members read own facility membership" on public.facility_admins;
create policy "Members read own facility membership"
  on public.facility_admins for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.app_role()) = 'admin');

drop policy if exists "Admins manage facility membership" on public.facility_admins;
create policy "Admins manage facility membership"
  on public.facility_admins for all to authenticated
  using ((select public.app_role()) = 'admin')
  with check ((select public.app_role()) = 'admin');

-- Kunci API: pemilik melihat/membuat/mencabut kunci miliknya, hanya untuk faskes yang ia kelola.
drop policy if exists "Owners read own api clients" on public.api_clients;
create policy "Owners read own api clients"
  on public.api_clients for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.app_role()) = 'admin');

drop policy if exists "Facility admins create api clients" on public.api_clients;
create policy "Facility admins create api clients"
  on public.api_clients for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and revoked_at is null
    and exists (select 1 from public.facility_admins fa
                where fa.profile_id = (select auth.uid()) and fa.facility_id = api_clients.facility_id)
  );

drop policy if exists "Owners update own api clients" on public.api_clients;
create policy "Owners update own api clients"
  on public.api_clients for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Pemilik hanya boleh MENCABUT (revoked_at). Hash, scope, dan pemilik tidak bisa diubah;
-- last_used_at diperbarui server memakai service_role.
create or replace function public.api_clients_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' then
    if new.name         is distinct from old.name
       or new.owner_id    is distinct from old.owner_id
       or new.facility_id is distinct from old.facility_id
       or new.key_prefix  is distinct from old.key_prefix
       or new.key_hash    is distinct from old.key_hash
       or new.scopes      is distinct from old.scopes
       or new.created_at  is distinct from old.created_at
       or new.last_used_at is distinct from old.last_used_at then
      raise exception 'Kunci API hanya bisa dicabut, tidak bisa diubah.' using errcode = '42501';
    end if;
    if old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at then
      raise exception 'Kunci yang sudah dicabut tidak bisa dihidupkan kembali.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_api_clients_guard_update on public.api_clients;
create trigger trg_api_clients_guard_update
  before update on public.api_clients
  for each row execute function public.api_clients_guard_update();

revoke execute on function public.api_clients_guard_update() from public, anon, authenticated;

-- Hak tabel seminimal mungkin (RLS tetap lapisan utama).
revoke all on public.care_links, public.crisis_alerts, public.facility_admins, public.api_clients from anon;
revoke delete, truncate on public.care_links, public.crisis_alerts, public.api_clients from authenticated;

-- ── facility_aggregate: agregat ANONIM dengan k-anonymity ──────────────────────
-- Satu-satunya jalan dashboard faskes membaca data pengguna (tidak ada query data individu).
-- Cakupan: pengguna yang berdomisili di PROVINSI faskes, dikelompokkan per kota dan minggu
-- (WIB). Wewenang: admin faskes tersebut, atau service_role (server memvalidasi kunci API
-- ber-scope aggregates:read lebih dulu).
--
-- k-anonymity (k = 10) diterapkan DUA lapis:
--   1. Grup kota-minggu dengan < 10 pengguna aktif disembunyikan: suppressed = true, SEMUA
--      angka null (termasuk jumlah pengguna, karena angka kecil pun bisa mengidentifikasi).
--   2. Di grup yang lolos, setiap METRIK hanya ditampilkan bila ≥ 10 pengguna berbeda
--      mengerjakannya. Rata-rata PHQ-9 dari 3 orang di grup 12 orang tetap membocorkan skor.
create or replace function public.facility_aggregate(p_facility uuid, p_from date, p_to date)
returns table (
  city               text,
  province           text,
  week_start         date,
  suppressed         boolean,
  active_users       integer,
  avg_phq9           numeric,
  avg_gad7           numeric,
  avg_pss10          numeric,
  minimal_count      integer,
  mild_count         integer,
  moderate_count     integer,
  severe_count       integer,
  crisis_alert_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  c_k        constant integer := 10;
  v_province text;
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'Rentang tanggal tidak valid.' using errcode = '22023';
  end if;

  if not (
    (select auth.role()) = 'service_role'
    or exists (select 1 from public.facility_admins fa
                where fa.profile_id = (select auth.uid()) and fa.facility_id = p_facility)
  ) then
    raise exception 'Tidak berwenang membaca agregat faskes ini.' using errcode = '42501';
  end if;

  select f.province into v_province from public.facilities f where f.id = p_facility;
  if v_province is null then
    return;
  end if;

  return query
  with scoped as (
    select p.id as user_id,
           lower(btrim(p.city)) as city_key,
           initcap(btrim(p.city)) as city_label
      from public.profiles p
     where nullif(btrim(p.city), '') is not null
       and lower(btrim(coalesce(p.domicile_province, ''))) = lower(btrim(v_province))
  ),
  activity as (
    select s.user_id, s.city_key, s.city_label,
           date_trunc('week', e.ts at time zone 'Asia/Jakarta')::date as week_start
      from scoped s
      join (
        select a.user_id, a.completed_at as ts from public.assessments  a
        union all
        select m.user_id, m.created_at           from public.mood_entries m
        union all
        select sl.user_id, sl.bedtime            from public.sleep_entries sl
      ) e on e.user_id = s.user_id
     where (e.ts at time zone 'Asia/Jakarta')::date between p_from and p_to
  ),
  active as (
    select ac.city_key, min(ac.city_label) as city_label, ac.week_start,
           count(distinct ac.user_id)::integer as active_users
      from activity ac
     group by ac.city_key, ac.week_start
  ),
  scores as (
    select s.city_key,
           date_trunc('week', a.completed_at at time zone 'Asia/Jakarta')::date as week_start,
           count(distinct a.user_id)                                  as assessed_users,
           count(distinct a.user_id) filter (where a.type = 'phq9')   as phq9_users,
           count(distinct a.user_id) filter (where a.type = 'gad7')   as gad7_users,
           count(distinct a.user_id) filter (where a.type = 'pss10')  as pss10_users,
           avg(a.total_score) filter (where a.type = 'phq9')          as phq9_avg,
           avg(a.total_score) filter (where a.type = 'gad7')          as gad7_avg,
           avg(a.total_score) filter (where a.type = 'pss10')         as pss10_avg,
           count(*) filter (where a.category = 'minimal')             as c_minimal,
           count(*) filter (where a.category = 'mild')                as c_mild,
           count(*) filter (where a.category = 'moderate')            as c_moderate,
           count(*) filter (where a.category = 'severe')              as c_severe
      from scoped s
      join public.assessments a on a.user_id = s.user_id
     where (a.completed_at at time zone 'Asia/Jakarta')::date between p_from and p_to
     group by s.city_key, date_trunc('week', a.completed_at at time zone 'Asia/Jakarta')::date
  ),
  alerts as (
    select s.city_key,
           date_trunc('week', ca.created_at at time zone 'Asia/Jakarta')::date as week_start,
           count(*)::integer as alert_count
      from scoped s
      join public.crisis_alerts ca on ca.user_id = s.user_id
     where (ca.created_at at time zone 'Asia/Jakarta')::date between p_from and p_to
     group by s.city_key, date_trunc('week', ca.created_at at time zone 'Asia/Jakarta')::date
  )
  select
    ac.city_label                                                         as city,
    v_province                                                            as province,
    ac.week_start                                                         as week_start,
    (ac.active_users < c_k)                                               as suppressed,
    case when ac.active_users >= c_k then ac.active_users end             as active_users,
    case when ac.active_users >= c_k and sc.phq9_users  >= c_k then round(sc.phq9_avg, 1)  end as avg_phq9,
    case when ac.active_users >= c_k and sc.gad7_users  >= c_k then round(sc.gad7_avg, 1)  end as avg_gad7,
    case when ac.active_users >= c_k and sc.pss10_users >= c_k then round(sc.pss10_avg, 1) end as avg_pss10,
    case when ac.active_users >= c_k and sc.assessed_users >= c_k then sc.c_minimal::integer  end as minimal_count,
    case when ac.active_users >= c_k and sc.assessed_users >= c_k then sc.c_mild::integer     end as mild_count,
    case when ac.active_users >= c_k and sc.assessed_users >= c_k then sc.c_moderate::integer end as moderate_count,
    case when ac.active_users >= c_k and sc.assessed_users >= c_k then sc.c_severe::integer   end as severe_count,
    case when ac.active_users >= c_k then coalesce(al.alert_count, 0) end as crisis_alert_count
  from active ac
  left join scores sc on sc.city_key = ac.city_key and sc.week_start = ac.week_start
  left join alerts al on al.city_key = ac.city_key and al.week_start = ac.week_start
  order by ac.city_label, ac.week_start;
end;
$$;

revoke execute on function public.facility_aggregate(uuid, date, date) from public, anon;
grant  execute on function public.facility_aggregate(uuid, date, date) to authenticated, service_role;


-- =============================================================================
-- 8. SELECT tambahan: data pengguna yang dibagikan
-- =============================================================================
-- PERMISSIVE, jadi hanya MENAMBAH akses di atas policy pemilik yang sudah ada. Syarat
-- `user_id <> auth.uid()` didahulukan agar baris milik sendiri tidak memanggil can_view().
drop policy if exists "Linked viewers read assessments" on public.assessments;
create policy "Linked viewers read assessments"
  on public.assessments for select to authenticated
  using (user_id <> (select auth.uid()) and public.can_view(user_id, 'assessments'));

drop policy if exists "Linked viewers read mood entries" on public.mood_entries;
create policy "Linked viewers read mood entries"
  on public.mood_entries for select to authenticated
  using (user_id <> (select auth.uid()) and public.can_view(user_id, 'mood'));

drop policy if exists "Linked viewers read sleep entries" on public.sleep_entries;
create policy "Linked viewers read sleep entries"
  on public.sleep_entries for select to authenticated
  using (user_id <> (select auth.uid()) and public.can_view(user_id, 'sleep'));

-- Indeks deret waktu (docs/ARCHITECTURE.md §9) untuk grafik 7 hari dan agregat.
create index if not exists idx_assessments_user_completed on public.assessments  (user_id, completed_at desc);
create index if not exists idx_mood_entries_user_created  on public.mood_entries (user_id, created_at desc);
create index if not exists idx_sleep_entries_user_bedtime on public.sleep_entries (user_id, bedtime desc);


-- =============================================================================
-- 9. PENGAMANAN TAMBAHAN — caregiver_relationships (tabel milik aplikasi Flutter)
-- =============================================================================
-- Bagian ini TERPISAH dan bisa dicabut (drop trigger) tanpa memengaruhi bagian lain.
--
-- Temuan: policy bawaan mengizinkan siapa pun yang login (a) membaca SEMUA undangan
-- `pending` dan (b) meng-update-nya tanpa WITH CHECK. Akibatnya penyerang bisa mengambil
-- alih undangan orang lain (caregiver_id = dirinya, status = 'active'), menulis ulang kolom
-- `permissions` menjadi serba true, lalu membaca mood/asesmen pasien lewat policy
-- "Caregivers can view patient …". Pendamping yang sudah DICABUT pasien juga bisa
-- mengubah statusnya kembali ke 'active' karena policy update mengizinkan caregiver_id = uid.
--
-- Trigger ini menutup eskalasi izin dan pengaktifan ulang TANPA mengubah alur Flutter
-- (acceptInvite hanya menulis caregiver_id + status; declineInvite hanya status;
-- updatePermissions hanya dipanggil pasien).
--
-- Yang BELUM tertutup: enumerasi undangan `pending` (SELECT) dan penerimaan oleh orang yang
-- salah. Itu butuh perubahan aplikasi (RPC accept_caregiver_invite) — keputusan pemilik proyek.
create or replace function public.caregiver_relationships_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if (select auth.role()) <> 'authenticated' then
    return new;                      -- service_role, SQL editor, migrasi
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

drop trigger if exists trg_caregiver_relationships_guard_update on public.caregiver_relationships;
create trigger trg_caregiver_relationships_guard_update
  before update on public.caregiver_relationships
  for each row execute function public.caregiver_relationships_guard_update();

revoke execute on function public.caregiver_relationships_guard_update() from public, anon, authenticated;
