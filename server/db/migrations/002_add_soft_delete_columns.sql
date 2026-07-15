-- ============================================================
-- Migration: 002_add_soft_delete_columns
-- Sprint: v2.1 (US-05 — Recycle Bin / Soft Delete)
-- Run against: Supabase Postgres
-- Rollback: DROP COLUMN deleted_at on both tables (data is additive, no loss)
-- ============================================================

BEGIN;

-- 1. Add deleted_at to accounts
ALTER TABLE public.accounts
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add deleted_at to entries
ALTER TABLE public.entries
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Index for recycle-bin queries (list soft-deleted items, purge by age)
CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at
    ON public.accounts(deleted_at)
    WHERE deleted_at IS NOT NULL;  -- partial index — only indexes soft-deleted rows

CREATE INDEX IF NOT EXISTS idx_entries_deleted_at
    ON public.entries(deleted_at)
    WHERE deleted_at IS NOT NULL;

-- 4. Index for the purge query (find rows past retention window)
--    The partial index above already serves this — no additional index needed.

COMMIT;