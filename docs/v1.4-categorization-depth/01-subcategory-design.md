# US-13: One-Level Subcategory (self-referencing FK) — Design

**Story:** "One-level subcategory (self-referencing FK)" (`docs/recon/sprint-backlog.md` §3, v1.4, 3 pts).
**Source idea:** idea-pool F-4 (`docs/recon/idea-pool.md` #9) — optional subcategory per category, selectable at entry time, reportable independently. Extends existing flat-category FRs FR-14/FR-15. **Explicitly one level only** — a subcategory can never itself have subcategories.
**Scope:** additive only. No existing column, endpoint, or row is removed or restructured.

---

## 1. Schema decision

**Self-referencing FK on `categories`, not a separate `subcategories` table.**

```sql
-- 015_category_subcategories.sql (new file — see §5)
ALTER TABLE public.categories
  ADD COLUMN parent_category_id BIGINT REFERENCES public.categories(id) ON DELETE RESTRICT,
  ADD CONSTRAINT categories_parent_not_self CHECK (parent_category_id IS NULL OR parent_category_id <> id);

CREATE INDEX idx_categories_parent_id ON public.categories(parent_category_id);
```

**Why not a `subcategories` table:** a subcategory needs the exact same columns as a category (name, color, icon, sort_order, type) and must be selectable directly on `entries.category_id` (FR requires it "reportable independently," i.e. its own row in breakdowns). A separate table would force `entries` to carry two nullable FK columns (`category_id` + `subcategory_id`) and double every aggregation/join in `queries.js`. Self-FK means a subcategory *is* a `categories` row — `entries.category_id` (line 42, `server/db/migration.sql`) needs zero changes, and it already resolves via the existing `category:categories(...)` embeds throughout `queries.js`.

**Why `ON DELETE RESTRICT` (not CASCADE / SET NULL):** cascading would silently delete subcategories (and orphan their entries' `category_id` via the existing `entries.category_id ... ON DELETE SET NULL`) the moment someone deletes a parent. The app layer blocks that scenario before it reaches the DB (§3, DELETE), so RESTRICT is defense-in-depth, not the primary guard.

**One-level enforcement — app layer, not a DB trigger.** Whether a parent is itself a subcategory requires reading a *different* row's `parent_category_id`, which a single-row `CHECK` constraint cannot express (Postgres CHECK constraints only see the row being written). This project's existing category business rules (default-category delete guard, `HAS_ENTRIES` reassignment) already live in `server/routes/categories.js` / `server/db/queries.js`, not in triggers — the transfer RPCs are the one trigger-adjacent exception, and those exist for atomic dual-row *writes*, not validation. Matching the existing convention, one-level nesting is enforced in `createCategory`/`updateCategory`. The only invariant a same-row `CHECK` *can* express — a category can't be its own parent — is added as `categories_parent_not_self` above, as a second line of defense.

## 2. API surface — same CRUD, `parent_category_id` rides along

No new endpoints. `GET/POST/PUT/DELETE /api/categories(/:id)` all gain one optional field.

**`GET /api/categories?type=expense|income`** — response rows gain two fields, both computed the same way `entry_count` already is (via a joined count, `server/db/queries.js:339-364`):
```json
{
  "id": 12, "name": "Clothes", "type": "expense", "color": "#3B82F6", "icon": "👕",
  "is_default": false, "sort_order": 0,
  "parent_category_id": 4,
  "child_count": 0,
  "entry_count": 7
}
```
- `parent_category_id`: `null` for top-level categories.
- `child_count`: direct-children count, via `children:categories!categories_parent_category_id_fkey(count)` embed (same self-join pattern as `entries(count)`) — lets the frontend know a category has subcategories without a second round trip, and lets the picker/management UI block "convert to subcategory" client-side before the API rejects it.
No new query params (e.g. no `?parent_id=`) — the endpoint still returns the full flat list per `type`; both `Categories.jsx` and `AddEntry.jsx`/`EditEntry.jsx` already fetch the full list once and filter/group client-side (existing pattern), so a tree is built in memory, not on the server.

**`POST /api/categories`** — body gains optional `parent_category_id`:
```json
{ "name": "Clothes", "type": "expense", "color": "#3B82F6", "icon": "👕", "parent_category_id": 4 }
```
`createCategorySchema` (`server/middleware/validate.js`) adds `parent_category_id: z.number().int().positive().optional()`.
Business validation in `createCategory` (queries.js), executed before insert:
| Condition | Response |
|---|---|
| `parent_category_id` given but no category with that id exists | `400 { error: { code: 'INVALID_PARENT', message: 'Parent category not found.' } }` |
| Parent exists but `parent.parent_category_id IS NOT NULL` (parent is itself a subcategory) | `400 { error: { code: 'INVALID_PARENT', message: 'Cannot nest a subcategory under another subcategory.' } }` |
| Parent exists, top-level, but `parent.type !== body.type` | `400 { error: { code: 'PARENT_TYPE_MISMATCH', message: 'Subcategory type must match its parent category type.' } }` |
| All checks pass | `201` with the row shape from §2 above (`parent_category_id` echoed, `child_count: 0`) |

**`PUT /api/categories/:id`** — body gains optional, **nullable** `parent_category_id` (`z.number().int().positive().nullable().optional()`): omit = leave unchanged (matches existing `color`/`icon` partial-update behavior at `categories.js:79-83`); explicit `null` = promote back to top-level (always allowed, no checks); explicit positive int = attempt to (re)parent.
Validation, only when a non-null `parent_category_id` is present in the body:
| Condition | Response |
|---|---|
| `parent_category_id === existingCategory.id` | `400 INVALID_PARENT` — "A category cannot be its own parent." |
| Target parent not found | `400 INVALID_PARENT` — "Parent category not found." |
| Target parent itself has a non-null `parent_category_id` | `400 INVALID_PARENT` — "Cannot nest a subcategory under another subcategory." |
| Target parent's `type` ≠ this category's existing `type` (type is not editable today — no `type` field in `updateCategorySchema`) | `400 PARENT_TYPE_MISMATCH` |
| This category already has ≥1 row with `parent_category_id = this.id` (i.e. it currently has its own subcategories) | `400 { code: 'HAS_SUBCATEGORIES', message: 'Cannot convert to a subcategory: this category already has its own subcategories.' }` |
`updateCategory` needs a new helper, `getSubcategoryCount(id)` (mirrors `getCategoryEntryCount`), for the last check.

**`DELETE /api/categories/:id`** — one new precondition, checked before the existing `is_default` / entry-reassignment logic in `categories.js:91-127`:
1. `getSubcategoryCount(id) > 0` → `409 { code: 'HAS_SUBCATEGORIES', message: 'This category has N subcategories. Delete or reassign them first.' }` — mirrors the existing `HAS_ENTRIES` 409 pattern exactly.
2. Existing `is_default` (`403 FORBIDDEN`) and entry-count checks proceed unchanged, **except** the reassignment target when entries exist:
   - If `existingCategory.parent_category_id IS NULL` (deleting a top-level category — already guaranteed zero children by step 1): unchanged — reassign to `getFallbackCategory(type)`, same as today.
   - If `existingCategory.parent_category_id IS NOT NULL` (deleting a subcategory): reassign its entries to **its own parent** (`existingCategory.parent_category_id`), not the type's global fallback. Deleting "Clothes" under "Shopping" should fold those entries up into "Shopping," not sideways into "Other." No fallback-existence check is needed here — the parent is guaranteed to exist by referential integrity.

## 3. Entry-time selection (`AddEntry.jsx` / `EditEntry.jsx`)

Current picker is a single flat `<select>` built from `getCategories(type)` (`AddEntry.jsx:208-221`) — no existing nested-picker component to reuse (confirmed via `Categories.jsx`, which is a flat card grid). Decision: keep a native `<select>`, build two visual levels from the same flat response client-side using `<optgroup>`:

- For each top-level category (`parent_category_id === null`) in sort order: render it as its own `<option value={parent.id}>` (a user can log against "Shopping" directly, with no subcategory — must remain possible, matches today's behavior for existing entries).
- Immediately after, if `child_count > 0`, render an `<optgroup label={parent.name}>` containing one `<option value={child.id}>` per subcategory (grouped by `parent_category_id === parent.id`), each icon-prefixed like today's options. (Native `<optgroup>` is a label wrapper, not a real nesting level — this is the correct native-HTML two-level presentation, not a custom dropdown.)
- No new API call: subcategories are already present in the same `getCategories(type)` array already being fetched at `AddEntry.jsx:36-38`; the grouping is a client-side `.reduce` keyed on `parent_category_id`.

**`Categories.jsx` (management page):** add an optional "Parent category" `<select>` to both the add form and edit modal, populated with top-level categories of the matching `type` only (client-filters the already-fetched list by `parent_category_id === null`), defaulting to "None." On the display grid, render each top-level category's card, followed by an indented list of its subcategories directly beneath it (grouped, not flattened as sibling peers) — same client-side grouping logic as the entry picker.

## 4. Reporting impact — explicit roll-up rule

`getExpenseBreakdown` / `getIncomeBreakdown` (`server/db/queries.js:1131-1229`) group strictly by `entry.category_id` today — that behavior is untouched and is exactly what makes a subcategory appear **as its own row** (no code change needed for that half; a subcategory is a real `categories` row with its own id/name/color/icon).

The **roll-up** half is new and must be explicit to avoid the ambiguity this project has hit before:

- **Top-level rows always show the fully rolled-up total** — a parent category's `total_amount` = sum of its own direct entries **plus** the summed `total_amount` of all its subcategories. This keeps top-level totals reconciling to the whole period total (what the dashboard pie/bar chart already assumes).
- **Subcategory rows show only their own direct total** (nothing to roll further at one level) and now carry `parent_category_id`, so the frontend can render them as an indented drill-down row under their parent.

Implementation shape for `queries.js` (both breakdown functions, same change):
1. Select `categories(id, name, type, color, icon, parent_category_id)` in the join (adds one column to the existing embed).
2. Build `categoryMap` exactly as today — one entry per `category_id` that has ≥1 matching row, each now also carrying `parent_category_id`.
3. **New backfill pass:** collect `parent_category_id` values referenced by any row in `categoryMap` that are *not themselves already a key* in `categoryMap` (a parent with zero direct entries but a subcategory that does have entries). Issue one extra query, `supabase.from('categories').select('id,name,color,icon').in('id', missingParentIds)`, and seed synthetic zero-total rows for them before the next step. (Only fires when this specific case occurs — not on every call.)
4. **Roll-up pass:** for every row with a non-null `parent_category_id`, add its `total_amount` into `categoryMap[parent_category_id].total_amount`.
5. Return `Object.values(categoryMap)` as today, now including `parent_category_id` on every row.

**No change needed** to `getDashboardKPIs` (sums by `type` only, category-agnostic) or to `getEntries`/`getEntryById`/`getRecentEntries`/`getEntriesForExport` totals — a subcategory's `category_id` already flows through those functions unchanged. Cosmetic-only addition for those list endpoints: expose `category_parent_name` (parent's name, `null` if the entry's category is top-level) so the frontend can render a "Shopping ▸ Clothes" breadcrumb. Requires embedding the self-join with an explicit FK-name hint (PostgREST needs disambiguation for a self-referencing embed): `parent:categories!categories_parent_category_id_fkey(name)`.

## 5. Migration file

**`server/db/migrations/015_category_subcategories.sql`** (next number after `014_balance_adjustment_categories.sql`). Full contents:

```sql
-- ============================================================
-- Migration: 015_category_subcategories
-- Story: US-13 — One-level subcategory (self-referencing FK) (v1.4)
-- Run against: Supabase Postgres
--
-- Adds an optional one-level subcategory under any category via a
-- nullable self-referencing FK on categories. Purely additive on an
-- existing table — no new table (see RLS note below).
--
-- "One level only" (no grandnesting) cannot be expressed as a single-row
-- CHECK constraint (it requires reading the PARENT row's own
-- parent_category_id) and is enforced at the application layer in
-- server/db/queries.js (createCategory/updateCategory), matching this
-- project's existing convention of enforcing category business rules
-- in the route/query layer rather than DB triggers.
--
-- The same-row self-parent case (parent_category_id = id) IS expressible
-- as a row-level CHECK and is enforced here as defense-in-depth.
--
-- ON DELETE RESTRICT (not CASCADE, not SET NULL): a category with
-- existing subcategories must not be deletable until its subcategories
-- are reassigned/deleted first. The app layer blocks this before it
-- reaches the DB (HAS_SUBCATEGORIES check) — RESTRICT is the second
-- line of defense if that check is ever bypassed.
--
-- Rollback: ALTER TABLE public.categories DROP COLUMN parent_category_id;
--           (safe only if no rows have it set yet)
-- ============================================================

BEGIN;

ALTER TABLE public.categories
  ADD COLUMN parent_category_id BIGINT REFERENCES public.categories(id) ON DELETE RESTRICT,
  ADD CONSTRAINT categories_parent_not_self CHECK (parent_category_id IS NULL OR parent_category_id <> id);

CREATE INDEX idx_categories_parent_id ON public.categories(parent_category_id);

COMMIT;
```

**Not applied here** — file only, per instructions; applying to production Supabase is a separate step.

## 6. RLS

**No new table is created — `categories` already exists with its current RLS posture** (it is not among the tables that shipped without RLS and needed a follow-up fix: that gap hit `budgets`/`recurrences` (`006_security_hardening_rls_and_rpc_grants.sql`) and `tags`/`entry_tags` (`011_enable_rls_tags.sql`), three times so far per `artifacts/milestone-log.md`). Adding a nullable column and two constraints to an existing table does not change its RLS enablement or require any new policy. No RLS action is needed or included in `015_category_subcategories.sql`.

## 7. Traceability

| Requirement | Satisfied by |
|---|---|
| Optional one-level subcategory per category | `parent_category_id` self-FK (§1) + `categories_parent_not_self` CHECK + app-layer nesting-depth guard in `createCategory`/`updateCategory` (§2) |
| Subcategory cannot itself have subcategories | `INVALID_PARENT` check on POST/PUT (parent must be top-level) + `HAS_SUBCATEGORIES` check on PUT (can't demote a category with children into a subcategory) (§2) |
| Selectable at entry time | No `entries` schema change needed — `category_id` already accepts any `categories.id`, including subcategories; `<optgroup>` two-level picker in `AddEntry.jsx`/`EditEntry.jsx` (§3) |
| Reportable independently | Subcategories appear as their own row in `getExpenseBreakdown`/`getIncomeBreakdown` unchanged (§4) |
| (Implied, decided here) Parent totals stay whole-reconciling | Roll-up pass folding subcategory totals into parent rows (§4) |
| Nothing existing removed/restructured | Purely additive column + constraints; zero changes to `entries` table; existing CRUD/behavior for top-level-only categories is unchanged when `parent_category_id` is never set |

## 8. Build order

1. Migration `015_category_subcategories.sql` (schema first, everything else depends on the column existing).
2. `server/middleware/validate.js` — add `parent_category_id` to `createCategorySchema` / `updateCategorySchema`.
3. `server/db/queries.js` — `getSubcategoryCount`, parent-validation logic in `createCategory`/`updateCategory`, updated `getCategories`/`getCategoryById` select (add `parent_category_id`, `child_count` embed), updated `getExpenseBreakdown`/`getIncomeBreakdown` roll-up logic, conditional reassignment target in the delete flow.
4. `server/routes/categories.js` — wire the new `HAS_SUBCATEGORIES`/`INVALID_PARENT`/`PARENT_TYPE_MISMATCH` error responses; branch delete-reassignment target.
5. `client/src/lib/api.js` (if it types/shapes category payloads) — pass through `parent_category_id` on create/update calls.
6. `client/src/pages/Categories.jsx` — parent-category selector on add/edit forms; grouped display.
7. `client/src/pages/AddEntry.jsx` / `EditEntry.jsx` — `<optgroup>` two-level picker.
8. Dashboard breakdown chart component(s) consuming `getExpenseBreakdown`/`getIncomeBreakdown` — use new `parent_category_id` field for drill-down rendering (optional polish, not required for the roll-up numbers to be correct).

---
*Proposal pending Gate G3 (Gino) approval — no code written against this design until approved.*
