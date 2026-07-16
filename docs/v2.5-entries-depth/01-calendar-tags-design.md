# SAD — US-08 (Calendar View) + US-14 (Freeform Tags)

**Version:** 1.0
**Date:** 2026-07-16
**Author:** Architect (architect-pondo)
**Status:** Draft — awaiting G3 approval

---

## Part A: US-08 — Month-Grid Calendar View

### A.1 Stack Decision

**No new dependencies.** Same stack as v2.1–v2.3:

- **Backend:** Node/Express + Supabase (PostgreSQL).
- **Frontend:** React + Tailwind, same conventions as `Entries.jsx`/`Dashboard.jsx`.
- **Calendar rendering:** Pure CSS Grid — no date-picker library. A 7-column CSS grid with day cells is ~50 lines of Tailwind. Adding a dependency (react-day-picker, react-calendar) for a read-only month grid is overkill when the only interaction is "tap a day to filter entries."

**Rationale:** The calendar view is a read-only aggregation surface with one interaction (tap → filter). It doesn't need date-range selection, keyboard navigation, or accessibility primitives that a library would provide. The existing `Entries.jsx` already handles date filtering via `GET /api/entries?from=YYYY-MM-DD&to=YYYY-MM-DD` — the calendar just needs to pass a single date as both `from` and `to`.

---

### A.2 Data Model

**No new tables or columns.** The calendar view is a read-only aggregation over the existing `entries` table. The only schema addition is a new `settings` key for the first-use tooltip dismissal (see §A.5).

---

### A.3 API Surface

#### A.3.1 New endpoint: `GET /api/entries/calendar?month=YYYY-MM`

**Purpose:** Return per-day aggregated totals for a calendar month, computed server-side via `GROUP BY date`. This avoids fetching a full month of individual entries (which could be hundreds of rows) just to sum them client-side.

**Why a new endpoint, not a query param on `GET /api/entries`:** The existing `GET /api/entries` is paginated at 10/page and returns full entry objects with account/category joins. The calendar needs a fundamentally different shape — per-day aggregates, not individual rows — and mixing these two concerns into one endpoint would complicate the query builder, the response shape, and the caching story. A dedicated endpoint is cleaner and follows the existing pattern of `getDashboardKPIs`/`getExpenseBreakdown` doing aggregation server-side.

**Request:**
```
GET /api/entries/calendar?month=2026-07
```

**Validation (Zod):**
```js
const calendarQuerySchema = z.object({
  query: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
  }),
});
```

**Response:** `200`
```json
{
  "month": "2026-07",
  "days": [
    { "date": "2026-07-01", "total_income": 1500.00, "total_expense": 350.00, "net": 1150.00 },
    { "date": "2026-07-02", "total_income": 0,     "total_expense": 120.50, "net": -120.50 },
    { "date": "2026-07-03", "total_income": 0,     "total_expense": 0,      "net": 0 },
    ...
  ]
}
```

**Days returned:** Every day from the 1st through the last day of the month, even if no entries exist for that day (zero-filled). This lets the client render a complete grid without having to backfill missing dates.

**Sign convention:** `net = total_income − total_expense`, matching the existing convention in `getDashboardKPIs()` (`net_balance = totalIncome - totalExpense`). Positive net = more income than expense that day; negative net = more expense than income.

**Transfer exclusion:** Transfer rows (`transfer_group_id IS NOT NULL`) are excluded from calendar aggregation, matching the existing pattern in `getDashboardKPIs`/`getDashboardMoM`/`getDashboardAccounts` which all filter out `transfer_group_id IS NOT NULL` from income/expense sums. Transfers are not real income or expense — they'd inflate both totals and misrepresent daily cashflow.

**Soft-delete exclusion:** Only entries where `deleted_at IS NULL` are included, matching every existing query in the codebase.

#### A.3.2 Query implementation: `getCalendarMonth(month)` in `server/db/queries.js`

```js
const getCalendarMonth = async (month) => {
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate(); // mon is 1-based; day 0 of next month = last day of this month

  // Build all dates in the month for zero-fill
  const allDates = [];
  for (let d = 1; d <= daysInMonth; d++) {
    allDates.push(`${month}-${String(d).padStart(2, '0')}`);
  }

  const from = `${month}-01`;
  const to = `${month}-${String(daysInMonth).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('entries')
    .select('date, type, amount, transfer_group_id')
    .is('deleted_at', null)
    .is('transfer_group_id', null)   // exclude transfers
    .gte('date', from)
    .lte('date', to);

  if (error) throw error;

  // Aggregate in JS — the row count for one month is bounded (~31 days × maybe 20 entries/day = 620 rows max),
  // so a JS reduce is simpler and more readable than a raw SQL GROUP BY via supabase-js.
  // This mirrors the existing pattern in getDashboardMoM which also aggregates in JS after fetching.
  const dayMap = {};
  for (const entry of data) {
    if (!dayMap[entry.date]) {
      dayMap[entry.date] = { total_income: 0, total_expense: 0 };
    }
    if (entry.type === 'income') {
      dayMap[entry.date].total_income += entry.amount;
    } else {
      dayMap[entry.date].total_expense += entry.amount;
    }
  }

  // Zero-fill all dates
  const days = allDates.map(date => ({
    date,
    total_income: dayMap[date]?.total_income || 0,
    total_expense: dayMap[date]?.total_expense || 0,
    net: (dayMap[date]?.total_income || 0) - (dayMap[date]?.total_expense || 0),
  }));

  return { month, days };
};
```

**Design note — JS aggregation vs. raw SQL `GROUP BY`:** The existing codebase consistently aggregates in JavaScript after fetching rows from Supabase (`getDashboardKPIs`, `getDashboardMoM`, `getExpenseBreakdown`, `getIncomeBreakdown`, `getDashboardAccounts` all do this). A raw SQL `GROUP BY date` via `supabase.rpc()` would be more efficient for very large datasets, but for a single month's entries (bounded at a few hundred rows), the JS approach is simpler, consistent with the codebase's established pattern, and avoids adding another Postgres function to maintain. If this ever becomes a bottleneck (unlikely for a single-household app), the migration path is straightforward: wrap the `GROUP BY` in an RPC function and swap the query call.

**Reuse of existing patterns:** The `transfer_group_id IS NULL` filter and `deleted_at IS NULL` filter are identical to the filters already applied in `getDashboardKPIs`, `getDashboardMoM`, and `getDashboardAccounts`. No new filtering logic is invented here.

#### A.3.3 Route registration

Add to `server/routes/entries.js` (the calendar endpoint lives on the entries route since it's an entries aggregation, not a separate resource):

```js
// GET /api/entries/calendar?month=YYYY-MM
router.get('/calendar', validate(calendarQuerySchema), async (req, res, next) => {
  try {
    const result = await getCalendarMonth(req.query.month);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

**Important — route ordering:** This route MUST be registered BEFORE `router.get('/:id', ...)` in `entries.js`. Express matches routes in registration order, and `/calendar` would otherwise be captured by `/:id` (with `id = 'calendar'` → `parseInt('calendar')` → `NaN` → 400 error). This is a standard Express gotcha; the existing route file already has `GET /` before `GET /:id`, so adding `/calendar` between them follows the established ordering convention.

---

### A.4 Client-Side Design

#### A.4.1 Toggle in `Entries.jsx`

A segmented control or toggle button pair at the top of the Entries screen, above the existing filter bar:

- **"List"** (default, active on mount) — renders the existing table view, completely unchanged.
- **"Calendar"** — renders the new month-grid view.

The toggle state is local component state (`useState`), not persisted to settings or URL. The user's preference resets to "List" on every page visit — this is intentional: the table is the primary interaction surface, and the calendar is a secondary inspection tool. Persisting the toggle would mean a user who last used the calendar three weeks ago opens Entries and is confused by a month grid instead of their familiar list.

#### A.4.2 Calendar grid component

A new component: `client/src/components/entries/CalendarView.jsx`

**Layout:**
- Month/year header with `<` `>` navigation arrows to move between months.
- 7-column CSS grid: `Sun Mon Tue Wed Thu Fri Sat` header row + up to 6 rows of day cells.
- Each day cell shows:
  - Day number (top-left)
  - Net total (centered or bottom-right), color-coded: green for positive net, red for negative net, muted gray for zero.
  - Optional: a subtle dot/indicator if the day has entries (so zero-net days with offsetting income/expense aren't visually identical to truly empty days).
- Today's cell has a distinct border/background highlight.
- Days outside the current month (padding cells at the start/end of the grid) are rendered as empty/muted.

**Interaction:**
- Tapping a day cell navigates to the entries list filtered to that single date: `GET /api/entries?from=YYYY-MM-DD&to=YYYY-MM-DD`. This reuses the existing `Entries.jsx` table view with its existing date filter mechanism — no new component, no new route.
- The navigation sets the date filter and switches the toggle back to "List" view (or keeps the calendar visible with the list below — dev's choice, but the simpler approach is switching to list view since the AC says "drills into that day's entries").

**Data fetching:**
- On mount and on month navigation, calls `GET /api/entries/calendar?month=YYYY-MM`.
- Loading state: skeleton grid (gray placeholder cells).
- Empty state: the grid still renders with all zeros — an empty month is valid data, not an error.
- Error state: inline error banner with retry button, same pattern as `Entries.jsx`'s existing error handling.

#### A.4.3 First-use tooltip

**Mechanism:** A new `settings` key: `calendar_view_tooltip_dismissed` (value: `'1'` when dismissed, absent/unset otherwise). This follows the exact same pattern as `first_launch_completed` and `last_used_account_id` — a key/value pair in the `settings` table, read via `getSetting()` and written via `setSetting()`.

**Why server-persisted (settings table), not localStorage:** The app already has multi-device usage via Supabase Auth. A localStorage-based dismissal would show the tooltip again when the user switches from desktop to mobile. The `settings` table is already the established mechanism for cross-device user preferences (`first_launch_completed`, `last_used_account_id`). See Open Question 3 for the explicit tradeoff.

**Behavior:**
- On first render of the calendar view, if `calendar_view_tooltip_dismissed` is not `'1'`, show a tooltip anchored to the calendar toggle or the first day cell: "Tap any day to see its entries."
- The tooltip has a "Got it" dismiss button that calls `setSetting('calendar_view_tooltip_dismissed', '1')`.
- The tooltip also auto-dismisses on the first day-cell tap (the action itself teaches the mechanic).
- After dismissal, the tooltip never shows again for this user on any device.

**Implementation note:** The `getSetting` call is async (Supabase query). The tooltip should default to NOT showing while the setting loads (avoid a flash of the tooltip for returning users). Pattern:

```jsx
const [showTooltip, setShowTooltip] = useState(false);
const [tooltipLoaded, setTooltipLoaded] = useState(false);

useEffect(() => {
  getSetting('calendar_view_tooltip_dismissed').then(val => {
    if (val !== '1') setShowTooltip(true);
    setTooltipLoaded(true);
  });
}, []);
// Only render tooltip if tooltipLoaded && showTooltip
```

---

### A.5 FR Traceability — US-08

| BRD/AC Item | Design Element |
|---|---|
| Toggle between table (default) and calendar view | Segmented control in `Entries.jsx`; local state, not persisted (§A.4.1) |
| Each day cell shows net total (income − expense) | `GET /api/entries/calendar` returns `{ total_income, total_expense, net }` per day (§A.3.1) |
| Tapping a day drills into that day's entries | Navigate to list view with `from=YYYY-MM-DD&to=YYYY-MM-DD` filter (§A.4.2) |
| First-use tooltip introduces the view once | `settings` key `calendar_view_tooltip_dismissed`; server-persisted (§A.4.3) |
| Calendar aggregation is server-side, not client-side over paginated entries | Dedicated `GET /api/entries/calendar` endpoint with `GROUP BY`-equivalent aggregation (§A.3.1) |

---

## Part B: US-14 — Freeform Tags

### B.1 Stack Decision

**No new dependencies.** Tags are a standard many-to-many relationship implemented with two new tables + a join table, all in the existing Supabase Postgres database. The autocomplete is a simple client-side filter over a fetched tag list — no search library needed.

---

### B.2 Data Model

#### B.2.1 Migration: `010_tags.sql`

```sql
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
```

**Design decisions:**

| Decision | Rationale |
|---|---|
| `name_lower` column with UNIQUE constraint | Case-insensitive tag matching (see Open Question 1). The user types "Grocery" — we store `name = 'Grocery'` (display case as entered) and `name_lower = 'grocery'` (for uniqueness and matching). This avoids the ambiguity of a case-insensitive collation and is explicit about what's being constrained. |
| `entry_tags` has its own `id` PK (not composite PK on `(entry_id, tag_id)`) | Consistency with the rest of the schema — every table in this project uses `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`. A composite PK would be semantically correct but breaks the established convention. The `UNIQUE (entry_id, tag_id)` constraint provides the same guarantee. |
| `ON DELETE CASCADE` on both FKs | **This is the critical soft-delete interaction decision** (see §B.2.2). |
| No `user_id` on `tags` | Tags are shared across the household (single-user app for now — US-22 multi-household is future work). When multi-user arrives, tags can be scoped with a `user_id` column + migration. For v2.5, the simpler model is correct. |

#### B.2.2 Soft-delete interaction — explicit specification

**The question:** When an entry is soft-deleted (`deleted_at = NOW()`), what happens to its `entry_tags` rows? When it's restored (`deleted_at = NULL`), do the tag associations come back?

**The answer: Tag associations survive soft-delete/restore round-trips with zero special handling.**

**Why this is the correct behavior, and why it requires no code changes:**

`ON DELETE CASCADE` on `entry_tags.entry_id` only fires on a **hard** `DELETE FROM entries` — a SQL `DELETE` statement. Soft-delete in this codebase is an `UPDATE entries SET deleted_at = NOW()` — it never issues a `DELETE`. Therefore:

1. **Soft-delete:** `UPDATE entries SET deleted_at = NOW()` — the `entry_tags` rows are untouched. They remain in the database, still pointing at the now-soft-deleted entry.
2. **Restore:** `UPDATE entries SET deleted_at = NULL` — the `entry_tags` rows are still there, still pointing at the same entry. The associations survive intact.
3. **Hard-delete (purge):** `DELETE FROM entries WHERE deleted_at < 30 days ago` — THIS triggers `ON DELETE CASCADE` on `entry_tags`, which is correct: when an entry is permanently purged, its tag associations should be cleaned up too.
4. **Tag deletion:** `DELETE FROM tags WHERE id = X` — `ON DELETE CASCADE` on `entry_tags.tag_id` cleans up the join rows. This is correct: if a tag is deleted, no entries should reference it.

**No special handling needed in `restoreItem` or `bulkDeleteEntries`** — unlike transfer pairs (which needed explicit paired-row logic because the pairing is stored on the entries themselves, not in a separate table with cascade semantics), tag associations are in a separate join table with standard FK cascades. The soft-delete pattern naturally preserves them.

**One edge case to document:** If an entry is soft-deleted, and while it's in the recycle bin a tag it was associated with is hard-deleted (e.g., the user deletes an unused tag), the `entry_tags` row is cascade-deleted. If the entry is later restored, that specific tag association is lost. This is acceptable behavior — the user explicitly chose to delete the tag.

#### B.2.3 Per-entry tag count limit

**Recommendation: soft cap of 5 tags per entry.** This is enforced client-side in the tag input UI (disable the input when 5 tags are selected, show a "Max 5 tags" tooltip). It is NOT enforced at the database level (no CHECK constraint or trigger) — the cap is a UX guideline, not a data integrity rule. If the product decision is "unlimited," the client-side cap is simply removed. See Open Question 2.

---

### B.3 API Surface

#### B.3.1 New route file: `server/routes/tags.js`

Mounted at `/api/tags` in `server.js`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/tags` | List all tags (for autocomplete). Optional `?q=gro` for prefix filtering. |
| `POST` | `/api/tags` | Create a new tag (idempotent — if the lowercased name already exists, return the existing tag). |
| `DELETE` | `/api/tags/:id` | Delete a tag (cascades to `entry_tags`). |

#### `GET /api/tags`

**Query params:**
- `q` (optional) — prefix filter on `name_lower` for autocomplete. Returns tags whose `name_lower` starts with the query.

**Response:** `200`
```json
{
  "tags": [
    { "id": 1, "name": "Grocery", "created_at": "2026-07-01T..." },
    { "id": 2, "name": "Vacation", "created_at": "2026-07-05T..." }
  ]
}
```

**Without `q`:** returns all tags, ordered by `name_lower ASC`. Used to populate the full tag list for the tag-filtered report view.

**With `q`:** returns tags matching the prefix, ordered by `name_lower ASC`. Used for autocomplete as the user types.

#### `POST /api/tags`

**Request body:**
```json
{ "name": "Grocery" }
```

**Validation (Zod):**
```js
const createTagSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).trim(),
  }),
});
```

**Behavior:** Lowercase the input, check if a tag with that `name_lower` already exists. If yes, return the existing tag (`200`). If no, create a new tag and return it (`201`). This idempotency means the client can blindly call "create tag" when the user types a new tag name, without first checking if it exists.

**Success response:** `200` (existing) or `201` (new)
```json
{ "tag": { "id": 1, "name": "Grocery", "created_at": "..." } }
```

**Error responses:**
- `400` — validation error (empty name, exceeds 100 chars)

#### `DELETE /api/tags/:id`

**Success:** `200`
```json
{ "deleted": true, "id": 1 }
```

**Errors:**
- `404` — tag not found

#### B.3.2 Modified route: `server/routes/entries.js`

**`GET /api/entries`** — new optional query param: `tag_id`. When present, filters entries to those associated with the given tag.

**`GET /api/entries/:id`** — response now includes a `tags` array:
```json
{
  "entry": {
    "id": 1,
    "type": "expense",
    "amount": 50.00,
    ...
    "tags": [
      { "id": 1, "name": "Grocery" },
      { "id": 2, "name": "Vacation" }
    ]
  }
}
```

**`POST /api/entries`** — new optional field: `tag_ids: [1, 2]`. If provided, creates `entry_tags` rows linking the new entry to the specified tags.

**`PUT /api/entries/:id`** — new optional field: `tag_ids: [1, 3]`. If provided, replaces the entry's tag associations (delete all existing `entry_tags` for this entry, insert new ones). This is a full replacement, not a delta — the client sends the complete desired set of tag IDs.

**`GET /api/entries` (list)** — each entry in the list response now includes a `tags` array (same shape as `GET /api/entries/:id`). This adds a JOIN to the list query.

#### B.3.3 New aggregation endpoint: `GET /api/tags/report?from=YYYY-MM-DD&to=YYYY-MM-DD`

**Purpose:** Tag-filtered spending report — the AC's "dedicated tag-filtered report view, separate from the existing category-breakdown report." This is the tag equivalent of `getExpenseBreakdown` — a server-side aggregation grouped by tag, not a client-side filter over already-fetched data.

**Response:** `200`
```json
{
  "from": "2026-07-01",
  "to": "2026-07-31",
  "tags": [
    { "id": 1, "name": "Grocery", "total_amount": 12500.00, "entry_count": 8 },
    { "id": 2, "name": "Vacation", "total_amount": 4500.00, "entry_count": 3 }
  ]
}
```

**Query implementation (`getTagsReport` in `queries.js`):**

```js
const getTagsReport = async (from, to) => {
  // Fetch entry_tags joined with entries and tags, filtered by date range
  let query = supabase
    .from('entry_tags')
    .select(`
      tag_id,
      tags!inner(id, name),
      entries!inner(amount)
    `)
    .is('entries.deleted_at', null)  // CORRECTED during review: .eq(col, null) never matches
                                      // NULL in Supabase-js/PostgREST (translates to SQL `= NULL`,
                                      // which is always false) — .is() is required for NULL checks.
                                      // This matches getCalendarMonth's own .is('deleted_at', null)
                                      // two sections earlier in this same document; the original
                                      // draft here was inconsistent with it.
    .is('entries.transfer_group_id', null);  // exclude transfers

  if (from) query = query.gte('entries.date', from);
  if (to) query = query.lte('entries.date', to);

  const { data, error } = await query;
  if (error) throw error;

  // Aggregate by tag (JS reduce, same pattern as getExpenseBreakdown)
  const tagMap = {};
  for (const row of data) {
    const tagId = row.tag_id;
    if (!tagMap[tagId]) {
      tagMap[tagId] = {
        id: tagId,
        name: row.tags.name,
        total_amount: 0,
        entry_count: 0,
      };
    }
    tagMap[tagId].total_amount += row.entries.amount;
    tagMap[tagId].entry_count += 1;
  }

  return Object.values(tagMap).sort((a, b) => b.total_amount - a.total_amount);
};
```

**Design note — this mirrors `getExpenseBreakdown`'s pattern exactly:** fetch joined rows, aggregate in JS, return sorted array. The same `transfer_group_id IS NULL` and `deleted_at IS NULL` filters are applied. The only difference is grouping by `tag_id` instead of `category_id`.

---

### B.4 Client-Side Design

#### B.4.1 Tag input on entry forms

A new component: `client/src/components/entries/TagInput.jsx`

**Behavior:**
- Renders as a row of "chips" (selected tags) + a text input.
- As the user types in the input, autocomplete suggestions appear below (filtered from `GET /api/tags?q=...`).
- Selecting an existing tag adds it as a chip.
- Typing a name that doesn't match any existing tag and pressing Enter/comma creates a new tag via `POST /api/tags` and adds it as a chip.
- Each chip has an `×` button to remove it.
- When 5 tags are selected, the input is disabled with a "Max 5 tags" tooltip (soft cap — see Open Question 2).

**Integration points:**
- `AddEntry.jsx` (or wherever the entry creation form lives) — add `<TagInput>` below the category selector.
- `EditEntry.jsx` — add `<TagInput>` pre-populated with the entry's existing tags.

**Data flow on save:**
- `POST /api/entries` includes `tag_ids: [1, 2, 3]` in the request body.
- `PUT /api/entries/:id` includes `tag_ids: [1, 3]` (full replacement).

#### B.4.2 Tag display on entry rows

In `Entries.jsx` table view, each entry row shows up to 3 tag chips (with a "+N more" overflow indicator if >3). Tags are rendered as small colored badges — distinct from category badges in visual treatment (e.g., outlined style vs. filled style, or a different shape).

#### B.4.3 Tag-filtered report view

A new page or dashboard section: `client/src/pages/TagsReport.jsx` (or a tab within an existing Reports page if one exists).

**Layout:**
- Date range picker (from/to), same pattern as the existing dashboard date filters.
- Bar chart or sorted list of tags by total amount, same visual treatment as `getExpenseBreakdown`'s category breakdown.
- Tapping a tag filters the entries list by that tag: `GET /api/entries?tag_id=X`.

**Route:** `/reports/tags` (or integrated into an existing `/reports` route if one exists).

#### B.4.4 Navigation

Add a "Tags" link to the reports section of the navigation, or integrate into an existing Reports dropdown. The exact placement depends on the current nav structure — if there's a Reports page, add a tab; if not, add a nav item.

---

### B.5 FR Traceability — US-14

| BRD/AC Item | Design Element |
|---|---|
| Many-to-many tag relationship on entries | `tags` table + `entry_tags` join table (§B.2.1) |
| Freeform text, created on the fly | `POST /api/tags` with idempotent upsert behavior (§B.3.1) |
| Autocomplete of existing tags when typing | `GET /api/tags?q=...` prefix filter on `name_lower` (§B.3.1, §B.4.1) |
| Dedicated tag-filtered report view | `GET /api/tags/report` aggregation endpoint (§B.3.3) + `TagsReport.jsx` (§B.4.3) |
| Tag associations survive soft-delete/restore | `ON DELETE CASCADE` only fires on hard DELETE; soft-delete is UPDATE (§B.2.2) |

---

## Part C: Shared Concerns

### C.1 Function Impact List

#### New query functions to add (`server/db/queries.js`)

| # | Function | Purpose |
|---|----------|---------|
| N1 | `getCalendarMonth(month)` | Per-day aggregated totals for calendar grid (§A.3.2) |
| N2 | `getTags(q?)` | List all tags, optional prefix filter for autocomplete |
| N3 | `createTag(name)` | Idempotent tag creation (upsert on `name_lower`) |
| N4 | `deleteTag(id)` | Hard-delete a tag (cascades to `entry_tags`) |
| N5 | `getTagsReport(from, to)` | Tag-filtered spending aggregation (§B.3.3) |

#### Existing query functions that need changes

| # | Function | Change | Reason |
|---|----------|--------|--------|
| 1 | `getEntries` | Add `tag_id` filter support; include `tags` array in response | Tag filtering + display |
| 2 | `getEntryById` | Include `tags` array in response | Tag display on entry detail/edit |
| 3 | `createEntry` | Accept optional `tagIds` param, insert `entry_tags` rows | Tag assignment on creation |
| 4 | `updateEntry` | Accept optional `tagIds` param, replace `entry_tags` rows | Tag assignment on edit |
| 5 | `getEntriesForExport` | Include tags in export (comma-separated tag names column) | Export completeness |

#### Functions that need NO changes

| Function | Why safe |
|---|---|
| `getDashboardKPIs` | Tags don't affect income/expense totals — they're orthogonal to the type/amount aggregation |
| `getDashboardMoM` | Same |
| `getExpenseBreakdown` | Tags are a separate breakdown dimension, not a replacement for category breakdown |
| `getIncomeBreakdown` | Same |
| `getDashboardAccounts` | Tags don't affect per-account aggregation |
| `getAccountBalance` | Tags don't affect balance calculation |
| `restoreItem` | Tag associations survive soft-delete naturally (§B.2.2) — no special handling needed |
| `bulkDeleteEntries` | Same — soft-delete doesn't touch `entry_tags` |
| `purgeExpired` | Hard-delete cascades to `entry_tags` via FK — correct behavior, no code change needed |
| All budget functions | Unaffected |
| All recurrence functions | Unaffected |
| All transfer functions | Unaffected |

---

### C.2 Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | Calendar endpoint returns stale data if entries are added while viewing | Low | The calendar is a snapshot at render time. Refetching on month navigation is sufficient. If real-time updates are needed later, a refetch-on-focus pattern can be added. |
| R2 | Tag autocomplete flashes empty then populates (layout shift) | Low | The tag input should render with a fixed-height container for the dropdown, same pattern as the existing category/account selectors. |
| R3 | `GET /api/entries` with `tag_id` filter + pagination could return fewer than `per_page` results (entries without the tag are filtered out post-query) | Medium | The tag filter should be applied at the Supabase query level (`.in('id', entryIdsWithTag)`) after a subquery for tag membership, not as a post-fetch JS filter. This ensures pagination works correctly. |
| R4 | Race condition: two users create the same tag simultaneously | Low | The `UNIQUE (name_lower)` constraint catches this at the DB level. The second `INSERT` fails with a unique violation — the client retries as a GET and uses the existing tag. The idempotent `createTag` implementation handles this gracefully. |
| R5 | Calendar route ordering conflict with `/:id` | Medium | Explicitly specified in §A.3.3 — `/calendar` must be registered before `/:id`. This is a standard Express gotcha with a standard fix. |
| R6 | Tag report performance with very large entry counts | Low | Same JS-aggregation pattern as `getExpenseBreakdown` which already handles the full entry history. If performance becomes an issue, the migration path is an RPC function with SQL `GROUP BY`. |

---

### C.3 Build Order

| Step | File(s) | Description |
|---|---|---|
| 1 | `server/db/migrations/010_tags.sql` | Run migration to create `tags` + `entry_tags` tables |
| 2 | `server/db/queries.js` | Add `getCalendarMonth`, `getTags`, `createTag`, `deleteTag`, `getTagsReport`; patch `getEntries`, `getEntryById`, `createEntry`, `updateEntry`, `getEntriesForExport` |
| 3 | `server/routes/entries.js` | Add `GET /api/entries/calendar` route (before `/:id`); add `tag_id` query param support; include `tag_ids` in POST/PUT body handling |
| 4 | `server/routes/tags.js` | New route file: `GET /api/tags`, `POST /api/tags`, `DELETE /api/tags/:id`, `GET /api/tags/report` |
| 5 | `server/middleware/validate.js` | Add `calendarQuerySchema`, `createTagSchema` |
| 6 | `server/server.js` | Mount tags router at `/api/tags` |
| 7 | `client/src/lib/api.js` | Add calendar + tag API functions |
| 8 | `client/src/components/entries/CalendarView.jsx` | Month grid component with day cells, month navigation, tap-to-filter |
| 9 | `client/src/pages/Entries.jsx` | Add list/calendar toggle; integrate `CalendarView`; add tag display on entry rows |
| 10 | `client/src/components/entries/TagInput.jsx` | Tag input with autocomplete, chip display, create-on-enter |
| 11 | `client/src/pages/AddEntry.jsx` (or equivalent) | Integrate `TagInput` into entry creation form |
| 12 | `client/src/pages/EditEntry.jsx` (or equivalent) | Integrate `TagInput` into entry edit form |
| 13 | `client/src/pages/TagsReport.jsx` | Tag-filtered spending report page |
| 14 | `client/src/App.jsx` | Add `/reports/tags` route (or integrate into existing reports) |
| 15 | QA | Calendar: day-cell tap → correct date filter, tooltip dismiss persistence, month navigation across year boundaries, zero-fill for empty days. Tags: create, autocomplete, assign to entry, soft-delete/restore round-trip, tag report aggregation, delete tag cascades. |

---

### C.4 File Manifest

#### New files

| File | Purpose |
|---|---|
| `server/db/migrations/010_tags.sql` | Schema migration for tags + entry_tags |
| `server/routes/tags.js` | Tag CRUD + report API endpoints |
| `client/src/components/entries/CalendarView.jsx` | Month-grid calendar component |
| `client/src/components/entries/TagInput.jsx` | Tag input with autocomplete |
| `client/src/pages/TagsReport.jsx` | Tag-filtered spending report page |

#### Modified files

| File | Change summary |
|---|---|
| `server/db/queries.js` | Add 5 new functions; patch 5 existing functions (§C.1) |
| `server/routes/entries.js` | Add `/calendar` route; add `tag_id` filter; accept `tag_ids` in POST/PUT |
| `server/middleware/validate.js` | Add `calendarQuerySchema`, `createTagSchema` |
| `server/server.js` | Mount tags router |
| `client/src/lib/api.js` | Add calendar + tag API functions |
| `client/src/pages/Entries.jsx` | List/calendar toggle; tag display on rows |
| `client/src/pages/AddEntry.jsx` | Integrate `TagInput` |
| `client/src/pages/EditEntry.jsx` | Integrate `TagInput` |
| `client/src/App.jsx` | Add tags report route |

---

## Part D: Open Questions for Gino (G3)

### Q1. Tag name normalization — case-insensitive matching?

**Recommendation: Yes.** Store the display case as entered by the user (`name = 'Grocery'`), but enforce uniqueness and match autocomplete on a lowercased form (`name_lower = 'grocery'`). This prevents near-duplicate tags like "Grocery" and "grocery" from accumulating, while preserving the user's preferred capitalization for display.

**Tradeoff:** If two users intentionally want "Grocery" and "grocery" as distinct tags with different meanings, this design prevents that. In practice, this is almost certainly not a real use case for a household expense tracker.

**If rejected:** Remove the `name_lower` column and the `UNIQUE (name_lower)` constraint. The `name` column itself becomes the unique key with a case-sensitive collation. Autocomplete matches on `name ILIKE 'prefix%'` instead of `name_lower LIKE 'prefix%'`.

### Q2. Per-entry tag count limit?

**Recommendation: Soft cap of 5 tags per entry.** Enforced client-side only (disable the input at 5, show a tooltip). No database-level constraint. This keeps entry rows readable (3 visible chips + "+N more" overflow) without limiting power users who might want more.

**Tradeoff:** A soft cap means a determined user could bypass it (e.g., via API directly). If this is a concern, a CHECK constraint or trigger on `entry_tags` could enforce it at the DB level, but that adds complexity for a scenario that's unlikely in a household expense tracker.

**If rejected (unlimited):** Remove the client-side cap. The UI still shows max 3 chips per row with "+N more" overflow.

### Q3. Calendar first-use tooltip — localStorage or server-persisted?

**Recommendation: Server-persisted via `settings` table** (key: `calendar_view_tooltip_dismissed`). This follows the existing `first_launch_completed` and `last_used_account_id` pattern. Since the app already has multi-device usage via Supabase Auth, a localStorage-based dismissal would show the tooltip again when the user switches devices.

**Tradeoff:** Server-persisted means an extra Supabase query on first calendar render to check the setting. This is negligible (the app already does several Supabase queries on page load). The alternative (localStorage) is simpler but results in a redundant tooltip on the user's second device.

**If rejected (localStorage):** Replace the `getSetting`/`setSetting` calls with `localStorage.getItem('pondo_calendar_tooltip_dismissed')` / `localStorage.setItem(...)`. No migration needed.

---

*End of SAD for US-08 + US-14. Ready for G3 review.*
