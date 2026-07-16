-- ============================================================
-- Migration: 008_fix_function_search_path
-- Applied directly to production during deployment verification
-- (2026-07-15); recorded here retroactively for the historical record.
--
-- Root-causes the signup 500 found during production verification:
-- backfill_first_user() calls PERFORM seed_default_categories()
-- unqualified. Because none of these functions set search_path explicitly
-- (the same "Function Search Path Mutable" WARN the advisors flagged
-- earlier and was deferred as low-priority), the unqualified call fails to
-- resolve inside the trigger's execution context:
--   ERROR: function seed_default_categories() does not exist (SQLSTATE 42883)
-- which aborts the entire signup transaction inside Supabase Auth
-- ("Database error saving new user"). The Express route then masks this as
-- a generic 200 success response per NFR-A5 (no email disclosure), so the
-- failure was invisible until the raw Supabase auth logs were checked.
--
-- Fix: pin search_path explicitly on every SECURITY DEFINER function in
-- this schema, closing the WARN advisory AND fixing the concrete bug in
-- one pass — same fix, not a coincidence (unqualified calls inside
-- SECURITY DEFINER functions with a mutable search_path are exactly the
-- failure mode the advisory warns about).
--
-- IMPORTANT for future migrations: any CREATE OR REPLACE FUNCTION on these
-- six functions must re-specify SET search_path = public, or this fix is
-- silently lost (CREATE OR REPLACE fully redefines the function, it does
-- not merge with the prior definition's config). See 009 for an instance
-- of this being caught before it shipped.
-- ============================================================

BEGIN;

ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.backfill_first_user() SET search_path = public;
ALTER FUNCTION public.seed_default_categories() SET search_path = public;
ALTER FUNCTION public.create_transfer(bigint, bigint, numeric, text, date) SET search_path = public;
ALTER FUNCTION public.update_transfer(uuid, bigint, bigint, numeric, text, date) SET search_path = public;
ALTER FUNCTION public.delete_transfer(uuid) SET search_path = public;

COMMIT;
