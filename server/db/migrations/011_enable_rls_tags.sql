-- ============================================================
-- Migration: 011_enable_rls_tags
-- Applied directly to production during v2.5 wrap-up (2026-07-16);
-- recorded here retroactively for the historical record.
--
-- Fixes the same "RLS Disabled in Public" ERROR-level advisor finding
-- already fixed twice before for budgets/recurrences (006/007) — new
-- tables in this project must have RLS enabled to match every other
-- table, even though the app enforces access control entirely at the
-- Express/service-role layer and defines no RLS policies. Migration
-- 010 created tags/entry_tags without this step.
-- ============================================================

BEGIN;

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_tags ENABLE ROW LEVEL SECURITY;

COMMIT;
