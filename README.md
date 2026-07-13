# Pondo — Household Expense Tracker

> *"Your money, in focus."*

A simple, local-first household income & expense tracker. Log entries, categorize them, track account balances, and see where your money goes — month over month.

## Features (MVP)

- **Accounts** — Track multiple accounts (Debit, Credit, Lent, Borrowed, Invest). Each entry is tied to an account.
- **Entries** — Log income and expenses with category, date, amount, and notes.
- **Categories** — Default categories seeded on first launch; add/edit/delete your own.
- **Dashboard** — KPIs (income, expense, balance), expense/income charts, month-over-month comparison, recent entries, account summary, time filters.
- **Export** — Export entries and accounts as CSV.
- **Passphrase auth** — Optional passphrase protection (bcrypt-hashed, stored locally).
- **First-launch setup** — Creates a default "Cash" account and seeds categories.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS + Recharts |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | Passphrase (bcrypt) |
| Charts | Recharts (d3-based) |

## Project structure

```
/server               Express API, SQLite DB, auth, validation
  /db                 Schema + queries
  /middleware         Auth, validation, error handling
  /routes             API endpoints (accounts, entries, categories, dashboard, export, system)
  /data               SQLite database file (pondo.db)
/client               Vite + React + Tailwind
  /src/pages           Screen components (Dashboard, Entries, Accounts, Categories, etc.)
  /src/components      Shared UI (Header, Sidebar, Layout)
  /src/lib             API client
/artifacts             TWC pipeline outputs (BRD, SAD, wireframes, design system, code docs, test plan, runbook)
/design                Wireframes + brand assets (logo, style guide, tokens.json)
/templates            Blank ADLC templates
```

## Getting started

### Prerequisites
- Node.js (v18+ recommended)
- npm
- Python 3.x (only if better-sqlite3 needs to compile from source)

### Backend
```bash
cd server
npm install
npm run dev          # starts on port 3001
```

### Frontend
```bash
cd client
npm install
npm run dev          # starts on port 3000 (Vite proxy → :3001)
```

Open http://localhost:3000

### Production build
```bash
cd client && npm run build       # outputs to client/dist
cd ../server && npm start        # serves frontend + API on :3001
```
Open http://localhost:3001

## Environment variables

| Var | Purpose | Default |
|-----|---------|---------|
| `PORT` | API port | 3001 |
| `DB_PATH` | SQLite database file path | `./data/pondo.db` |

Copy `server/.env.example` to `server/.env` to override.

## API overview

24 endpoints across 6 route files:

| Route file | Endpoints |
|-----------|----------|
| accounts | GET/POST/PUT/DELETE `/api/accounts` |
| entries | GET/POST/PUT/DELETE `/api/entries` + bulk-delete |
| categories | GET/POST/PUT/DELETE `/api/categories` |
| dashboard | GET `/api/dashboard` + `/api/dashboard/mom` |
| export | GET `/api/export/entries` + `/api/export/accounts` (CSV) |
| system | GET `/api/status` + `/api/settings` + POST `/api/setup` + `/api/set-passphrase` |

## Deferred to v2

Recurring expenses · budgets/alerts · multi-household · CSV/PDF import · receipt upload · savings goals · multi-currency · account-to-account transfers · partial repayment tracking · bank-sync · AI features · dark mode · mobile-optimized layout

## Documentation

Full TWC pipeline artifacts in `/artifacts`:
1. `01-BRD.md` — Business Requirements Document (G1 approved)
2. `02-wireframes.md` — UX wireframes (11 screens)
3. `02b-design-system.md` — Brand design system (Pondo)
4. `03-SAD.md` — Solution Architecture Document (G3 approved)
5. `04-code-docs.md` — Code documentation + API map + bugfix history
6. `05-test-uat.md` — UAT test plan (G6)
7. `06-runbook.md` — Deployment runbook (G7)

## Build history

Built by **The Workshop Crew (TWC)** — an 8-agent ADLC pipeline orchestrated by FRIDAY (chief of staff). Pipeline: analyst → ux → brand → architect → dev → qa → devops, with pm consolidating. Gates G1–G3 approved by Gino on 2026-07-10. Build (G5) completed same day. Bugfixes applied 2026-07-10 → 2026-07-11.

---

*Pondo · 2026 · First TWC build*