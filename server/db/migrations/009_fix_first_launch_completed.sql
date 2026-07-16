-- ============================================================
-- Migration: 009_fix_first_launch_completed
-- Bug: Sidebar/nav disappears on every page except dashboard
-- Root cause: backfill_first_user() used ON CONFLICT DO NOTHING,
--   so a pre-existing stale 'first_launch_completed' row (from
--   the pre-Supabase-Auth v1 app) was never updated to '1' when
--   the first real user signed up. Layout.jsx reads this as
--   first_launch=true and strips the sidebar on every non-/ route.
-- Fix: (a) Replace the function with DO UPDATE so future first
--   sign-ups always self-heal; (b) one-time UPDATE to fix the
--   current stale row immediately.
-- ============================================================

BEGIN;

-- (a) Replace backfill_first_user() with corrected ON CONFLICT clause
--
-- CAUTION preserved during review (DARKLING): CREATE OR REPLACE FUNCTION
-- fully redefines the function, including dropping any `SET search_path`
-- config the previous definition had — it does NOT merge with the prior
-- version. 008_fix_function_search_path.sql had already pinned
-- `search_path = public` on this exact function after it caused the
-- original signup 500 ("function seed_default_categories() does not
-- exist") the first time this trigger chain ran in production. Omitting
-- `SET search_path = public` here would silently re-introduce that bug.
-- Re-specified below.
CREATE OR REPLACE FUNCTION public.backfill_first_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Count existing users (including the one just inserted)
    SELECT COUNT(*) INTO user_count FROM public.users;

    -- Only backfill for the FIRST user
    IF user_count = 1 THEN
        -- Assign all existing accounts to this user
        UPDATE public.accounts SET user_id = NEW.id WHERE user_id IS NULL;

        -- Mark first launch as completed (if not already)
        -- CHANGED: DO UPDATE instead of DO NOTHING so a stale
        -- pre-existing row gets corrected to '1' on first sign-up.
        INSERT INTO public.settings (key, value)
        VALUES ('first_launch_completed', '1')
        ON CONFLICT (key) DO UPDATE SET value = '1';

        -- Seed default categories if none exist
        PERFORM seed_default_categories();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- (b) One-time fix: correct any existing stale row RIGHT NOW
--     (don't wait for a second user to sign up to self-heal)
INSERT INTO public.settings (key, value)
VALUES ('first_launch_completed', '1')
ON CONFLICT (key) DO UPDATE SET value = '1';

COMMIT;
