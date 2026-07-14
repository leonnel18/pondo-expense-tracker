# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
