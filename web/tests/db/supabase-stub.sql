-- Stub minimal lingkungan Supabase untuk menguji migrasi di Postgres biasa (PGlite).
-- Meniru HANYA yang dibutuhkan migrasi: role, skema auth/storage, auth.uid()/role()/jwt(),
-- hak default tabel, dan publikasi realtime. Bukan pengganti Supabase sungguhan.

create role anon          nologin;
create role authenticated nologin;
create role service_role  nologin bypassrls;

create schema if not exists auth;
create schema if not exists storage;

create table auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  raw_app_meta_data   jsonb not null default '{}'::jsonb
);

-- Sama seperti Supabase: nilai berasal dari klaim JWT yang diatur PostgREST per permintaan.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select jsonb_build_object('sub', auth.uid(), 'role', auth.role(),
                            'aal', nullif(current_setting('request.jwt.claim.aal', true), ''))
$$;

create table storage.buckets (
  id text primary key, name text, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select string_to_array(name, '/')
$$;

create publication supabase_realtime;

grant usage on schema public, auth to anon, authenticated, service_role;
-- Di Supabase nyata, baris auth.users dibuat oleh GoTrue (supabase_auth_admin). Untuk uji,
-- service_role boleh menulisnya supaya skenario signup bisa disimulasikan.
grant all on auth.users to service_role;
grant execute on function auth.uid(), auth.role(), auth.jwt() to anon, authenticated, service_role;

-- Supabase memberi anon/authenticated/service_role hak TABEL penuh secara default pada tabel
-- baru di skema public. Inilah yang membuat `revoke update (kolom)` tidak efektif.
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
