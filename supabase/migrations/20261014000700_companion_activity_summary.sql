-- =============================================================================
-- Mindra Web, Gelombang 3: ringkasan penggunaan Teman cerita untuk psikolog (izin `ai_summary`)
-- =============================================================================
-- Izin `ai_summary` sudah ada sejak migrasi web pertama, tetapi belum ada yang membacanya. Fungsi ini memberi
-- psikolog (yang diizinkan klien) GAMBARAN PENGGUNAAN saja: berapa percakapan, berapa pesan, berapa hari aktif,
-- berapa percakapan yang sempat memicu tanda krisis, dan kapan terakhir. ISI PERCAKAPAN TIDAK PERNAH KELUAR dari
-- fungsi ini dan tidak ada policy baru pada `ai_conversations`, jadi psikolog tidak bisa membaca teks lewat jalur lain.
--
-- Additive saja: satu fungsi baru. Tidak mengubah tabel, policy, atau fungsi yang ada. Idempotent.
-- =============================================================================

create or replace function public.client_companion_activity(p_client uuid, p_days integer default 30)
returns table (
  conversations         integer,
  messages              integer,
  active_days           integer,
  crisis_conversations  integer,
  last_activity         timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
begin
  -- `can_view` memeriksa izin `ai_summary` pada tautan aktif (psikolog harus aal2) atau pemilik data itu sendiri.
  if p_client is null or not public.can_view(p_client, 'ai_summary') then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;

  return query
  select
    count(*)::integer,
    coalesce(sum(
      case when jsonb_typeof(c.messages) = 'array' then jsonb_array_length(c.messages) else 0 end
    ), 0)::integer,
    count(distinct (c.updated_at at time zone 'Asia/Jakarta')::date)::integer,
    (count(*) filter (where c.crisis_detected))::integer,
    max(c.updated_at)
  from public.ai_conversations c
  where c.user_id = p_client
    and c.updated_at >= now() - make_interval(days => v_days);
end;
$$;

revoke all on function public.client_companion_activity(uuid, integer) from public, anon;
grant execute on function public.client_companion_activity(uuid, integer) to authenticated, service_role;

comment on function public.client_companion_activity(uuid, integer) is
  'Gambaran penggunaan Teman cerita (jumlah, tanpa isi percakapan) bagi yang diizinkan `ai_summary`. Menolak 42501 bila tidak berhak.';
