# QA Report — Pondo Cloud Migration (SQLite → Supabase + Vercel)

**Gate:** G6 — QA / UAT Verification  
**Date:** 2026-07-13  
**Reviewer:** QA Engineer (`qa`)  
**Project:** Pondo Household Expense Tracker — Cloud Migration  
**Approved upstream:** BRD v1.0 approved by Gino (2026-07-13)

---

## Executive Summary

This report reviews the migration build output stored in `C:\Users\Friday\.openclaw\workspace-friday\pondo-build\output\`. The objective is to verify the correctness of the Supabase/Vercel migration against the checklist items provided in the G6 task and the migration BRD (`01-BRD-migration.md`).

### Verdict: ❌ FAIL (Conditional — must fix issues listed below)

The core migration output is largely correct and aligns with the approved BRD. However, one **P0-level functional regression** (getEntries pagination) and several **P1/P2 correctness/consistency issues** prevent a clean pass. The issues are documented below with clear instructions for dev remediation.

---

## Traceability

All checklist items map to the migration BRD sections:

- `§4.1 Server Files — Must Change`
- `§5 SQLite → PostgreSQL: Query Translation Catalog`
- `§6 Vercel Serverless Adapter Approach`
- `§7 Environment Variables`
- `§8 Risk Assessment`

---

## Checklist Results

| # | Checklist Item | BRD Ref | Status | Notes |
|---|----------------|---------|--------|-------|
| 1 | All 36 function names in `queries.js` match what routes import | §4.1 | ⚠️ PARTIAL | 36 async functions exist. Two original exports dropped (`deleteEntriesByCategory`, `getAccountBalance` in `accounts.js`), and one new export added (`getEntryCount`). `getCategories` route no longer receives `entry_count` field, risking UI regressions. |
| 2 | Supabase client uses `service_role` key (not anon key) for server-side | §7.1 | ✅ PASS | `supabase.js` only reads `SUPABASE_SERVICE_ROLE_KEY`. Correct. |
| 3 | `server.js` removed `express.static` and catch-all SPA route | §6.2 | ✅ PASS | Confirmed removed vs. original. |
| 4 | `server.js` has conditional `app.listen` | §6.2 | ✅ PASS | Wrapped in `if (process.env.NODE_ENV !== 'production')`. |
| 5 | `server.js` exports `app` | §6.2 | ✅ PASS | `module.exports = app;` present. |
| 6 | `api/index.js` imports and exports the Express app | §6.1 | ✅ PASS | `const app = require('../server/server'); module.exports = app;`. Note: does **not** use `@vercel/node` wrapper (BRD’s Option A text suggests it). Vercel’s Express adapter can work without it, but this is a deviation worth noting. |
| 7 | `vercel.json` rewrites `/api/*` to `api/index` and SPA routes to `index.html` | §6.3 | ✅ PASS | `rewrites` present and match BRD sample. |
| 8 | `error-handler.js` handles PG error codes (23503, 23505, etc.) | §4.1 | ✅ PASS | 23503, 23505, and 42P01 handled. |
| 9 | `package.json` removed `sqlite3/better-sqlite3`, added `@supabase/supabase-js` | §4.1 | ⚠️ PARTIAL | `sqlite3`/`better-sqlite3` removed; `@supabase/supabase-js` added. However, `scripts/migrate-data.js` still imports `sqlite3`, so `sqlite3` is now an undeclared dependency for migration. Must add it back as a dev/optional dependency or split migration package. |
| 10 | `.env.example` has `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | §7.1 | ✅ PASS | All three present. Also includes `BCRYPT_SALT_ROUNDS` and `PORT` for local dev. |
| 11 | `migrate-data.js` reads from SQLite, writes to Supabase, validates counts | §8 | ✅ PASS | Reads SQLite, upserts to Supabase, validates counts per table. |
| 12 | All route files use the correct function names from `queries.js` | §4.1 | ✅ PASS | Verified imports in `accounts.js`, `entries.js`, `categories.js`, `dashboard.js`, `export.js`, `system.js`, `auth.js`. All imported names are exported. |

---

## Detailed Findings

### Issue P0 — `getEntries` pagination no longer supports offset-only queries

**Severity:** P0 — Functional regression / data loss risk in list view  
**File:** `output/server/db/queries.js` (lines 386–440)  
**BRD trace:** §5.2 (`LIMIT / OFFSET`) and §4.1 (`queries.js` rewrite)

**Observation:**
The new Supabase implementation applies `.range()` only when `filters.offset` is truthy:

```js
if (filters.offset) {
  query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
}
```

Because `filters.offset` is calculated from `(page - 1) * per_page`, page 1 produces `offset = 0`, which is falsy. Therefore the first page request is sent without `.limit()`, causing Supabase to use its default page size (currently 1,000 rows) rather than the requested `per_page`. In addition, if the route ever sends `offset: 0` explicitly with a `limit`, the `range()` call is skipped entirely.

**Expected:**
```js
if (filters.limit || filters.offset !== undefined) {
  query = query.range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 10) - 1);
}
```

**Actual:**
`range()` skipped on page 1 (`offset = 0`).

**Recommendation (dev fix):**
Change the condition to `filters.limit !== undefined || filters.offset !== undefined` and default both values.

**Workaround for Gino:** None without code change; the Entries page may show the wrong number of rows on page 1.

---

### Issue P1 — `getCategories` no longer returns `entry_count`

**Severity:** P1 — UI regression  
**File:** `output/server/db/queries.js` (lines 222–235)  
**BRD trace:** §5.2 (`COUNT(*)`) and §4.1

**Observation:**
The original SQLite query joined `entries` and returned `COUNT(e.id) as entry_count`. The Supabase version selects only category columns and does not compute `entry_count`. If any UI component or downstream consumer (e.g., category delete confirmation, badges) reads `entry_count`, it will now be `undefined`.

**Expected:**
Return `entry_count` alongside each category, either by joining a count or by computing it.

**Actual:**
`entry_count` field is missing from returned rows.

**Recommendation (dev fix):**
Add a joined count or a second query to populate `entry_count`. Example using Supabase foreign-key count:

```js
const { data, error } = await supabase
  .from('categories')
  .select('..., entries(count)')
  ...
```

and then map to `entry_count: category.entries.length`.

---

### Issue P1 — `getDashboardKPIs` drops `total_balance`

**Severity:** P1 — API contract regression  
**File:** `output/server/db/queries.js` (lines 596–631)  
**BRD trace:** §5.3 (balance calculation logic), §3.2 (API contract must remain identical)

**Observation:**
The original SQLite implementation computed and returned `total_balance` (sum of per-account balances). The Supabase version returns only `total_income`, `total_expense`, and `net`. The `dashboard.js` route still references `total_balance` from the returned object (line 45), but the value is now `undefined`.

**Expected:**
```js
return {
  total_income: totalIncome,
  total_expense: totalExpense,
  net,
  total_balance // computed across accounts
};
```

**Actual:**
`total_balance` is missing.

**Recommendation (dev fix):**
Restore the total-balance computation. Query all accounts/entries or reuse the logic from `getDashboardAccounts` and sum the balances.

---

### Issue P1 — `deleteEntriesByCategory` exported but never used / missing route integration

**Severity:** P1 — Dead code / inconsistent API  
**File:** `output/server/db/queries.js` (lines 352–363)  
**BRD trace:** §4.1

**Observation:**
`queries.js` exports `deleteEntriesByCategory`, but the original `queries.js` did **not** export this function. No route file imports it. It appears to be unused scaffolding. Its presence increases the export count to 36 but has no functional route support.

**Expected:**
Either (a) remove `deleteEntriesByCategory` if it is not needed, or (b) add a route/migration flow that consumes it. The public API contract should remain unchanged.

**Recommendation (dev fix):**
Remove `deleteEntriesByCategory` unless a specific requirement justifies it.

---

### Issue P1 — `migrate-data.js` declares `sqlite3` dependency that is no longer in `package.json`

**Severity:** P1 — Runtime failure when running migration  
**File:** `output/scripts/migrate-data.js`, `output/server/package.json`  
**BRD trace:** §4.4 (files to remove / dependencies)

**Observation:**
The migration script does `const sqlite3 = require('sqlite3').verbose();` at line 7. `server/package.json` no longer lists `sqlite3` or `better-sqlite3`. If a user runs `node scripts/migrate-data.js` after a normal `npm install`, the script will throw `MODULE_NOT_FOUND`.

**Expected:**
Migration script dependencies must be installable.

**Recommendation (dev fix):**
Either:
1. Keep `sqlite3` as a `devDependency` in `server/package.json`, or
2. Add a separate `package.json` in `scripts/` that declares `sqlite3`, or
3. Document that the migration script must be run with `npm install sqlite3` first.

Option 1 is preferred for the monorepo structure.

---

### Issue P1 — `getEntryById` response shape changed (nested vs. flat)

**Severity:** P1 — API contract regression  
**File:** `output/server/db/queries.js` (lines 444–466)  
**BRD trace:** §3.2 (API contract unchanged)

**Observation:**
The original query returned flat columns such as `category_name`, `category_color`, `category_emoji`, `account_name`, `account_type`, `account_emoji`. The Supabase version returns nested objects:

```js
account: { id, name, type, emoji }
category: { id, name, type, color, icon }
```

The route `entries.js` simply wraps this in `{ entry }` and returns it. If the frontend (which is said to be unchanged) expects flat fields, the entry detail view will break.

**Expected:**
Return the same flat shape as the original, or explicitly update the frontend contract. Since the BRD states the frontend must not change, the backend must preserve the flat shape.

**Recommendation (dev fix):**
Map the Supabase nested result back to the original flat field names before returning.

---

### Issue P2 — `getEntries` `search` is case-insensitive (`ilike`) but no sanitization of SQL injection

**Severity:** P2 — Security / correctness  
**File:** `output/server/db/queries.js` (line 421)  
**BRD trace:** §5.2 (`ILIKE`)

**Observation:**
The code interpolates the search string directly:

```js
query = query.ilike('note', `%${filters.search}%`);
```

Supabase/PostgREST does not treat this as a parameterized query for the `%` wildcards — it constructs the pattern on the client side. While PostgREST prevents SQL injection, unescaped `%` or `_` characters in the search term will behave as wildcards, which may be surprising. More importantly, this pattern matches the original behavior and is not a migration regression, so severity is lower.

**Recommendation (dev fix):**
Escape `%` and `_` in `filters.search` if exact-substring search is intended.

---

### Issue P2 — `supabase.js` hardcodes PgBouncer port 6543 in client config

**Severity:** P2 — Deployment/config risk  
**File:** `output/server/db/supabase.js`  
**BRD trace:** §8 (PgBouncer recommendation)

**Observation:**
The Supabase JS client connects via PostgREST/REST API, not direct PostgreSQL. Setting `db.port: 6543` is unnecessary and may be misleading — the `@supabase/supabase-js` client does not open a raw TCP Postgres connection on that port. It uses the project URL over HTTPS. This is a benign but incorrect configuration.

**Recommendation (dev fix):**
Remove the `db: { port: 6543 }` block. Keep `auth: { persistSession: false }`.

---

### Issue P2 — `schema.js` exists as a compatibility shim, but filename is confusing

**Severity:** P2 — Maintenance / clarity  
**File:** `output/server/db/schema.js`  
**BRD trace:** §4.1

**Observation:**
The file now just re-exports `./supabase`. This satisfies compatibility, but the name `schema.js` implies it contains DDL. The BRD says "Replace with Supabase client initialization + a migration script (or Supabase-managed migrations)." Having a `schema.js` that is just the client init is acceptable but should be renamed to `client.js` or documented.

**Recommendation (dev fix):**
Either rename to `db/client.js` and update `queries.js` import, or add a code comment explaining the shim.

---

### Issue P2 — `getAccounts` balance sort performs N+1 queries

**Severity:** P2 — Performance  
**File:** `output/server/db/queries.js` (lines 4–52)  
**BRD trace:** §5.3, NFR-5

**Observation:**
When sorting accounts by balance, the implementation calls `getAccountBalance(account.id)` for every account (`Promise.all` over N accounts, each issuing a Supabase query). This is an N+1 pattern and may violate NFR-5 (dashboard ≤ 2s with 1,000 entries) if many accounts exist.

**Recommendation (dev fix):**
Fetch all entries once and compute balances in memory, or use a single RPC/aggregate query.

---

### Issue P2 — `getDashboardAccounts` ignores `from`/`to` parameters

**Severity:** P2 — API contract regression  
**File:** `output/server/db/queries.js` (lines 772–842)  
**BRD trace:** §3.2 (API contract)

**Observation:**
The function signature accepts `(from, to)` and the original implementation did not filter by date either, but the route in `dashboard.js` passes the current period range. The new implementation accepts the args but does not apply date filters to the entries query, so the dashboard account balances are lifetime balances rather than period balances. This may be intentional (lifetime balances are usually desired for accounts), but it differs from how the original SQL could be interpreted and should be confirmed with Gino.

**Recommendation (dev fix):**
Confirm intended behavior. If period-filtered account balances are required, apply `gte`/`lte` on `date` before aggregation.

---

## Correct Items (Evidence)

- **36 query functions exported:** counted via regex `^const \w+ = async` — result = 36.
- **Service role key only:** `supabase.js` reads `SUPABASE_SERVICE_ROLE_KEY`, throws if missing.
- **`server.js` Vercel-ready:** removed `express.static`, catch-all SPA route, conditional listen, exports `app`.
- **`api/index.js`:** correctly imports and exports app.
- **`vercel.json`:** matches BRD sample exactly (build command, output directory, two rewrites, function config).
- **Error handler:** handles `23503`, `23505`, `42P01` and generic `err.code` cases.
- **Route imports:** all imported query function names exist in `module.exports`.
- **Environment template:** contains required Supabase variables.
- **Migration script:** sequential table migration, boolean/null conversions, count validation.

---

## Defect Log

| ID | Severity | File(s) | Title | Repro Steps | Expected | Actual |
|----|----------|---------|-------|-------------|----------|--------|
| D-1 | P0 | `server/db/queries.js` | `getEntries` skips pagination on page 1 | Request `GET /api/entries?page=1&per_page=10` | Returns 10 rows | Returns up to Supabase default (1,000) rows |
| D-2 | P1 | `server/db/queries.js` | `getCategories` omits `entry_count` | Call `getCategories()` | Each category has `entry_count` | `entry_count` is `undefined` |
| D-3 | P1 | `server/db/queries.js` | `getDashboardKPIs` omits `total_balance` | Call `getDashboardKPIs()` | Returns `total_balance` | `total_balance` is `undefined` |
| D-4 | P1 | `server/db/queries.js` | Unused `deleteEntriesByCategory` export | Inspect exports | Only functions used by routes are exported | `deleteEntriesByCategory` is exported but unused |
| D-5 | P1 | `scripts/migrate-data.js`, `server/package.json` | Migration script dependency missing | Run `npm install` in `server/`, then `node ../scripts/migrate-data.js` | Migration runs | `MODULE_NOT_FOUND: sqlite3` |
| D-6 | P1 | `server/db/queries.js`, `server/routes/entries.js` | `getEntryById` returns nested account/category objects | Call `GET /api/entries/1` | Flat fields (`account_name`, `category_name`, etc.) | Nested `account`/`category` objects |
| D-7 | P2 | `server/db/queries.js` | Search wildcards not escaped | Search for a note containing `%` | Literal match | Wildcard behavior |
| D-8 | P2 | `server/db/supabase.js` | Incorrect PgBouncer port in REST client config | Inspect `supabase.js` | No `db.port` config (not used by REST client) | `db.port: 6543` |
| D-9 | P2 | `server/db/schema.js` | Misleading filename for client shim | Inspect file | File name reflects content | `schema.js` re-exports Supabase client |
| D-10 | P2 | `server/db/queries.js` | N+1 balance queries when sorting accounts by balance | Sort accounts by balance with many accounts | Single query or bounded queries | One query per account |
| D-11 | P2 | `server/db/queries.js` | `getDashboardAccounts` ignores date range | Request dashboard with date range | Account balances reflect range if required | Account balances are lifetime totals |

---

## UAT Script for Gino

**Prerequisites:**
1. `.env` file set with real `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
2. Supabase tables (`accounts`, `categories`, `entries`, `settings`) created via migration SQL.
3. Run `npm install` in `server/`. (Note: if running `scripts/migrate-data.js`, you must manually install `sqlite3` until D-5 is fixed.)
4. For local dev: `npm run dev` in `server/`.

### UAT Cases

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | `GET /api/health` | `200 { status: 'OK', timestamp: ... }` | |
| 2 | `POST /api/system/setup` with passphrase | Creates Cash account + 16 default categories | |
| 3 | `GET /api/categories` | 16 categories, each with `entry_count` (after D-2 fix) | |
| 4 | `POST /api/accounts` create a credit account | `201`, account returned | |
| 5 | `POST /api/entries` create an expense entry | `201`, entry returned with flat `account_name`, `category_name` (after D-6 fix) | |
| 6 | `GET /api/entries?page=1&per_page=5` | Exactly 5 entries returned (after D-1 fix) | |
| 7 | `GET /api/entries?page=2&per_page=5` | Next 5 entries returned | |
| 8 | `GET /api/dashboard?from=YYYY-MM-01&to=YYYY-MM-DD` | KPIs include `total_balance` (after D-3 fix), accounts list, charts | |
| 9 | `GET /api/export/entries?from=...&to=...` | CSV download with correct columns | |
| 10 | Delete an account with entries, choose "reassign" | Entries moved to target account | |
| 11 | Delete a non-default category with entries | Entries reassigned to "Other" category | |
| 12 | Run `node scripts/migrate-data.js` (if migrating old SQLite data) | Counts match, no errors (after D-5 fix) | |

**Pass criteria:** All steps above produce expected results, and no P0/P1 defects remain open.

---

## Recommendations

1. **Fix D-1 immediately** (pagination on page 1) — it affects the primary list view.
2. **Fix D-2 and D-3** to preserve the original API response shapes.
3. **Fix D-5** by adding `sqlite3` back to `server/package.json` as a `devDependency`, or create a migration-only package.
4. **Fix D-6** or explicitly update the frontend contract (not recommended per BRD).
5. **Remove or justify D-4** (`deleteEntriesByCategory`).
6. **Clean up D-8** (PgBouncer port) and **D-9** (schema.js naming) for maintainability.
7. **Address D-10 and D-11** before performance testing against NFR-5.

---

## Final Verdict

**Overall Status: ❌ FAIL — G6 gate cannot be cleared yet.**

**Rationale:**
- One P0 defect (D-1) breaks the entries list pagination on the first page.
- Four P1 defects (D-2, D-3, D-5, D-6) cause API contract regressions or runtime failures.
- Per G6 constraints, a PASS cannot be granted while P0/P1 defects are open.

**Next step:** Return this report to `dev` via `friday`. Re-test on fix. Once D-1 through D-6 are resolved and re-verified, the G6 gate may be reconsidered.
