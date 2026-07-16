-- ============================================================
-- Migration: 007_revoke_public_execute_grant_fix
-- Applied directly to production during deployment verification
-- (2026-07-15); recorded here retroactively for the historical record.
--
-- Fixes 006: REVOKE EXECUTE FROM anon, authenticated had no effect because
-- Postgres grants EXECUTE to the implicit PUBLIC pseudo-role by default
-- when a function is created, and every role (including anon/authenticated)
-- inherits PUBLIC's privileges regardless of role-specific REVOKEs.
-- Verified directly via has_function_privilege() after 006 — anon/
-- authenticated still had EXECUTE despite the prior REVOKE succeeding
-- without error (it revoked a grant that wasn't the one actually in
-- effect). Must REVOKE FROM PUBLIC specifically to remove the default.
-- ============================================================

BEGIN;

REVOKE EXECUTE ON FUNCTION public.create_transfer(bigint, bigint, numeric, text, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_transfer(uuid, bigint, bigint, numeric, text, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_transfer(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_default_categories() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.backfill_first_user() FROM PUBLIC;

-- Explicitly re-grant to service_role only, so the server (which connects
-- with the service role key) is unaffected. service_role typically bypasses
-- these grants entirely in Supabase, but granting explicitly removes any
-- doubt and documents intent.
GRANT EXECUTE ON FUNCTION public.create_transfer(bigint, bigint, numeric, text, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_transfer(uuid, bigint, bigint, numeric, text, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_transfer(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_default_categories() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.backfill_first_user() TO service_role;

COMMIT;
