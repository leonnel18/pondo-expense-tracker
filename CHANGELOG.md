# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-07-24

### Added
- **Settings page** (`/settings`) — didn't exist before this release; wired into both desktop sidebar and mobile bottom nav.
- **US-41: Custom period-start day + working time-filter presets** — This Month/Last Month/Last 3 Months/This Year/All Time presets on Dashboard and Entries, respecting a configurable 1-28 period-start day. (The presets existed in code since v1 but were never wired into any page until now.)
- **US-40: Logging streak + lifetime transaction count**, shown on the Settings page.
- **US-36: Reusable `EmptyState` component**, replacing 5 separate ad-hoc empty-state blocks across Entries, Accounts, Recycle Bin, Recurrences, Budgets, and Tags Report.
- **US-35: Compact chart legend** on the expense/income breakdown charts, replacing the old in-pie legend; added a hover tooltip so amount/% detail isn't lost.
- **US-43: Income/expense color-swap setting**, for households whose cultural convention treats red as growth rather than loss.

### Fixed
- Recurring-transactions cron endpoint (`GET /api/recurrences/process`) was unreachable via its real Vercel Cron trigger — a route-ordering bug meant `GET /:id` always matched first. The cron had likely never successfully fired since it was built in v2.3.
- Migration `012_app_events.sql` (US-27, from the 2026-07-18 session below) had been written but never applied to production — the event log had been silently doing nothing since it shipped.

---

## [1.4.0] - 2026-07-24

### Added
- **US-13: One-level subcategories** — self-referencing `parent_category_id` on `categories`, two-level category picker, subcategory totals roll up into their parent's total in breakdown reports.
- **US-28: Persisted `app_errors` table** — the central error handler now logs to a real table alongside `console.error`, instead of losing everything on restart.
- **US-33: Reusable `SettingsRow` component** (enabler, not yet wired into a page this release).
- **US-34: Compact modal variant** for short single-field forms, alongside the existing footer-button modal.

---

## [1.3.0] - 2026-07-24

### Added
- **US-32: Real test suite** — 13 suites, 122 tests, covering server boot, CORS/proxy config, and every route handler's valid/invalid paths. `jest` had been declared as the test runner since v1 but was never actually configured or used.
- **US-42: Arithmetic expressions in the amount field** (e.g. `250+150` evaluates to `400` before submit).
- **US-09: Stats view on Entries**, alongside the existing List/Calendar views.
- **US-11: Icon-in-circle badges** on transaction rows, replacing bare inline emoji, with a WCAG 1.4.11 contrast-safe color utility.

### Fixed
- Transaction rows were reading a `category_emoji` API field that was never actually returned (only `category_icon` was) — dead code since it was written, now corrected.

---

## [1.2.0] - 2026-07-20

### Added
- **US-02: App-wide privacy mask toggle.**
- **US-03: Balance reconciliation** via an auto-created adjustment entry.
- **US-04: Pending-entry flag**, excluded from balances until confirmed.
- **US-07: Persistent mobile FAB** for quick entry capture.

### Fixed
- `GET /api/accounts/:id` never returned a balance, so the reconciliation modal always displayed ₱0.00.

---

## [1.1.0] - 2026-07-14

### Added
- **Supabase (Postgres) backend migration** — moved from SQLite self-hosted to cloud-based serverless deployment on Vercel (migration completed 2026-07-13/14, per `artifacts/milestone-log.md` "Post-Recon Reconciliation" §15).
- **Vercel deployment configuration** (`vercel.json`) — serverless Express function routing and Vite-based client build pipeline.

### Fixed
- **US-01: Net-worth sign bug** — `getDashboardKPIs` and `getAccountBalance` in `server/db/queries.js` now correctly subtract Credit and Borrowed account balances as liabilities instead of adding them to total net worth. Verified against live Supabase data: formula now produces 1200 (800+700+400-250-450) instead of incorrect 2600.
- **US-29: Central error-handler bypass** — `server/routes/accounts.js` and `server/routes/categories.js` now route errors through `middleware/error-handler.js` via `next(error)`, matching the pattern already established in `routes/entries.js`.
- **US-30: Orphaned files cleanup** — removed dead-code reference `server/schema.js` (stale `better-sqlite3` file) and divergent `server/database.sqlite` files that had fallen out of sync with live Supabase schema.

### Known Issues
- **Multi-user authentication not yet implemented** — app remains single-user with a shared passphrase (v2.0 Sprint 2 was deferred before the cloud cutover). See `docs/recon/sprint-backlog.md` for the full v1.1–v2.11 roadmap and planned multi-user/household-sharing features.

---

## [1.0.0] - 2026-07-11

### Added
- **Initial release** — React 18 (Vite) + Tailwind CSS frontend with Node.js/Express backend and SQLite database, built and deployed 2026-07-10 through 2026-07-11 via The Forge pipeline (gates G0–G8).
- **Account types** — support for 5 distinct account types (Debit, Credit, Lent, Borrowed, Invest) with account-type-aware balance computations (assets added, liabilities subtracted).
- **Dashboard** — KPI cards (net worth, total income/expense), expense/income breakdown donut charts, recent transaction list, account summaries, and month-over-month comparisons.
- **Accounts management** — full CRUD operations with balance calculations and type-specific styling.
- **Entries management** — transaction creation/editing/deletion with date filtering, bulk deletion, and audit trail (created_at/updated_at timestamps).
- **Categories management** — customizable spending/income categories with 10 seed expense and 6 seed income types.
- **Authentication** — passphrase-based access control using bcrypt hashing and `X-App-Passphrase` header validation.
- **Date range filtering** — dashboard and entries list time-window filtering for period-aware analysis.
- **27 functional requirements** implemented across 24 API endpoints, fully traced and tested (38 functional + 20 edge-case test cases, QA certified 2026-07-11 09:50).
- **Self-hosted deployment** — standalone Windows-based local deployment at `http://localhost:3001` with manual file-based backup strategy.
