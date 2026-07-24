-- ============================================================
-- Migration: 015_category_subcategories
-- Story: US-13 — One-level subcategory (self-referencing FK) (v1.4)
-- Run against: Supabase Postgres
--
-- Adds an optional one-level subcategory under any category via a
-- nullable self-referencing FK on categories. Purely additive on an
-- existing table — no new table (see RLS note below).
--
-- "One level only" (no grandnesting) cannot be expressed as a single-row
-- CHECK constraint (it requires reading the PARENT row's own
-- parent_category_id) and is enforced at the application layer in
-- server/db/queries.js (createCategory/updateCategory), matching this
-- project's existing convention of enforcing category business rules
-- in the route/query layer rather than DB triggers.
--
-- The same-row self-parent case (parent_category_id = id) IS expressible
-- as a row-level CHECK and is enforced here as defense-in-depth.
--
-- ON DELETE RESTRICT (not CASCADE, not SET NULL): a category with
-- existing subcategories must not be deletable until its subcategories
-- are reassigned/deleted first. The app layer blocks this before it
-- reaches the DB (HAS_SUBCATEGORIES check) — RESTRICT is the second
-- line of defense if that check is ever bypassed.
--
-- Rollback: ALTER TABLE public.categories DROP COLUMN parent_category_id;
--           (safe only if no rows have it set yet)
--
-- Not applied here — file only. Applying to production Supabase is a
-- separate step performed by the reviewer, not this build.
-- ============================================================

BEGIN;

ALTER TABLE public.categories
  ADD COLUMN parent_category_id BIGINT REFERENCES public.categories(id) ON DELETE RESTRICT,
  ADD CONSTRAINT categories_parent_not_self CHECK (parent_category_id IS NULL OR parent_category_id <> id);

CREATE INDEX idx_categories_parent_id ON public.categories(parent_category_id);

COMMIT;
