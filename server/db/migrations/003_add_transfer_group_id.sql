-- ============================================================
-- Migration: 003_add_transfer_group_id
-- Sprint: v2.2 (US-15 — Transfer between own accounts)
-- Run against: Supabase Postgres
-- Rollback: ALTER TABLE entries DROP COLUMN transfer_group_id;
-- ============================================================

BEGIN;

-- 1. Add transfer_group_id to entries (nullable — only set for transfer pairs)
ALTER TABLE public.entries
    ADD COLUMN IF NOT EXISTS transfer_group_id UUID DEFAULT NULL;

-- 2. Index for looking up the paired row of a transfer
CREATE INDEX IF NOT EXISTS idx_entries_transfer_group_id
    ON public.entries(transfer_group_id)
    WHERE transfer_group_id IS NOT NULL;

-- 3. Partial index for efficient "exclude transfers from income/expense totals"
--    (used by dashboard queries that filter on type but need to skip transfers)
CREATE INDEX IF NOT EXISTS idx_entries_type_notransfer
    ON public.entries(type, date)
    WHERE transfer_group_id IS NULL AND deleted_at IS NULL;

-- 4. Postgres RPC functions for atomic transfer operations

-- Function: create_transfer
CREATE OR REPLACE FUNCTION public.create_transfer(
    p_from_account_id BIGINT,
    p_to_account_id   BIGINT,
    p_amount          DECIMAL(10,2),
    p_note            TEXT DEFAULT NULL,
    p_date            DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer_group_id UUID := gen_random_uuid();
    v_from_entry_id BIGINT;
    v_to_entry_id   BIGINT;
    v_from_row      RECORD;
    v_to_row        RECORD;
BEGIN
    -- Validate accounts exist and are not soft-deleted
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_from_account_id AND deleted_at IS NULL) THEN
        RETURN jsonb_build_object('error', 'Source account not found');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_to_account_id AND deleted_at IS NULL) THEN
        RETURN jsonb_build_object('error', 'Destination account not found');
    END IF;
    IF p_from_account_id = p_to_account_id THEN
        RETURN jsonb_build_object('error', 'Cannot transfer to the same account');
    END IF;
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('error', 'Amount must be positive');
    END IF;

    -- Insert expense row (source account)
    INSERT INTO entries (type, amount, account_id, category_id, note, date, transfer_group_id)
    VALUES ('expense', p_amount, p_from_account_id, NULL, p_note, p_date, v_transfer_group_id)
    RETURNING id INTO v_from_entry_id;

    -- Insert income row (destination account)
    INSERT INTO entries (type, amount, account_id, category_id, note, date, transfer_group_id)
    VALUES ('income', p_amount, p_to_account_id, NULL, p_note, p_date, v_transfer_group_id)
    RETURNING id INTO v_to_entry_id;

    -- Fetch the created rows with joins for the response
    SELECT e.id, e.type, e.amount, e.note, e.date, e.created_at, e.updated_at,
           e.account_id, e.category_id,
           a.name AS account_name, a.type AS account_type, a.emoji AS account_emoji
    INTO v_from_row
    FROM entries e
    JOIN accounts a ON a.id = e.account_id
    WHERE e.id = v_from_entry_id;

    SELECT e.id, e.type, e.amount, e.note, e.date, e.created_at, e.updated_at,
           e.account_id, e.category_id,
           a.name AS account_name, a.type AS account_type, a.emoji AS account_emoji
    INTO v_to_row
    FROM entries e
    JOIN accounts a ON a.id = e.account_id
    WHERE e.id = v_to_entry_id;

    RETURN jsonb_build_object(
        'transfer_group_id', v_transfer_group_id,
        'from_entry', row_to_json(v_from_row)::jsonb,
        'to_entry',   row_to_json(v_to_row)::jsonb
    );
END;
$$;

-- Function: update_transfer
CREATE OR REPLACE FUNCTION public.update_transfer(
    p_transfer_group_id UUID,
    p_from_account_id  BIGINT,
    p_to_account_id    BIGINT,
    p_amount           DECIMAL(10,2),
    p_note             TEXT DEFAULT NULL,
    p_date             DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_from_entry_id BIGINT;
    v_to_entry_id   BIGINT;
    v_from_row      RECORD;
    v_to_row        RECORD;
BEGIN
    -- Find the two rows
    SELECT id INTO v_from_entry_id FROM entries
        WHERE transfer_group_id = p_transfer_group_id AND type = 'expense'
        AND deleted_at IS NULL;
    SELECT id INTO v_to_entry_id FROM entries
        WHERE transfer_group_id = p_transfer_group_id AND type = 'income'
        AND deleted_at IS NULL;

    IF v_from_entry_id IS NULL OR v_to_entry_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Transfer not found or incomplete');
    END IF;

    -- Validate accounts
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_from_account_id AND deleted_at IS NULL) THEN
        RETURN jsonb_build_object('error', 'Source account not found');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_to_account_id AND deleted_at IS NULL) THEN
        RETURN jsonb_build_object('error', 'Destination account not found');
    END IF;
    IF p_from_account_id = p_to_account_id THEN
        RETURN jsonb_build_object('error', 'Cannot transfer to the same account');
    END IF;
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('error', 'Amount must be positive');
    END IF;

    -- Update both rows atomically
    UPDATE entries SET
        account_id = p_from_account_id,
        amount = p_amount,
        note = p_note,
        date = COALESCE(p_date, date),
        updated_at = NOW()
    WHERE id = v_from_entry_id;

    UPDATE entries SET
        account_id = p_to_account_id,
        amount = p_amount,
        note = p_note,
        date = COALESCE(p_date, date),
        updated_at = NOW()
    WHERE id = v_to_entry_id;

    -- Fetch updated rows
    SELECT e.id, e.type, e.amount, e.note, e.date, e.created_at, e.updated_at,
           e.account_id, e.category_id,
           a.name AS account_name, a.type AS account_type, a.emoji AS account_emoji
    INTO v_from_row
    FROM entries e JOIN accounts a ON a.id = e.account_id
    WHERE e.id = v_from_entry_id;

    SELECT e.id, e.type, e.amount, e.note, e.date, e.created_at, e.updated_at,
           e.account_id, e.category_id,
           a.name AS account_name, a.type AS account_type, a.emoji AS account_emoji
    INTO v_to_row
    FROM entries e JOIN accounts a ON a.id = e.account_id
    WHERE e.id = v_to_entry_id;

    RETURN jsonb_build_object(
        'transfer_group_id', p_transfer_group_id,
        'from_entry', row_to_json(v_from_row)::jsonb,
        'to_entry',   row_to_json(v_to_row)::jsonb
    );
END;
$$;

-- Function: delete_transfer
CREATE OR REPLACE FUNCTION public.delete_transfer(
    p_transfer_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Soft-delete both rows atomically
    UPDATE entries
    SET deleted_at = NOW()
    WHERE transfer_group_id = p_transfer_group_id
      AND deleted_at IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    IF v_count = 0 THEN
        RETURN jsonb_build_object('error', 'Transfer not found or already deleted');
    END IF;

    RETURN jsonb_build_object(
        'deleted', v_count,
        'transfer_group_id', p_transfer_group_id
    );
END;
$$;

COMMIT;