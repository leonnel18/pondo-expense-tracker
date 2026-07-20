-- ============================================================
-- Migration: 013_entries_pending_flag
-- Story: US-04 — Pending entry flag (v1.2)
-- Run against: Supabase Postgres
-- Rollback: ALTER TABLE public.entries DROP COLUMN pending;
--           DROP INDEX IF EXISTS idx_entries_pending;
--
-- Purely additive column on an existing, already-RLS-enabled table
-- (per migration 006's baseline) — no new table, so the "RLS on new
-- tables" checklist item does not apply here. Not independently
-- re-verified against a live get_advisors call in this design pass;
-- recommend running get_advisors after applying, per this project's
-- own established post-migration habit (see 006/007/011/012).
-- ============================================================

BEGIN;

ALTER TABLE public.entries
    ADD COLUMN IF NOT EXISTS pending BOOLEAN NOT NULL DEFAULT false;

-- Partial index — the vast majority of entries will have pending = false;
-- this index only covers the small pending subset, same partial-index
-- pattern already established for deleted_at in migration 002.
CREATE INDEX IF NOT EXISTS idx_entries_pending
    ON public.entries(pending)
    WHERE pending = true;

COMMIT;