-- ============================================================
-- Migration: 005_recurring_transactions
-- Sprint: v2.3 (US-16 — Recurring bills/income)
-- Run against: Supabase Postgres
-- Rollback: DROP TABLE recurrences; ALTER TABLE entries DROP COLUMN recurrence_id;
-- ============================================================

BEGIN;

-- 1. recurrences table
CREATE TABLE recurrences (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id            BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id           BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  type                  TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount                DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  note                  TEXT,
  mode                  TEXT NOT NULL CHECK (mode IN ('repeat', 'installment', 'subscription')),
  cycle                 TEXT NOT NULL CHECK (cycle IN ('weekly', 'monthly')),
  start_date            DATE NOT NULL,
  end_date              DATE,
  occurrences_total     INTEGER CHECK (occurrences_total > 0),
  occurrences_completed INTEGER NOT NULL DEFAULT 0,
  auto_post             BOOLEAN NOT NULL DEFAULT true,
  next_due_date         DATE NOT NULL,
  pending_confirmation  BOOLEAN NOT NULL DEFAULT false,
  pending_due_date      DATE,                       -- the specific due date awaiting confirmation;
                                                      -- distinct from next_due_date, which advances to
                                                      -- the following cycle immediately on sweep (§4.2)
  archived_at           TIMESTAMP WITH TIME ZONE,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT installment_needs_occurrences CHECK (
    mode != 'installment' OR occurrences_total IS NOT NULL
  )
);

-- Cron sweep scans exactly this shape: "not archived, due today or earlier"
CREATE INDEX idx_recurrences_due ON recurrences(next_due_date) WHERE archived_at IS NULL;

-- GET /api/recurrences/due scans exactly this shape
CREATE INDEX idx_recurrences_pending ON recurrences(pending_confirmation) WHERE pending_confirmation = true;

-- Management page filters by account/category
CREATE INDEX idx_recurrences_account ON recurrences(account_id);
CREATE INDEX idx_recurrences_category ON recurrences(category_id);

-- 2. entries.recurrence_id — traces a posted entry back to the recurrence
--    that created it, same nullable-FK-plus-partial-index shape as
--    transfer_group_id (003_add_transfer_group_id.sql). ON DELETE SET NULL,
--    not CASCADE/RESTRICT: if a recurrence is later hard-deleted, entries
--    already posted are real transaction history and must survive.
ALTER TABLE entries
    ADD COLUMN IF NOT EXISTS recurrence_id BIGINT REFERENCES recurrences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entries_recurrence_id
    ON entries(recurrence_id)
    WHERE recurrence_id IS NOT NULL;

COMMIT;
