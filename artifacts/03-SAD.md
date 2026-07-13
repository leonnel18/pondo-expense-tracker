# Solution Architecture Document (SAD)
**Project:** Household Expense Tracker ("Pondo") · **Author:** architect · **Version:** 1.0 · **Date:** 2026-07-10 · **Gate:** G3 (HARD)

---

## 1. Stack Decision

| Layer | Choice | Version | Justification (vs NFRs) |
|-------|--------|---------|-------------------------|
| **Frontend** | React + Vite + Tailwind CSS | React 18+, Vite 5+, Tailwind 3.4+ | Vite for fast HMR/dev experience; Tailwind maps directly to the design tokens from G2.5 (brand palette, spacing, radius, shadows). No CSS-in-JS overhead. |
| **Charts** | Recharts | 2.x | Declarative React charting; donut charts for category breakdown (FR-17, FR-18) are first-class. Lighter than Chart.js for React. Composable — dev can build the exact donut + legend layout from wireframes S1. |
| **Backend** | Node.js + Express | Node 20 LTS, Express 4.x | Single-threaded is fine for single-user v1. Express is mature, minimal, and the team knows it. No ORM overhead needed for SQLite. |
| **Data** | SQLite via better-sqlite3 | better-sqlite3 11.x | **Decision rationale:** Single-user, single-household, self-hosted, local-first (NFR-1, NFR-12). SQLite is file-based — zero ops, zero daemon, zero network config. better-sqlite3 is synchronous (simpler code, no connection pool bugs) and 2–5× faster than async wrappers for this workload. NFR-4 (5,000 entries, 20 accounts) is trivial for SQLite — it handles millions of rows on consumer hardware. NFR-3 (durability) is satisfied by WAL mode + synchronous=NORMAL. NFR-13 (computed balances) is enforced by never storing a cached balance — every balance query is a live SUM. |
| **Auth** | Simple PIN / passphrase (see §5.1) | — | Single-user MVP. No OAuth, no JWT, no session management. A local passphrase stored as a bcrypt hash in the SQLite settings table. The server checks it on every request via a lightweight middleware. |
| **AI** | None in v1 | — | No in-app AI features are in the v1 MVP scope. Deferred to v2. See §5.6. |

### 1.1 Key Tradeoffs for Gino

> **Tradeoff 1 — SQLite vs Postgres:** SQLite is the right call for v1 (single-user, single-household, self-hosted, file-based). If NFR-1 ever expands to multi-household with concurrent writers, SQLite's single-writer lock becomes a bottleneck. **Migration path:** The schema is designed with standard SQL (no SQLite-specific features beyond `INTEGER PRIMARY KEY` autoincrement). A migration to Postgres would require: (a) swap `better-sqlite3` for `pg` + `knex`, (b) change `INTEGER PRIMARY KEY` to `SERIAL PRIMARY KEY`, (c) add connection pooling. The API layer is abstracted — Express route handlers call a data-access module, so the surface area of change is contained. **Gino's call:** Accept SQLite for v1 with this migration path documented, or pre-emptively use Postgres now (adds setup complexity for self-hosted users).

> **Tradeoff 2 — Auth: PIN vs. no auth:** A single-user, self-hosted, local app could ship with zero auth (the server runs on localhost, only the machine owner can access it). However, NFR-2 requires "accessible only to the authenticated user." A simple PIN/passphrase (set on first launch, stored as bcrypt hash, checked per-request) satisfies NFR-2 with minimal friction — no email, no password reset, no session tokens. The PIN is sent as a header (`X-App-Passphrase`) on every request. **Gino's call:** Accept PIN-based auth, or drop auth entirely for v1 (trust localhost boundary) and add it in v2.

---

## 2. Data Model

### 2.1 Entity-Relationship Summary

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│  account  │──1:N──│  entry   │──N:1──│ category  │
└──────────┘       └──────────┘       └──────────┘
     │                                      │
     │  account.type ∈ {debit, credit,      │  category.type ∈ {expense, income}
     │   lent, borrowed, invest}            │
     │                                      │
└──────────┘                          └──────────┘
│ settings  │ (key-value, single row per key)
└──────────┘
```

### 2.2 Table Definitions

#### 2.2.1 `accounts`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `name` | TEXT | NOT NULL, CHECK(length(name) >= 1) | User-facing name. Duplicates allowed (e.g., two "Savings" at different banks). |
| `type` | TEXT | NOT NULL, CHECK(type IN ('debit','credit','lent','borrowed','invest')) | Enum enforced at app layer + CHECK constraint. |
| `description` | TEXT | DEFAULT '' | Optional free-text note. |
| `created_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | ISO 8601 UTC. |
| `updated_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | ISO 8601 UTC. Updated on any change. |

**Indexes:**
- `idx_accounts_type` on `(type)` — for filtering accounts by type on the dashboard account summary.

**Relationships:**
- One account has many entries (`entry.account_id → accounts.id`).

#### 2.2.2 `entries`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `type` | TEXT | NOT NULL, CHECK(type IN ('income','expense')) | |
| `amount` | REAL | NOT NULL, CHECK(amount > 0) | Stored as positive. Interpretation depends on `type` and `account.type`. |
| `date` | TEXT | NOT NULL, CHECK(date IS date(date)) | ISO 8601 date (YYYY-MM-DD). No time component — entries are daily. |
| `category_id` | INTEGER | NOT NULL, FOREIGN KEY → categories(id) | |
| `account_id` | INTEGER | NOT NULL, FOREIGN KEY → accounts(id) ON DELETE RESTRICT | RESTRICT prevents orphaned entries. Deletion must go through the resolution flow (FR-3, FR-26). |
| `note` | TEXT | DEFAULT '' | Optional free-text. |
| `created_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | ISO 8601 UTC. Audit trail (FR-25). |
| `updated_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | ISO 8601 UTC. Updated on edit (FR-25). |

**Indexes:**
- `idx_entries_date` on `(date)` — time-filtered queries (FR-22, FR-23).
- `idx_entries_account_id` on `(account_id)` — per-account balance computation (FR-5, FR-27).
- `idx_entries_category_id` on `(category_id)` — category breakdown queries (FR-17, FR-18).
- `idx_entries_type_date` on `(type, date)` — dashboard KPI queries filter by type + date range.
- `idx_entries_account_date` on `(account_id, date)` — per-account time-filtered queries.

**Relationships:**
- `category_id` → `categories.id` (required, every entry has a category).
- `account_id` → `accounts.id` (required, every entry belongs to an account — FR-26).

**Design note — amount sign convention:** All amounts are stored as positive REAL values. The `type` column ('income' | 'expense') determines whether the amount is added or subtracted in balance calculations. This avoids negative numbers in the database and simplifies validation (CHECK(amount > 0) covers both types).

#### 2.2.3 `categories`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `name` | TEXT | NOT NULL, CHECK(length(name) >= 1) | |
| `type` | TEXT | NOT NULL, CHECK(type IN ('expense','income')) | Determines which entry form shows this category. |
| `color` | TEXT | DEFAULT NULL | Hex color (e.g., '#1F7A64'). NULL = use default from chart palette. FR-15 (P2) — field exists, UI picker deferred. |
| `icon` | TEXT | DEFAULT NULL | Icon identifier string. NULL = no icon. FR-15 (P2) — field exists, UI picker deferred. |
| `is_default` | INTEGER | NOT NULL DEFAULT 0 | 1 = system default (cannot be deleted). 0 = user-created. |
| `sort_order` | INTEGER | NOT NULL DEFAULT 0 | For deterministic ordering: defaults first (0), then custom alphabetically. |
| `created_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | |
| `updated_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | |

**Indexes:**
- `idx_categories_type` on `(type)` — filter categories by expense/income.

**Default data (seeded on first launch):**

*Expense categories (type='expense', is_default=1):*
| name | color | sort_order |
|------|-------|------------|
| Food & Dining | #1F7A64 | 1 |
| Transportation | #2A9A7D | 2 |
| Housing & Utilities | #45B095 | 3 |
| Shopping | #6FC9B0 | 4 |
| Entertainment | #E89C2A | 5 |
| Subscriptions | #F5B042 | 6 |
| Health | #F9C55A | 7 |
| Education | #5B6FBF | 8 |
| Insurance | #8B5CF6 | 9 |
| Other | #D14343 | 10 |

*Income categories (type='income', is_default=1):*
| name | color | sort_order |
|------|-------|------------|
| Salary | #1B8E4E | 1 |
| Freelance | #2A9A7D | 2 |
| Gift | #45B095 | 3 |
| Investment | #F5B042 | 4 |
| Refund | #5B6FBF | 5 |
| Other Income | #8B5CF6 | 6 |

**Deletion rule:** `is_default=1` categories cannot be deleted. "Other" and "Other Income" are default and always available as reassignment targets (FR-14).

#### 2.2.4 `settings`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `key` | TEXT | PRIMARY KEY | Setting identifier. |
| `value` | TEXT | NOT NULL | String value. Cast as needed at app layer. |

**Predefined keys:**
| key | value (default) | Purpose |
|-----|-----------------|---------|
| `passphrase_hash` | NULL | bcrypt hash of the user's PIN/passphrase. NULL = not set (first launch). |
| `first_launch_completed` | '0' | '0' = first launch pending, '1' = completed. Drives auto-creation of Cash account + default categories. |
| `last_used_account_id` | NULL | ID of the most recently used account for entry form default (UX Q2 resolution). |
| `db_version` | '1' | Schema version for future migrations. |

### 2.3 Balance Computation Formulas (per Account Type)

These are **always computed, never stored** (NFR-13). The formulas are implemented as SQL queries in the data-access layer.

| Account Type | Balance Formula | SQL (pseudo) |
|-------------|----------------|--------------|
| **Debit** | Σ income − Σ expense | `SELECT COALESCE(SUM(CASE WHEN e.type='income' THEN e.amount ELSE -e.amount END), 0) FROM entries e WHERE e.account_id = ?` |
| **Credit** | Σ expense (liability) | `SELECT COALESCE(SUM(e.amount), 0) FROM entries e WHERE e.account_id = ? AND e.type = 'expense'` |
| **Lent** | Σ expense(lent) − Σ income(repaid) | `SELECT COALESCE(SUM(CASE WHEN e.type='expense' THEN e.amount ELSE -e.amount END), 0) FROM entries e WHERE e.account_id = ?` |
| **Borrowed** | Σ income(borrowed) − Σ expense(repaid) | `SELECT COALESCE(SUM(CASE WHEN e.type='income' THEN e.amount ELSE -e.amount END), 0) FROM entries e WHERE e.account_id = ?` |
| **Invest** | Σ income (cost basis) | `SELECT COALESCE(SUM(e.amount), 0) FROM entries e WHERE e.account_id = ? AND e.type = 'income'` |

**Semantics:**
- **Debit:** Income entries add money to the account; expense entries subtract. Net = available cash.
- **Credit:** Only expense entries matter (charges to the card). Income entries to a Credit account represent payments/credits that reduce the balance. Displayed as positive with "(owed)" label (Q5 resolution).
- **Lent:** Expense entries = money lent out. Income entries = repayments received. Positive balance = still owed to user.
- **Borrowed:** Income entries = money borrowed. Expense entries = repayments made. Positive balance = still owed by user. Displayed as positive with "(owed)" label.
- **Invest:** Only income entries matter (money invested). Expense entries to an Invest account represent withdrawals. Cost-basis only (Q6 resolution).

**Display rules:**
- Debit, Lent, Invest: balance shown as `₱{amount}` in text-primary.
- Credit, Borrowed: balance shown as `₱{amount} (owed)` in text-negative (#D14343).

---

## 3. API Contract

### 3.1 Conventions

- **Base path:** `/api`
- **Content-Type:** `application/json` (request and response)
- **Auth header:** `X-App-Passphrase: <passphrase>` on every request (see §5.1)
- **Error shape (consistent):**
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Human-readable description",
      "fields": { "amount": "Amount must be greater than ₱0." }
    }
  }
  ```
  Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `UNAUTHORIZED`, `INTERNAL_ERROR`.
  `fields` is present only for validation errors; it maps field names to error messages.
  `message` never exposes stack traces, SQL, or internal paths (NFR-10).

- **Success responses:** Always return the resource(s). Create = 201, Update = 200, Delete = 204 (no body), List/Get = 200.
- **Date format:** All dates are ISO 8601 strings (`YYYY-MM-DD` for date-only, `YYYY-MM-DDTHH:mm:ss.sssZ` for timestamps).
- **Amount format:** All amounts are numbers (not strings). The `₱` prefix and formatting are frontend concerns.

### 3.2 Endpoints

---

#### 3.2.1 Accounts

##### `GET /api/accounts`
List all accounts with computed balances.

**Request:** — (no body)

**Response:** `200 OK`
```json
{
  "accounts": [
    {
      "id": 1,
      "name": "BPI Savings",
      "type": "debit",
      "description": "Joint savings account",
      "balance": 42500.00,
      "entry_count": 15,
      "created_at": "2026-07-10T00:00:00.000Z",
      "updated_at": "2026-07-10T12:00:00.000Z"
    }
  ]
}
```

**Query params:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `sort` | string | `"name"` | `"name"` or `"balance"` (FR-4) |
| `order` | string | `"asc"` | `"asc"` or `"desc"` |

**Notes:** `balance` is computed live (SUM of entries per account type formula). `entry_count` is `COUNT(*)` of entries for that account. Both are never stored.

---

##### `GET /api/accounts/:id`
Get a single account with computed balance.

**Request:** — (no body)

**Response:** `200 OK`
```json
{
  "account": {
    "id": 1,
    "name": "BPI Savings",
    "type": "debit",
    "description": "Joint savings account",
    "balance": 42500.00,
    "entry_count": 15,
    "created_at": "2026-07-10T00:00:00.000Z",
    "updated_at": "2026-07-10T12:00:00.000Z"
  }
}
```

**Errors:** `404` if account not found.

---

##### `POST /api/accounts`
Create a new account (FR-1).

**Request:**
```json
{
  "name": "GCash",
  "type": "debit",
  "description": "E-wallet"
}
```

**Validation:**
| Field | Rule |
|-------|------|
| `name` | Required, non-empty string, max 100 chars |
| `type` | Required, one of: `"debit"`, `"credit"`, `"lent"`, `"borrowed"`, `"invest"` |
| `description` | Optional string, max 500 chars |

**Response:** `201 Created`
```json
{
  "account": {
    "id": 2,
    "name": "GCash",
    "type": "debit",
    "description": "E-wallet",
    "balance": 0.00,
    "entry_count": 0,
    "created_at": "2026-07-10T12:00:00.000Z",
    "updated_at": "2026-07-10T12:00:00.000Z"
  },
  "warning": null
}
```

**Duplicate warning:** If an account with the same `name` + `type` already exists, the response includes `"warning": "An account with this name and type already exists."` (FR-1). The account is still created.

**Errors:** `400` if validation fails (field-specific errors in `fields`).

---

##### `PUT /api/accounts/:id`
Edit an existing account (FR-2).

**Request:**
```json
{
  "name": "Maya",
  "type": "debit",
  "description": "Updated e-wallet"
}
```

**Validation:** Same as POST. All fields optional — only provided fields are updated (partial update).

**Response:** `200 OK` — full account object (same shape as GET /:id).

**Notes:** Changing `type` does not retroactively recategorize entries (FR-2). It only affects future balance interpretation.

**Errors:** `400` validation, `404` not found.

---

##### `DELETE /api/accounts/:id`
Delete an account (FR-3).

**Request:**
```json
{
  "resolution": "reassign",
  "target_account_id": 2
}
```
OR
```json
{
  "resolution": "cascade"
}
```

**Validation:**
| Field | Rule |
|-------|------|
| `resolution` | Required, one of: `"reassign"`, `"cascade"` |
| `target_account_id` | Required if `resolution = "reassign"`. Must be a valid, existing account ID ≠ `:id`. |

**Behavior:**
- `"reassign"`: All entries with `account_id = :id` are updated to `account_id = target_account_id`. Then the account is deleted.
- `"cascade"`: All entries with `account_id = :id` are deleted, then the account is deleted.
- If the account has zero entries, either resolution works (no-op for entries). The frontend shows a simplified confirmation (S7 wireframe).

**Response:** `204 No Content`

**Errors:** `400` if resolution invalid or target_account_id missing/invalid for reassign. `404` if account not found. `409` if `resolution = "reassign"` and no other accounts exist (cannot orphan entries — FR-26).

---

#### 3.2.2 Entries

##### `GET /api/entries`
List entries with pagination, filtering, and sorting.

**Query params:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | integer | `1` | 1-indexed |
| `per_page` | integer | `20` | Max 100 |
| `type` | string | — | `"income"` or `"expense"` (filter) |
| `category_id` | integer | — | Filter by category |
| `account_id` | integer | — | Filter by account |
| `from` | string | — | ISO date, inclusive (FR-22, FR-23) |
| `to` | string | — | ISO date, inclusive |
| `search` | string | — | Case-insensitive search in `note` field |
| `sort` | string | `"date"` | `"date"`, `"amount"`, `"category"`, `"account"` |
| `order` | string | `"desc"` | `"asc"` or `"desc"` |

**Response:** `200 OK`
```json
{
  "entries": [
    {
      "id": 1,
      "type": "expense",
      "amount": 500.00,
      "date": "2026-07-10",
      "category_id": 1,
      "category_name": "Food & Dining",
      "category_color": "#1F7A64",
      "account_id": 1,
      "account_name": "BPI Savings",
      "account_type": "debit",
      "note": "Grocery run",
      "created_at": "2026-07-10T08:00:00.000Z",
      "updated_at": "2026-07-10T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

**Notes:** `category_name`, `category_color`, `account_name`, `account_type` are JOINed for display convenience. The frontend does not need separate lookups.

---

##### `GET /api/entries/:id`
Get a single entry.

**Response:** `200 OK` — single entry object (same shape as list item).

**Errors:** `404` if not found.

---

##### `POST /api/entries`
Create a new entry (FR-7, FR-8).

**Request:**
```json
{
  "type": "expense",
  "amount": 500.00,
  "date": "2026-07-10",
  "category_id": 1,
  "account_id": 1,
  "note": "Grocery run"
}
```

**Validation:**
| Field | Rule |
|-------|------|
| `type` | Required, `"income"` or `"expense"` |
| `amount` | Required, number > 0, max 999999999.99 |
| `date` | Required, valid ISO date (YYYY-MM-DD), not in the future (allow today) |
| `category_id` | Required, must reference an existing category. Category type must match entry type (expense entry → expense category; income entry → income category). |
| `account_id` | Required, must reference an existing account (FR-26) |
| `note` | Optional string, max 500 chars |

**Response:** `201 Created`
```json
{
  "entry": { /* full entry object with JOINed names */ }
}
```

**Notes:** No duplicate detection (FR-24). Two identical entries are both persisted. `updated_at` is set to `created_at` on creation.

**Errors:** `400` with field-specific messages.

---

##### `PUT /api/entries/:id`
Edit an existing entry (FR-9).

**Request:** Same shape as POST. All fields optional — only provided fields are updated (partial update).

**Validation:** Same rules as POST, applied only to provided fields. If `category_id` is changed, the new category's type must match the entry's type (or the entry's type must also be changed to match).

**Response:** `200 OK` — full entry object with updated `updated_at`.

**Notes:** Changing `account_id` moves the entry to a different account. Both old and new account balances recalculate (FR-9). `updated_at` is set to current timestamp.

**Errors:** `400` validation, `404` not found.

---

##### `DELETE /api/entries/:id`
Delete a single entry (FR-10).

**Request:** — (no body)

**Response:** `204 No Content`

**Errors:** `404` if not found.

---

##### `POST /api/entries/bulk-delete`
Bulk-delete entries (FR-11, P2).

**Request:**
```json
{
  "ids": [1, 2, 3]
}
```

**Validation:**
| Field | Rule |
|-------|------|
| `ids` | Required, non-empty array of integers. Each ID must exist. Max 100 per request. |

**Response:** `200 OK`
```json
{
  "deleted_count": 3
}
```

**Notes:** All deletions happen in a single transaction. If any ID is invalid, the entire batch is rejected (atomic). KPIs and account balances recalculate once after the batch completes.

**Errors:** `400` if ids empty or contains invalid IDs. `400` if > 100 ids.

---

#### 3.2.3 Categories

##### `GET /api/categories`
List all categories, grouped by type.

**Query params:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `type` | string | — | `"expense"` or `"income"`. Omit for both. |

**Response:** `200 OK`
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Food & Dining",
      "type": "expense",
      "color": "#1F7A64",
      "icon": null,
      "is_default": true,
      "entry_count": 23,
      "sort_order": 1,
      "created_at": "2026-07-10T00:00:00.000Z"
    }
  ]
}
```

**Notes:** `entry_count` is the count of entries referencing this category (live COUNT). Sorted by `sort_order` ASC, then `name` ASC.

---

##### `POST /api/categories`
Create a custom category (FR-14).

**Request:**
```json
{
  "name": "Pets",
  "type": "expense",
  "color": "#FF6B6B",
  "icon": null
}
```

**Validation:**
| Field | Rule |
|-------|------|
| `name` | Required, non-empty string, max 50 chars. Must be unique within its type (case-insensitive). |
| `type` | Required, `"expense"` or `"income"` |
| `color` | Optional, valid hex color (#RRGGBB). Defaults to next available chart palette color if omitted. |
| `icon` | Optional string, max 50 chars. P2 — field accepted, UI picker deferred. |

**Response:** `201 Created` — full category object.

**Errors:** `400` validation. `409` if name+type combination already exists.

---

##### `PUT /api/categories/:id`
Rename or update a category (FR-14).

**Request:**
```json
{
  "name": "Online Shopping",
  "color": "#FF6B6B"
}
```

**Validation:** Same as POST, partial update. Cannot change `type` of an existing category. `is_default` categories cannot be renamed (the "Other" / "Other Income" names are fixed).

**Response:** `200 OK` — full category object.

**Notes:** Renaming a category updates the name for all existing entries under it (they reference by `category_id`, so the name change is reflected via JOIN).

**Errors:** `400` validation, `404` not found, `409` if name conflict, `403` if attempting to rename a default category.

---

##### `DELETE /api/categories/:id`
Delete a category (FR-14).

**Request:**
```json
{
  "reassign_to_category_id": 5
}
```

**Validation:**
| Field | Rule |
|-------|------|
| `reassign_to_category_id` | Required if category has entries. Must be a valid, existing category ID ≠ `:id`, with the same `type`. |

**Behavior:**
- If category has entries: all entries with `category_id = :id` are updated to `category_id = reassign_to_category_id`. Then the category is deleted.
- If category has zero entries: `reassign_to_category_id` is optional (ignored if provided). Category is deleted directly.
- `is_default = 1` categories cannot be deleted (FR-12, FR-13 — "Other" and "Other Income" are permanent fallbacks).

**Response:** `204 No Content`

**Errors:** `400` if reassign_to_category_id missing when needed or invalid. `403` if attempting to delete a default category. `404` if category not found. `409` if no other category of the same type exists to reassign to.

---

#### 3.2.4 Dashboard & Aggregation

##### `GET /api/dashboard`
Get all dashboard data in a single request (FR-16 through FR-21).

**Query params:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `from` | string | first day of current month | ISO date, inclusive |
| `to` | string | today | ISO date, inclusive |

**Response:** `200 OK`
```json
{
  "period": {
    "from": "2026-07-01",
    "to": "2026-07-10"
  },
  "kpi": {
    "total_income": 45000.00,
    "total_expenses": 28300.00,
    "net_balance": 16700.00
  },
  "mom": {
    "income": {
      "current": 45000.00,
      "previous": 42000.00,
      "change_pct": 7.14,
      "direction": "up"
    },
    "expenses": {
      "current": 28300.00,
      "previous": 29800.00,
      "change_pct": -5.03,
      "direction": "down"
    },
    "has_prior_data": true
  },
  "expense_breakdown": [
    {
      "category_id": 1,
      "category_name": "Food & Dining",
      "category_color": "#1F7A64",
      "total": 8500.00,
      "percentage": 30.04
    }
  ],
  "income_breakdown": [
    {
      "category_id": 11,
      "category_name": "Salary",
      "category_color": "#1B8E4E",
      "total": 40000.00,
      "percentage": 88.89
    }
  ],
  "accounts": [
    {
      "id": 1,
      "name": "BPI Savings",
      "type": "debit",
      "balance": 42500.00,
      "entry_count": 15
    }
  ],
  "recent_entries": [
    {
      "id": 1,
      "type": "expense",
      "amount": 500.00,
      "date": "2026-07-10",
      "category_name": "Food & Dining",
      "category_color": "#1F7A64",
      "account_name": "BPI Savings",
      "account_type": "debit",
      "note": "Grocery run"
    }
  ]
}
```

**Notes:**
- `kpi` values are period-filtered (sum of entries within `[from, to]`).
- `accounts[].balance` is **all-time** (not period-filtered) per Q2 resolution.
- `mom` compares the current period to the equivalent-length prior period. E.g., if `from=2026-07-01, to=2026-07-10`, the prior period is `2026-06-01` to `2026-06-10`. If `from=2026-01-01, to=2026-03-31` (Last 3 Months), prior is `2025-10-01` to `2025-12-31`.
- `mom.has_prior_data` is `false` if the prior period has zero entries. In that case, `previous` is 0 and `change_pct` is null. The frontend shows "No prior data" (FR-19).
- `expense_breakdown` and `income_breakdown` are sorted by `total` DESC. Categories with 0 total in the period are excluded (FR-17, FR-18).
- `recent_entries` returns the 10 most recent entries (by date DESC, then created_at DESC) within the period (FR-20).

---

##### `GET /api/dashboard/mom`
Month-over-month comparison only (lighter endpoint for polling/refresh).

**Query params:** Same as `/api/dashboard` (`from`, `to`).

**Response:** `200 OK` — just the `mom` object from the dashboard response.

---

#### 3.2.5 Export

##### `GET /api/export/entries`
Export all entries as CSV (NFR-9).

**Query params:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `from` | string | — | Optional date filter |
| `to` | string | — | Optional date filter |

**Response:** `200 OK`
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="entries_export_2026-07-10.csv"`
- Body: CSV with header row + data rows.

**CSV columns:** `ID, Type, Amount, Date, Category, Account, Note, Created At, Updated At`

**Notes:** Amounts are raw numbers (no ₱ prefix). Dates are YYYY-MM-DD. Timestamps are ISO 8601.

---

##### `GET /api/export/accounts`
Export all accounts as CSV (NFR-9).

**Response:** `200 OK`
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="accounts_export_2026-07-10.csv"`

**CSV columns:** `ID, Name, Type, Description`

---

#### 3.2.6 System / First Launch

##### `GET /api/system/status`
Check if the app is in first-launch state.

**Response:** `200 OK`
```json
{
  "first_launch": true,
  "has_accounts": false,
  "has_entries": false
}
```

**Notes:** `first_launch` is true if `settings.first_launch_completed = '0'`. The frontend uses this to decide whether to show the welcome banner (S10) or the normal dashboard.

---

##### `POST /api/system/setup`
Complete first-launch setup (auto-creates Cash account + default categories).

**Request:** — (no body, or optionally `{ "passphrase": "my-secret" }` to set auth on first launch)

**Response:** `200 OK`
```json
{
  "first_launch_completed": true,
  "cash_account": { /* full account object */ },
  "categories_created": 16
}
```

**Behavior (idempotent):**
1. Creates default expense categories (10) if they don't exist.
2. Creates default income categories (6) if they don't exist.
3. Creates "Cash" (Debit) account if it doesn't exist (Q7 resolution).
4. Sets `first_launch_completed = '1'`.
5. If `passphrase` is provided, hashes it with bcrypt and stores in `passphrase_hash`.

**Notes:** Called automatically by the frontend on first load if `GET /api/system/status` returns `first_launch: true`. The frontend can call this without a passphrase (auth deferred) or with one (auth set immediately).

---

##### `POST /api/system/set-passphrase`
Set or change the app passphrase (auth).

**Request:**
```json
{
  "current_passphrase": "old-secret",
  "new_passphrase": "new-secret"
}
```

**Validation:**
| Field | Rule |
|-------|------|
| `current_passphrase` | Required if a passphrase is already set. Omit on first-set. |
| `new_passphrase` | Required, min 4 chars, max 128 chars. |

**Response:** `200 OK` — `{ "updated": true }`

**Errors:** `401` if current_passphrase doesn't match. `400` if new_passphrase too short.

---

#### 3.2.7 Settings

##### `GET /api/settings`
Get all non-sensitive settings.

**Response:** `200 OK`
```json
{
  "last_used_account_id": 1,
  "first_launch_completed": true
}
```

**Notes:** `passphrase_hash` is never returned. `db_version` is internal.

---

##### `PUT /api/settings`
Update settings.

**Request:**
```json
{
  "last_used_account_id": 2
}
```

**Response:** `200 OK` — updated settings object (non-sensitive keys only).

---

### 3.3 Endpoint Summary

| # | Method | Path | FRs Covered |
|---|--------|------|-------------|
| 1 | GET | `/api/accounts` | FR-4, FR-5, FR-6 |
| 2 | GET | `/api/accounts/:id` | FR-4, FR-5 |
| 3 | POST | `/api/accounts` | FR-1, FR-6 |
| 4 | PUT | `/api/accounts/:id` | FR-2 |
| 5 | DELETE | `/api/accounts/:id` | FR-3, FR-26 |
| 6 | GET | `/api/entries` | FR-20, FR-22, FR-23, FR-24, FR-25 |
| 7 | GET | `/api/entries/:id` | FR-9, FR-25 |
| 8 | POST | `/api/entries` | FR-7, FR-8, FR-12, FR-13, FR-24, FR-26 |
| 9 | PUT | `/api/entries/:id` | FR-9, FR-25 |
| 10 | DELETE | `/api/entries/:id` | FR-10 |
| 11 | POST | `/api/entries/bulk-delete` | FR-11 |
| 12 | GET | `/api/categories` | FR-12, FR-13, FR-14, FR-15 |
| 13 | POST | `/api/categories` | FR-14, FR-15 |
| 14 | PUT | `/api/categories/:id` | FR-14, FR-15 |
| 15 | DELETE | `/api/categories/:id` | FR-14 |
| 16 | GET | `/api/dashboard` | FR-16, FR-17, FR-18, FR-19, FR-20, FR-21, FR-22, FR-23 |
| 17 | GET | `/api/dashboard/mom` | FR-19 |
| 18 | GET | `/api/export/entries` | NFR-9 |
| 19 | GET | `/api/export/accounts` | NFR-9 |
| 20 | GET | `/api/system/status` | FR-1 (auto-create), S10 |
| 21 | POST | `/api/system/setup` | FR-1 (auto-create), FR-12, FR-13 |
| 22 | POST | `/api/system/set-passphrase` | NFR-2 |
| 23 | GET | `/api/settings` | UX (last-used account) |
| 24 | PUT | `/api/settings` | UX (last-used account) |

**Total: 24 endpoints.**

---

## 4. Aggregation & Business Logic

### 4.1 Balance Computation (per Account Type)

Implemented as a single parameterized query in the data-access layer. The account type determines the CASE logic.

```sql
-- Debit: income adds, expense subtracts
SELECT COALESCE(SUM(
  CASE
    WHEN e.type = 'income' THEN e.amount
    WHEN e.type = 'expense' THEN -e.amount
    ELSE 0
  END
), 0) AS balance
FROM entries e
WHERE e.account_id = ?;

-- Credit: expense adds (charges), income subtracts (payments)
SELECT COALESCE(SUM(
  CASE
    WHEN e.type = 'expense' THEN e.amount
    WHEN e.type = 'income' THEN -e.amount
    ELSE 0
  END
), 0) AS balance
FROM entries e
WHERE e.account_id = ?;

-- Lent: expense adds (money lent), income subtracts (repaid)
-- Same formula as Credit
SELECT COALESCE(SUM(
  CASE
    WHEN e.type = 'expense' THEN e.amount
    WHEN e.type = 'income' THEN -e.amount
    ELSE 0
  END
), 0) AS balance
FROM entries e
WHERE e.account_id = ?;

-- Borrowed: income adds (money borrowed), expense subtracts (repaid)
-- Same formula as Debit
SELECT COALESCE(SUM(
  CASE
    WHEN e.type = 'income' THEN e.amount
    WHEN e.type = 'expense' THEN -e.amount
    ELSE 0
  END
), 0) AS balance
FROM entries e
WHERE e.account_id = ?;

-- Invest: income only (cost basis)
SELECT COALESCE(SUM(e.amount), 0) AS balance
FROM entries e
WHERE e.account_id = ? AND e.type = 'income';
```

**Optimization:** The five formulas collapse into two patterns:
- **Pattern A (Debit, Borrowed):** income +, expense −
- **Pattern B (Credit, Lent):** expense +, income −
- **Pattern C (Invest):** income only

The data-access layer selects the pattern based on `account.type` and executes the corresponding query.

### 4.2 Dashboard KPI Computation

```sql
-- Total Income for period [from, to]
SELECT COALESCE(SUM(e.amount), 0) AS total_income
FROM entries e
WHERE e.type = 'income'
  AND e.date >= :from
  AND e.date <= :to;

-- Total Expenses for period [from, to]
SELECT COALESCE(SUM(e.amount), 0) AS total_expenses
FROM entries e
WHERE e.type = 'expense'
  AND e.date >= :from
  AND e.date <= :to;

-- Net Balance = total_income - total_expenses (computed in JS)
```

### 4.3 Category Breakdown

```sql
-- Expense breakdown for period [from, to]
SELECT
  c.id AS category_id,
  c.name AS category_name,
  c.color AS category_color,
  COALESCE(SUM(e.amount), 0) AS total,
  ROUND(COALESCE(SUM(e.amount), 0) * 100.0 / :total_expenses, 2) AS percentage
FROM entries e
JOIN categories c ON e.category_id = c.id
WHERE e.type = 'expense'
  AND e.date >= :from
  AND e.date <= :to
GROUP BY c.id
HAVING total > 0
ORDER BY total DESC;

-- Income breakdown: same query, WHERE e.type = 'income'
```

**Note:** `:total_expenses` is the pre-computed KPI value. The percentage is computed server-side to avoid floating-point drift between frontend and backend. Categories with 0 spend are excluded via `HAVING total > 0`.

### 4.4 Month-over-Month Comparison

The prior period is the same length as the current period, shifted back by the period duration.

```
current_period_days = (to - from).days
prior_from = from - current_period_days
prior_to = from - 1 day
```

Example: `from=2026-07-01, to=2026-07-10` (10 days) → prior: `2026-06-01` to `2026-06-10`.

```sql
-- Prior period income
SELECT COALESCE(SUM(e.amount), 0) AS prior_income
FROM entries e
WHERE e.type = 'income'
  AND e.date >= :prior_from
  AND e.date <= :prior_to;

-- Prior period expenses
SELECT COALESCE(SUM(e.amount), 0) AS prior_expenses
FROM entries e
WHERE e.type = 'expense'
  AND e.date >= :prior_from
  AND e.date <= :prior_to;
```

**Change percentage:**
```
change_pct = ((current - previous) / previous) * 100
```
If `previous = 0` and `current > 0`: `change_pct = null`, `direction = "up"`, `has_prior_data = false`.
If `previous = 0` and `current = 0`: `change_pct = 0`, `direction = "flat"`, `has_prior_data = false`.

**Direction interpretation:**
- Income up → `"up"` (favorable, green)
- Income down → `"down"` (unfavorable, red)
- Expenses up → `"up"` (unfavorable, red)
- Expenses down → `"down"` (favorable, green)

### 4.5 Time Filter Presets (FR-22)

The frontend computes `from` and `to` based on the selected preset and passes them as query params:

| Preset | from | to |
|--------|------|----|
| This Month | first day of current month | today |
| Last Month | first day of previous month | last day of previous month |
| Last 3 Months | first day of (current month − 2 months) | today |
| This Year | January 1 of current year | today |
| All Time | 2000-01-01 (or earliest entry date) | today |
| Custom Range | user-selected start | user-selected end |

**Validation (server-side):** `from` must be ≤ `to`. If `from > to`, return `400`.

### 4.6 Account Balance Consistency (FR-27)

After every entry create/edit/delete operation, the affected account's balance is implicitly recalculated (it's always a live SUM). The API does not return a "stale" balance. The test case from FR-27:

1. Create account A (Debit).
2. Add 3 entries: income ₱100, income ₱200, expense ₱50.
3. `GET /api/accounts/:id` → balance = 100 + 200 − 50 = ₱250. ✓
4. Edit the ₱200 income to ₱150.
5. `GET /api/accounts/:id` → balance = 100 + 150 − 50 = ₱200. ✓

### 4.7 Account Deletion — Entry Resolution (FR-3, FR-26)

```
DELETE /api/accounts/:id { resolution: "reassign", target_account_id: X }
  → BEGIN TRANSACTION
  → UPDATE entries SET account_id = X WHERE account_id = :id
  → DELETE FROM accounts WHERE id = :id
  → COMMIT

DELETE /api/accounts/:id { resolution: "cascade" }
  → BEGIN TRANSACTION
  → DELETE FROM entries WHERE account_id = :id
  → DELETE FROM accounts WHERE id = :id
  → COMMIT
```

Both operations are atomic (single transaction). If the account has zero entries, either path works (the UPDATE/DELETE on entries is a no-op).

### 4.8 Category Deletion — Entry Reassignment (FR-14)

```
DELETE /api/categories/:id { reassign_to_category_id: X }
  → BEGIN TRANSACTION
  → UPDATE entries SET category_id = X WHERE category_id = :id
  → DELETE FROM categories WHERE id = :id
  → COMMIT
```

---

## 5. NFR Design

### 5.1 Authentication (NFR-2)

**Approach:** Simple passphrase-based auth.

- On first launch, the user may set a passphrase (min 4 chars) via `POST /api/system/setup` or `POST /api/system/set-passphrase`.
- The passphrase is hashed with bcrypt (cost factor 12) and stored in `settings` table (`passphrase_hash`).
- Every API request includes the header `X-App-Passphrase: <passphrase>`.
- A middleware on the Express app checks: if `passphrase_hash` is set, compare the header value against the bcrypt hash. If it doesn't match, return `401`.
- If `passphrase_hash` is NULL (user chose not to set one), all requests pass through.
- The passphrase is stored in the browser's `sessionStorage` (cleared on tab close) and sent with every request. The frontend prompts for it on first load if `passphrase_hash` is set.

**Tradeoff:** This is not production-grade auth. It's a single-user, self-hosted, local app. The passphrase protects against casual access (roommate, family member) but not against a determined attacker with filesystem access (they can read the SQLite file directly). For v1, this is sufficient. For v2 with multi-user, switch to JWT + proper session management.

**Gino's call:** Accept passphrase auth for v1, or drop auth entirely (trust localhost boundary).

### 5.2 Input Validation (NFR-10)

**Strategy:** Two-layer validation.

1. **Client-side (React):** Immediate field-level validation on blur/submit. Prevents bad requests from being sent. Uses the same rules as the server for consistency.
2. **Server-side (Express middleware):** Validates every request body and query params. Returns `400` with field-specific errors. This is the authoritative layer — client-side validation is UX only.

**Validation library:** `zod` (TypeScript-first schema validation). Each endpoint has a zod schema. Invalid requests never reach the route handler.

**Error response shape (consistent across all endpoints):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please fix the following errors.",
    "fields": {
      "amount": "Amount must be greater than ₱0.",
      "category_id": "Please select a category."
    }
  }
}
```

### 5.3 Error Handling (NFR-10)

**Global error handler (Express middleware):**
- Catches all unhandled errors.
- Logs the full error to console (server-side only).
- Returns a sanitized response to the client:
  ```json
  {
    "error": {
      "code": "INTERNAL_ERROR",
      "message": "Something went wrong. Please try again."
    }
  }
  ```
- Never exposes stack traces, SQL, file paths, or internal state.

**Error code catalog:**
| HTTP Status | Code | When |
|-------------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid request body/params |
| 401 | `UNAUTHORIZED` | Missing or incorrect passphrase |
| 403 | `FORBIDDEN` | Attempting to delete a default category |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Duplicate category name, cannot reassign (no target), cannot delete last account with entries |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### 5.4 Backup & Data Durability (NFR-3)

**SQLite WAL mode:** The database opens with:
```sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA foreign_keys=ON;
```

WAL (Write-Ahead Logging) provides:
- Concurrent reads during a write (not that v1 needs it, but it's safer).
- Better crash recovery than DELETE journal mode.
- `synchronous=NORMAL` is safe for WAL mode (the WAL file protects against corruption) and is faster than FULL.

**Backup strategy (v1):**
- The SQLite file (`pondo.db`) lives in the app's data directory.
- The user can back it up by copying the file (while the app is running, thanks to WAL mode — though stopping the server first is safer).
- The CSV export feature (NFR-9) provides an additional backup path — the user can re-import entries manually (import is v2, but the data is not lost).
- **Recommendation for v2:** Add a "Download Backup" button that copies the SQLite file (with WAL checkpoint) to a user-chosen location. Add an automated daily backup to a configurable directory.

### 5.5 Performance (NFR-4, NFR-5)

**Index strategy (see §2.2 for full index list):**
- `entries.date` — all time-filtered queries hit this index.
- `entries.account_id` — per-account balance queries.
- `entries.category_id` — category breakdown queries.
- `entries.type, entries.date` — dashboard KPI queries (filtered by type + date range).
- `entries.account_id, entries.date` — per-account time-filtered queries.

**Query optimization:**
- The dashboard endpoint (`GET /api/dashboard`) makes 6 queries: KPIs (2), MoM (2), breakdowns (2), accounts (1), recent entries (1). With indexes, all queries are O(log n) or O(1) on 5,000 entries. Total response time < 50ms on consumer hardware.
- The accounts list endpoint computes balance per account. With 20 accounts, that's 20 SUM queries. Each is an index scan on `entries.account_id`. Total < 20ms.
- No N+1 queries: category names and account names are JOINed in the entries query, not fetched separately.

**Frontend performance:**
- Vite code-splits by route (React.lazy + Suspense).
- Recharts renders only visible data (donut charts with ≤ 10 slices).
- The dashboard is a single API call — no waterfall of requests.

**NFR-5 verification:** Cold load with 1,000 entries and 10 accounts → dashboard renders in < 2s (API response < 100ms, React render < 500ms, chart render < 500ms). Entry save < 1s (API < 50ms, React re-render < 200ms).

### 5.6 AI Integration

**v1: No in-app AI.** The v1 MVP does not include AI-powered categorization, spending insights, or natural-language entry. These are explicitly deferred to v2 per the BRD's MVP boundary (§7).

**v2 placeholder:** If AI is added in v2, the integration point would be:
- **Model:** Ollama cloud model (e.g., `llama3.2` or `mistral`) for auto-categorization of entries based on note text.
- **Endpoint:** `POST /api/entries/suggest-category` → `{ "note": "Grocery run at SM", "amount": 500 }` → `{ "suggested_category_id": 1, "confidence": 0.92 }`.
- **Fallback:** If Ollama is unreachable, the entry form falls back to manual category selection (the current v1 behavior). No blocking on AI.
- **Prompt template:** "You are a financial categorization assistant. Given an expense note and amount in PHP, suggest the most appropriate category from this list: [categories]. Return JSON: {category_id, confidence}."

**Gino's call:** Confirm AI is deferred to v2. If AI is wanted in v1, specify the model and scope.

### 5.7 Accessibility (NFR-7)

**WCAG 2.1 AA compliance is a frontend implementation concern, but the architecture enables it:**

- **Semantic HTML:** The wireframes use proper heading hierarchy (h1→h2→h3), `<table>` for data tables, `<nav>` for sidebar, `<main>` for content. The SAD specifies that dev must use semantic elements, not `<div>` soup.
- **Color is never the sole differentiator:** Account types use border styles (solid/dashed/dotted/double/thick) AND color AND text labels. Category charts use labels + percentages in addition to color slices. Income/expense use ↑/↓ arrows + color.
- **Keyboard navigation:** All interactive elements (buttons, selects, table rows, modals) must be reachable via Tab. Modals trap focus. Escape closes modals.
- **Screen reader labels:** All form inputs have `<label>` elements. KPI cards have `aria-label` with the full value (e.g., "Total Income: 45,000 pesos"). Charts have `aria-label` with a text summary of the data. Error messages use `aria-live="polite"` regions.
- **Contrast ratios:** All text/background pairs meet AA minimums as documented in the design system (§2 of 02b-design-system.md). The brand palette was chosen with contrast compliance in mind.

### 5.8 Browser Support (NFR-8)

- **Desktop:** Chrome 90+, Firefox 90+, Edge 90+, Safari 15+ (latest stable versions).
- **Mobile (P2):** The app is usable on mobile browsers but not optimized. Responsive breakpoints are defined in the wireframes (sidebar collapses, cards stack, tables become card lists). No separate mobile layout in v1.
- **No IE11 support.** Vite's default build target is `es2015+`.

### 5.9 Currency (NFR-11)

- Single currency: PHP (₱).
- All amounts stored as REAL (floating-point). For financial data, this is acceptable for v1 because: (a) PHP has 2 decimal places (centavos), (b) amounts are sums of user-entered values, not compound interest calculations, (c) SQLite REAL is IEEE 754 double — 15-17 significant digits, far more than needed for household expenses.
- **Recommendation for v2:** Switch to INTEGER storage (amount in centavos) to avoid floating-point drift on very large datasets. For v1 with 5,000 entries, REAL is fine.
- The `₱` prefix and thousand-separator formatting are frontend-only (`Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`).

### 5.10 Hosting (NFR-12)

- **Self-hosted / local-first:** The app runs as a single Node.js process on the user's machine.
- **Startup:** `node server.js` (or `npm start`). The server listens on `localhost:3000` by default (configurable via `PORT` env var).
- **No Docker requirement for v1** (though a Dockerfile can be provided as a convenience).
- **No cloud dependency.** The app works fully offline after `npm install` (all dependencies are local).

---

## 6. Requirement Traceability Matrix

### 6.1 Functional Requirements (FR-1 through FR-27)

| FR | Requirement | Design Element(s) |
|----|-------------|-------------------|
| **FR-1** | Create an account | `POST /api/accounts` · `accounts` table · `POST /api/system/setup` (auto-create Cash) · S6 (Account Create form) · S10 (First Launch) |
| **FR-2** | Edit an account | `PUT /api/accounts/:id` · `accounts` table · S6 (Account Edit form) |
| **FR-3** | Delete an account | `DELETE /api/accounts/:id` (reassign/cascade) · `accounts` + `entries` tables · S7 (Account Delete Resolution modal) |
| **FR-4** | List/view accounts | `GET /api/accounts` · `accounts` table · S5 (Accounts List) · S1 (Dashboard account summary) |
| **FR-5** | View per-account balance | `GET /api/accounts` (balance field, computed live) · Balance formulas §2.3/§4.1 · S5 (account cards) · S1 (account summary) |
| **FR-6** | Account type definitions | `accounts.type` CHECK constraint · 5 account type colors + border styles · S6 (type selector cards) · S5 (type badges) |
| **FR-7** | Log an expense | `POST /api/entries` (type=expense) · `entries` table · S3 (Add Entry form) · S1 (dashboard updates) |
| **FR-8** | Log income | `POST /api/entries` (type=income) · `entries` table · S3 (Add Entry form) · S1 (dashboard updates) |
| **FR-9** | Edit an entry | `PUT /api/entries/:id` · `entries` table · S3 (Edit Entry form) · S1/S2 (recalculation) |
| **FR-10** | Delete an entry | `DELETE /api/entries/:id` · `entries` table · S4 (Delete Confirmation modal) |
| **FR-11** | Bulk-delete entries | `POST /api/entries/bulk-delete` · `entries` table · S2 (bulk action bar) · S4 (bulk confirmation) |
| **FR-12** | Default expense categories | `categories` table (seed data, 10 expense categories) · `GET /api/categories` · S3 (category dropdown) · S8 (Categories Management) |
| **FR-13** | Default income categories | `categories` table (seed data, 6 income categories) · `GET /api/categories` · S3 (category dropdown) · S8 (Categories Management) |
| **FR-14** | Create/rename/delete custom categories | `POST/PUT/DELETE /api/categories` · `categories` table · S8 (add/edit/delete) · S9 (Category Delete Resolution) |
| **FR-15** | Category icon/color | `categories.color` + `categories.icon` columns · S8 (color/icon picker — P2, fields exist, UI deferred) |
| **FR-16** | Dashboard KPI cards | `GET /api/dashboard` (kpi object) · S1 (KPI cards: Income, Expenses, Net Balance) |
| **FR-17** | Expense category breakdown chart | `GET /api/dashboard` (expense_breakdown array) · S1 (Expense donut chart) · Recharts DonutChart |
| **FR-18** | Income breakdown chart | `GET /api/dashboard` (income_breakdown array) · S1 (Income donut chart) · Recharts DonutChart |
| **FR-19** | Month-over-month comparison | `GET /api/dashboard` (mom object) · `GET /api/dashboard/mom` · S1 (MoM comparison card) · §4.4 (MoM SQL) |
| **FR-20** | Recent entries list | `GET /api/dashboard` (recent_entries array) · `GET /api/entries` · S1 (Recent Entries table) · S2 (All Entries) |
| **FR-21** | Account summary on dashboard | `GET /api/dashboard` (accounts array) · S1 (Account Summary section) · S5 (Accounts List) |
| **FR-22** | Preset time filters | `GET /api/dashboard?from=&to=` · `GET /api/entries?from=&to=` · S1 (time filter dropdown) · §4.5 (preset mapping) |
| **FR-23** | Custom date range | `GET /api/dashboard?from=&to=` (custom values) · S1 (Custom Range in dropdown) · §4.5 |
| **FR-24** | No duplicate detection | `POST /api/entries` (no uniqueness check) · S3 (no duplicate warning) |
| **FR-25** | Entry audit trail | `entries.created_at` + `entries.updated_at` · S3 (audit trail in edit mode) · S2 (timestamps not shown in list to avoid clutter) |
| **FR-26** | Account-entry referential integrity | `entries.account_id` FK with ON DELETE RESTRICT · `DELETE /api/accounts/:id` resolution flow · S7 (Account Delete Resolution) |
| **FR-27** | Account balance consistency | Balance always computed (never stored) · §4.1 (balance SQL) · §4.6 (consistency test case) · NFR-13 |

**Coverage: 27/27 FRs traced. 100%.**

### 6.2 Non-Functional Requirements (NFR-1 through NFR-13)

| NFR | Requirement | Design Element(s) |
|-----|-------------|-------------------|
| **NFR-1** | Single-household, single-user | No multi-tenant schema. No `household` table. No `user` table. Single SQLite file. |
| **NFR-2** | Data privacy | Passphrase auth (§5.1). No bank credentials. No third-party tracking. No Plaid/Yodlee. |
| **NFR-3** | Data durability | SQLite WAL mode (§5.4). `synchronous=NORMAL`. CSV export as secondary backup. |
| **NFR-4** | Volume (5K entries, 20 accounts) | Indexed queries (§5.5). SQLite handles millions of rows. |
| **NFR-5** | Performance (≤2s dashboard, ≤1s save) | Index strategy (§5.5). Single dashboard API call. better-sqlite3 synchronous speed. |
| **NFR-6** | Online-only | No offline queue. No service worker. Server required. |
| **NFR-7** | WCAG 2.1 AA | Semantic HTML. Color + border style + text for account types. Keyboard nav. Screen-reader labels. Contrast ratios documented in design system. |
| **NFR-8** | Browser support | Vite es2015+ target. Chrome/Firefox/Edge/Safari latest. Mobile P2. |
| **NFR-9** | CSV export | `GET /api/export/entries` + `GET /api/export/accounts` · S11 (CSV Export view) |
| **NFR-10** | Error handling | Consistent `{ error: { code, message, fields } }` shape (§3.1). Zod validation (§5.2). Global error handler (§5.3). |
| **NFR-11** | Single currency (PHP) | No currency column. No conversion logic. `₱` prefix in UI only. |
| **NFR-12** | Self-hosted / local-first | Node.js process on localhost. No cloud dependency. `PORT` env var. |
| **NFR-13** | Computed balances (never stored) | No `balance` column in `accounts`. All balances are live SUM queries (§4.1). |

**Coverage: 13/13 NFRs addressed. 100%.**

---

## 7. Build Order (for Dev)

The build is sequenced to produce a working vertical slice as early as possible — schema first, then API, then frontend scaffold, then features in dependency order.

### Phase 1: Foundation (Day 1–2)
| Step | Task | Deliverable |
|------|------|-------------|
| 1.1 | Initialize project: Vite + React + Tailwind + Express + better-sqlite3 | Monorepo scaffold with `client/` and `server/` directories |
| 1.2 | Configure Tailwind with design tokens from `tokens.json` | `tailwind.config.js` with brand palette, spacing, radius, shadows, fonts |
| 1.3 | Create SQLite schema + migrations (all 4 tables) | `server/db/schema.js` — creates tables, indexes, seeds default categories |
| 1.4 | Implement passphrase auth middleware | `server/middleware/auth.js` — bcrypt check, `X-App-Passphrase` header |
| 1.5 | Implement validation middleware (zod schemas) | `server/middleware/validate.js` — reusable per-endpoint schemas |
| 1.6 | Implement global error handler | `server/middleware/error-handler.js` — consistent error shape |
| 1.7 | Implement system endpoints: status, setup, set-passphrase, settings | `server/routes/system.js` — first-launch flow |

### Phase 2: Core CRUD (Day 3–4)
| Step | Task | Deliverable |
|------|------|-------------|
| 2.1 | Category CRUD endpoints | `server/routes/categories.js` — GET/POST/PUT/DELETE with reassignment |
| 2.2 | Account CRUD endpoints | `server/routes/accounts.js` — GET/POST/PUT/DELETE with balance computation + resolution |
| 2.3 | Entry CRUD endpoints | `server/routes/entries.js` — GET/POST/PUT/DELETE + bulk-delete |
| 2.4 | Data-access layer (balance formulas, query helpers) | `server/db/queries.js` — reusable query functions |

### Phase 3: Aggregation (Day 4–5)
| Step | Task | Deliverable |
|------|------|-------------|
| 3.1 | Dashboard aggregation endpoint | `server/routes/dashboard.js` — KPI, MoM, breakdowns, accounts, recent entries |
| 3.2 | MoM-only endpoint | `server/routes/dashboard.js` — lighter endpoint for polling |
| 3.3 | CSV export endpoints | `server/routes/export.js` — entries CSV + accounts CSV |

### Phase 4: Frontend Scaffold (Day 5–6)
| Step | Task | Deliverable |
|------|------|-------------|
| 4.1 | React Router setup (Dashboard, Entries, Accounts, Categories, Export) | `client/src/App.jsx` — routes + lazy loading |
| 4.2 | Shared layout: Sidebar + Header + main content area | `client/src/components/Layout.jsx` |
| 4.3 | API client module (fetch wrapper with passphrase header) | `client/src/lib/api.js` |
| 4.4 | Shared UI components: Button, Input, Select, Modal, KPI Card, Badge, Banner | `client/src/components/ui/` |
| 4.5 | First-launch flow: check status → setup → welcome banner | `client/src/pages/Dashboard.jsx` (first-launch state) |

### Phase 5: Dashboard (Day 6–8)
| Step | Task | Deliverable |
|------|------|-------------|
| 5.1 | KPI cards (Income, Expenses, Net Balance) | `client/src/components/dashboard/KpiCards.jsx` |
| 5.2 | MoM comparison card | `client/src/components/dashboard/MomComparison.jsx` |
| 5.3 | Expense donut chart (Recharts) | `client/src/components/dashboard/ExpenseChart.jsx` |
| 5.4 | Income donut chart (Recharts) | `client/src/components/dashboard/IncomeChart.jsx` |
| 5.5 | Account summary cards | `client/src/components/dashboard/AccountSummary.jsx` |
| 5.6 | Recent entries table | `client/src/components/dashboard/RecentEntries.jsx` |
| 5.7 | Time filter dropdown + integration | `client/src/components/dashboard/TimeFilter.jsx` |
| 5.8 | Dashboard page assembly (all states: loading, empty, error, data) | `client/src/pages/Dashboard.jsx` |

### Phase 6: Entry Forms & Management (Day 8–10)
| Step | Task | Deliverable |
|------|------|-------------|
| 6.1 | Add/Edit Entry form (type toggle, amount, date, category, account, note) | `client/src/components/entries/EntryForm.jsx` |
| 6.2 | Delete Entry confirmation modal | `client/src/components/entries/DeleteEntryModal.jsx` |
| 6.3 | All Entries page (table, search, filters, pagination, bulk actions) | `client/src/pages/Entries.jsx` |
| 6.4 | Bulk delete flow (selection, confirmation, execution) | `client/src/components/entries/BulkDeleteBar.jsx` |

### Phase 7: Accounts & Categories (Day 10–12)
| Step | Task | Deliverable |
|------|------|-------------|
| 7.1 | Accounts List page (card grid, sort, add button) | `client/src/pages/Accounts.jsx` |
| 7.2 | Account Create/Edit form (name, type selector, description) | `client/src/components/accounts/AccountForm.jsx` |
| 7.3 | Account Delete Resolution modal (reassign/cascade) | `client/src/components/accounts/DeleteAccountModal.jsx` |
| 7.4 | Categories Management page (expense + income lists, add/edit/delete) | `client/src/pages/Categories.jsx` |
| 7.5 | Category Delete Resolution modal | `client/src/components/categories/DeleteCategoryModal.jsx` |

### Phase 8: Export & Polish (Day 12–14)
| Step | Task | Deliverable |
|------|------|-------------|
| 8.1 | CSV Export page (entries + accounts download + preview) | `client/src/pages/Export.jsx` |
| 8.2 | Empty states for all pages (dashboard, entries, accounts, categories) | All page components |
| 8.3 | Loading skeletons for all pages | All page components |
| 8.4 | Error states with retry for all pages | All page components |
| 8.5 | Accessibility audit (keyboard nav, screen reader labels, focus management) | All components |
| 8.6 | Cross-browser testing (Chrome, Firefox, Edge, Safari) | QA checklist |
| 8.7 | Performance testing (1,000 entries, 10 accounts — verify NFR-5) | Load test |

**Total estimated: 14 development days** (single developer, full-time). Parallelizable if multiple devs: frontend and backend can proceed independently after Phase 1.

---

## 8. Risks & Decisions for G3

### 8.1 Hard Decision #1 — SQLite vs. Postgres

**Context:** SQLite is the right call for v1 (single-user, single-household, self-hosted, file-based, zero-ops). It satisfies all NFRs. The risk is future migration if the app grows to multi-household with concurrent writers.

**Recommendation:** Ship v1 on SQLite. The schema uses standard SQL — no SQLite-specific features beyond `INTEGER PRIMARY KEY AUTOINCREMENT`. The data-access layer is abstracted behind query functions, not raw SQL in route handlers. A migration to Postgres would require:
1. Swap `better-sqlite3` for `pg` + `knex` (or `pg` directly).
2. Change `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`.
3. Add connection pooling.
4. The API contract, validation, and business logic remain unchanged.

**Gino's call:** Accept SQLite for v1 with this documented migration path, or pre-emptively use Postgres now (adds setup complexity for self-hosted users — they'd need to install and configure Postgres).

### 8.2 Hard Decision #2 — Auth Approach

**Context:** A single-user, self-hosted, local app has three auth options:
1. **No auth** — trust the localhost boundary. Simplest. Risk: anyone on the same machine can access the app.
2. **Passphrase** — simple PIN/passphrase, bcrypt-hashed, checked per request. Low friction. Risk: passphrase is sent in plaintext over HTTP (but it's localhost — no network exposure). An attacker with filesystem access can read the SQLite file directly, bypassing auth.
3. **Proper auth (JWT + sessions)** — overengineered for v1. Adds login/logout flows, token refresh, session storage. Appropriate for v2 with multi-user.

**Recommendation:** Option 2 (passphrase). It satisfies NFR-2 ("accessible only to the authenticated user") with minimal friction. The passphrase is optional — if the user doesn't set one, the app works without auth. This is consistent with the "privacy-first, dead-simple" philosophy from the competitive research.

**Gino's call:** Accept passphrase auth, drop auth entirely for v1, or specify a different approach.

### 8.3 Additional Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Floating-point drift on large datasets | Low (5K entries) | Low (centavo-level errors) | Switch to INTEGER (centavos) in v2 if needed. Documented in §5.9. |
| SQLite file corruption on power loss | Low (WAL mode) | High (data loss) | WAL mode + `synchronous=NORMAL` is crash-safe. CSV export as secondary backup. Add automated backup in v2. |
| User enters 50+ accounts, balance queries slow down | Low (NFR-4 caps at 20) | Medium | 20 accounts × indexed SUM queries = < 20ms. If accounts grow, batch the balance computation into a single query with a GROUP BY. |
| Passphrase forgotten (no reset flow) | Medium | Medium | Document that the passphrase is stored in the SQLite file. Power users can delete the `passphrase_hash` row from the `settings` table. Add a "Reset Passphrase" flow in v2. |

---

## 9. Sign-off

- **Reviewed by Gino at G3 on:** ________ · **Notes:** ________
- **Stack:** React/Vite/Tailwind · Recharts · Node/Express · SQLite (better-sqlite3) · Passphrase auth
- **Schema:** 4 tables (accounts, entries, categories, settings) · 6 indexes · 16 seed categories
- **API:** 24 endpoints · Consistent error shape · Zod validation
- **FR coverage:** 27/27 (100%) · NFR coverage: 13/13 (100%)
- **Build order:** 8 phases · 14 dev days estimated
- **Hard decisions for Gino:** SQLite vs Postgres migration path · Passphrase auth vs no auth
