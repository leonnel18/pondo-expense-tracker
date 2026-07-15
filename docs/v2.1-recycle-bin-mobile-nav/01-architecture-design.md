# Pondo v2.1 — Recycle Bin & Mobile Bottom Nav: Architecture Design

**Document type:** Software Architecture Document (SAD) — US-05 + US-06  
**Author:** architect (via FRIDAY's OpenClaw Workshop Crew, `ollama/deepseek-v4-pro:cloud`)  
**Date:** 2026-07-15  
**Feeds from:** `docs/recon/sprint-backlog.md` §5, `docs/recon/kill-absorb-review.md` (Gino-approved AC)  
**Feeds into:** implementation pass (next)  
**Parent:** `artifacts/01-BRD.md` + `docs/recon/sprint-backlog.md` Gate v2.1

---

## Table of Contents

1. [US-05 — Recycle Bin / Soft Delete](#us-05--recycle-bin--soft-delete)
   - 1.1 [Architectural decisions](#11-architectural-decisions)
   - 1.2 [Schema changes](#12-schema-changes)
   - 1.3 [Query function audit — every function needing `deleted_at` filter](#13-query-function-audit--every-function-needing-deleted_at-filter)
   - 1.4 [API surface changes](#14-api-surface-changes)
   - 1.5 [Purge mechanism](#15-purge-mechanism)
   - 1.6 [Client-side changes](#16-client-side-changes)
2. [US-06 — Mobile Bottom Tab Nav](#us-06--mobile-bottom-tab-nav)
   - 2.1 [Architectural decisions](#21-architectural-decisions)
   - 2.2 [Component design](#22-component-design)
   - 2.3 [Layout integration](#23-layout-integration)
   - 2.4 [Safe-area & visual design](#24-safe-area--visual-design)
3. [File manifest](#3-file-manifest)
4. [Risk register](#4-risk-register)

---

## US-05 — Recycle Bin / Soft Delete

### 1.1 Architectural decisions

| Decision | Verdict | Rationale |
|----------|---------|-----------|
| Soft-delete via `deleted_at` timestamp | **Confirmed** | Standard pattern. `NULL` = active, non-NULL = soft-deleted. Allows restore by setting back to `NULL`. Enables retention-window purge via `WHERE deleted_at < now() - INTERVAL '30 days'`. |
| Retention window | **30 days** | Reasonable default for a household expense tracker. Long enough to catch a mistake, short enough that the recycle bin doesn't become a second database. Stated explicitly so dev doesn't guess. |
| Purge mechanism | **Vercel Cron Job** (primary) + **lazy on-demand check** (defense-in-depth) | See §1.5 for full justification. A `setInterval` in `server.js` will never fire on Vercel serverless — the process is frozen between requests. Vercel Cron Jobs are the platform's supported mechanism for scheduled work. The lazy check is a cheap safety net. |
| Account soft-delete cascades to entries? | **Yes — soft-deleting an account also soft-deletes all its non-deleted entries** | If an account is soft-deleted but its entries remain "active," those entries silently leak into every dashboard/balance/export query (because the entries table has no `deleted_at` filter on its own — the filter is on the joined `accounts` table, and Supabase's JS client doesn't push `is.null('deleted_at')` through joins). The alternative (entries stay active on a soft-deleted account) creates a correctness nightmare. Soft-deleting both together is the only safe path. Restoring the account restores its entries too. |
| Reassign/cascade resolution on account delete — does it survive soft-delete? | **Simplified: no reassign/cascade under soft-delete** | The old hard-delete flow asked "reassign entries or cascade-delete them?" because the entries would be orphaned. Under soft-delete, entries are soft-deleted alongside the account — they're not orphaned, they're recoverable. The user can restore the account (and its entries) from the Recycle Bin. The reassign/cascade resolution is removed from the DELETE handler entirely. If the user wants to move entries to another account, they can do that before deleting (edit each entry's account). This is a UX simplification that the soft-delete model enables. |
| `deleted_at` on `categories`? | **No** | Out of scope for this story. Categories are household-wide reference data, not user-generated content. If needed later, it's a trivial additive migration. |
| `deleted_at` on `settings`? | **No** | Settings are key-value config, not user data. No recycle-bin semantics apply. |

### 1.2 Schema changes

#### DDL — Migration 002: `add_soft_delete_columns`

```sql
-- ============================================================
-- Migration: 002_add_soft_delete_columns
-- Sprint: v2.1 (US-05 — Recycle Bin / Soft Delete)
-- Run against: Supabase Postgres
-- Rollback: DROP COLUMN deleted_at on both tables (data is additive, no loss)
-- ============================================================

BEGIN;

-- 1. Add deleted_at to accounts
ALTER TABLE public.accounts
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add deleted_at to entries
ALTER TABLE public.entries
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Index for recycle-bin queries (list soft-deleted items, purge by age)
CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at
    ON public.accounts(deleted_at)
    WHERE deleted_at IS NOT NULL;  -- partial index — only indexes soft-deleted rows

CREATE INDEX IF NOT EXISTS idx_entries_deleted_at
    ON public.entries(deleted_at)
    WHERE deleted_at IS NOT NULL;

-- 4. Index for the purge query (find rows past retention window)
--    The partial index above already serves this — no additional index needed.

COMMIT;
```

**Key design choices:**

- **`TIMESTAMPTZ`** (not `TIMESTAMP`): Stores UTC with timezone awareness. Supabase Postgres defaults to UTC. The purge query uses `now()` which returns `TIMESTAMPTZ` — consistent comparison.
- **Partial indexes** (`WHERE deleted_at IS NOT NULL`): The vast majority of rows will have `deleted_at IS NULL` (active). A partial index only indexes the small subset of soft-deleted rows, keeping the index tiny and fast.
- **No trigger needed**: The application sets `deleted_at = now()` on soft-delete and `deleted_at = NULL` on restore. No database-level automation required.

### 1.3 Query function audit — every function needing `deleted_at` filter

This is the single highest-risk part of US-05. `server/db/queries.js` has ~750 lines with zero abstraction — every aggregation function repeats its own inline Supabase query. If any function is missed, soft-deleted rows silently leak into balances, totals, or exports.

Below is the **exhaustive list** of every function in `server/db/queries.js` that reads from `accounts` or `entries`. Each one needs a `WHERE deleted_at IS NULL` filter added. Functions that read only from `categories` or `settings` are listed for completeness but need no change.

#### Functions that read `accounts` — MUST add `.is('deleted_at', null)` filter

| # | Function | Table(s) read | Filter location | Notes |
|---|----------|---------------|-----------------|-------|
| 1 | `getAccounts()` | `accounts` + `entries` (count join) | Add `.is('deleted_at', null)` on the `accounts` query | The `entries(count)` join will also need filtering — see note below |
| 2 | `getAccountById(id)` | `accounts` + `entries` (count join) | Add `.is('deleted_at', null)` on the `accounts` query | Same join concern |
| 3 | `getAccountBalance(id)` | `accounts` + `entries` (type, amount join) | Add `.is('deleted_at', null)` on the `accounts` query | The joined `entries` must also be filtered — see note below |
| 4 | `getAccountsForExport()` | `accounts` | Add `.is('deleted_at', null)` | Straightforward — no joins |
| 5 | `getDashboardKPIs(from, to)` | `entries` + `accounts` + `entries` (nested join) | Add `.is('deleted_at', null)` on both the standalone `entries` query AND the `accounts` query | Two separate queries in this function — both need the filter |
| 6 | `getDashboardAccounts(from, to)` | `entries` + `accounts` (join) | Add `.is('deleted_at', null)` on the `entries` query | The joined `accounts` data comes through the entry — filtering entries by `deleted_at IS NULL` is sufficient since a soft-deleted account's entries are also soft-deleted |

#### Functions that read `entries` — MUST add `.is('deleted_at', null)` filter

| # | Function | Table(s) read | Filter location | Notes |
|---|----------|---------------|-----------------|-------|
| 7 | `getEntries(filters)` | `entries` + `accounts` + `categories` (joins) | Add `.is('deleted_at', null)` on the `entries` query | The most heavily used query — entry list, filtered views, pagination |
| 8 | `getEntryById(id)` | `entries` + `accounts` + `categories` (joins) | Add `.is('deleted_at', null)` on the `entries` query | Used by edit-entry page and validation checks |
| 9 | `getEntriesForExport(from, to)` | `entries` + `accounts` + `categories` (joins) | Add `.is('deleted_at', null)` on the `entries` query | Export must not include soft-deleted entries |
| 10 | `getDashboardMoM(from, to)` | `entries` | Add `.is('deleted_at', null)` | Month-over-month chart data |
| 11 | `getExpenseBreakdown(from, to)` | `entries` + `categories` (join) | Add `.is('deleted_at', null)` on the `entries` query | Expense pie/bar chart |
| 12 | `getIncomeBreakdown(from, to)` | `entries` + `categories` (join) | Add `.is('deleted_at', null)` on the `entries` query | Income pie/bar chart |
| 13 | `getRecentEntries(from, to, limit)` | `entries` + `accounts` + `categories` (joins) | Add `.is('deleted_at', null)` on the `entries` query | Dashboard recent-activity widget |
| 14 | `getEntryCount(filters)` | `entries` | Add `.is('deleted_at', null)` | Used for pagination totals |
| 15 | `getAccountEntryCount(id)` | `entries` | Add `.is('deleted_at', null)` | Used by the account-delete flow to check if entries exist — **this one is subtle**: after soft-delete, this function should count only *active* (non-deleted) entries. A soft-deleted account's entries are also soft-deleted, so this will return 0 for a soft-deleted account — which is correct (no active entries to resolve). |
| 16 | `getCategoryEntryCount(id)` | `entries` | Add `.is('deleted_at', null)` | Used by category-delete flow — same logic as above |

#### Functions that write to `accounts` or `entries` — behavior change needed

| # | Function | Change |
|---|----------|--------|
| 17 | `deleteAccount(id)` | **Rewrite**: instead of `.delete()`, do `.update({ deleted_at: new Date().toISOString() })` |
| 18 | `deleteEntry(id)` | **Rewrite**: instead of `.delete()`, do `.update({ deleted_at: new Date().toISOString() })` |
| 19 | `bulkDeleteEntries(ids)` | **Rewrite**: instead of `.delete()`, do `.update({ deleted_at: new Date().toISOString() }).in('id', ids)` |
| 20 | `deleteEntriesByAccount(id)` | **Rewrite**: instead of `.delete()`, do `.update({ deleted_at: new Date().toISOString() }).eq('account_id', id)` |
| 21 | `reassignAccountEntries(fromId, toId)` | **Add filter**: only reassign *active* entries — add `.is('deleted_at', null)`. Soft-deleted entries should not be reassigned (they belong to the soft-deleted account and will be restored with it). |
| 22 | `reassignCategoryEntries(fromId, toId)` | **Add filter**: same as above — add `.is('deleted_at', null)` |

#### Functions that need NO change

| Function | Reason |
|----------|--------|
| `createAccount()` | INSERT — new rows always have `deleted_at = NULL` (column default) |
| `updateAccount()` | UPDATE — only touches active rows (routed through `getAccountById` which will filter) |
| `createEntry()` | INSERT — same as createAccount |
| `updateEntry()` | UPDATE — same logic |
| `getCategories()` | Reads `categories` only — no `deleted_at` column |
| `getCategoryById()` | Reads `categories` only |
| `createCategory()` | INSERT — categories table |
| `updateCategory()` | UPDATE — categories table |
| `deleteCategory()` | Hard delete — categories are reference data, no soft-delete |
| `getFallbackCategory()` | Reads `categories` only |
| `getSetting()` | Reads `settings` only |
| `setSetting()` | Upserts `settings` only |
| `getAllSettings()` | Reads `settings` only |

#### Critical note on Supabase JS client join filtering

Supabase's JavaScript client does **not** automatically propagate `.is('deleted_at', null)` filters through nested joins. When a query does:

```javascript
supabase.from('accounts').select(`*, entries(count)`)
```

Adding `.is('deleted_at', null)` filters the `accounts` rows but **does not** filter the `entries` rows included in the join. This means:

- `getAccounts()` and `getAccountById()`: The `entries(count)` join will count **all** entries (including soft-deleted ones) for each account. **Fix:** The `entries(count)` is used only for `entry_count` display. After soft-delete, an account's soft-deleted entries should not be counted. The simplest fix: use a **Postgres function** or a **computed column** instead of the Supabase join. Alternatively, accept that `entry_count` includes soft-deleted entries for the accounts list page (low impact — the count is informational only) and fix it properly in a future refactor. **Decision: accept the minor inaccuracy for now.** The accounts list page shows `entry_count` as a convenience number. A soft-deleted entry being counted is a cosmetic issue, not a data-corruption issue. The dashboard/balance/export functions (which do matter for correctness) use separate queries that will be properly filtered.

- `getAccountBalance()`: The `entries(type, amount)` join is used to calculate the account balance. **This is correctness-critical.** If soft-deleted entries leak into the balance calculation, the account balance is wrong. **Fix:** This function already fetches entries separately and filters them in JavaScript (`data.entries.filter(...)`) — add a `.filter(e => !e.deleted_at)` to both the income and expense filter chains. This is a one-line addition to the existing JS filter logic.

- `getDashboardKPIs()`: Fetches `accounts` with nested `entries(type, amount)`. Same issue — soft-deleted entries in the join would leak into the net-worth calculation. **Fix:** Add `.filter(e => !e.deleted_at)` in the JavaScript filter chain, same pattern as `getAccountBalance()`.

**Summary of join-filtering fixes needed beyond the `.is('deleted_at', null)` additions:**

| Function | Additional fix |
|----------|---------------|
| `getAccountBalance()` | Add `!e.deleted_at` to the JS filter for both income and expense |
| `getDashboardKPIs()` | Add `!e.deleted_at` to the JS filter in the `accountsData.forEach` loop |

### 1.4 API surface changes

#### 1.4.1 Modified endpoints

**`DELETE /api/accounts/:id`** — Soft-delete instead of hard-delete

Current behavior: Hard DELETE with reassign/cascade resolution flow.  
New behavior:

1. Look up the account (must exist and not already soft-deleted — `getAccountById` will return null for soft-deleted accounts after the query filter is added).
2. **Remove the reassign/cascade resolution flow entirely.** The old `HAS_ENTRIES` 409 response, the `resolution`/`target_account_id` body params, and the `reassignAccountEntries`/`deleteEntriesByAccount` calls are all removed.
3. Soft-delete the account: `UPDATE accounts SET deleted_at = now() WHERE id = $1`.
4. Soft-delete all active entries belonging to this account: `UPDATE entries SET deleted_at = now() WHERE account_id = $1 AND deleted_at IS NULL`.
5. Return `{ id, deleted_at }` with status 200 (not 204 — the response body confirms the soft-delete timestamp).

**Request:** `DELETE /api/accounts/:id` (no body needed)  
**Response (200):**
```json
{
    "id": 1,
    "deleted_at": "2026-07-15T00:00:00.000Z",
    "entries_soft_deleted": 5
}
```

**Response (404):**
```json
{
    "error": {
        "code": "NOT_FOUND",
        "message": "Account not found"
    }
}
```

**`DELETE /api/entries/:id`** — Soft-delete instead of hard-delete

Current behavior: Hard DELETE.  
New behavior:

1. Look up the entry (must exist and not already soft-deleted).
2. Soft-delete: `UPDATE entries SET deleted_at = now() WHERE id = $1`.
3. Return `{ id, deleted_at }` with status 200.

**Request:** `DELETE /api/entries/:id`  
**Response (200):**
```json
{
    "id": 42,
    "deleted_at": "2026-07-15T00:00:00.000Z"
}
```

**`POST /api/entries/bulk-delete`** — Soft-delete instead of hard-delete

Current behavior: Hard DELETE multiple entries.  
New behavior: `UPDATE entries SET deleted_at = now() WHERE id IN (...) AND deleted_at IS NULL`. Return count of actually soft-deleted rows (already-deleted entries are silently skipped).

**Request:** `POST /api/entries/bulk-delete` with `{ "ids": [1, 2, 3] }`  
**Response (200):**
```json
{
    "soft_deleted": 3
}
```

#### 1.4.2 New endpoints

**`GET /api/recycle-bin`** — List all soft-deleted items

Returns soft-deleted accounts and entries, ordered by `deleted_at DESC` (most recently deleted first). Includes the item type, name/label, deletion timestamp, and days remaining until permanent purge.

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `"accounts"` \| `"entries"` \| absent | both | Filter by item type |
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Items per page |

**Response (200):**
```json
{
    "items": [
        {
            "type": "entry",
            "id": 42,
            "label": "Groceries — ₱1,500",
            "account_name": "Cash",
            "date": "2026-07-10",
            "deleted_at": "2026-07-14T12:00:00.000Z",
            "days_remaining": 29
        },
        {
            "type": "account",
            "id": 5,
            "label": "Old Savings",
            "account_type": "debit",
            "deleted_at": "2026-07-13T08:00:00.000Z",
            "days_remaining": 28,
            "entry_count": 12
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total": 2
    }
}
```

**Implementation note:** This is a new query function `getRecycleBin(filters)` in `server/db/queries.js`. It runs two queries (one for accounts, one for entries) and merges/sorts the results in JavaScript. The Supabase JS client doesn't support UNION queries natively, and the two tables have different shapes — merging in application code is the pragmatic approach.

**`POST /api/recycle-bin/restore/:type/:id`** — Restore a soft-deleted item

Restores an account or entry by setting `deleted_at = NULL`. For accounts, also restores all entries that were soft-deleted alongside the account (same `deleted_at` timestamp, within a 1-second tolerance to avoid restoring entries that were independently soft-deleted earlier).

**URL params:**
- `type`: `"accounts"` or `"entries"`
- `id`: The item ID

**Response (200):**
```json
{
    "restored": true,
    "id": 42,
    "type": "entry"
}
```

**Response (404):**
```json
{
    "error": {
        "code": "NOT_FOUND",
        "message": "Item not found or already restored"
    }
}
```

**Account restore behavior:** When an account is restored, all entries that were soft-deleted at the same time as the account (within ±1 second of the account's `deleted_at`) are also restored. This handles the cascade soft-delete from account deletion. Entries that were independently soft-deleted before or after the account deletion are NOT restored — they stay in the recycle bin.

**`POST /api/recycle-bin/purge`** — Trigger permanent purge (called by Vercel Cron)

Deletes rows where `deleted_at < now() - INTERVAL '30 days'`. This is a hard DELETE — data is permanently gone.

**Auth:** This endpoint should be protected. Options:
1. Require a shared secret in a header (e.g., `X-Purge-Key` matching an env var).
2. Require a valid user JWT (any authenticated user can trigger it — the cron job will use a service account).

**Decision: Use a shared secret (`PURGE_API_KEY` env var).** The Vercel Cron Job can't easily obtain a user JWT, and we don't want to create a dummy user just for cron. A simple shared secret in an `X-API-Key` header is the standard pattern for internal cron endpoints.

**Response (200):**
```json
{
    "purged": {
        "accounts": 0,
        "entries": 3
    }
}
```

#### 1.4.3 Removed/changed validation schemas

**`server/middleware/validate.js`:**
- Remove `deleteAccountSchema` — the `resolution`/`target_account_id` fields are no longer part of the account delete flow.
- The `bulkDeleteEntriesSchema` stays (still validates `ids` array).

**`server/routes/accounts.js`:**
- Remove the `deleteAccountSchema` import and validation.
- Remove the `HAS_ENTRIES` 409 response, `reassign`/`cascade` resolution logic, `reassignAccountEntries`, and `deleteEntriesByAccount` calls.
- The DELETE handler becomes a simple: validate ID → check exists → soft-delete account + entries → return 200.

#### 1.4.4 Complete API route map (post-v2.1)

```
# Recycle Bin (new)
GET    /api/recycle-bin                  # List soft-deleted items
POST   /api/recycle-bin/restore/:type/:id # Restore item
POST   /api/recycle-bin/purge            # Permanent purge (cron)

# Accounts (modified DELETE)
DELETE /api/accounts/:id                 # Now soft-deletes (no body needed)

# Entries (modified DELETE)
DELETE /api/entries/:id                  # Now soft-deletes
POST   /api/entries/bulk-delete          # Now soft-deletes

# All other endpoints — unchanged
```

### 1.5 Purge mechanism

#### Problem

Pondo is deployed as Vercel serverless functions (`api/index.js` → `server/server.js`). Serverless functions are ephemeral — the process is frozen between requests. A `setInterval` or `setTimeout` in `server.js` will **never fire** in production because there is no long-lived process. The original sizing note's assumption of a `setInterval` tick is architecturally invalid for this deployment model.

#### Solution: Vercel Cron Job (primary) + lazy on-demand check (defense-in-depth)

**Primary: Vercel Cron Job**

Vercel natively supports scheduled functions via the `crons` field in `vercel.json`. A cron job hits a specified API endpoint on a schedule. This is the correct mechanism for periodic cleanup on Vercel.

**`vercel.json` addition:**

```json
{
    "crons": [
        {
            "path": "/api/recycle-bin/purge",
            "schedule": "0 3 * * *"
        }
    ]
}
```

This runs the purge endpoint daily at 3:00 AM UTC (a low-traffic window). The endpoint:

1. Validates the `X-API-Key` header against `PURGE_API_KEY` env var.
2. Runs `DELETE FROM accounts WHERE deleted_at < now() - INTERVAL '30 days'`.
3. Runs `DELETE FROM entries WHERE deleted_at < now() - INTERVAL '30 days'`.
4. Returns counts of purged rows.

**Why daily and not hourly?** The retention window is 30 days. A daily purge means items live 30–31 days depending on when in the day they were deleted. This is well within the spirit of "30 days" and avoids unnecessary cron invocations (Vercel's free tier has limits on cron executions).

**Defense-in-depth: Lazy on-demand check**

As a safety net (in case the cron job fails, or Vercel Cron is unavailable), the Recycle Bin page load (`GET /api/recycle-bin`) also runs a lightweight purge before returning results:

```sql
DELETE FROM public.entries WHERE deleted_at < now() - INTERVAL '30 days';
DELETE FROM public.accounts WHERE deleted_at < now() - INTERVAL '30 days';
```

This is cheap (the partial indexes make it fast, and it only deletes rows past the retention window) and ensures that even without the cron job, the recycle bin never shows items past the 30-day window. The purge runs synchronously before the list query — the user might see a slightly slower Recycle Bin page load (a few extra milliseconds for the DELETE, which is near-instant on the partial index), but they'll never see expired items.

**Why not lazy-only?** Relying solely on the lazy check means items are only purged when someone visits the Recycle Bin page. If no one visits for months, expired rows accumulate indefinitely. The cron job guarantees regular cleanup regardless of user behavior.

**Why not cron-only?** If the cron job fails silently (e.g., Vercel Cron misconfiguration, env var missing), expired items would accumulate with no backstop. The lazy check is a zero-cost safety net.

#### Retention window: 30 days

Stated explicitly. The purge query uses `INTERVAL '30 days'`. The Recycle Bin UI shows "X days remaining" calculated as `30 - days_since_deletion`.

### 1.6 Client-side changes

#### 1.6.1 New page: `client/src/pages/RecycleBin.jsx`

A new page listing soft-deleted items with restore buttons. Key design:

- **Two tabs or sections:** "Entries" and "Accounts" (or a unified list with type badges).
- **Each item shows:** icon/type badge, name/label, deletion date, days remaining until permanent purge.
- **Restore button:** Calls `POST /api/recycle-bin/restore/:type/:id`. On success, removes the item from the list and shows a brief toast/confirmation.
- **Empty state:** "Recycle Bin is empty" with an illustration or icon.
- **Pagination:** Same pattern as the Entries page (page + per_page params).

#### 1.6.2 Changes to `client/src/lib/api.js`

New exports:

```javascript
export const getRecycleBin = (params = {}) => {
    const search = new URLSearchParams();
    if (params.type) search.append('type', params.type);
    if (params.page) search.append('page', params.page);
    if (params.per_page) search.append('per_page', params.per_page);
    const qs = search.toString();
    return apiRequest(`/recycle-bin${qs ? `?${qs}` : ''}`);
};

export const restoreItem = (type, id) => {
    return apiRequest(`/recycle-bin/restore/${type}/${id}`, { method: 'POST' });
};
```

No changes needed to existing exports — `deleteAccount` and `deleteEntry` still call the same endpoints; the server-side behavior changes transparently.

#### 1.6.3 Changes to `client/src/pages/Accounts.jsx`

- **Remove the reassign/cascade resolution modal** (`resolveModal` state, `handleResolveDelete` function, the modal JSX). The DELETE endpoint no longer returns `HAS_ENTRIES` 409 — it just soft-deletes.
- **Update the confirm message:** Change from "This action cannot be undone" to "The account will be moved to the Recycle Bin and can be restored within 30 days."
- **Simplify `handleDeleteAccount`:** Remove the `catch` block that checks for `err.message.includes('entr')` — that error code no longer exists.

#### 1.6.4 Changes to `client/src/pages/Entries.jsx`

- **Update the delete confirm message:** Same change — mention the Recycle Bin and 30-day recovery window.
- **No structural changes** — the delete flow already uses a simple confirm + API call pattern.

#### 1.6.5 Navigation entry

Add a "Recycle Bin" nav item. This touches both the sidebar (US-05) and the bottom nav (US-06). See §2.2 for the shared nav items list.

---

## US-06 — Mobile Bottom Tab Nav

### 2.1 Architectural decisions

| Decision | Verdict | Rationale |
|----------|---------|-----------|
| Bottom nav is additive, not a replacement | **Confirmed** | The existing left sidebar stays at `md:` (768px) and above. The bottom nav appears at below `md:` breakpoint. Both render from the same nav items list — no duplication. |
| Nav items source of truth | **`navItems` array extracted to a shared module** | Currently defined inline in `Sidebar.jsx`. Extract to `client/src/lib/navigation.js` so both `Sidebar.jsx` and `BottomNav.jsx` import the same array. Adding "Recycle Bin" to this array automatically appears in both navs. |
| Active-state indicator | **Background color + icon color change** | Matches the sidebar's active-state pattern (`bg-brand-700 text-white` vs `text-brand-200 hover:bg-brand-700`). For the bottom nav, use a filled icon variant or a top-border indicator since the bar is already dark. |
| Safe-area padding | **`env(safe-area-inset-bottom)` via CSS `padding-bottom`** | Standard iOS safe-area handling. The bottom nav bar adds `padding-bottom: env(safe-area-inset-bottom)` so the tabs aren't obscured by the home indicator. |
| 5 items | **Dashboard, Entries, Recycle Bin, Accounts, Export** | The original 5 from the sidebar (Dashboard, Entries, Accounts, Categories, Export) plus the new Recycle Bin makes 6. **Decision: 5 items max for bottom nav** — more than 5 is crowded on mobile. Drop "Categories" from the bottom nav (it's a settings-adjacent page, not a primary action) and add "Recycle Bin" in its place. The sidebar keeps all 6. |

### 2.2 Component design

#### 2.2.1 New shared module: `client/src/lib/navigation.js`

```javascript
import { LayoutDashboard, ClipboardList, Trash2, Wallet, Tags, Download } from 'lucide-react';

export const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/entries', label: 'Entries', icon: ClipboardList },
    { path: '/recycle-bin', label: 'Recycle Bin', icon: Trash2 },
    { path: '/accounts', label: 'Accounts', icon: Wallet },
    { path: '/categories', label: 'Categories', icon: Tags },
    { path: '/export', label: 'Export', icon: Download },
];

// Bottom nav shows a subset — max 5 items for mobile thumb reach
export const bottomNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/entries', label: 'Entries', icon: ClipboardList },
    { path: '/recycle-bin', label: 'Bin', icon: Trash2 },
    { path: '/accounts', label: 'Accounts', icon: Wallet },
    { path: '/export', label: 'Export', icon: Download },
];
```

#### 2.2.2 Modified: `client/src/components/Sidebar.jsx`

Change the import from inline `navItems` to the shared module:

```javascript
import { navItems } from '../lib/navigation';
```

Remove the inline `navItems` array definition. Everything else stays the same.

#### 2.2.3 New component: `client/src/components/BottomNav.jsx`

```javascript
import { Link, useLocation } from 'react-router-dom';
import { bottomNavItems } from '../lib/navigation';

const BottomNav = () => {
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-800 text-brand-200 z-40 border-t border-brand-700"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <ul className="flex justify-around items-center h-16">
                {bottomNavItems.map((item) => {
                    const IconComponent = item.icon;
                    const active = isActive(item.path);
                    return (
                        <li key={item.path} className="flex-1">
                            <Link
                                to={item.path}
                                className={`flex flex-col items-center justify-center h-full px-1 text-xs font-medium transition-colors ${
                                    active
                                        ? 'text-white'
                                        : 'text-brand-400 hover:text-brand-200'
                                }`}
                            >
                                <IconComponent
                                    className={`w-5 h-5 mb-1 ${active ? 'text-white' : ''}`}
                                    strokeWidth={active ? 2.5 : 2}
                                />
                                <span>{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default BottomNav;
```

**Key design details:**

- **`md:hidden`**: Only visible below the `md:` breakpoint (768px). At `md:` and above, the sidebar is visible and the bottom nav disappears.
- **`fixed bottom-0`**: Sticks to the bottom of the viewport.
- **`h-16` (64px)**: Standard bottom nav height — large enough for comfortable thumb targets, small enough not to waste screen space.
- **`paddingBottom: env(safe-area-inset-bottom)`**: iOS safe-area handling. On devices with a home indicator (iPhone X+), this adds extra padding so the tabs aren't obscured.
- **Active state**: White text + bolder icon stroke for the active tab. The inactive tabs use `text-brand-400` (muted teal-gray) which is visible against the dark `bg-brand-800` background.
- **`startsWith` matching**: For nested routes like `/entries/add`, the "Entries" tab stays highlighted. The Dashboard (`/`) uses exact matching to avoid matching everything.

### 2.3 Layout integration

#### 2.3.1 Changes to `client/src/components/Layout.jsx`

The `Layout` component currently renders:

```jsx
<div className="flex min-h-screen">
    <Sidebar ... />
    <div className="flex-1 flex flex-col">
        <Header ... />
        <main className="flex-1 p-6">
            ...
            <Outlet />
        </main>
    </div>
</div>
```

Changes:

1. **Import `BottomNav`:**
   ```javascript
   import BottomNav from './BottomNav';
   ```

2. **Add `BottomNav` inside the main content area, after `<main>`:**
   ```jsx
   <div className="flex-1 flex flex-col">
       <Header ... />
       <main className="flex-1 p-6 pb-20 md:pb-6">
           ...
           <Outlet />
       </main>
       <BottomNav />
   </div>
   ```

3. **Add bottom padding to `<main>` on mobile:** `pb-20 md:pb-6` — the `pb-20` (80px) accounts for the 64px nav bar + 16px breathing room. On `md:` and above, it reverts to `pb-6` (the original padding) since the bottom nav is hidden.

**Why `BottomNav` inside the flex column and not at the root level?** The sidebar is `fixed` on mobile (overlay mode). If `BottomNav` were at the root level, it would need to coordinate z-index with the sidebar overlay. Placing it inside the main content column keeps it scoped to the content area and avoids z-index conflicts.

#### 2.3.2 Changes to `client/src/App.jsx`

Add the Recycle Bin route:

```javascript
import RecycleBin from './pages/RecycleBin';

// Inside the protected routes:
<Route path="recycle-bin" element={<RecycleBin />} />
```

#### 2.3.3 Changes to `client/src/components/Header.jsx`

Add "Recycle Bin" to the `getPageTitle()` switch:

```javascript
case '/recycle-bin': return 'Recycle Bin';
```

### 2.4 Safe-area & visual design

#### Breakpoints

| Breakpoint | Sidebar | Bottom Nav | Header hamburger |
|------------|---------|------------|------------------|
| `< 768px` (mobile) | Hidden (overlay on hamburger tap) | **Visible** (fixed bottom) | Visible |
| `≥ 768px` (desktop/tablet) | Visible (static left column) | Hidden (`md:hidden`) | Hidden |

#### Visual specs

- **Bottom nav background:** `bg-brand-800` (matches sidebar — consistent dark theme)
- **Bottom nav border-top:** `border-brand-700` (subtle separator from content)
- **Active tab:** `text-white` + `strokeWidth={2.5}` (bold icon)
- **Inactive tab:** `text-brand-400` + `strokeWidth={2}` (muted icon)
- **Tab height:** 64px (`h-16`)
- **Safe area:** `padding-bottom: env(safe-area-inset-bottom, 0px)` — the `0px` fallback handles browsers that don't support the env variable
- **Content bottom padding:** `pb-20` (80px) on mobile to prevent content from being hidden behind the nav

#### Icon selection

The `Trash2` icon from `lucide-react` is used for the Recycle Bin. It's already in the project's dependency tree (`lucide-react` is in `client/package.json`). The sidebar currently imports `LayoutDashboard, ClipboardList, Wallet, Tags, Download` — add `Trash2` to that import.

---

## 3. File manifest

### New files

| File | Purpose |
|------|---------|
| `client/src/lib/navigation.js` | Shared nav items array (source of truth for both Sidebar and BottomNav) |
| `client/src/components/BottomNav.jsx` | Mobile bottom tab navigation bar |
| `client/src/pages/RecycleBin.jsx` | Recycle Bin page (list + restore) |

### Changed files

| File | Change |
|------|--------|
| **Schema** | |
| *(Supabase migration)* | Migration 002: add `deleted_at` columns + partial indexes |
| **Server** | |
| `server/db/queries.js` | Add `.is('deleted_at', null)` to 16 read functions; rewrite 4 delete functions to soft-delete; add `getRecycleBin()`, `restoreItem()`, `purgeExpired()` functions; add JS-level `!e.deleted_at` filter in `getAccountBalance()` and `getDashboardKPIs()` |
| `server/routes/accounts.js` | Simplify DELETE handler: remove reassign/cascade logic, soft-delete account + entries |
| `server/routes/entries.js` | Change DELETE and bulk-delete handlers to soft-delete |
| `server/routes/recycle-bin.js` | **New route file** — recycle bin list, restore, purge endpoints |
| `server/server.js` | Mount `/api/recycle-bin` router |
| `server/middleware/validate.js` | Remove `deleteAccountSchema` |
| `vercel.json` | Add `crons` entry for daily purge |
| **Client** | |
| `client/src/lib/api.js` | Add `getRecycleBin()`, `restoreItem()` exports |
| `client/src/components/Sidebar.jsx` | Import `navItems` from shared module; add Recycle Bin + Trash2 icon |
| `client/src/components/Layout.jsx` | Import and render `BottomNav`; add mobile bottom padding |
| `client/src/components/Header.jsx` | Add "Recycle Bin" page title |
| `client/src/App.jsx` | Add `/recycle-bin` route; import `RecycleBin` page |
| `client/src/pages/Accounts.jsx` | Remove reassign/cascade modal; update confirm message; simplify delete handler |
| `client/src/pages/Entries.jsx` | Update delete confirm message |

### Unchanged files

| File | Note |
|------|------|
| `server/db/supabase.js` | Service-role client — unchanged |
| `server/db/client.js` | Re-exports — unchanged |
| `server/routes/categories.js` | Unchanged (categories are not soft-deleted) |
| `server/routes/dashboard.js` | Unchanged (queries are filtered at the query-function level) |
| `server/routes/export.js` | Unchanged (queries are filtered at the query-function level) |
| `server/routes/system.js` | Unchanged |
| `server/middleware/auth.js` | Unchanged |
| `server/middleware/error-handler.js` | Unchanged |
| All other client pages | Unchanged |

---

## 4. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | **Missed `deleted_at` filter in a query function** — soft-deleted rows leak into balances/totals/exports. | Medium | High | The exhaustive function audit in §1.3 lists every function by name. `dev` must check each one off. DARKLING's review should verify each function was touched. A manual smoke test: soft-delete an entry with a known amount, verify it disappears from dashboard KPIs, entry list, and export. |
| R2 | **Supabase join filtering gap** — `entries(count)` in `getAccounts()` counts soft-deleted entries. | High (certain) | Low | Accepted as a cosmetic issue (see §1.3 note). The `entry_count` on the accounts list page may include soft-deleted entries. This is informational only — no data corruption. Fix properly in a future refactor. |
| R3 | **Vercel Cron Job doesn't fire** — misconfigured `vercel.json` or missing `PURGE_API_KEY` env var. | Low | Medium | The lazy on-demand purge in `GET /api/recycle-bin` is the defense-in-depth backstop. Even without the cron job, expired items are purged whenever someone visits the Recycle Bin page. Test the cron endpoint manually after deploy: `curl -X POST https://<project>.vercel.app/api/recycle-bin/purge -H "X-API-Key: <key>"`. |
| R4 | **Account restore doesn't correctly identify cascade-deleted entries** — entries deleted independently at a similar time get incorrectly restored. | Low | Medium | The ±1 second tolerance window is narrow. In practice, two independent delete operations within 1 second of each other is extremely unlikely for a single-user household app. If it happens, the user gets an extra restored entry — they can re-delete it. |
| R5 | **Bottom nav + sidebar both visible during resize** — at exactly 768px, both could render briefly. | Low | Low | Tailwind's `md:` breakpoint is 768px. The sidebar uses `md:static md:translate-x-0` and the bottom nav uses `md:hidden`. At exactly 768px, both are hidden/shown correctly. The transition is instant (no CSS transition on `display`). |
| R6 | **Bottom nav obscures content on short screens** — on very small phones, the 64px nav + 80px padding leaves little content space. | Low | Low | The 80px padding (`pb-20`) is generous. On a 568px-height iPhone SE, the usable content area is ~488px minus header (~64px) = ~424px — sufficient for scrolling lists. The padding can be reduced to `pb-18` (72px) if needed. |
| R7 | **Recycle Bin page shows items from other users** — in a future multi-user scenario, the recycle bin would show all users' deleted items. | N/A | N/A | Out of scope. US-22 (per-user data scoping) will add `WHERE user_id = $1` to the recycle bin queries. This is documented as a known limitation for the single-user v2.1. |

---

*Produced via FRIDAY's OpenClaw Workshop Crew (`architect`, `ollama/deepseek-v4-pro:cloud`). All code samples above are design specifications — the implementer should adapt them to the actual codebase conventions. The function audit in §1.3 is the authoritative checklist for `dev` and DARKLING's review.*
