-- 004_budgets.sql
-- US-17: Per-Category Budgets with Progress Visualization
-- Adds the budgets table for tracking per-category spending limits.

CREATE TABLE budgets (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id   BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount        DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  cycle         TEXT NOT NULL CHECK (cycle IN ('weekly', 'monthly', 'custom')),
  cycle_start   DATE NOT NULL,
  cycle_end     DATE,                              -- NULL for weekly/monthly; required for custom
  reuse_next    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- One budget per category (a category can only have one active budget at a time)
CREATE UNIQUE INDEX idx_budgets_category ON budgets(category_id);

-- Index for dashboard queries filtering by cycle boundaries
CREATE INDEX idx_budgets_cycle ON budgets(cycle, cycle_start, cycle_end);
