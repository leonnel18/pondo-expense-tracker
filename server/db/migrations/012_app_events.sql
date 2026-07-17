-- ============================================================
-- Migration: 012_app_events
-- Story: US-27 — minimal local event log
-- Run against: Supabase Postgres
-- Rollback: DROP TABLE app_events;
--
-- Purely additive. No existing table/column changes. No PII logged —
-- metadata is limited to small, non-identifying shape info (e.g. entry
-- type/amount bucket, export date range) set by the call sites in
-- server/routes/*.js, never raw user content (notes, emails, etc).
--
-- RLS enabled per this project's established pattern for every new
-- table (see 004/010, and the retroactive fixes in 006/007/011) — the
-- app enforces access control entirely at the Express/service-role
-- layer and defines no RLS policies, but every table still gets RLS
-- turned on to avoid the "RLS Disabled in Public" advisor finding.
-- ============================================================

BEGIN;

CREATE TABLE app_events (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_events_event_type_created_at ON app_events(event_type, created_at);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

COMMIT;
