-- =============================================================================
-- Mindra Mental Health App — Initial Database Schema
-- Run this in: Supabase SQL Editor  →  New Query  →  Run
-- =============================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- =============================================================================
-- HELPER FUNCTION: auto-update updated_at column
-- =============================================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql security definer as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Macro to attach the trigger to any table
-- Usage: select attach_updated_at_trigger('table_name');
create or replace function public.attach_updated_at_trigger(tbl text)
returns void language plpgsql as $$
begin
  execute format(
    'create trigger trg_%I_updated_at
     before update on public.%I
     for each row execute function public.handle_updated_at()',
    tbl, tbl
  );
end;
$$;

-- =============================================================================
-- TABLE 1: profiles
-- Column names align with UserProfileModel.fromJson() in the Flutter app.
-- =============================================================================
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  name                  text not null default 'Pengguna',
  avatar_url            text,
  date_of_birth         date,
  gender                text check (gender in ('laki_laki', 'perempuan', 'lainnya')),
  city                  text,                    -- domicile city (app uses 'city')
  domicile_province     text,
  nik_encrypted         text,                    -- encrypted at app layer via pgcrypto
  notifications_enabled boolean not null default true,
  reminder_time         text,                    -- HH:mm string e.g. "20:00"
  language_preference   text not null default 'id_informal'
                          check (language_preference in ('id_formal', 'id_informal')),
  font_size_preference  text not null default 'normal'
                          check (font_size_preference in ('small', 'normal', 'large')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================================
-- TABLE 2: assessments
-- =============================================================================
create table if not exists public.assessments (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles(id) on delete cascade,
  type                     text not null check (type in ('phq9', 'gad7', 'pss10', 'srq20')),
  answers                  jsonb not null default '[]',   -- [{question_id, score}]
  total_score              integer not null default 0,
  category                 text check (category in ('minimal','mild','moderate','severe')),
  completed_at             timestamptz not null default now(),
  sent_to_satusehat        boolean not null default false,
  satusehat_observation_id text,
  created_at               timestamptz not null default now()
);

create index idx_assessments_user_id    on public.assessments(user_id);
create index idx_assessments_type       on public.assessments(type);
create index idx_assessments_completed  on public.assessments(completed_at desc);


-- =============================================================================
-- TABLE 3: mood_entries
-- Column names match MoodEntryModel.toJson() in the Flutter app.
-- =============================================================================
create table if not exists public.mood_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  mood_type    text not null,   -- 'tenang','syukur','bahagia','hangat','lelah','sedih','cemas'
  note         text not null default '',
  energy_level integer check (energy_level between 1 and 5),
  triggers     text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create index idx_mood_entries_user_id on public.mood_entries(user_id);
create index idx_mood_entries_created on public.mood_entries(created_at desc);


-- =============================================================================
-- TABLE 4: sleep_entries
-- Column names match SleepEntryModel.toJson() in the Flutter app.
-- =============================================================================
create table if not exists public.sleep_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  bedtime    timestamptz not null,
  wake_time  timestamptz not null,
  quality    integer not null check (quality between 1 and 5),
  notes      text not null default '',
  created_at timestamptz not null default now(),
  constraint chk_wake_after_bedtime check (wake_time > bedtime)
);

create index idx_sleep_entries_user_id on public.sleep_entries(user_id);
create index idx_sleep_entries_bedtime on public.sleep_entries(bedtime desc);


-- =============================================================================
-- TABLE 6: reflection_questions  (before night_reflections — FK dependency)
-- =============================================================================
create table if not exists public.reflection_questions (
  id            uuid primary key default gen_random_uuid(),
  question_text text not null,
  category      text not null default 'general',
  is_active     boolean not null default true,
  display_order integer not null default 0
);

create index idx_reflection_questions_active
  on public.reflection_questions(is_active, display_order);


-- =============================================================================
-- TABLE 5: night_reflections
-- Column names match NightReflectionModel.toJson() in the Flutter app.
-- `answers` is a JSONB array of {question_id, question_text, answer, category}.
-- =============================================================================
create table if not exists public.night_reflections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  date       date not null,
  answers    jsonb not null default '[]',
  mood_after integer check (mood_after between 1 and 5),
  created_at timestamptz not null default now()
);

create index idx_night_reflections_user_id on public.night_reflections(user_id);
create index idx_night_reflections_date    on public.night_reflections(date desc);


-- =============================================================================
-- TABLE 7: voice_journals
-- Column names match VoiceJournalEntryModel.toJson() in the Flutter app.
-- `storage_path` points to an AES-256 encrypted object in the
-- `voice-journals` storage bucket.
-- =============================================================================
create table if not exists public.voice_journals (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  storage_path     text not null,
  duration_seconds integer not null default 0,
  mood_emoji       text,
  note             text,
  recorded_at      timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create index idx_voice_journals_user_id on public.voice_journals(user_id);
create index idx_voice_journals_date    on public.voice_journals(recorded_at desc);


-- =============================================================================
-- TABLE 8: exercise_sessions
-- One row per completed CBT exercise (written by markExerciseComplete).
-- Drives streaks and the Weekly Insight CBT count.
-- =============================================================================
create table if not exists public.exercise_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  exercise_type text not null check (
    exercise_type in ('thought_record','behavioral_activation','pmr','breathing')
  ),
  completed_at  timestamptz not null default now()
);

create index idx_exercise_sessions_user      on public.exercise_sessions(user_id);
create index idx_exercise_sessions_type      on public.exercise_sessions(exercise_type);
create index idx_exercise_sessions_completed on public.exercise_sessions(completed_at desc);


-- =============================================================================
-- TABLE 8b: thought_records
-- A completed CBT Thought Record (saveThoughtRecord). `emotions` /
-- `after_emotions` are JSONB arrays of {label, intensity}.
-- =============================================================================
create table if not exists public.thought_records (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  situation           text,
  emotions            jsonb not null default '[]',
  automatic_thought   text,
  supporting_evidence text[] not null default '{}',
  counter_evidence    text[] not null default '{}',
  balanced_thought    text,
  belief_score        integer check (belief_score between 0 and 100),
  after_emotions      jsonb not null default '[]',
  created_at          timestamptz not null default now()
);

create index idx_thought_records_user on public.thought_records(user_id);


-- =============================================================================
-- TABLE 8c: activity_logs
-- Behavioural-activation daily checklist. Primary key is (user_id, date) so
-- the app's upsert keeps exactly one row per user per day.
-- =============================================================================
create table if not exists public.activity_logs (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  date       date not null,
  activities jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create index idx_activity_logs_user on public.activity_logs(user_id);


-- =============================================================================
-- TABLE 9: psychologists
-- =============================================================================
create table if not exists public.psychologists (
  id                  uuid primary key default gen_random_uuid(),
  full_name           text not null,
  title               text not null default 'M.Psi., Psikolog',
  specializations     text[] not null default '{}',
  languages           text[] not null default '{id}',
  bio                 text,
  photo_url           text,
  license_number      text,
  himpsi_verified     boolean not null default false,
  str_number          text,                         -- Suratizin Registrasi
  rating_average      numeric(3,2) not null default 0.00
                        check (rating_average between 0 and 5),
  total_reviews       integer not null default 0,
  consultation_fee    integer not null default 0,  -- IDR per session
  is_active           boolean not null default true,
  is_available_now    boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_psychologists_updated_at
  before update on public.psychologists
  for each row execute function public.handle_updated_at();

create index idx_psychologists_active    on public.psychologists(is_active);
create index idx_psychologists_available on public.psychologists(is_available_now)
  where is_active = true;


-- =============================================================================
-- TABLE 10: psychologist_schedules
-- =============================================================================
create table if not exists public.psychologist_schedules (
  id                   uuid primary key default gen_random_uuid(),
  psychologist_id      uuid not null references public.psychologists(id) on delete cascade,
  day_of_week          integer not null check (day_of_week between 0 and 6),  -- 0=Sunday
  start_time           time not null,
  end_time             time not null,
  max_slots_per_slot   integer not null default 1,
  constraint chk_end_after_start check (end_time > start_time)
);

create index idx_psych_schedules_psychologist
  on public.psychologist_schedules(psychologist_id);
create index idx_psych_schedules_day
  on public.psychologist_schedules(day_of_week);


-- =============================================================================
-- TABLE 11: consultations
-- =============================================================================
create table if not exists public.consultations (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  psychologist_id       uuid not null references public.psychologists(id),
  scheduled_at          timestamptz not null,
  duration_minutes      integer not null default 50,
  status                text not null default 'pending'
                          check (status in ('pending','confirmed','ongoing','completed','cancelled')),
  agora_channel_name    text,
  agora_token           text,
  video_call_started_at timestamptz,
  ended_at              timestamptz,
  session_summary       text,      -- written by psychologist post-session
  notes_for_patient     text,
  booking_fee           integer not null default 0,  -- IDR
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger trg_consultations_updated_at
  before update on public.consultations
  for each row execute function public.handle_updated_at();

create index idx_consultations_user_id       on public.consultations(user_id);
create index idx_consultations_psychologist  on public.consultations(psychologist_id);
create index idx_consultations_scheduled     on public.consultations(scheduled_at desc);
create index idx_consultations_status        on public.consultations(status);


-- =============================================================================
-- TABLE 12: consultation_messages
-- =============================================================================
create table if not exists public.consultation_messages (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  message_text    text not null,
  sent_at         timestamptz not null default now(),
  is_read         boolean not null default false
);

create index idx_consult_messages_consultation
  on public.consultation_messages(consultation_id, sent_at desc);
create index idx_consult_messages_unread
  on public.consultation_messages(consultation_id, is_read)
  where is_read = false;


-- =============================================================================
-- TABLE 13: ai_conversations
-- =============================================================================
create table if not exists public.ai_conversations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  -- messages: [{role: 'user'|'assistant', content: string, timestamp: iso8601}]
  messages         jsonb not null default '[]',
  crisis_detected  boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger trg_ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.handle_updated_at();

create index idx_ai_conversations_user_id on public.ai_conversations(user_id);
create index idx_ai_conversations_crisis
  on public.ai_conversations(user_id, crisis_detected)
  where crisis_detected = true;


-- =============================================================================
-- TABLE 14: emergency_contacts
-- =============================================================================
create table if not exists public.emergency_contacts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  contact_name   text not null,
  contact_phone  text not null,
  relationship   text not null,
  is_primary     boolean not null default false,
  created_at     timestamptz not null default now()
);

create index idx_emergency_contacts_user_id on public.emergency_contacts(user_id);

-- Enforce only one primary contact per user
create unique index uidx_emergency_contacts_primary
  on public.emergency_contacts(user_id)
  where is_primary = true;


-- =============================================================================
-- TABLE 15: caregiver_relationships
-- Column names match CaregiverRepositoryImpl in the Flutter app. A patient
-- creates an invite (caregiver_id null, status 'pending'); the caregiver
-- accepts it by invite_code, which sets caregiver_id and status 'active'.
-- =============================================================================
create table if not exists public.caregiver_relationships (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  caregiver_id    uuid references public.profiles(id) on delete cascade,
  caregiver_phone text,
  invite_code     text not null unique,
  -- {"mood_daily":true,"assessment_results":false,"app_activity":false,"emergency_alerts":true}
  permissions     jsonb not null default
    '{"mood_daily":true,"assessment_results":false,"app_activity":false,"emergency_alerts":true}',
  status          text not null default 'pending'
                    check (status in ('pending','active','declined','revoked')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_caregiver_relationships_updated_at
  before update on public.caregiver_relationships
  for each row execute function public.handle_updated_at();

create index idx_caregiver_rel_caregiver on public.caregiver_relationships(caregiver_id);
create index idx_caregiver_rel_patient   on public.caregiver_relationships(patient_id);
create index idx_caregiver_rel_invite    on public.caregiver_relationships(invite_code);


-- =============================================================================
-- TABLE 16: notifications_log
-- =============================================================================
create table if not exists public.notifications_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  type          text not null,          -- 'reminder', 'crisis_alert', 'session_start', etc.
  title         text not null,
  body          text not null,
  sent_at       timestamptz not null default now(),
  read_at       timestamptz,
  action_taken  text
);

create index idx_notifications_user_id  on public.notifications_log(user_id);
create index idx_notifications_unread
  on public.notifications_log(user_id, read_at)
  where read_at is null;


-- =============================================================================
-- TABLE 17: satusehat_sync_log
-- =============================================================================
create table if not exists public.satusehat_sync_log (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  resource_type    text not null,     -- 'Observation', 'Patient', 'Encounter', etc.
  local_record_id  uuid not null,
  satusehat_id     text,
  sync_status      text not null default 'pending'
                     check (sync_status in ('pending','synced','failed')),
  synced_at        timestamptz,
  error_message    text,
  created_at       timestamptz not null default now()
);

create index idx_satusehat_sync_user_id       on public.satusehat_sync_log(user_id);
create index idx_satusehat_sync_status        on public.satusehat_sync_log(sync_status);
create index idx_satusehat_sync_local_record  on public.satusehat_sync_log(local_record_id);


-- =============================================================================
-- ROW LEVEL SECURITY — Enable on all tables
-- =============================================================================
alter table public.profiles                  enable row level security;
alter table public.assessments               enable row level security;
alter table public.mood_entries              enable row level security;
alter table public.sleep_entries             enable row level security;
alter table public.night_reflections         enable row level security;
alter table public.reflection_questions      enable row level security;
alter table public.voice_journals            enable row level security;
alter table public.exercise_sessions         enable row level security;
alter table public.thought_records           enable row level security;
alter table public.activity_logs             enable row level security;
alter table public.psychologists             enable row level security;
alter table public.psychologist_schedules    enable row level security;
alter table public.consultations             enable row level security;
alter table public.consultation_messages     enable row level security;
alter table public.ai_conversations          enable row level security;
alter table public.emergency_contacts        enable row level security;
alter table public.caregiver_relationships   enable row level security;
alter table public.notifications_log         enable row level security;
alter table public.satusehat_sync_log        enable row level security;


-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- ── profiles ─────────────────────────────────────────────────────────────────
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Psychologists can view profiles of users booked with them
create policy "Psychologists can view patient profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.consultations c
      where c.user_id = profiles.id
        and c.psychologist_id = auth.uid()
        and c.status in ('confirmed','ongoing','completed')
    )
  );

-- Caregivers can view patient profile if relationship is active
create policy "Caregivers can view patient profile"
  on public.profiles for select
  using (
    exists (
      select 1 from public.caregiver_relationships cr
      where cr.patient_id = profiles.id
        and cr.caregiver_id = auth.uid()
        and cr.status = 'active'
    )
  );

-- ── assessments ──────────────────────────────────────────────────────────────
create policy "Users manage own assessments"
  on public.assessments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Psychologists can view patient assessments"
  on public.assessments for select
  using (
    exists (
      select 1 from public.consultations c
      where c.user_id = assessments.user_id
        and c.psychologist_id = auth.uid()
        and c.status in ('confirmed','ongoing','completed')
    )
  );

create policy "Caregivers can view patient assessments"
  on public.assessments for select
  using (
    exists (
      select 1 from public.caregiver_relationships cr
      where cr.patient_id = assessments.user_id
        and cr.caregiver_id = auth.uid()
        and cr.status = 'active'
        and (cr.permissions->>'assessment_results')::boolean = true
    )
  );

-- ── mood_entries ──────────────────────────────────────────────────────────────
create policy "Users manage own mood entries"
  on public.mood_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Caregivers can view patient mood"
  on public.mood_entries for select
  using (
    exists (
      select 1 from public.caregiver_relationships cr
      where cr.patient_id = mood_entries.user_id
        and cr.caregiver_id = auth.uid()
        and cr.status = 'active'
        and (cr.permissions->>'mood_daily')::boolean = true
    )
  );

-- ── sleep_entries ─────────────────────────────────────────────────────────────
create policy "Users manage own sleep entries"
  on public.sleep_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── night_reflections ─────────────────────────────────────────────────────────
create policy "Users manage own reflections"
  on public.night_reflections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── reflection_questions — read-only for all authenticated users ──────────────
create policy "Anyone authenticated can read questions"
  on public.reflection_questions for select
  using (auth.role() = 'authenticated');

-- ── voice_journals ────────────────────────────────────────────────────────────
create policy "Users manage own voice journals"
  on public.voice_journals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── exercise_sessions / thought_records / activity_logs ───────────────────────
create policy "Users manage own exercise sessions"
  on public.exercise_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own thought records"
  on public.thought_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own activity logs"
  on public.activity_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── psychologists — public read, service-role write ───────────────────────────
create policy "Anyone authenticated can view active psychologists"
  on public.psychologists for select
  using (auth.role() = 'authenticated' and is_active = true);

-- ── psychologist_schedules ────────────────────────────────────────────────────
create policy "Anyone authenticated can view schedules"
  on public.psychologist_schedules for select
  using (auth.role() = 'authenticated');

-- ── consultations ─────────────────────────────────────────────────────────────
create policy "Users can view own consultations"
  on public.consultations for select
  using (auth.uid() = user_id);

create policy "Users can insert own consultations"
  on public.consultations for insert
  with check (auth.uid() = user_id);

create policy "Users can cancel own consultations"
  on public.consultations for update
  using (auth.uid() = user_id and status in ('pending','confirmed'))
  with check (auth.uid() = user_id and status = 'cancelled');

create policy "Psychologists can view their consultations"
  on public.consultations for select
  using (auth.uid() = psychologist_id);

create policy "Psychologists can update their consultations"
  on public.consultations for update
  using (auth.uid() = psychologist_id);

-- ── consultation_messages ─────────────────────────────────────────────────────
create policy "Participants can view consultation messages"
  on public.consultation_messages for select
  using (
    exists (
      select 1 from public.consultations c
      where c.id = consultation_messages.consultation_id
        and (c.user_id = auth.uid() or c.psychologist_id = auth.uid())
    )
  );

create policy "Participants can send consultation messages"
  on public.consultation_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.consultations c
      where c.id = consultation_messages.consultation_id
        and (c.user_id = auth.uid() or c.psychologist_id = auth.uid())
        and c.status in ('confirmed','ongoing')
    )
  );

-- ── ai_conversations ──────────────────────────────────────────────────────────
create policy "Users manage own AI conversations"
  on public.ai_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── emergency_contacts ────────────────────────────────────────────────────────
create policy "Users manage own emergency contacts"
  on public.emergency_contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── caregiver_relationships ───────────────────────────────────────────────────
-- Pending invites are readable/updatable so a caregiver can accept one by its
-- invite_code before the link (caregiver_id) exists. The 8-char code is the
-- shared secret that gates the invite.
create policy "View own or pending caregiver relationships"
  on public.caregiver_relationships for select
  using (
    auth.uid() = patient_id
    or auth.uid() = caregiver_id
    or status = 'pending'
  );

create policy "Patient can create caregiver invite"
  on public.caregiver_relationships for insert
  with check (auth.uid() = patient_id);

create policy "Caregiver or patient can update relationship"
  on public.caregiver_relationships for update
  using (
    auth.uid() = patient_id
    or auth.uid() = caregiver_id
    or status = 'pending'
  );

create policy "Patient can delete caregiver relationship"
  on public.caregiver_relationships for delete
  using (auth.uid() = patient_id);

-- ── notifications_log ─────────────────────────────────────────────────────────
create policy "Users can view own notifications"
  on public.notifications_log for select
  using (auth.uid() = user_id);

create policy "Users can mark own notifications read"
  on public.notifications_log for update
  using (auth.uid() = user_id);

-- ── satusehat_sync_log ────────────────────────────────────────────────────────
create policy "Users can view own sync log"
  on public.satusehat_sync_log for select
  using (auth.uid() = user_id);


-- =============================================================================
-- DATABASE FUNCTIONS
-- =============================================================================

-- Compute assessment category from score and type
create or replace function public.classify_assessment(
  p_type text,
  p_score integer
) returns text language plpgsql immutable as $$
begin
  return case p_type
    when 'phq9' then
      case
        when p_score <= 4  then 'minimal'
        when p_score <= 9  then 'mild'
        when p_score <= 14 then 'moderate'
        else 'severe'
      end
    when 'gad7' then
      case
        when p_score <= 4  then 'minimal'
        when p_score <= 9  then 'mild'
        when p_score <= 14 then 'moderate'
        else 'severe'
      end
    when 'pss10' then
      case
        when p_score <= 13 then 'minimal'
        when p_score <= 26 then 'moderate'
        else 'severe'
      end
    when 'srq20' then
      case
        when p_score <= 5  then 'minimal'
        when p_score <= 10 then 'mild'
        when p_score <= 15 then 'moderate'
        else 'severe'
      end
    else
      case
        when p_score::float / 40 < 0.2 then 'minimal'
        when p_score::float / 40 < 0.5 then 'mild'
        when p_score::float / 40 < 0.75 then 'moderate'
        else 'severe'
      end
  end;
end;
$$;

-- Get user's last mood entry
create or replace function public.get_latest_mood(p_user_id uuid)
returns public.mood_entries language sql stable security definer as $$
  select * from public.mood_entries
  where user_id = p_user_id
  order by created_at desc
  limit 1;
$$;

-- Count unread notifications for a user
create or replace function public.unread_notification_count(p_user_id uuid)
returns bigint language sql stable security definer as $$
  select count(*) from public.notifications_log
  where user_id = p_user_id and read_at is null;
$$;


-- =============================================================================
-- SEED DATA: reflection_questions
-- =============================================================================
insert into public.reflection_questions (question_text, category, display_order) values
  ('Apa hal terbaik yang terjadi hari ini?',           'gratitude',   1),
  ('Apa yang membuatmu merasa sulit hari ini?',         'challenge',   2),
  ('Satu hal yang ingin kamu syukuri malam ini?',       'gratitude',   3),
  ('Apa yang bisa kamu lakukan lebih baik besok?',      'growth',      4),
  ('Siapa yang membuatmu merasa didukung hari ini?',    'connection',  5),
  ('Bagaimana perasaanmu saat ini, dalam satu kata?',   'emotion',     6),
  ('Apa yang membuatmu tersenyum hari ini?',            'joy',         7),
  ('Adakah kekhawatiran yang ingin kamu lepaskan?',     'release',     8),
  ('Apa yang kamu pelajari tentang dirimu hari ini?',   'self-insight',9),
  ('Bagaimana kualitas istirahatmu kemarin?',           'sleep',      10)
on conflict do nothing;


-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile_photos',       'profile_photos',       true,  5242880,  array['image/jpeg','image/png','image/webp']),
  ('voice-journals',       'voice-journals',        false, 52428800, array['audio/m4a','audio/mpeg','audio/wav','audio/ogg','application/octet-stream']),
  ('consultation_assets',  'consultation_assets',   false, 10485760, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;


-- Storage RLS: profile_photos (public read, owner write)
create policy "Public read profile photos"
  on storage.objects for select
  using (bucket_id = 'profile_photos');

create policy "Authenticated users upload own photo"
  on storage.objects for insert
  with check (
    bucket_id = 'profile_photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner can update own photo"
  on storage.objects for update
  using (
    bucket_id = 'profile_photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Owner can delete own photo"
  on storage.objects for delete
  using (
    bucket_id = 'profile_photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: voice-journals (private — owner only)
create policy "Owner can CRUD voice journals"
  on storage.objects for all
  using (
    bucket_id = 'voice-journals'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'voice-journals'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: consultation_assets (participants only)
create policy "Consultation participants can access assets"
  on storage.objects for select
  using (
    bucket_id = 'consultation_assets'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated users can upload consultation assets"
  on storage.objects for insert
  with check (
    bucket_id = 'consultation_assets'
    and auth.role() = 'authenticated'
  );
