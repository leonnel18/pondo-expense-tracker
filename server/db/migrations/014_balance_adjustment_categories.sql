-- ============================================================
-- Migration: 014_balance_adjustment_categories
-- Story: US-03 — Balance reconciliation (v1.2)
-- Run against: Supabase Postgres

-- Rollback: DELETE FROM public.categories WHERE name = 'Balance Adjustment';
--           (safe only if no entries reference these categories yet —
--           if entries exist, reassign them first, same as any other
--           category deletion in this app)
--
-- Purely additive rows on an existing, already-RLS-enabled table — no
-- new table. Uses WHERE NOT EXISTS instead of ON CONFLICT DO NOTHING:
-- there is no UNIQUE constraint on categories(name, type), so an
-- ON CONFLICT clause would have no constraint to target and would
-- silently insert duplicates on a re-run rather than no-op. This
-- project's own history (migrations 006/011/012 are all recorded as
-- "applied directly to production, recorded here retroactively") means
-- accidental re-application is a real operational pattern here, not a
-- hypothetical — this migration is written to be safe under that reality.
-- ============================================================

BEGIN;

INSERT INTO public.categories (name, type, color, icon, is_default, sort_order)
SELECT 'Balance Adjustment', 'income', '#8A9387', '⚖️', true, 100
WHERE NOT EXISTS (
    SELECT 1 FROM public.categories WHERE name = 'Balance Adjustment' AND type = 'income'
);

INSERT INTO public.categories (name, type, color, icon, is_default, sort_order)
SELECT 'Balance Adjustment', 'expense', '#8A9387', '⚖️', true, 100
WHERE NOT EXISTS (
    SELECT 1 FROM public.categories WHERE name = 'Balance Adjustment' AND type = 'expense'
);

COMMIT;