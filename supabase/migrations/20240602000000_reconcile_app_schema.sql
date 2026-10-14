-- =============================================================================
-- Reconcile the database schema with the Flutter app's data layer.
-- =============================================================================
-- The original initial schema drifted from the column names the app actually
-- reads/writes. The initial migration file has since been corrected, so any
-- FRESH project is already right and this migration is a harmless no-op.
--
-- For an EXISTING database created from the *old* initial schema, this
-- migration morphs it into the correct shape in place. Every step is guarded
-- (IF EXISTS / IF NOT EXISTS / information_schema checks) so it is safe to run
-- once, repeatedly, or on an already-correct database.
--
-- Tables reconciled : mood_entries, sleep_entries, night_reflections,
--                     voice_journals, caregiver_relationships, assessments
-- Tables added      : exercise_sessions, thought_records, activity_logs
-- =============================================================================

-- ── mood_entries ─────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.mood_entries') is null then return; end if;

  alter table public.mood_entries drop column if exists recorded_date;
  alter table public.mood_entries drop column if exists mood_score;
  alter table public.mood_entries drop column if exists mood_label;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'mood_entries'
               and column_name = 'recorded_at')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'mood_entries'
               and column_name = 'created_at') then
    alter table public.mood_entries rename column recorded_at to created_at;
  end if;

  alter table public.mood_entries
    add column if not exists created_at   timestamptz not null default now();
  alter table public.mood_entries
    add column if not exists note         text not null default '';
  alter table public.mood_entries
    add column if not exists energy_level integer;
  alter table public.mood_entries
    add column if not exists triggers     text[] not null default '{}';

  update public.mood_entries set mood_type = 'tenang' where mood_type is null;
  alter table public.mood_entries alter column mood_type set not null;
end $$;

-- ── sleep_entries ────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.sleep_entries') is null then return; end if;

  alter table public.sleep_entries drop column if exists duration_minutes;
  alter table public.sleep_entries drop column if exists recorded_date;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'sleep_entries'
               and column_name = 'sleep_time')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'sleep_entries'
               and column_name = 'bedtime') then
    alter table public.sleep_entries rename column sleep_time to bedtime;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'sleep_entries'
               and column_name = 'quality_score')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'sleep_entries'
               and column_name = 'quality') then
    alter table public.sleep_entries rename column quality_score to quality;
  end if;

  alter table public.sleep_entries
    add column if not exists notes      text not null default '';
  alter table public.sleep_entries
    add column if not exists created_at timestamptz not null default now();
end $$;

-- ── night_reflections ────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.night_reflections') is null then return; end if;

  alter table public.night_reflections drop column if exists question_id;
  alter table public.night_reflections drop column if exists answer_text;
  alter table public.night_reflections drop column if exists mood_at_reflection;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'night_reflections'
               and column_name = 'reflected_at')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'night_reflections'
               and column_name = 'created_at') then
    alter table public.night_reflections rename column reflected_at to created_at;
  end if;

  alter table public.night_reflections
    add column if not exists created_at timestamptz not null default now();
  alter table public.night_reflections
    add column if not exists date       date not null default current_date;
  alter table public.night_reflections
    add column if not exists answers    jsonb not null default '[]';
  alter table public.night_reflections
    add column if not exists mood_after integer;
end $$;

-- ── voice_journals ───────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.voice_journals') is null then return; end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'voice_journals'
               and column_name = 'audio_file_path')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'voice_journals'
               and column_name = 'storage_path') then
    alter table public.voice_journals rename column audio_file_path to storage_path;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'voice_journals'
               and column_name = 'text_notes')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'voice_journals'
               and column_name = 'note') then
    alter table public.voice_journals rename column text_notes to note;
  end if;

  alter table public.voice_journals drop column if exists mood_tag;
  alter table public.voice_journals
    add column if not exists mood_emoji text;
  alter table public.voice_journals
    add column if not exists created_at timestamptz not null default now();
end $$;

-- ── assessments — widen the instrument-type CHECK to include pss10 ───────────
do $$
begin
  if to_regclass('public.assessments') is null then return; end if;
  alter table public.assessments drop constraint if exists assessments_type_check;
  alter table public.assessments
    add constraint assessments_type_check
    check (type in ('phq9', 'gad7', 'pss10', 'srq20'));
end $$;

-- ── caregiver_relationships ──────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.caregiver_relationships') is null then return; end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public'
               and table_name = 'caregiver_relationships'
               and column_name = 'caregiver_user_id')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public'
               and table_name = 'caregiver_relationships'
               and column_name = 'caregiver_id') then
    alter table public.caregiver_relationships
      rename column caregiver_user_id to caregiver_id;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public'
               and table_name = 'caregiver_relationships'
               and column_name = 'patient_user_id')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public'
               and table_name = 'caregiver_relationships'
               and column_name = 'patient_id') then
    alter table public.caregiver_relationships
      rename column patient_user_id to patient_id;
  end if;

  -- caregiver_id is nullable until an invite is accepted.
  alter table public.caregiver_relationships
    alter column caregiver_id drop not null;

  alter table public.caregiver_relationships
    add column if not exists caregiver_phone text;
  alter table public.caregiver_relationships
    add column if not exists invite_code text;

  -- Backfill invite codes for any legacy rows, then enforce uniqueness.
  update public.caregiver_relationships
    set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    where invite_code is null;
  alter table public.caregiver_relationships
    alter column invite_code set not null;

  alter table public.caregiver_relationships
    drop constraint if exists uq_caregiver_patient;
  if not exists (select 1 from pg_constraint
                 where conname = 'caregiver_relationships_invite_code_key') then
    alter table public.caregiver_relationships
      add constraint caregiver_relationships_invite_code_key unique (invite_code);
  end if;

  -- Allow the 'declined' status used by the app.
  alter table public.caregiver_relationships
    drop constraint if exists caregiver_relationships_status_check;
  alter table public.caregiver_relationships
    add constraint caregiver_relationships_status_check
    check (status in ('pending', 'active', 'declined', 'revoked'));
end $$;

-- ── New tables the app depends on ────────────────────────────────────────────

create table if not exists public.exercise_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  exercise_type text not null check (
    exercise_type in ('thought_record','behavioral_activation','pmr','breathing')
  ),
  completed_at  timestamptz not null default now()
);
create index if not exists idx_exercise_sessions_user
  on public.exercise_sessions(user_id);
create index if not exists idx_exercise_sessions_completed
  on public.exercise_sessions(completed_at desc);

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
create index if not exists idx_thought_records_user
  on public.thought_records(user_id);

create table if not exists public.activity_logs (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  date       date not null,
  activities jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
create index if not exists idx_activity_logs_user
  on public.activity_logs(user_id);

-- ── RLS for the new tables (drop-then-create keeps this idempotent) ──────────
alter table public.exercise_sessions enable row level security;
alter table public.thought_records   enable row level security;
alter table public.activity_logs     enable row level security;

drop policy if exists "Users manage own exercise sessions" on public.exercise_sessions;
create policy "Users manage own exercise sessions"
  on public.exercise_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own thought records" on public.thought_records;
create policy "Users manage own thought records"
  on public.thought_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own activity logs" on public.activity_logs;
create policy "Users manage own activity logs"
  on public.activity_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Storage: rename the voice-journal bucket to match the app ────────────────
update storage.buckets set id = 'voice-journals', name = 'voice-journals'
  where id = 'voice_journals';
