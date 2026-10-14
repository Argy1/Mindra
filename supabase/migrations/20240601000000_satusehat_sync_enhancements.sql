-- =============================================================================
-- SATUSEHAT sync — retry & exponential-backoff support
-- =============================================================================
-- The initial schema's satusehat_sync_log tracks only a final status. The
-- SatusehatSyncService additionally needs per-row attempt counting and a
-- retry window so transient failures can be re-attempted with backoff.
-- =============================================================================

alter table public.satusehat_sync_log
  add column if not exists attempt_count integer not null default 0,
  add column if not exists retry_after   timestamptz,
  add column if not exists updated_at    timestamptz not null default now();

-- Keep updated_at fresh on every write (handle_updated_at defined in initial schema).
create or replace trigger trg_satusehat_sync_log_updated_at
  before update on public.satusehat_sync_log
  for each row execute function public.handle_updated_at();

-- Speed up the "due for retry" scan run on app start / reconnect.
create index if not exists idx_satusehat_sync_retry_after
  on public.satusehat_sync_log(retry_after)
  where sync_status = 'pending';
