# Business Requirements Document — Cloud Migration
**Project:** Pondo Household Expense Tracker — SQLite→Supabase + Vercel Migration  
**Author:** analyst · **Version:** 1.0 · **Date:** 2026-07-13 · **Gate:** G0 (Discovery)

---

## 1. Problem Statement

Pondo currently runs as a self-hosted Express + SQLite monolith: the Express server serves both the API and the built React frontend from a single process on a single machine. This works for a single user on localhost, but it has no path to multi-device access, no off-machine backup, and no resilience against machine failure. Gino wants to move Pondo to the cloud so he can access it from any device, share it with household members later, and not worry about losing data if his laptop dies.

The migration target is:
- **Frontend:** Vercel (static hosting + serverless functions for the API)
- **Database:** Supabase PostgreSQL (managed, with a provisioned project at `https://csuadlwjhxelwjjgzajb.supabase.co`)
- **Domain:** `ginovalera.com` (Cloudflare registrar, will point to Vercel)

This BRD defines the scope of changes, file-by-file impact, risks, and deployment order — without prescribing implementation details (that's the architect's job at G3).

---

## 2. Goals & Success Criteria

- **Goal:** Migrate Pondo from a local SQLite/Express monolith to a cloud-hosted Supabase + Vercel stack with zero functional regression.
- **Success looks like (measurable):**
  - All 27 functional requirements from the v2 BRD pass on the cloud stack.
  - All 13 non-functional requirements are satisfied (with NFR-12 updated from "self-hosted" to "cloud-hosted").
  - Passphrase auth (X-App-Passphrase header + bcrypt) continues to work identically.
  - The frontend API client (`/api` base path) works without changes to the client code.
  - CSV export (entries + accounts) produces identical output.
  - Dashboard loads in ≤ 2 seconds with 1,000 entries (NFR-5).
  - No data loss during migration — all existing entries, accounts, categories, and settings are preserved.

---

## 3. Scope of Changes

### 3.1 What Changes

| Layer | From | To | Impact |
|-------|------|----|--------|
| **Database** | SQLite (file-based, `better-sqlite3` + `sqlite3` npm packages) | Supabase PostgreSQL (managed, accessed via `@supabase/supabase-js` or `pg` + `knex`) | **High.** All 30+ query functions in `db/queries.js` must be rewritten. SQL dialect differences (datetime functions, `ON CONFLICT`, `lastID`, autoincrement). |
| **Server runtime** | Express long-running process (`server.js` → `app.listen()`) | Vercel serverless functions (one function per route file, or a single Express adapter) | **High.** Express must be adapted to Vercel's serverless model. No persistent in-memory state. Cold starts. |
| **Static serving** | Express serves `dist/` from `server/dist/` | Vercel serves the built React app natively | **Low.** Vite already builds to `dist/`. Vercel auto-detects Vite projects. |
| **Auth** | bcrypt hash comparison in Express middleware | Same logic, runs in serverless function | **Low.** bcrypt is pure JS (no native deps). Works in serverless. |
| **Environment** | `.env` file with `PORT`, `DB_PATH` | Vercel environment variables + Supabase connection string | **Medium.** New env vars needed. No more `DB_PATH` (no file path). |
| **Deployment** | Manual `node server.js` | `vercel deploy` (or Git-push auto-deploy) | **New.** Deployment pipeline from scratch. |

### 3.2 What Does NOT Change

| Component | Why unchanged |
|-----------|---------------|
| **Frontend React code** | The API client already uses `/api` as base. Vercel rewrites will proxy `/api/*` to serverless functions. No client code changes needed. |
| **API contract** | All route paths, request/response shapes, status codes, and error formats remain identical. The frontend must not know the database changed. |
| **Passphrase auth flow** | `X-App-Passphrase` header + bcrypt comparison. The auth middleware logic is database-agnostic (it reads from `settings` table). |
| **Zod validation schemas** | All validation middleware is database-agnostic. No changes needed. |
| **CSV export format** | Column order, headers, and escaping logic are unchanged. |
| **Category defaults** | The 16 default categories (10 expense + 6 income) seeded on first launch are unchanged. |
| **Account type enum** | `debit`, `credit`, `lent`, `borrowed`, `invest` — unchanged. |
| **Vite config** | The `proxy` config is dev-only. Vercel handles routing in production. The `build.outDir` pointing to `../server/dist` may need adjustment for Vercel's default `dist/` output. |

---

## 4. File-by-File Impact Analysis

### 4.1 Server Files — Must Change

| File | Current Role | Migration Impact | Severity |
|------|-------------|------------------|----------|
| **`server/db/schema.js`** | Creates SQLite connection, defines tables, creates indexes, runs `PRAGMA foreign_keys = ON` | **Rewrite.** Replace with Supabase client initialization + a migration script (or Supabase-managed migrations). Table DDL must be ported to PostgreSQL syntax. `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY` or `BIGINT GENERATED ALWAYS AS IDENTITY`. `CHECK` constraints are portable. `datetime('now')` → `NOW()`. `PRAGMA` is SQLite-only — foreign keys are enforced by default in PostgreSQL. | **CRITICAL** |
| **`server/db/queries.js`** | ~750 lines of callback-style SQLite queries (30+ exported functions) | **Rewrite.** All queries must be ported to PostgreSQL. Key differences: (a) `db.all()` / `db.get()` / `db.run()` callback pattern → `pg` pool query or Supabase client; (b) `this.lastID` → `RETURNING id`; (c) `ON CONFLICT(key) DO UPDATE` (SQLite extension) → PostgreSQL native `ON CONFLICT ... DO UPDATE` (syntax is compatible); (d) `datetime('now')` → `NOW()`; (e) `||` for concatenation → same in PG but beware of NULL handling; (f) `LIKE` is case-sensitive in PG vs case-insensitive in SQLite — may need `ILIKE` for search. | **CRITICAL** |
| **`server/server.js`** | Express app creation, middleware registration, `app.listen()` | **Modify.** Must export the Express app (not start listening) for Vercel serverless adapter. The `app.listen(PORT)` block becomes conditional (`if (require.main === module)` or removed). Static file serving (`express.static`) is removed — Vercel handles that. The catch-all `app.get('*')` for SPA routing is removed — Vercel handles that via `vercel.json` rewrites. | **HIGH** |
| **`server/package.json`** | Dependencies: `better-sqlite3`, `sqlite3`, `bcrypt`, `express`, `cors`, `dotenv`, `zod` | **Modify.** Remove `better-sqlite3` and `sqlite3`. Add `@supabase/supabase-js` (or `pg` + `knex`). `bcrypt`, `express`, `cors`, `dotenv`, `zod` stay. Add `@vercel/node` if using Vercel's Express adapter. | **HIGH** |
| **`server/routes/entries.js`** | Entry CRUD routes with inline `dbGet()` helper for raw SQLite lookups | **Modify.** The inline `dbGet()` helper (lines 18–20) uses `db.get()` from the SQLite connection — must be replaced with a Supabase/PG query helper. The route logic (validation, business rules like "date not in future", "category type must match entry type") is unchanged. | **MEDIUM** |
| **`server/routes/system.js`** | Setup, status, settings, passphrase management with inline `dbGet()`, `dbAll()`, `dbRun()` helpers | **Modify.** Same as entries.js — inline SQLite helpers must be replaced. The `DEFAULT_CATEGORIES` constant and seeding logic is unchanged. The `bcrypt.hashSync()` calls are unchanged. | **MEDIUM** |
| **`server/routes/accounts.js`** | Account CRUD with reassign/cascade-delete resolution | **LOW.** No inline SQLite calls — all DB access goes through `db/queries.js`. Route logic is unchanged. | **LOW** |
| **`server/routes/categories.js`** | Category CRUD with fallback reassignment on delete | **LOW.** No inline SQLite calls. Route logic is unchanged. | **LOW** |
| **`server/routes/dashboard.js`** | Dashboard aggregation endpoint | **LOW.** No inline SQLite calls. Route logic is unchanged. | **LOW** |
| **`server/routes/export.js`** | CSV export endpoints | **LOW.** No inline SQLite calls. CSV generation logic is unchanged. | **LOW** |
| **`server/middleware/auth.js`** | Passphrase verification via `getSetting('passphrase_hash')` + `bcrypt.compareSync()` | **LOW.** Only DB call is `getSetting()` — already abstracted through `db/queries.js`. bcrypt is pure JS. | **LOW** |
| **`server/middleware/validate.js`** | Zod schemas for all routes | **NONE.** Pure validation, no DB dependency. | **NONE** |
| **`server/middleware/error-handler.js`** | Global error handler with SQLite-specific error handling | **Modify.** The `err.name === 'SqliteError'` block must be replaced with PostgreSQL error handling (`err.code` patterns like `23503` for FK violation, `23505` for unique violation). | **MEDIUM** |

### 4.2 Client Files — May Need Minor Changes

| File | Current Role | Migration Impact | Severity |
|------|-------------|------------------|----------|
| **`client/vite.config.js`** | Dev server proxy to `localhost:3001`, build output to `../server/dist/` | **Modify.** Change `build.outDir` from `../server/dist` to `dist` (Vercel default). The `server.proxy` config is dev-only and can stay. | **LOW** |
| **`client/package.json`** | Client dependencies (React, Vite, Recharts, etc.) | **NONE.** No server-side deps here. Note: `better-sqlite3` and `express` are listed as client deps but are unused on the client side — they should be removed (cleanup, not migration-blocking). | **LOW** |
| **`client/src/lib/api.js`** | API client with `API_BASE = '/api'` | **NONE.** The `/api` base path works with Vercel rewrites. No changes needed. | **NONE** |

### 4.3 New Files Needed

| File | Purpose |
|------|---------|
| **`vercel.json`** (root) | Vercel deployment config: build settings, rewrites (`/api/*` → serverless functions), environment variable declarations, SPA fallback routing. |
| **`api/` directory** (root) | Vercel serverless functions directory. Each file in `api/` becomes an endpoint. Options: (a) one `api/index.js` that imports the Express app via `@vercel/node` helper, or (b) split into `api/accounts.js`, `api/entries.js`, etc. |
| **Supabase migration file(s)** | SQL DDL to create tables, indexes, and seed default categories. Can be managed via Supabase CLI (`supabase migration new`) or a manual `init.sql`. |
| **`.env.example` (updated)** | New variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (for migrations), `DATABASE_URL` (if using direct PG connection). Remove `DB_PATH`. |

### 4.4 Files to Remove

| File | Reason |
|------|--------|
| `server/data/` directory | SQLite database files. Supabase replaces this. |
| `server/db/schema.js` (old) | Replaced by Supabase migration + client init. |
| `server/db/queries.js` (old) | Replaced by Supabase/PG query layer. |

---

## 5. SQLite → PostgreSQL: Query Translation Catalog

This section catalogs every SQL pattern in `db/queries.js` and its PostgreSQL equivalent. The architect uses this as a checklist.

### 5.1 DDL (schema.js)

| SQLite | PostgreSQL | Notes |
|--------|-----------|-------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` or `BIGINT GENERATED ALWAYS AS IDENTITY` | `SERIAL` is simpler and sufficient for this scale. |
| `REAL` | `REAL` or `DOUBLE PRECISION` or `NUMERIC(12,2)` | `NUMERIC(12,2)` is preferred for currency to avoid floating-point drift. |
| `TEXT` | `TEXT` | Identical. |
| `BOOLEAN` | `BOOLEAN` | SQLite stores as 0/1; PG has native boolean. |
| `DATETIME DEFAULT CURRENT_TIMESTAMP` | `TIMESTAMPTZ DEFAULT NOW()` | PG's `NOW()` includes timezone. |
| `CHECK(type IN (...))` | `CHECK(type IN (...))` | Identical syntax. |
| `PRAGMA foreign_keys = ON` | Not needed | PG enforces FKs by default. |
| `CREATE INDEX IF NOT EXISTS` | `CREATE INDEX IF NOT EXISTS` | Identical syntax. |
| `ALTER TABLE ... ADD COLUMN` (migration) | `ALTER TABLE ... ADD COLUMN` | Identical syntax. |

### 5.2 Queries (queries.js)

| Pattern | SQLite | PostgreSQL | Notes |
|---------|--------|-----------|-------|
| **Get last inserted ID** | `this.lastID` (from `db.run` callback) | `RETURNING id` clause in INSERT | `INSERT INTO ... RETURNING id` — cleaner, no callback needed. |
| **Upsert** | `INSERT ... ON CONFLICT(key) DO UPDATE SET value = excluded.value` | Same syntax | PostgreSQL native. Compatible. |
| **Current timestamp** | `datetime('now')` / `CURRENT_TIMESTAMP` | `NOW()` | PG's `CURRENT_TIMESTAMP` also works. |
| **String concatenation** | `\|\|` | `\|\|` | Same, but PG returns NULL if any operand is NULL. Use `COALESCE(x, '')` where needed. |
| **LIKE (case-insensitive)** | `LIKE` (SQLite is case-insensitive by default for ASCII) | `ILIKE` | PG's `LIKE` is case-sensitive. Use `ILIKE` for search. |
| **COALESCE** | `COALESCE(...)` | `COALESCE(...)` | Identical. |
| **CASE WHEN** | `CASE WHEN ... THEN ... ELSE ... END` | Same | Identical. |
| **GROUP BY** | `GROUP BY` | `GROUP BY` | PG is stricter: every non-aggregated column in SELECT must appear in GROUP BY. The current queries already do this correctly. |
| **LIMIT / OFFSET** | `LIMIT ? OFFSET ?` | `LIMIT $1 OFFSET $2` | Parameter placeholders differ: `?` → `$1, $2, ...` |
| **COUNT(*)** | `COUNT(*)` | `COUNT(*)` | Identical. |
| **SUM with COALESCE** | `COALESCE(SUM(...), 0)` | Same | Identical. |
| **Date filtering** | `date >= ?` (text comparison, YYYY-MM-DD) | `date >= $1::date` | PG can compare TEXT to DATE with casting. Safer to cast explicitly. |
| **ORDER BY with dynamic column** | Template literal `` ORDER BY ${orderBy} ${order} `` | Parameterized or whitelist | **Security risk.** Dynamic ORDER BY cannot use parameterized queries in PG either. Must whitelist column names. Same issue exists in current code — not a migration regression. |

### 5.3 Balance Calculation Logic

The balance calculation logic (switch on account type: debit/invest = income − expense, credit/lent = expense − income, borrowed = income − expense) is **pure application logic** — it runs in JavaScript after the query returns. This logic is unchanged. The only change is the SQL that fetches the raw `total_income` and `total_expense` aggregates.

### 5.4 Settings Key-Value Store

The `settings` table is a simple key-value store. The upsert pattern (`INSERT ... ON CONFLICT DO UPDATE`) is natively supported in PostgreSQL. No logic change needed.

---

## 6. Vercel Serverless Adapter Approach

### 6.1 Recommended Approach: Single Express Adapter

**Option A — Single `api/index.js` (recommended):**

Use `@vercel/node` to wrap the entire Express app as a single serverless function:

```
api/
  index.js   ← imports app from ../server/server.js, exports via @vercel/node
```

`vercel.json` rewrites:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" }
  ]
}
```

**Pros:** Minimal refactoring of route files. All middleware (auth, validation, error handler) works as-is. One cold-start penalty shared across all routes.  
**Cons:** Larger function bundle. All routes share one function's memory/CPU limits.

**Option B — Split per-route functions:**

```
api/
  accounts.js   ← standalone serverless function for /api/accounts
  entries.js    ← standalone for /api/entries
  ...
```

**Pros:** Smaller per-function bundles. Independent scaling.  
**Cons:** Must duplicate middleware setup in each function. More files to maintain. Cold starts per route.

**Recommendation:** Option A (single Express adapter) for v1. The app is single-user, low-traffic. Cold starts are acceptable. If traffic grows, split later.

### 6.2 Express App Changes Required

1. **Remove `app.listen()`** — Vercel manages the HTTP server.
2. **Remove `express.static()` and catch-all SPA route** — Vercel serves static files.
3. **Export `app`** — `module.exports = app;` (already present at line 56).
4. **Conditional listen for local dev** — `if (process.env.NODE_ENV !== 'production') { app.listen(PORT, ...); }`

### 6.3 Vercel Configuration (`vercel.json`)

```json
{
  "buildCommand": "cd client && npm run build",
  "outputDirectory": "client/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "functions": {
    "api/index.js": {
      "memory": 512,
      "maxDuration": 30
    }
  }
}
```

---

## 7. Environment Variables

### 7.1 New Variables Required

| Variable | Purpose | Where Set | Secret? |
|----------|---------|-----------|---------|
| `SUPABASE_URL` | Supabase project URL (`https://csuadlwjhxelwjjgzajb.supabase.co`) | Vercel dashboard | No (it's public) |
| `SUPABASE_ANON_KEY` | Supabase anonymous key (for client-side queries, if used) | Vercel dashboard | Semi-sensitive (public in client bundle if used there) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS, for server-side only) | Vercel dashboard | **YES** — never expose to client |
| `DATABASE_URL` | Direct PostgreSQL connection string (if using `pg` instead of Supabase client) | Vercel dashboard | **YES** |
| `BCRYPT_SALT_ROUNDS` | Salt rounds for passphrase hashing (default: 12) | Vercel dashboard | No |

### 7.2 Variables to Remove

| Variable | Reason |
|----------|--------|
| `DB_PATH` | No more file-based SQLite. |
| `PORT` | Vercel assigns the port. Keep for local dev only. |

### 7.3 Variables Unchanged

| Variable | Reason |
|----------|--------|
| `NODE_ENV` | Standard. Vercel sets this automatically. |

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| **Data loss during migration** | Medium | **CRITICAL** | Export SQLite data to CSV as backup before migration. Write a migration script that reads SQLite and inserts into Supabase. Validate row counts post-migration. |
| **SQL dialect mismatch causes silent data corruption** | Medium | **HIGH** | Test every query function with known input/output pairs. Pay special attention to: date handling, NULL coalescing, floating-point precision, LIKE vs ILIKE. |
| **bcrypt fails in Vercel serverless** | Low | **HIGH** | bcrypt is pure JS with optional native bindings. The pure JS fallback works in serverless. Test passphrase auth end-to-end before cutover. |
| **Cold starts degrade dashboard load time** | High | **Medium** | Vercel free tier has cold starts. With Option A (single function), the first API call after idle triggers a cold start (~1-3s for Node.js). Mitigation: Vercel Pro (no cold starts) or a keep-warm cron. Acceptable for single-user v1. |
| **Supabase connection pool exhaustion** | Low | **Medium** | Supabase free tier includes 15 connections. Single-user app won't exhaust this. Serverless functions create a new connection per invocation — use Supabase's PgBouncer (port 6543) for connection pooling, or `pg` pool with `max: 1` per function instance. |
| **Vercel function timeout (30s free, 60s pro)** | Low | **Medium** | Dashboard aggregation queries with 5,000 entries complete in <100ms. CSV export of 5,000 entries is <500ms. No risk of timeout. |
| **CORS issues after migration** | Low | **Low** | Vercel serves frontend and API from the same domain (`ginovalera.com`). No cross-origin requests. CORS middleware can be removed or left as no-op. |
| **Supabase Row-Level Security (RLS) blocks queries** | Medium | **HIGH** | By default, Supabase enables RLS on all tables. If using the anon key, all queries will return empty. **Must either:** (a) use the service_role key server-side (bypasses RLS), or (b) configure permissive RLS policies. Recommendation: use service_role key for all server-side queries. |
| **`vercel.json` rewrite misconfiguration** | Medium | **HIGH** | If rewrites are wrong, API calls 404 or the SPA doesn't load. Test with `vercel dev` locally before deploying. |
| **Client `package.json` has server deps** | Low | **Low** | `better-sqlite3` and `express` are listed in client's `package.json` but unused. They add unnecessary build weight. Remove during migration cleanup. |

---

## 9. Deployment Order

### Phase 1: Local Development & Testing

1. Set up Supabase project schema (run migration SQL to create tables, indexes, seed default categories).
2. Rewrite `db/queries.js` to use Supabase/PG.
3. Rewrite `db/schema.js` to initialize Supabase client (no DDL — that's in migrations).
4. Modify `server.js` for Vercel compatibility (export app, conditional listen).
5. Update `error-handler.js` for PG error codes.
6. Create `vercel.json` and `api/index.js`.
7. Update `vite.config.js` output directory.
8. Clean up `client/package.json` (remove unused server deps).
9. Test all 27 FRs locally with `vercel dev`.

### Phase 2: Data Migration

1. Export existing SQLite data (if any) to JSON or CSV.
2. Write and run a migration script: read SQLite → insert into Supabase.
3. Validate: row counts match, account balances match, settings preserved.
4. Test passphrase auth with migrated data.

### Phase 3: Staging Deploy

1. Deploy to Vercel preview environment (automatic on PR).
2. Run full regression: all API endpoints, dashboard load, entry CRUD, CSV export, passphrase auth.
3. Verify domain routing (temporary Vercel URL).

### Phase 4: Production Cutover

1. Point `ginovalera.com` DNS to Vercel (via Cloudflare dashboard).
2. Deploy to Vercel production.
3. Verify SSL (Vercel auto-provisions).
4. Smoke test: dashboard loads, entry can be created, passphrase works.
5. Keep old SQLite database as backup for 30 days.

---

## 10. MVP Boundary — Migration v1

### In Scope (must ship)

| Area | What's included |
|------|----------------|
| Database migration | All 4 tables (accounts, entries, categories, settings) + 5 indexes ported to PostgreSQL. |
| Query layer rewrite | All 30+ query functions in `db/queries.js` ported to Supabase/PG. |
| Serverless adapter | Express app wrapped for Vercel via `@vercel/node`. |
| Auth continuity | Passphrase auth works identically. |
| API contract preservation | All routes, status codes, error formats unchanged. |
| CSV export | Identical output format. |
| Vercel deployment config | `vercel.json` with rewrites, build settings. |
| Environment variables | All required vars documented and configurable. |
| Data migration script | One-time script to move SQLite data to Supabase. |

### Deferred / Out of Scope

- Multi-user / Row-Level Security policies (v1 uses service_role key, bypasses RLS).
- Supabase Auth (email/password, OAuth) — passphrase auth stays.
- Supabase Realtime (live dashboard updates) — polling or manual refresh only.
- Supabase Storage (receipt uploads) — deferred to v2.
- Vercel Analytics / monitoring dashboards.
- CI/CD pipeline (GitHub Actions auto-deploy) — manual `vercel deploy` for v1.
- Database backups (Supabase manages this on paid tier; free tier has point-in-time recovery for 7 days).
- Custom domain email (e.g., `app@ginovalera.com` for password reset) — not needed with passphrase auth.

---

## 11. Open Questions (for Gino at G0)

1. **Supabase client vs. direct PG connection?** The server-side code can either use `@supabase/supabase-js` (Supabase's client library, which wraps PostgREST) or connect directly to PostgreSQL via `pg` + `knex`. The Supabase client is simpler but adds an HTTP layer (PostgREST) between the serverless function and the database. Direct PG connection is faster but requires managing connection pooling in serverless. **Recommendation:** Use `@supabase/supabase-js` with the service_role key for simplicity. The overhead of PostgREST is negligible for single-user workload. Confirm or override.

2. **Vercel free tier vs. Pro?** Vercel free tier has: 100 GB bandwidth, 6,000 function-minutes, 30s max function duration, cold starts on infrequent routes. For a single-user app, this is likely sufficient. However, cold starts mean the first dashboard load after idle could take 3-5 seconds. Vercel Pro ($20/mo) eliminates cold starts and increases limits. **Question:** Start with free tier and upgrade if needed, or go Pro from day one?

3. **Supabase free tier vs. Pro?** Supabase free tier includes: 500 MB database, 15 connections, 2 GB bandwidth, 7-day backup retention. This is more than sufficient for a single-user expense tracker. Supabase Pro ($25/mo) adds: 8 GB database, 100 connections, 50 GB bandwidth, 30-day backups, no pausing. **Recommendation:** Start with free tier. The database is tiny (<10 MB for 5,000 entries). Upgrade only if needed. Confirm.

4. **Data migration — one-time script or manual?** If Gino already has data in his local SQLite database, we need a migration script. If the app is being set up fresh on the cloud (no existing data), we can skip migration and just run the schema + seed script. **Question:** Does Gino have existing data in his local Pondo instance that must be migrated, or is this a fresh cloud deployment?

5. **Vite build output directory?** Currently `vite.config.js` outputs to `../server/dist/` because the Express server serves it. For Vercel, the build output should be `dist/` (relative to project root) or `client/dist/`. Vercel's default for Vite projects is `dist/`. **Recommendation:** Change `build.outDir` to `dist` and set `vercel.json` `outputDirectory` to `client/dist` (if building from `client/` subdirectory) or restructure so Vite builds to root `dist/`. Confirm preferred project structure.

6. **Monorepo structure?** Currently the project has `server/` and `client/` as sibling directories. Vercel expects either: (a) a single `package.json` at root with workspaces, or (b) the `vercel.json` at root with `buildCommand` pointing to the client subdirectory. **Recommendation:** Keep the current structure. Add `vercel.json` at root with `buildCommand: "cd client && npm run build"` and `outputDirectory: "client/dist"`. The `api/` directory also lives at root. Confirm.

7. **Passphrase hash — bcrypt in serverless cold start?** bcrypt's `hashSync()` with 12 salt rounds takes ~300ms on a warm instance but could be 500-800ms on a cold start (first invocation loads the module). This only affects the `/api/setup` and `/api/set-passphrase` endpoints (rarely called). The auth middleware uses `compareSync()` which is faster (~50ms). **Question:** Is this acceptable, or should we reduce salt rounds to 10 for faster cold starts? Recommendation: keep 12 rounds — setup is called once.

---

## 12. Sign-off

- **To be approved by Gino at G0 on:** ________  
- **Notes:** ________

---

## Appendix A: Sources & References

1. **Pondo v2 BRD** — `docs/01-BRD.md` (2026-07-10). All 27 FRs and 13 NFRs.
2. **Pondo SAD** — `docs/03-SAD.md` (2026-07-10). Architecture decisions, data model, tradeoffs.
3. **Current codebase** — All files in `server/` and `client/` as of 2026-07-13.
4. **Vercel Serverless Functions docs** — https://vercel.com/docs/functions/serverless-functions
5. **Vercel Express adapter** — https://vercel.com/docs/frameworks/express
6. **Supabase JavaScript client** — https://supabase.com/docs/reference/javascript
7. **Supabase connection pooling (PgBouncer)** — https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling
8. **PostgreSQL vs SQLite dialect differences** — https://wiki.postgresql.org/wiki/Things_to_find_out_about_when_moving_from_SQLite_to_PostgreSQL
9. **Vercel rewrites configuration** — https://vercel.com/docs/project-configuration#rewrites
10. **Gino's constraints** — Provided via Friday: Vercel frontend + serverless, Supabase PostgreSQL, domain `ginovalera.com`, Vercel token in Bitwarden, `/api` base path, passphrase auth must continue.

---

## Appendix B: Summary

| Metric | Count |
|--------|:-----:|
| **Files requiring changes** | 10 (6 server, 2 client, 2 new) |
| **Files unchanged** | 20+ (all React components, pages, UI library) |
| **Query functions to rewrite** | 30+ (in `db/queries.js`) |
| **SQL patterns to translate** | 12 (see §5 catalog) |
| **New environment variables** | 5 |
| **Risks identified** | 10 (2 CRITICAL impact) |
| **Open questions** | 7 |
| **Deployment phases** | 4 |
