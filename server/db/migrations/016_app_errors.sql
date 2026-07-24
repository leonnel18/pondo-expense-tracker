-- ============================================================
-- Migration: 016_app_errors
-- Story: US-28 — Persisted app_errors table (v1.4)
-- Run against: Supabase Postgres
-- Rollback: DROP TABLE app_errors;
--
-- Purely additive. No existing table/column changes. Persists what the
-- central error handler (server/middleware/error-handler.js) currently
-- only sends to console.error — lost on every restart.
--
-- Same conventions as 012_app_events.sql (US-27): RLS enabled with no
-- policies, since the app enforces access control entirely at the
-- Express/service-role layer, not via RLS policies. This project has
-- shipped 3 tables without RLS before and had to patch it after the
-- fact (budgets, recurrences, tags — see artifacts/milestone-log.md);
-- this is not a 4th.
-- ============================================================

BEGIN;

CREATE TABLE app_errors (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  severity   TEXT NOT NULL,
  route      TEXT,
  message    TEXT NOT NULL,
  stack      TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_errors_severity_created_at ON app_errors(severity, created_at);

ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

COMMIT;
