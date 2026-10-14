-- =============================================================================
-- Mindra Web, gelombang 1 sebelum deploy: opt-in statistik wilayah, daftar slot konsultasi untuk
-- kedua aplikasi, hapus akun mandiri, dan peninjauan akun psikolog oleh admin
-- =============================================================================
-- Aman dijalankan ulang (idempotent). Semuanya additive: satu kolom baru, satu tabel baru, enam fungsi
-- baru, dan dua fungsi lama diganti (facility_aggregate, protect_profile_privileged_columns).
--
--   1. profiles.share_region_stats  : persetujuan EKSPLISIT (default mati) agar kota pengguna ikut
--      dihitung di angka gabungan anonim milik faskes. facility_aggregate() hanya menghitung yang setuju.
--      Pemicu menjaga konsistensi: tanpa kota dan provinsi, persetujuan otomatis mati (aplikasi Flutter
--      yang mengosongkan kota tidak mendapat galat).
--   2. psychologist_available_slots : daftar jam yang masih bisa dipesan, dihitung di database dengan
--      aturan SAMA dengan book_consultation. Dipakai aplikasi Flutter (yang semula membaca tabel
--      `psychologist_slots` yang tidak pernah ada). tests/db/consultation-parity.test.ts menjaga agar
--      daftar ini, kode web (lib/domain/consultation/slots.ts), dan book_consultation tidak bergeser.
--   3. delete_my_account            : pengguna menghapus akunnya sendiri (auth.users, lalu semua datanya
--      ikut terhapus lewat ON DELETE CASCADE). Hanya peran `user`; dipakai web dan aplikasi Flutter.
--   4. Peninjauan psikolog oleh admin: admin_actions (jejak keputusan), admin_pending_psychologists
--      (antrean), admin_review_psychologist (setujui atau tolak, SATU transaksi). Admin WAJIB sesi aal2.
--      Pengubahan `profiles.role` tetap dijaga pemicu; fungsi peninjauan memakai pintu khusus yang
--      hanya terbuka bagi fungsi milik sistem (bukan bagi sesi pengguna).
-- =============================================================================


-- =============================================================================
-- 1. Opt-in statistik wilayah
-- =============================================================================
alter table public.profiles
  add column if not exists share_region_stats boolean not null default false;

create or replace function public.profiles_region_stats_consistency()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if nullif(btrim(new.city), '') is null or nullif(btrim(new.domicile_province), '') is null then
    new.share_region_stats := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_region_stats on public.profiles;
create trigger trg_profiles_region_stats
  before insert or update on public.profiles
  for each row execute function public.profiles_region_stats_consistency();

revoke execute on function public.profiles_region_stats_consistency() from public, anon, authenticated;

-- Akun demo sintetis (hasil `pnpm seed`) sudah punya kota dan provinsi; mereka dianggap setuju agar
-- dasbor faskes demo tetap berisi. Pengguna nyata tidak terpengaruh (default mati).
update public.profiles
   set share_region_stats = true
 where is_demo
   and not share_region_stats
   and nullif(btrim(city), '') is not null
   and nullif(btrim(domicile_province), '') is not null;

-- facility_aggregate: sama seperti migrasi 000500, ditambah syarat persetujuan (satu baris di `scoped`).
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

  -- Admin faskes WAJIB sesi aal2 (TOTP). service_role (API mitra lewat kunci API) tidak terpengaruh.
  if not (
    (select auth.role()) = 'service_role'
    or (
      public.psychologist_mfa_ok()
      and exists (select 1 from public.facility_admins fa
                   where fa.profile_id = (select auth.uid()) and fa.facility_id = p_facility)
    )
  ) then
    raise exception 'Tidak berwenang membaca agregat faskes ini.' using errcode = '42501';
  end if;

  select f.province into v_province from public.facilities f where f.id = p_facility;
  if v_province is null then
    return;
  end if;

  return query
  with scoped as (
    -- Hanya pengguna yang MENYETUJUI kotanya dihitung, dan hanya bila kota dan provinsinya terisi.
    select p.id as user_id,
           lower(btrim(p.city)) as city_key,
           initcap(btrim(p.city)) as city_label
      from public.profiles p
     where p.share_region_stats
       and nullif(btrim(p.city), '') is not null
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
-- 2. Daftar slot konsultasi yang masih bisa dipesan
-- =============================================================================
-- Aturan SAMA dengan book_consultation: jadwal psikolog = jam lokal WIB per hari dalam seminggu (0 = Minggu),
-- sesi 50 menit pada kisi 60 menit dari jam mulai, sesi harus selesai sebelum jadwal berakhir, paling cepat
-- 1 jam dan paling lama 30 hari dari sekarang, dan slot yang beririsan dengan sesi aktif psikolog itu terisi.
-- Hanya mengembalikan jam: tidak ada identitas pasien. Security definer karena RLS `consultations` hanya
-- membuka baris milik pemanggil.
create or replace function public.psychologist_available_slots(
  p_psychologist uuid,
  p_from         timestamptz,
  p_to           timestamptz
)
returns table (slot_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with days as (
    select g::date as day
      from generate_series(
             (p_from at time zone 'Asia/Jakarta')::date,
             (p_to   at time zone 'Asia/Jakarta')::date,
             interval '1 day') g
     where (select auth.uid()) is not null
       and p_from is not null and p_to is not null
       and p_to > p_from
       and p_to - p_from <= interval '62 days'
  ),
  candidates as (
    select distinct ((d.day + make_interval(mins => m.minute))::timestamp at time zone 'Asia/Jakarta') as slot_at
      from days d
      join public.psychologist_schedules s
        on s.psychologist_id = p_psychologist
       and s.day_of_week = extract(dow from d.day)::integer
      cross join lateral generate_series(
             extract(hour from s.start_time)::integer * 60 + extract(minute from s.start_time)::integer,
             extract(hour from s.end_time)::integer   * 60 + extract(minute from s.end_time)::integer - 50,
             60) as m(minute)
     where exists (select 1 from public.psychologists ps
                    where ps.id = p_psychologist and ps.is_active)
  )
  select c.slot_at
    from candidates c
   where c.slot_at >= p_from
     and c.slot_at <  p_to
     and c.slot_at >= now() + interval '1 hour'
     and c.slot_at <= now() + interval '30 days'
     and not exists (
           select 1 from public.consultations k
            where k.psychologist_id = p_psychologist
              and k.status in ('pending', 'confirmed', 'ongoing')
              and public.consultation_span(k.scheduled_at, k.duration_minutes)
                  && public.consultation_span(c.slot_at, 50))
   order by c.slot_at;
$$;

revoke execute on function public.psychologist_available_slots(uuid, timestamptz, timestamptz) from public, anon;
grant  execute on function public.psychologist_available_slots(uuid, timestamptz, timestamptz) to authenticated, service_role;


-- =============================================================================
-- 3. Hapus akun mandiri
-- =============================================================================
-- Menghapus baris auth.users milik pemanggil; profil dan seluruh datanya ikut terhapus (ON DELETE CASCADE:
-- skrining, mood, tidur, percakapan, konsultasi, izin, riwayat akses, dst.). Data yang sudah dikirim ke pihak
-- ketiga (SATUSEHAT) tidak terjangkau. Hanya peran `user`: akun psikolog, pendamping, admin faskes, dan admin
-- punya keterkaitan (mis. peringatan krisis yang ditandai ditangani) dan dihapus lewat admin.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_role text;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;

  select p.role into v_role from public.profiles p where p.id = v_uid;
  if v_role is distinct from 'user' then
    raise exception 'role_not_deletable' using errcode = 'P0001';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;


-- =============================================================================
-- 4. Peninjauan akun psikolog oleh admin
-- =============================================================================
create table if not exists public.admin_actions (
  id          bigint generated always as identity primary key,
  admin_id    uuid references public.profiles(id) on delete set null,
  target_id   uuid references public.profiles(id) on delete set null,
  target_name text not null,
  action      text not null check (action in ('approve_psychologist', 'reject_psychologist')),
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_admin_actions_created on public.admin_actions (created_at desc);

alter table public.admin_actions enable row level security;

-- Admin (aal2) membaca jejak keputusan. TIDAK ada policy insert/update/delete: hanya fungsi di bawah
-- (milik sistem) yang menulis.
drop policy if exists "Admins read admin actions" on public.admin_actions;
create policy "Admins read admin actions"
  on public.admin_actions for select to authenticated
  using (public.app_role() = 'admin' and public.psychologist_mfa_ok());

-- Pemicu penjaga kolom profil: sama seperti migrasi web, ditambah satu pintu khusus. Pintu itu hanya
-- berlaku bila (a) fungsi peninjauan memasang penanda transaksi-lokal DAN (b) eksekusi sedang berjalan
-- sebagai pemilik fungsi, bukan sebagai peran API. Sesi pengguna tidak bisa memenuhi (b), jadi
-- memasang penanda sendiri tidak berguna.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.profile_review', true) = 'on'
     and current_user not in ('authenticated', 'anon') then
    return new;
  end if;

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

revoke execute on function public.protect_profile_privileged_columns() from public, anon, authenticated;

-- Antrean permintaan akun psikolog.
create or replace function public.admin_pending_psychologists()
returns table (id uuid, name text, email text, created_at timestamptz)
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
  select p.id, p.name, p.email, p.created_at
    from public.profiles p
   where p.requested_role = 'psychologist'
     and p.role = 'user'
   order by p.created_at;
end;
$$;

revoke execute on function public.admin_pending_psychologists() from public, anon;
grant  execute on function public.admin_pending_psychologists() to authenticated, service_role;

-- Setujui atau tolak. Kegagalan memakai token tetap (P0001) yang dipetakan aplikasi ke kalimat:
--   not_pending, invalid_decision, invalid_name, invalid_str, invalid_fee, invalid_specializations,
--   invalid_schedule. Tidak berwenang = 42501.
-- Menyetujui: peran jadi `psychologist`, baris direktori `psychologists` dibuat (terhubung lewat profile_id),
-- jadwal praktik mingguan dibuat (opsional), dan keputusan dicatat, semuanya dalam satu transaksi.
create or replace function public.admin_review_psychologist(
  p_profile         uuid,
  p_decision        text,
  p_full_name       text      default null,
  p_title           text      default null,
  p_str_number      text      default null,
  p_specializations text[]    default '{}',
  p_fee             integer   default 0,
  p_verified        boolean   default false,
  p_days            integer[] default '{}',
  p_start           time      default null,
  p_end             time      default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin   uuid := (select auth.uid());
  v_target  public.profiles%rowtype;
  v_name    text := nullif(btrim(coalesce(p_full_name, '')), '');
  v_str     text := nullif(btrim(coalesce(p_str_number, '')), '');
  v_title   text := coalesce(nullif(btrim(coalesce(p_title, '')), ''), 'M.Psi., Psikolog');
  v_spec    text[] := coalesce(p_specializations, '{}');
  v_days    integer[] := coalesce(p_days, '{}');
  v_ps_id   uuid;
begin
  if not (public.app_role() = 'admin' and public.psychologist_mfa_ok()) then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;

  if p_decision is null or p_decision not in ('approve', 'reject') then
    raise exception 'invalid_decision' using errcode = 'P0001';
  end if;

  select * into v_target
    from public.profiles p
   where p.id = p_profile
     and p.requested_role = 'psychologist'
     and p.role = 'user'
   for update;
  if not found then
    raise exception 'not_pending' using errcode = 'P0001';
  end if;

  if p_decision = 'approve' then
    if v_name is null or char_length(v_name) > 120 then
      raise exception 'invalid_name' using errcode = 'P0001';
    end if;
    if v_str is null or char_length(v_str) > 60 then
      raise exception 'invalid_str' using errcode = 'P0001';
    end if;
    if p_fee is null or p_fee < 0 or p_fee > 5000000 then
      raise exception 'invalid_fee' using errcode = 'P0001';
    end if;
    if cardinality(v_spec) > 10
       or exists (select 1 from unnest(v_spec) s where nullif(btrim(s), '') is null or char_length(s) > 60) then
      raise exception 'invalid_specializations' using errcode = 'P0001';
    end if;
    if cardinality(v_days) > 7
       or exists (select 1 from unnest(v_days) d where d is null or d not between 0 and 6)
       or (cardinality(v_days) > 0 and (p_start is null or p_end is null or p_end <= p_start)) then
      raise exception 'invalid_schedule' using errcode = 'P0001';
    end if;

    perform set_config('app.profile_review', 'on', true);
    update public.profiles
       set role = 'psychologist', requested_role = null
     where id = p_profile;
    perform set_config('app.profile_review', 'off', true);

    insert into public.psychologists
      (profile_id, full_name, title, str_number, specializations, consultation_fee, himpsi_verified, is_active)
    values
      (p_profile, v_name, v_title, v_str, v_spec, p_fee, coalesce(p_verified, false), true)
    returning psychologists.id into v_ps_id;

    if cardinality(v_days) > 0 then
      insert into public.psychologist_schedules (psychologist_id, day_of_week, start_time, end_time)
      select v_ps_id, d, p_start, p_end from (select distinct unnest(v_days) as d) x;
    end if;

    insert into public.admin_actions (admin_id, target_id, target_name, action, detail)
    values (v_admin, p_profile, v_target.name, 'approve_psychologist',
            jsonb_build_object('psychologist_id', v_ps_id, 'str_number', v_str,
                               'verified', coalesce(p_verified, false), 'days', v_days));
  else
    perform set_config('app.profile_review', 'on', true);
    update public.profiles set requested_role = null where id = p_profile;
    perform set_config('app.profile_review', 'off', true);

    insert into public.admin_actions (admin_id, target_id, target_name, action)
    values (v_admin, p_profile, v_target.name, 'reject_psychologist');
  end if;
end;
$$;

revoke execute on function public.admin_review_psychologist(uuid, text, text, text, text, text[], integer, boolean, integer[], time, time) from public, anon;
grant  execute on function public.admin_review_psychologist(uuid, text, text, text, text, text[], integer, boolean, integer[], time, time) to authenticated, service_role;

-- Hak akses tabel jejak: pengguna hanya boleh MEMBACA (dan itu pun disaring policy di atas); penulisan
-- hanya lewat fungsi peninjauan.
revoke all on public.admin_actions from anon;
revoke insert, update, delete, truncate on public.admin_actions from authenticated;
