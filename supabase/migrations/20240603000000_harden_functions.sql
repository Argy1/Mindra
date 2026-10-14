-- =============================================================================
-- Security hardening for database functions (Supabase advisor remediation).
-- =============================================================================

-- 1. Pin search_path so functions cannot be hijacked via a mutable path.
alter function public.handle_updated_at() set search_path = '';
alter function public.attach_updated_at_trigger(text) set search_path = '';
alter function public.handle_new_user() set search_path = '';
alter function public.classify_assessment(text, integer) set search_path = '';
alter function public.get_latest_mood(uuid) set search_path = '';
alter function public.unread_notification_count(uuid) set search_path = '';

-- 2. Trigger / internal functions must not be callable as REST RPC endpoints.
revoke execute on function public.handle_updated_at() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.attach_updated_at_trigger(text) from anon, authenticated;

-- 3. Utility RPCs: run with the caller's privileges so RLS is enforced —
-- otherwise any signed-in user could read another user's data by passing
-- their UUID. SECURITY INVOKER + RLS confines results to the caller's rows.
alter function public.get_latest_mood(uuid) security invoker;
alter function public.unread_notification_count(uuid) security invoker;
