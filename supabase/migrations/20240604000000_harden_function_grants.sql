-- =============================================================================
-- Follow-up hardening (Supabase advisor remediation).
-- =============================================================================

-- Trigger/internal functions are granted to PUBLIC by default. anon and
-- authenticated inherit that grant, so revoking from those roles alone is not
-- enough — revoke from PUBLIC. Triggers still fire (they execute as the table
-- owner regardless of EXECUTE privileges).
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_updated_at() from public;
revoke execute on function public.attach_updated_at_trigger(text) from public;

-- A public bucket serves objects via their public URL without an RLS SELECT
-- policy; the broad "Public read profile photos" policy only enabled
-- bucket-wide listing (clients enumerating every uploaded avatar). Drop it —
-- avatar URLs stored on profiles still resolve normally.
drop policy if exists "Public read profile photos" on storage.objects;
