-- ============================================================
-- Migration: 010_tags
-- Sprint: v2.5 (US-14 — Freeform tags on entries)
-- Run against: Supabase Postgres
-- Rollback: DROP TABLE entry_tags; DROP TABLE tags;
-- ============================================================

BEGIN;

-- 1. tags table — freeform, user-created on the fly
CREATE TABLE tags (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  name_lower TEXT NOT NULL,   -- lowercased for case-insensitive UNIQUE constraint + autocomplete matching
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT tags_name_lower_unique UNIQUE (name_lower)
);

-- 2. entry_tags join table — many-to-many
CREATE TABLE entry_tags (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entry_id BIGINT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id   BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

  CONSTRAINT entry_tags_entry_tag_unique UNIQUE (entry_id, tag_id)
);

-- 3. Indexes
CREATE INDEX idx_entry_tags_entry_id ON entry_tags(entry_id);
CREATE INDEX idx_entry_tags_tag_id ON entry_tags(tag_id);
CREATE INDEX idx_tags_name_lower ON tags(name_lower);

COMMIT;