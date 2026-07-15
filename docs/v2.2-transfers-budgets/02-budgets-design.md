# SAD — US-17: Per-Category Budgets with Progress Visualization

**Version:** 1.0  
**Date:** 2026-07-15  
**Author:** Architect  
**Status:** Draft → G3 pending

---

## 1. Stack Decision

**No new dependencies.** This feature uses the existing stack:

- **Backend:** Node/Express + Supabase (PostgreSQL) — same as all existing routes.
- **Frontend:** React + Tailwind CSS + Recharts (already a dependency, used by `ExpenseChart.jsx`/`IncomeChart.jsx`).
- **Datastore:** PostgreSQL (Supabase) — a new `budgets` table in the existing schema.

**Rationale:** No reason to introduce anything new. The existing `getExpenseBreakdown(from, to)` already groups expenses by category and sums `total_amount` — we reuse it directly for "spend-so-far." The only new artifact is the `budgets` table and its CRUD + dashboard-enriched endpoint.

---

## 2. Data Model

### 2.1 DDL — `budgets` table

```sql
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
```

**Design decisions:**

| Decision | Rationale |
|---|---|
| `UNIQUE` on `category_id` | One budget per category. If the user wants a different amount, they update the existing row. No need for history rows — this is a target, not a ledger. |
| `cycle_start` always required | Every cycle type needs an anchor date to compute the current window. For weekly/monthly, this is the "start of the first cycle" — e.g., if the user sets a monthly budget starting on the 15th, `cycle_start = 2026-07-15`. |
| `cycle_end` nullable | For `weekly`/`monthly`, the end is computed from `cycle_start` + cycle logic (see §3). For `custom`, the user provides an explicit end date. |
| `reuse_next` boolean | Controls whether the budget auto-carries to the next cycle. See §7. |
| `amount` as `DECIMAL(10,2)` | Matches `entries.amount` type. No floating-point drift. |
| `ON DELETE CASCADE` | If a category is deleted, its budget goes with it — no orphan budgets. |

### 2.2 Entity relationship

```
categories (1) ──── (0..1) budgets
categories (1) ──── (0..N) entries
```

A category may have zero or one budget. Entries remain the source of truth for actual spending.

---

## 3. Cycle-Boundary Calculation

The "current cycle" is always computed **on-the-fly** from `cycle_start` (and `cycle_end` for custom). No cron, no pre-materialized windows.

### 3.1 Algorithm (pseudocode)

```
function getCurrentCycle(budget):
  now = today()

  if budget.cycle == 'custom':
    return { start: budget.cycle_start, end: budget.cycle_end }

  if budget.cycle == 'weekly':
    // How many full 7-day periods have elapsed since cycle_start?
    periods = floor((now - budget.cycle_start) / 7 days)
    start  = budget.cycle_start + (periods * 7 days)
    end    = start + 6 days
    return { start, end }

  if budget.cycle == 'monthly':
    // Anchor on the day-of-month from cycle_start.
    // The current cycle starts on the most recent occurrence of that day-of-month.
    anchorDay = day(budget.cycle_start)  // e.g., 15

    // Candidate: same day-of-month this month
    candidate = date(now.year, now.month, anchorDay)
    if candidate > now:
      // We haven't reached it yet — current cycle started last month
      candidate = addMonths(candidate, -1)

    start = candidate
    // End = one month later minus 1 day
    end   = addMonths(start, 1) - 1 day
    return { start, end }
```

### 3.2 Edge cases

| Case | Handling |
|---|---|
| Anchor day 31 in a 30-day month | `addMonths` clamps to last day of month (standard JS `setMonth` behavior). E.g., anchor=31 in April → April 30. |
| `cycle_start` is in the future | The "current cycle" hasn't started yet. `start > now` → spend-so-far = 0, budget not yet active. |
| `custom` with `cycle_end` in the past | Budget is expired. Spend-so-far computed for the custom range; progress bar shows 100%+ if overspent. |
| DST transitions | Dates are date-only (no time component). DST is irrelevant. |

### 3.3 Implementation location

A single utility function in `server/lib/budget-cycle.js`:

```js
// Exports: getCurrentCycle(budgetRow) → { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
```

This is called by the dashboard endpoint and by any function that needs to know "what date range does this budget currently cover." It is **not** a DB function — it's pure JS so it's testable without a database.

---

## 4. Spend-So-Far Computation

### Decision: Reuse `getExpenseBreakdown(from, to)`

**Rationale:**

1. `getExpenseBreakdown` already does exactly what we need: `SELECT category_id, SUM(amount) FROM entries WHERE type='expense' AND date BETWEEN from AND to GROUP BY category_id`.
2. It returns `{ id, name, color, icon, total_amount }` per category — we just need `total_amount` for the budget comparison.
3. No new query, no risk of divergent aggregation logic.

**How it's wired:**

For the dashboard budget endpoint, the flow is:

1. Fetch all `budgets` rows (with joined `categories` name/color/icon).
2. For each budget, compute `getCurrentCycle(budget)` → `{ start, end }`.
3. Call `getExpenseBreakdown(start, end)` once with the **union** of all cycle date ranges (or, simpler: call it once with the widest `[min_start, max_end]` across all budgets, then filter per-category in JS). **Decision: one call with the widest range, then JS filter.** This avoids N+1 queries and keeps the dashboard fast.
4. For each budget, look up the matching category in the breakdown result. `spend = breakdown[category_id]?.total_amount || 0`.
5. Return `{ budget, spend, cycle_start, cycle_end, percent }`.

**Tradeoff:** If budgets have wildly different cycle windows (e.g., one weekly starting Jan 1, one custom from Mar–May), the "widest range" query may pull more rows than strictly needed. In practice, with a single-household app and <10 budgets, this is negligible. If it ever becomes a problem, switch to per-budget queries — but that's premature optimization for v1.

---

## 5. API Surface

### 5.1 CRUD: `/api/budgets`

All endpoints are authenticated (via the global `authMiddleware` in `server.js`). Follow the existing pattern: Zod validation, `try/catch` → `next(error)`.

#### `GET /api/budgets`

List all budgets with category info joined.

**Response `200`:**
```json
[
  {
    "id": 1,
    "category_id": 3,
    "category_name": "Food & Dining",
    "category_color": "#FF6B6B",
    "category_icon": "🍽️",
    "amount": 5000.00,
    "cycle": "monthly",
    "cycle_start": "2026-07-01",
    "cycle_end": null,
    "reuse_next": true,
    "created_at": "2026-07-15T04:00:00.000Z",
    "updated_at": "2026-07-15T04:00:00.000Z"
  }
]
```

**Query params:** none required. Optional `?category_id=<id>` filter.

#### `POST /api/budgets`

Create a new budget.

**Body:**
```json
{
  "category_id": 3,
  "amount": 5000.00,
  "cycle": "monthly",
  "cycle_start": "2026-07-01",
  "cycle_end": null,
  "reuse_next": false
}
```

**Validation rules (Zod):**
- `category_id`: `number().int().positive()`
- `amount`: `number().positive()`
- `cycle`: `enum(['weekly', 'monthly', 'custom'])`
- `cycle_start`: `string().regex(/^\d{4}-\d{2}-\d{2}$/)`
- `cycle_end`: `string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()` — **required** when `cycle === 'custom'`, **must be null/absent** otherwise
- `reuse_next`: `boolean().optional().default(false)`

**Response `201`:**
```json
{
  "id": 1,
  "category_id": 3,
  "amount": 5000.00,
  "cycle": "monthly",
  "cycle_start": "2026-07-01",
  "cycle_end": null,
  "reuse_next": false,
  "created_at": "...",
  "updated_at": "..."
}
```

**Error `409`:** if a budget already exists for `category_id` → `{ error: { code: "DUPLICATE_BUDGET", message: "A budget already exists for this category" } }`

**Error `400`:** validation failures (negative amount, missing `cycle_end` for custom, etc.)

#### `PUT /api/budgets/:id`

Update an existing budget. Same body schema as POST (all fields optional for PATCH-like behavior, but we use PUT for consistency with the rest of the API).

**Response `200`:** updated budget object.

**Error `404`:** budget not found.

#### `DELETE /api/budgets/:id`

Hard-delete the budget row.

**Response `204`:** no body.

**Error `404`:** budget not found.

### 5.2 Dashboard enrichment: `GET /api/dashboard/budgets`

**Decision: separate endpoint, not merged into `GET /api/dashboard`.**

**Rationale:**
1. The existing `GET /api/dashboard` already does 6 parallel queries and returns a large payload. Adding budget computation (which requires per-budget cycle math) would bloat it further.
2. Budgets are a distinct feature — a separate endpoint keeps the dashboard composable. The client fetches what it needs.
3. If the user has no budgets configured, the client can skip the call entirely.

**Response `200`:**
```json
[
  {
    "budget_id": 1,
    "category_id": 3,
    "category_name": "Food & Dining",
    "category_color": "#FF6B6B",
    "category_icon": "🍽️",
    "amount": 5000.00,
    "cycle": "monthly",
    "cycle_start": "2026-07-01",
    "cycle_end": null,
    "reuse_next": true,
    "current_cycle_start": "2026-07-01",
    "current_cycle_end": "2026-07-31",
    "spend": 3200.50,
    "percent": 64.0,
    "remaining": 1799.50
  }
]
```

**Fields:**
| Field | Source |
|---|---|
| `budget_id` through `reuse_next` | `budgets` row + joined `categories` |
| `current_cycle_start`, `current_cycle_end` | Computed by `getCurrentCycle()` |
| `spend` | `getExpenseBreakdown(cycle_start, cycle_end)` → matched by `category_id` |
| `percent` | `(spend / amount) * 100`, clamped to 0–100 for display (but raw value available for "overspent" indicator) |
| `remaining` | `amount - spend` (negative = overspent) |

**Implementation flow in the route handler:**

```js
// 1. Fetch all budgets with category join
const budgets = await getBudgetsWithCategories();

// 2. Compute cycle windows for each budget
const enriched = budgets.map(b => ({
  ...b,
  ...getCurrentCycle(b)
}));

// 3. Find the widest date range across all cycles
const minStart = min(enriched.map(e => e.current_cycle_start));
const maxEnd   = max(enriched.map(e => e.current_cycle_end));

// 4. One call to getExpenseBreakdown for the full range
const breakdown = await getExpenseBreakdown(minStart, maxEnd);
const spendByCategory = Object.fromEntries(
  breakdown.map(b => [b.id, b.total_amount])
);

// 5. Merge spend into each budget
return enriched.map(b => ({
  ...b,
  spend: spendByCategory[b.category_id] || 0,
  percent: ...,
  remaining: ...
}));
```

---

## 6. Client-Side Design

### 6.1 Progress component: CSS/Tailwind bar (not Recharts ring)

**Decision: Plain CSS/Tailwind progress bar.**

**Rationale:**
1. **Simplicity.** A progress bar is a single `<div>` with a width percentage. A Recharts `RadialBarChart` requires a full chart container, responsive wrapper, and custom label positioning — overkill for a linear percentage display.
2. **Dashboard real estate.** The existing dashboard layout is a 3-column grid. Progress bars stack compactly in a list; rings would need more vertical space or a dedicated chart area.
3. **Consistency.** The existing `ExpenseChart.jsx`/`IncomeChart.jsx` are donut charts for *aggregate breakdown* — they answer "what's my spending mix?" Budget progress answers "am I on track per category?" — a different question, a different visual.
4. **Accessibility.** A `<progress>` element or ARIA `role="progressbar"` is semantically correct and screen-reader friendly out of the box. Recharts SVGs are not.

**Component spec: `BudgetProgressBar.jsx`**

```jsx
// Props:
//   category_name, category_color, category_icon
//   amount (budget), spend, percent, remaining
//   cycle_label (e.g., "Jul 1 – Jul 31")

// Renders:
//   ┌─────────────────────────────────────────────┐
//   │ 🍽️ Food & Dining                    64%    │
//   │ ████████████████████░░░░░░░░░░░░░░░░░░░░░░ │
//   │ ₱3,201 spent of ₱5,000 · ₱1,799 remaining  │
//   │ Monthly · Jul 1 – Jul 31                   │
//   └─────────────────────────────────────────────┘
```

**Color logic:**
- `percent < 75` → bar fill = `category_color` (or brand green `#1F7A64`)
- `75 ≤ percent < 100` → bar fill = amber/warning (`#E89C2A`)
- `percent ≥ 100` → bar fill = red (`#D14343`), show "Overspent by ₱X"

### 6.2 Dashboard placement

The budget progress list lives in the **right sidebar** of the dashboard, below the existing `AccountSummary` card. It's a new card:

```
Dashboard layout (existing):
┌──────────────────────┬──────────┐
│ BalanceHero          │ QuickAdd │
│ RecentEntries        │ Accounts │
│                      │ BUDGETS  │  ← NEW
└──────────────────────┴──────────┘
```

**Rationale:** The right column is the "at-a-glance" sidebar. Budgets are a monitoring concern, not a data-entry concern — they belong near Accounts, not in the main content area.

### 6.3 Budget management page

A new page at `/budgets` with:
- List of all budgets (category, amount, cycle, reuse toggle)
- "Add Budget" button → modal or inline form
- Edit/delete per row
- This page is **not** on the dashboard — it's a settings/admin page, reachable from the nav. The dashboard only shows progress.

### 6.4 File manifest (new files)

| File | Purpose |
|---|---|
| `server/db/migrations/004_budgets.sql` | DDL for `budgets` table |
| `server/db/queries.js` (append) | `getBudgets`, `getBudgetById`, `createBudget`, `updateBudget`, `deleteBudget`, `getBudgetsWithCategories` |
| `server/lib/budget-cycle.js` | `getCurrentCycle(budgetRow)` utility |
| `server/routes/budgets.js` | CRUD routes + `GET /api/dashboard/budgets` |
| `server/server.js` (edit) | Register `app.use('/api/budgets', budgetsRouter)` and `app.use('/api/dashboard/budgets', budgetsRouter)` |
| `client/src/lib/api.js` (append) | `getBudgets`, `createBudget`, `updateBudget`, `deleteBudget`, `getDashboardBudgets` |
| `client/src/components/dashboard/BudgetProgressBar.jsx` | Single budget progress bar |
| `client/src/components/dashboard/BudgetCard.jsx` | Card wrapping the list of `BudgetProgressBar` items |
| `client/src/pages/Budgets.jsx` | Budget management page (CRUD) |
| `client/src/App.jsx` (edit) | Add `/budgets` route |

---

## 7. "Reuse Budget" Toggle Behavior

### Decision: On-the-fly computation — no row duplication.

**How it works:**

When `reuse_next = true`:
- The `getCurrentCycle()` function (see §3) already computes the current cycle window from `cycle_start` alone.
- For a monthly budget with `cycle_start = 2026-07-01` and `reuse_next = true`, on August 1 the current cycle automatically becomes `2026-08-01 → 2026-08-31`. No DB change needed.
- The budget row stays as-is. The cycle just "rolls forward" mathematically.

When `reuse_next = false`:
- The budget is **only active for its first cycle**. After the current cycle ends, `getCurrentCycle()` still returns the *current* window (which is now in the past), but the dashboard endpoint marks it as `expired: true` and the client can hide or grey it out.
- **Alternative considered:** auto-delete the budget row at cycle end. Rejected — the user might want to re-enable it later, and silent deletion is surprising.

**Why on-the-fly beats row duplication:**

| Approach | Pros | Cons |
|---|---|---|
| **On-the-fly (chosen)** | No cron/scheduler dependency. No row explosion. Simple to reason about. | `reuse_next = false` budgets need an `expired` flag in the API response so the client can filter them. |
| Row duplication at rollover | Each cycle is an explicit row — auditable. | Requires a cron job or a "check on every request" pattern. Row count grows unboundedly. What happens if the user edits a past cycle's budget? Ambiguous. |

**Expired budget handling in the API:**

`GET /api/dashboard/budgets` adds `"active": true/false` to each item:
- `active = true` if `now <= current_cycle_end` (the cycle hasn't ended yet).
- `active = false` if the cycle has ended AND `reuse_next = false`.
- `active = true` if the cycle has ended BUT `reuse_next = true` (it rolls forward — the "current" cycle is the next one, which is in the future or just starting).

The client filters to `active: true` for the dashboard card. The management page shows all.

---

## 8. FR → Design Traceability Matrix

| BRD FR | Design Element |
|---|---|
| "Per-category budget amount" | `budgets.amount` column, `POST/PUT /api/budgets` |
| "Cycle: weekly/monthly/custom" | `budgets.cycle` + `budgets.cycle_start` + `budgets.cycle_end`; `getCurrentCycle()` in `server/lib/budget-cycle.js` |
| "Reuse budget toggle carries amount forward" | `budgets.reuse_next` boolean; on-the-fly cycle rollover in `getCurrentCycle()` — no row duplication |
| "Dashboard category tiles show progress bar/ring" | `BudgetProgressBar.jsx` + `BudgetCard.jsx` in dashboard right sidebar; `GET /api/dashboard/budgets` |
| "Spend-so-far vs. budget" | Reuses `getExpenseBreakdown(from, to)` filtered to current cycle window; merged server-side in the dashboard budgets endpoint |
| "Overspending visible before the fact" | Color-coded progress bar (green → amber → red); `remaining` field goes negative; percent > 100 shown explicitly |

---

## 9. Build Order

| Step | What | Who | Depends on |
|---|---|---|---|
| 1 | Migration: `004_budgets.sql` | dev | — |
| 2 | `server/lib/budget-cycle.js` (pure function, testable) | dev | — |
| 3 | `server/db/queries.js` — budget CRUD functions | dev | step 1 |
| 4 | `server/routes/budgets.js` — CRUD + dashboard endpoint | dev | steps 2, 3 |
| 5 | Register routes in `server/server.js` | dev | step 4 |
| 6 | `client/src/lib/api.js` — budget API functions | dev | step 4 |
| 7 | `BudgetProgressBar.jsx` component | dev | step 6 |
| 8 | `BudgetCard.jsx` — wire into Dashboard right sidebar | dev | step 7 |
| 9 | `Budgets.jsx` — management page + `/budgets` route | dev | step 6 |
| 10 | QA: verify cycle math, edge cases, color thresholds | qa | all |

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Monthly cycle anchor-day edge cases (31→30, Feb 29→28) | Medium | Medium | `getCurrentCycle()` uses JS `Date` arithmetic which handles month clamping natively. Unit-test with boundary dates. |
| `getExpenseBreakdown` wide-range query pulls too many rows | Low | Low | Single-household app; <10 budgets. If it becomes a problem, switch to per-budget queries with a `Promise.all`. |
| User creates budget for a category that later gets deleted | Low | Low | `ON DELETE CASCADE` handles this. Budget disappears with category. |
| `reuse_next = false` budget expiration is confusing | Medium | Low | Dashboard endpoint returns `active: false`; client hides it. Management page shows all with an "Expired" badge. |
| Client-side percent calculation drift vs. server | Low | Medium | Server computes `percent` and `remaining` — client is display-only. Single source of truth. |
| ~~No `budgets` table in SQLite schema~~ | — | — | **Correction (DARKLING, post-review): this risk is stale.** `server/schema.js` was deleted in the v1.1 backfill pass (US-30, 2026-07-15) and `server/db/schema.js` is confirmed dead code with zero live imports — the app is 100% Supabase/Postgres, no SQLite path exists anywhere in the running system. Add the `budgets` DDL only as a new migration file (`server/db/migrations/00X_budgets.sql`), matching the pattern already used for `001_add_users_and_account_user_id.sql` and `002_add_soft_delete_columns.sql`. Do not touch `server/db/schema.js` or recreate `server/schema.js`. |

---

## 11. Open Questions for Gino (G3)

1. **Budget management page location:** Proposed as `/budgets` in the nav. Acceptable, or should it be a settings sub-page?
2. **"Expired" budget behavior:** When `reuse_next = false` and the cycle ends, should the budget row be auto-deleted, soft-deleted, or just marked inactive? Proposed: marked inactive, user can re-enable by editing.
3. **Progress bar color thresholds:** Proposed green <75%, amber 75–99%, red ≥100%. Acceptable?
4. **Dashboard card title:** "Budgets" or "Spending Limits" or "Category Budgets"?
