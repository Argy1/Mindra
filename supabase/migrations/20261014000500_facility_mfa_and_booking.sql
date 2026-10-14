-- =============================================================================
-- Mindra Web, Fase 4: MFA admin faskes di database dan pemesanan konsultasi tanpa bentrok
-- =============================================================================
-- Aman dijalankan ulang (idempotent). Tidak mengubah tabel milik aplikasi Flutter selain menambah dua
-- constraint pada `consultations` (lihat bagian 2) dan mengganti dua policy tabel web `api_clients`.
--
--   1. MFA admin faskes DI DATABASE (sama seperti psikolog di migrasi 000300):
--        - facility_aggregate(): cabang pengguna login mensyaratkan sesi aal2.
--        - api_clients: membuat dan mencabut kunci API mensyaratkan sesi aal2.
--      Fungsi `psychologist_mfa_ok()` dipakai ulang (namanya historis: ia hanya memeriksa klaim `aal`
--      dan sakelar demo `app.psychologist_mfa`). service_role tidak terpengaruh, jadi API mitra
--      (X-API-Key) tetap bekerja.
--   2. Penjaga bentrok jadwal: tidak ada dua konsultasi aktif yang tumpang-tindih untuk psikolog yang
--      sama, dan tidak ada dua yang tumpang-tindih untuk pasien yang sama. Ditegakkan constraint
--      EXCLUDE (bukan pemeriksaan di aplikasi), sehingga dua permintaan serentak pun tidak bisa lolos
--      keduanya. Berlaku untuk SEMUA penulis, termasuk aplikasi Flutter.
--   3. Fungsi: psychologist_booked_slots (jam terisi, tanpa data pribadi), book_consultation (pemesanan
--      terjaga), psychologist_schedule (jadwal milik psikolog).
-- Zona waktu jadwal: psychologist_schedules menyimpan jam lokal tanpa zona; seluruhnya dibaca sebagai
-- Asia/Jakarta (WIB, tanpa DST). Satu sesi 50 menit pada kisi 60 menit dari jam mulai jadwal.
-- =============================================================================

create extension if not exists btree_gist with schema extensions;


-- =============================================================================
-- 1. MFA admin faskes
-- =============================================================================
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

drop policy if exists "Facility admins create api clients" on public.api_clients;
create policy "Facility admins create api clients"
  on public.api_clients for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and revoked_at is null
    and public.psychologist_mfa_ok()
    and exists (select 1 from public.facility_admins fa
                where fa.profile_id = (select auth.uid()) and fa.facility_id = api_clients.facility_id)
  );

drop policy if exists "Owners update own api clients" on public.api_clients;
create policy "Owners update own api clients"
  on public.api_clients for update to authenticated
  using (owner_id = (select auth.uid()) and public.psychologist_mfa_ok())
  with check (owner_id = (select auth.uid()));


-- =============================================================================
-- 2. Penjaga bentrok jadwal
-- =============================================================================
-- Rentang waktu sesi. Dibungkus fungsi IMMUTABLE karena constraint EXCLUDE tidak menerima ekspresi
-- `timestamptz + interval` biasa (STABLE: bergantung zona waktu untuk satuan hari/bulan). Di sini
-- satuannya menit, jadi hasilnya memang tidak bergantung zona waktu.
create or replace function public.consultation_span(p_start timestamptz, p_minutes integer)
returns tstzrange
language sql
immutable
parallel safe
set search_path = ''
as $$
  select tstzrange(p_start, p_start + (p_minutes * interval '1 minute'), '[)')
$$;

revoke execute on function public.consultation_span(timestamptz, integer) from public, anon;
grant  execute on function public.consultation_span(timestamptz, integer) to authenticated, service_role;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'consultations_no_psychologist_overlap') then
    alter table public.consultations
      add constraint consultations_no_psychologist_overlap
      exclude using gist (
        psychologist_id with =,
        public.consultation_span(scheduled_at, duration_minutes) with &&
      ) where (status in ('pending', 'confirmed', 'ongoing'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'consultations_no_patient_overlap') then
    alter table public.consultations
      add constraint consultations_no_patient_overlap
      exclude using gist (
        user_id with =,
        public.consultation_span(scheduled_at, duration_minutes) with &&
      ) where (status in ('pending', 'confirmed', 'ongoing'));
  end if;
end;
$$;


-- =============================================================================
-- 3. Fungsi pemesanan
-- =============================================================================

-- Jam yang sudah terisi untuk satu psikolog. Hanya waktu dan lama sesi: tidak ada identitas pasien.
-- Perlu security definer karena RLS `consultations` hanya membuka baris milik pemanggil.
create or replace function public.psychologist_booked_slots(
  p_psychologist uuid,
  p_from         timestamptz,
  p_to           timestamptz
)
returns table (scheduled_at timestamptz, duration_minutes integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.scheduled_at, c.duration_minutes
    from public.consultations c
   where (select auth.uid()) is not null
     and p_from is not null and p_to is not null
     and p_to > p_from
     and p_to - p_from <= interval '62 days'
     and c.psychologist_id = p_psychologist
     and c.status in ('pending', 'confirmed', 'ongoing')
     and c.scheduled_at >= p_from
     and c.scheduled_at <  p_to
   order by c.scheduled_at;
$$;

revoke execute on function public.psychologist_booked_slots(uuid, timestamptz, timestamptz) from public, anon;
grant  execute on function public.psychologist_booked_slots(uuid, timestamptz, timestamptz) to authenticated, service_role;


-- Pemesanan. Kegagalan memakai pesan berupa token tetap (P0001) yang dipetakan aplikasi ke kalimat:
--   not_signed_in, psychologist_unavailable, slot_not_offered, too_soon, too_far, limit_reached,
--   slot_taken (psikolog sudah dipesan), patient_busy (kamu sudah punya sesi di jam itu).
create or replace function public.book_consultation(p_psychologist uuid, p_scheduled_at timestamptz)
returns table (
  id               uuid,
  scheduled_at     timestamptz,
  duration_minutes integer,
  booking_fee      integer,
  status           text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  c_session  constant integer := 50;  -- menit per sesi
  c_step     constant integer := 60;  -- jarak antar awal sesi pada kisi jadwal
  c_max_open constant integer := 3;   -- sesi yang akan datang per pasien
  v_uid        uuid := (select auth.uid());
  v_ps         public.psychologists%rowtype;
  v_local      timestamp;
  v_minute     integer;
  v_constraint text;
  v_row        public.consultations%rowtype;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;

  select * into v_ps
    from public.psychologists ps
   where ps.id = p_psychologist and ps.is_active;
  if not found or v_ps.profile_id is not distinct from v_uid then
    raise exception 'psychologist_unavailable' using errcode = 'P0001';
  end if;

  if p_scheduled_at is null then
    raise exception 'slot_not_offered' using errcode = 'P0001';
  end if;

  v_local := p_scheduled_at at time zone 'Asia/Jakarta';
  if v_local <> date_trunc('minute', v_local) then
    raise exception 'slot_not_offered' using errcode = 'P0001';
  end if;
  v_minute := extract(hour from v_local)::integer * 60 + extract(minute from v_local)::integer;

  if p_scheduled_at < now() + interval '1 hour' then
    raise exception 'too_soon' using errcode = 'P0001';
  end if;
  if p_scheduled_at > now() + interval '30 days' then
    raise exception 'too_far' using errcode = 'P0001';
  end if;

  -- Harus tepat di kisi jadwal psikolog pada hari itu, dan sesinya selesai sebelum jadwal berakhir.
  if not exists (
    select 1
      from public.psychologist_schedules s
     where s.psychologist_id = p_psychologist
       and s.day_of_week = extract(dow from v_local)::integer
       and v_minute >= extract(hour from s.start_time)::integer * 60 + extract(minute from s.start_time)::integer
       and v_minute + c_session <= extract(hour from s.end_time)::integer * 60 + extract(minute from s.end_time)::integer
       and mod(v_minute - (extract(hour from s.start_time)::integer * 60 + extract(minute from s.start_time)::integer), c_step) = 0
  ) then
    raise exception 'slot_not_offered' using errcode = 'P0001';
  end if;

  if (select count(*) from public.consultations c
       where c.user_id = v_uid
         and c.status in ('pending', 'confirmed')
         and c.scheduled_at > now()) >= c_max_open then
    raise exception 'limit_reached' using errcode = 'P0001';
  end if;

  begin
    insert into public.consultations (user_id, psychologist_id, scheduled_at, duration_minutes, status, booking_fee)
    values (v_uid, p_psychologist, p_scheduled_at, c_session, 'confirmed', v_ps.consultation_fee)
    returning * into v_row;
  exception
    when exclusion_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'consultations_no_patient_overlap' then
        raise exception 'patient_busy' using errcode = 'P0001';
      end if;
      raise exception 'slot_taken' using errcode = 'P0001';
  end;

  return query
    select v_row.id, v_row.scheduled_at, v_row.duration_minutes, v_row.booking_fee, v_row.status;
end;
$$;

revoke execute on function public.book_consultation(uuid, timestamptz) from public, anon;
grant  execute on function public.book_consultation(uuid, timestamptz) to authenticated, service_role;


-- Jadwal milik psikolog yang masuk. Nama klien HANYA muncul bila klien itu menautkan akunnya
-- (care_links aktif); memesan saja tidak membuka identitas. Wajib sesi aal2 seperti pembacaan data klien.
create or replace function public.psychologist_schedule(p_from timestamptz, p_to timestamptz)
returns table (
  id               uuid,
  scheduled_at     timestamptz,
  duration_minutes integer,
  status           text,
  client_id        uuid,
  client_name      text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.scheduled_at, c.duration_minutes, c.status, cl.patient_id, p.name
    from public.consultations c
    join public.psychologists ps on ps.id = c.psychologist_id
    left join public.care_links cl
           on cl.psychologist_id = ps.id and cl.patient_id = c.user_id and cl.status = 'active'
    left join public.profiles p on p.id = cl.patient_id
   where ps.profile_id = (select auth.uid())
     and public.psychologist_mfa_ok()
     and p_from is not null and p_to is not null
     and p_to > p_from
     and p_to - p_from <= interval '93 days'
     and c.status in ('pending', 'confirmed', 'ongoing', 'completed')
     and c.scheduled_at >= p_from
     and c.scheduled_at <  p_to
   order by c.scheduled_at;
$$;

revoke execute on function public.psychologist_schedule(timestamptz, timestamptz) from public, anon;
grant  execute on function public.psychologist_schedule(timestamptz, timestamptz) to authenticated, service_role;
