-- ============================================================
-- Migration: 001_add_users_and_account_user_id
-- Sprint: v2.0 Sprint 2 (Multi-User Auth)
-- Run against: Supabase Postgres (via Supabase SQL Editor or migration tool)
-- Rollback: see §6.5 of architecture design
-- ============================================================

BEGIN;

-- 1. Create public.users mirror table
CREATE TABLE IF NOT EXISTS public.users (
    id          UUID PRIMARY KEY,              -- mirrors auth.users.id
    email       TEXT NOT NULL,                  -- mirrors auth.users.email (denormalized for query convenience)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS on public.users (consistent with other tables — toothless for now)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Trigger: auto-create public.users row when a new auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists (idempotent re-run safety)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Add nullable user_id FK to accounts
ALTER TABLE public.accounts
    ADD COLUMN IF NOT EXISTS user_id UUID
    REFERENCES public.users(id)
    ON DELETE SET NULL;  -- soft-delete safety: if a user is deleted, accounts become unowned, not cascade-deleted

-- 5. Index for future user-scoped queries (US-22)
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- 6. Backfill existing accounts: assign to the first user in public.users (if any)
--    This is the "first sign-up owns existing data" mechanism (FR-A11, Q5).
--    If no user exists yet (pre-cutover), this is a no-op — the backfill runs
--    as part of the cutover script (see §6.3).
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    SELECT id INTO first_user_id FROM public.users ORDER BY created_at ASC LIMIT 1;
    IF first_user_id IS NOT NULL THEN
        UPDATE public.accounts SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
END $$;

-- 7. First-sign-up backfill mechanism (FR-A11, Q5)
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
        INSERT INTO public.settings (key, value)
        VALUES ('first_launch_completed', '1')
        ON CONFLICT (key) DO NOTHING;

        -- Seed default categories if none exist (migrated from old /api/setup logic)
        -- This ensures the first user gets the default categories even if
        -- the old setup flow never ran.
        PERFORM seed_default_categories();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to the existing handle_new_user trigger, or create a separate one
DROP TRIGGER IF EXISTS on_first_user_backfill ON public.users;
CREATE TRIGGER on_first_user_backfill
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.backfill_first_user();

-- 8. Seed default categories function (replicates old /api/setup logic)
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS void AS $$
DECLARE
    cat_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO cat_count FROM public.categories;
    IF cat_count = 0 THEN
        INSERT INTO public.categories (name, type, color, is_default, sort_order) VALUES
            ('Food & Dining',    'expense', '#1F7A64', true, 1),
            ('Transportation',   'expense', '#2A9A7D', true, 2),
            ('Housing & Utilities','expense','#45B095', true, 3),
            ('Shopping',         'expense', '#6FC9B0', true, 4),
            ('Entertainment',    'expense', '#E89C2A', true, 5),
            ('Subscriptions',    'expense', '#F5B042', true, 6),
            ('Health',           'expense', '#F9C55A', true, 7),
            ('Education',        'expense', '#5B6FBF', true, 8),
            ('Insurance',        'expense', '#8B5CF6', true, 9),
            ('Other',            'expense', '#D14343', true, 10),
            ('Salary',           'income',  '#1B8E4E', true, 1),
            ('Freelance',        'income',  '#2A9A7D', true, 2),
            ('Gift',             'income',  '#45B095', true, 3),
            ('Investment',       'income',  '#F5B042', true, 4),
            ('Refund',           'income',  '#5B6FBF', true, 5),
            ('Other Income',     'income',  '#8B5CF6', true, 6);

        -- Also create the default Cash account
        INSERT INTO public.accounts (name, type, description)
        VALUES ('Cash', 'debit', 'Default cash account');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;