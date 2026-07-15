# SAD — US-15: Transfer Between Own Accounts

**Version:** 1.0  
**Date:** 2026-07-15  
**Author:** Architect (architect-pondo)  
**Status:** Draft — awaiting G3 approval

---

## 1. Decision — Data Model Approach

### Chosen: Paired-entry model (two rows linked by `transfer_group_id`)

**Rationale:**

| Factor | Paired-entry (chosen) | Third `'transfer'` type |
|--------|----------------------|------------------------|
| Schema change | Add 1 nullable column (`transfer_group_id`) | Add 1 column + alter CHECK constraint + alter every aggregation function |
| Balance logic | Reuses existing `getAccountBalance` unchanged — an expense on source reduces it, an income on destination increases it | Must teach every function that `transfer` is neither income nor expense but still affects balance |
| Income/expense totals | Transfers naturally excluded from `total_income`/`total_expense` because the pair is one expense + one income — they cancel in net, and we explicitly filter them out of income/expense breakdowns | Must add `type != 'transfer'` to every income/expense aggregation |
| Category breakdowns | Transfer rows get `category_id = NULL` (no category) — naturally excluded from category-grouped queries | Same |
| Net worth | Zero-sum — expense on source + income on destination = net zero across accounts | Same |
| Visual distinction | Client-side: detect `transfer_group_id IS NOT NULL` to render transfer styling | Client-side: detect `type === 'transfer'` |
| Risk of pair drift | Mitigated by Postgres function atomicity (see §3) | No pair-drift risk (single row) |
| Future recurring transfers | Same mechanism — just create pairs on a schedule | Same |

**Tradeoff for Gino:** The paired-entry model means two rows per transfer instead of one. This is slightly more storage but eliminates touching every aggregation function in the codebase. The atomicity risk is fully addressed by the Postgres function in §3. If the team strongly prefers a single-row model, the `'transfer'` type approach is viable but requires ~8 function rewrites instead of ~2.

---

## 2. Schema DDL

### 2.1 Migration: `003_add_transfer_group_id.sql`

```sql
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

COMMIT;
```

**Column spec:**
- `transfer_group_id UUID DEFAULT NULL` — shared UUID for both rows of a transfer pair. `NULL` for normal income/expense entries.
- A transfer pair consists of: one `expense` row (source account) + one `income` row (destination account), both with the same `transfer_group_id`.
- `category_id` is `NULL` on both transfer rows (transfers have no category).
- `note` on both rows carries the same user-provided note.

### 2.2 No CHECK constraint change needed

The existing `CHECK (type IN ('income', 'expense'))` remains valid — transfer rows use `'expense'` and `'income'` types.

---

## 3. Atomicity Mechanism — Postgres Function

Supabase JS client has no multi-statement transaction API. The standard approach is an RPC call to a Postgres function, which runs in a single implicit transaction.

### 3.1 Function: `create_transfer`

```sql
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
```

### 3.2 Function: `update_transfer`

```sql
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
```

### 3.3 Function: `delete_transfer`

```sql
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
```

---

## 4. Exhaustive Function Impact List

### 4.1 Functions that need changes

| # | Function | Change | Reason |
|---|----------|--------|--------|
| 1 | `getEntries` | Add `transfer_group_id` to the SELECT and flatten output | Client needs it to render transfer styling |
| 2 | `getEntryById` | Add `transfer_group_id` to SELECT and flatten output | Same |
| 3 | `getRecentEntries` | Add `transfer_group_id` to SELECT and flatten output | Same |
| 4 | `getEntriesForExport` | Add `transfer_group_id` to SELECT and flatten output | Export should preserve transfer info |
| 5 | `getDashboardKPIs` | Filter out entries where `transfer_group_id IS NOT NULL` from `total_income`/`total_expense` sums | Transfers are not real income/expense — they'd inflate both totals |
| 6 | `getDashboardMoM` | Filter out entries where `transfer_group_id IS NOT NULL` from monthly sums | Same — monthly income/expense should exclude transfers |
| 7 | `getExpenseBreakdown` | Filter out entries where `transfer_group_id IS NOT NULL` | Transfer rows have `category_id = NULL` so they'd already be excluded, but explicit filter is defensive |
| 8 | `getIncomeBreakdown` | Filter out entries where `transfer_group_id IS NOT NULL` | Same |
| 9 | `getDashboardAccounts` | Filter out entries where `transfer_group_id IS NOT NULL` from per-account income/expense sums | Per-account income/expense should exclude transfers |
| 10 | `getRecycleBin` | Add `transfer_group_id` to entries SELECT in recycle bin query | So restored transfers keep their pairing |
| 11 | `restoreItem` (entries path) | When restoring a transfer entry, also restore its paired row | Prevents orphaned transfer halves |
| 12 | `bulkDeleteEntries` | If a deleted entry is part of a transfer pair, soft-delete the paired row too | Prevents orphaned transfer halves |

### 4.2 Functions that need NO changes

| Function | Why safe |
|----------|----------|
| `getAccountBalance` | Already sums income − expense per account. A transfer is an expense on source + income on destination — each account's balance updates correctly with no code change. |
| `getAccounts` | Only joins `entries(count)` — count is still correct. |
| `getAccountById` | Same. |
| `createEntry` / `updateEntry` | Individual entry CRUD still works; transfers use the dedicated RPC functions. |
| `deleteEntry` | Individual soft-delete still works; but if called on one half of a transfer pair, the other half becomes orphaned. Mitigation: the UI should not expose individual delete for transfer rows (see §7.3). |
| `getEntryCount` | Count still correct; `filters.type` still works. |
| `getCategories` / `getCategoryById` | Unaffected — transfer rows have no category. |
| `getFallbackCategory` | Unaffected. |
| `getSetting` / `setSetting` / `getAllSettings` | Unaffected. |
| `purgeExpired` | Unaffected — soft-deleted transfer rows purge like any other entry. |

### 4.3 New functions to add

| # | Function | Purpose |
|---|----------|---------|
| N1 | `createTransfer(payload)` | Calls `rpc('create_transfer', payload)` |
| N2 | `updateTransfer(payload)` | Calls `rpc('update_transfer', payload)` |
| N3 | `deleteTransfer(transferGroupId)` | Calls `rpc('delete_transfer', { p_transfer_group_id })` |
| N4 | `getTransferByGroupId(transferGroupId)` | Fetches both rows of a transfer pair for display/edit |

---

## 5. API Surface

### 5.1 New route file: `server/routes/transfers.js`

Mounted at `/api/transfers` in `server.js`.

#### `POST /api/transfers`

Create a transfer between two accounts.

**Request body:**
```json
{
  "from_account_id": 1,
  "to_account_id": 2,
  "amount": 500.00,
  "note": "Paying off credit card",
  "date": "2026-07-15"
}
```

**Validation (Zod):**
```js
const createTransferSchema = z.object({
  body: z.object({
    from_account_id: z.number().int().positive(),
    to_account_id: z.number().int().positive(),
    amount: z.number().positive(),
    note: z.string().max(500).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});
```

**Success response:** `201`
```json
{
  "transfer": {
    "transfer_group_id": "550e8400-e29b-41d4-a716-446655440000",
    "from_entry": { "id": 101, "type": "expense", "amount": 500, "account_id": 1, "account_name": "Wallet", ... },
    "to_entry":   { "id": 102, "type": "income",  "amount": 500, "account_id": 2, "account_name": "Credit Card", ... }
  }
}
```

**Error responses:**
- `400` — validation error (same account, amount ≤ 0, missing fields)
- `400` — `{ "error": "Source account not found" }` or `"Destination account not found"`
- `400` — `{ "error": "Cannot transfer to the same account" }`

#### `PUT /api/transfers/:transferGroupId`

Update an existing transfer (both rows).

**Request body:** same shape as create (all fields required for simplicity — client sends full payload).

**Success:** `200` with updated `{ transfer: { transfer_group_id, from_entry, to_entry } }`

**Errors:**
- `404` — `{ "error": "Transfer not found or incomplete" }`
- `400` — validation errors (same as create)

#### `DELETE /api/transfers/:transferGroupId`

Soft-delete both rows of a transfer.

**Success:** `200`
```json
{ "deleted": 2, "transfer_group_id": "550e8400-..." }
```

**Errors:**
- `404` — `{ "error": "Transfer not found or already deleted" }`

#### `GET /api/transfers/:transferGroupId`

Fetch both rows of a transfer (for edit form pre-population).

**Success:** `200`
```json
{
  "transfer": {
    "transfer_group_id": "...",
    "from_entry": { ... },
    "to_entry": { ... }
  }
}
```

### 5.2 Modified route: `server/routes/entries.js`

- `GET /api/entries` — the `type` query param enum stays `['income', 'expense']`. Transfer rows have those types, so filtering by type still works. The response now includes `transfer_group_id` per entry.
- `GET /api/entries/:id` — response includes `transfer_group_id`.
- No other entry route changes needed.

### 5.3 Server.js mount

Add after existing route mounts:
```js
const transfersRouter = require('./routes/transfers');
app.use('/api/transfers', transfersRouter);
```

---

## 6. Client-Side Changes

### 6.1 New page: `pages/AddTransfer.jsx`

**Route:** `/transfers/new` (or a modal — TBD by dev, but a dedicated page is simpler for v1)

**Form fields:**
- From Account (dropdown — all non-deleted accounts)
- To Account (dropdown — all non-deleted accounts, exclude the selected "from" account)
- Amount (number input, positive)
- Note (optional text)
- Date (date picker, defaults to today, no future dates)

**Validation (client-side):**
- From ≠ To
- Amount > 0
- Date ≤ today

**On submit:** calls `POST /api/transfers` → redirects to entries list or shows success.

### 6.2 New page: `pages/EditTransfer.jsx`

**Route:** `/transfers/:transferGroupId/edit`

Pre-populates form from `GET /api/transfers/:transferGroupId`. On submit calls `PUT /api/transfers/:transferGroupId`.

### 6.3 Modified: `pages/Entries.jsx` — visual distinction

Each entry row already renders `type` (income/expense). Add a transfer indicator:

**Logic:**
```jsx
const isTransfer = entry.transfer_group_id !== null;
```

**Visual treatment:**
- Transfer rows get a distinct icon/indicator (e.g., `⇄` or `🔄` prefix)
- Transfer rows show both accounts: `"Wallet → Credit Card"` instead of just one account name
- Transfer rows should NOT show a category badge (they have none)
- Transfer rows should NOT have an individual edit/delete action — instead, a single "Edit Transfer" / "Delete Transfer" action that operates on the pair
- Color treatment: a muted/neutral color distinct from income (green) and expense (red) — e.g., blue or gray

### 6.4 Modified: `pages/Dashboard.jsx` — QuickAdd

Optionally add a "Transfer" quick-action button that navigates to `/transfers/new`. Not required for v1 but nice-to-have.

### 6.5 Modified: `lib/api.js`

Add API functions:
```js
export const createTransfer = (data) => api.post('/transfers', data);
export const updateTransfer = (id, data) => api.put(`/transfers/${id}`, data);
export const deleteTransfer = (id) => api.delete(`/transfers/${id}`);
export const getTransfer = (id) => api.get(`/transfers/${id}`);
```

### 6.6 Modified: `App.jsx`

Add routes:
- `/transfers/new` → `AddTransfer`
- `/transfers/:transferGroupId/edit` → `EditTransfer`

---

## 7. Edge Cases & Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | Orphaned transfer half (one row deleted individually) | Medium | UI hides individual delete for transfer rows. `deleteEntry` still works server-side but the UI never calls it for transfer rows. `bulkDeleteEntries` is patched to handle pairs. |
| R2 | Orphaned transfer half on restore | Medium | `restoreItem` for entries checks `transfer_group_id` and restores the paired row too. |
| R3 | Transfer between accounts of different types (e.g., debit → credit) | Low | This is correct behavior — paying a credit card from a debit account is a valid use case. The balance formulas handle it correctly per account type. |
| R4 | Transfer amount exceeds source account balance | Low | Not enforced in v1. Pondo doesn't track "available balance" constraints — it's a tracking tool, not a ledger with overdraft protection. Documented as a known limitation. |
| R5 | Concurrent transfer creation with same accounts | Low | Each call to `create_transfer` generates a new UUID — no collision risk. Postgres function runs in a transaction — no partial writes. |
| R6 | `getEntries` with `type=income` filter returns the income half of transfers | Medium | This is intentional — the income half IS type=income. The client uses `transfer_group_id` to style it differently. Dashboard aggregation functions explicitly exclude transfers, so totals are correct. |
| R7 | Export includes transfer rows | Low | Export should include transfers (they're real entries). The `transfer_group_id` column in the export lets the user identify them. |

---

## 8. FR Traceability Matrix

| BRD FR | Design Element |
|--------|---------------|
| US-15: Move money between two own accounts in one action | `POST /api/transfers` → `create_transfer()` RPC |
| US-15: Updates both balances atomically | Postgres function with implicit transaction (§3) |
| US-15: Transfer entries visually distinguishable | Client-side `transfer_group_id` check → distinct icon/color (§6.3) |
| US-15: Optional note/date | `note` and `date` fields in transfer payload (§5.1) |
| US-15: Recurring transfers out of scope | Explicitly excluded — no scheduling logic in this design |

---

## 9. Build Order

| Step | File(s) | Description |
|------|---------|-------------|
| 1 | `server/db/migrations/003_add_transfer_group_id.sql` | Run migration to add column + indexes |
| 2 | Supabase SQL editor | Create `create_transfer`, `update_transfer`, `delete_transfer` Postgres functions |
| 3 | `server/db/queries.js` | Add `createTransfer`, `updateTransfer`, `deleteTransfer`, `getTransferByGroupId` query functions; patch functions #1–#12 from §4.1 |
| 4 | `server/routes/transfers.js` | New route file with POST/PUT/DELETE/GET endpoints |
| 5 | `server/server.js` | Mount transfers router |
| 6 | `server/middleware/validate.js` | Add `createTransferSchema` Zod schema |
| 7 | `client/src/lib/api.js` | Add transfer API functions |
| 8 | `client/src/pages/AddTransfer.jsx` | New transfer creation page |
| 9 | `client/src/pages/EditTransfer.jsx` | New transfer edit page |
| 10 | `client/src/pages/Entries.jsx` | Add transfer visual distinction, hide individual actions for transfer rows |
| 11 | `client/src/App.jsx` | Add transfer routes |
| 12 | `client/src/pages/Dashboard.jsx` | Optional: QuickAdd transfer button |

---

## 10. File Manifest

### New files
| File | Purpose |
|------|---------|
| `server/db/migrations/003_add_transfer_group_id.sql` | Schema migration |
| `server/routes/transfers.js` | Transfer API endpoints |
| `client/src/pages/AddTransfer.jsx` | Transfer creation form |
| `client/src/pages/EditTransfer.jsx` | Transfer edit form |

### Modified files
| File | Change summary |
|------|---------------|
| `server/db/queries.js` | Add 4 new functions; patch 12 existing functions (§4.1) |
| `server/server.js` | Mount transfers router |
| `server/middleware/validate.js` | Add transfer Zod schemas |
| `server/routes/entries.js` | Include `transfer_group_id` in response flattening |
| `client/src/lib/api.js` | Add transfer API functions |
| `client/src/pages/Entries.jsx` | Transfer visual distinction + action gating |
| `client/src/App.jsx` | Add transfer routes |
| `client/src/pages/Dashboard.jsx` | Optional QuickAdd transfer button |

---

*End of SAD for US-15. Ready for G3 review.*
