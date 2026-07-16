-- ============================================================
-- Migration: 006_security_hardening_rls_and_rpc_grants
-- Applied directly to production during deployment verification
-- (2026-07-15); recorded here retroactively for the historical record.
--
-- Context: client/src/lib/supabase.js ships VITE_SUPABASE_ANON_KEY in the
-- built client bundle (by design, for Supabase Auth's client-side SDK
-- calls). This means the anon key is publicly extractable from the
-- deployed site. Two consequences:
--   1. public.budgets and public.recurrences had RLS disabled entirely
--      (unlike every other table in this schema) — fully readable/
--      writable by anyone with the anon key.
--   2. create_transfer/update_transfer/delete_transfer (and a few other
--      SECURITY DEFINER functions) were EXECUTE-granted to anon and
--      authenticated by default, callable directly via
--      /rest/v1/rpc/<function>, bypassing the Express server's own auth
--      middleware entirely — a live money-movement authorization bypass.
--
-- The Express server always uses SUPABASE_SERVICE_ROLE_KEY (confirmed in
-- server/db/supabase.js), which bypasses both RLS and these grants, so
-- neither fix changes the app's own intended behavior.
-- ============================================================

BEGIN;

-- 1. Lock down budgets/recurrences the same way every other table in this
--    schema already is (RLS enabled, no policies — this app does not use
--    RLS-based access control; all authorization happens in the Express
--    layer via the service-role key, which bypasses RLS regardless).
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrences ENABLE ROW LEVEL SECURITY;

-- 2. Revoke direct RPC execution by anon/authenticated on functions that
--    should only ever be called by the server's service-role client.
--    NOTE: this REVOKE alone turned out to be insufficient — see 007.
REVOKE EXECUTE ON FUNCTION public.create_transfer(bigint, bigint, numeric, text, date) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_transfer(uuid, bigint, bigint, numeric, text, date) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_transfer(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_categories() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_first_user() FROM anon, authenticated;

COMMIT;
