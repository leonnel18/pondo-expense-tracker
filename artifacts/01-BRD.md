# Business Requirements Document (BRD)
**Project:** Household Expense Tracker · **Author:** analyst · **Version:** 2.0 · **Date:** 2026-07-10 · **Gate:** G1 (REVISION)

---

## 1. Problem statement

A household with one or more earners needs to know, at a glance, where its money goes each month — income in, expenses out, and what's left. Most households rely on memory, scattered bank statements, or a spreadsheet that one person maintains until it quietly dies. Existing apps either demand bank credentials (privacy barrier), impose rigid budgeting philosophies (YNAB-style zero-based budgeting), or drown users in 50+ auto-categorized categories that don't match how the household actually thinks about its spending.

Beyond simple expense tracking, households manage money across multiple accounts — checking, savings, credit cards, e-wallets, petty cash, money lent to friends, money borrowed from family, and investments. Without account-level tracking, the user can't answer basic questions like "How much do I actually have in my checking account right now?" or "How much have I lent to Mark that hasn't been repaid?" Existing apps either ignore lending/borrowing entirely or treat it as an afterthought.

The result: households lose visibility within weeks, make financial decisions blind, and miss patterns (subscription creep, category drift, month-over-month trends) that a well-designed dashboard would surface immediately.

**For:** A single user managing their household's finances across multiple accounts (bank, credit, lending, borrowing, investments) who wants clarity without handing over bank credentials or adopting a financial philosophy.

**Why now:** The post-Mint landscape (Mint shut down March 2024, displacing ~25M users) has proven that lightweight, privacy-respecting, manual-entry tools fill a real gap. A focused household dashboard with account-level tracking — not a full PFM suite — is the right scope for a first build.

---

## 2. Goals & success criteria

- **Goal:** Give a household a single dashboard that answers these questions in under 5 seconds: (1) How much came in this month? (2) How much went out? (3) What's left — and is that better or worse than last month? (4) What's the balance in each of my accounts?
- **Success looks like (measurable):**
  - A user can log an income or expense entry in ≤ 15 seconds from dashboard open, including account selection.
  - Dashboard KPIs (total income, total expense, net balance) update immediately after any entry is saved.
  - Category breakdown chart renders with ≤ 5 categories and is legible without explanation.
  - Month-over-month comparison (current month vs. prior month) is visible on the dashboard without navigation.
  - A user who has never seen the app can log their first expense and understand the dashboard within 90 seconds (no onboarding wizard required).
  - A user can create an account, assign its type, and see its balance update after logging entries tied to that account.

---

## 3. Personas & jobs-to-be-done

| Persona | Context | Top jobs-to-be-done |
|---------|---------|---------------------|
| **Priya — Primary Bill-Payer** | Manages household finances for a dual-income family. Pays rent, utilities, groceries. Maintains a checking account, two credit cards, a joint savings account, and an e-wallet. Occasionally lends money to her sister. Currently uses a mix of bank apps and a notes file. Wants to know if the household is net-positive each month without reconciling 3 bank accounts. | 1. Log expenses quickly (under 15s) as they happen or in a daily batch, selecting the right account. 2. See total monthly spend vs. income at a glance. 3. Spot which categories are growing month-over-month. 4. Edit or delete a mistaken entry without breaking totals. 5. Check her checking account balance without opening her bank app. 6. Track how much her sister still owes her. |
| **Marcus — Occasional Contributor** | Priya's partner. Logs irregular expenses (car repair, weekend trip, large purchase). Doesn't want to learn a system — just wants to record an amount and move on. Uses a shared credit card for most purchases. | 1. Log an expense in under 10s with minimal fields, defaulting to the shared credit card account. 2. See the household's current monthly standing without navigating. 3. Trust that his entries are reflected in the dashboard and account balances immediately. |
| **Solo Tracker (v1 primary)** | Single person or sole financial manager of a household. Wants clarity on personal cash flow across multiple accounts (checking, credit card, e-wallet, investments). May occasionally lend money to friends or borrow from family. May later expand to multi-user (deferred). | 1. Categorize every expense so the dashboard tells a story. 2. Compare this month to last month. 3. Filter to a specific time range to answer "what did I spend on X in Q1?" 4. See all account balances in one place. 5. Track money lent and borrowed separately from owned funds. |

---

## 4. Research — comparable products

| Product | What it does well | Pitfall to avoid | Source |
|---------|-------------------|------------------|--------|
| **YNAB** | Zero-based budgeting methodology creates strong user habits; excellent retention among committed users. Account types: Cash, Credit, Loan, Tracking — each with distinct behavior in the budget. | Steep learning curve; requires adopting a full philosophy before the tool is useful. $15/mo filters out casual users. Loan accounts are complex to set up. | DDH 9-app test (2026); TheFrontKit retention analysis; YNAB support docs (2026) |
| **Copilot (iOS/Mac)** | Best-in-class auto-categorization (85%+ accuracy via AI); clean, low-friction UI. | Platform-locked (Apple only); $13/mo; requires bank sync — privacy barrier for many users. | DDH 9-app test (2026) |
| **Monarch Money** | Cross-platform; strong net-worth + investment tracking alongside expenses; 82% auto-categorization accuracy. | $15/mo; still requires bank credentials; feature-heavy for someone who just wants expense tracking. | DDH 9-app test (2026); Finny blog (2026) |
| **Spend Split (SpendWise)** | Only app found that explicitly tracks lending/borrowing alongside expenses. Tracks "They owe you" vs. "You owe" with partial repayment support. $3.99/mo. | Lending tracking is person-based (IOUs between friends), not account-type-based. No investment account tracking. | getspendwise.co (2026) |
| **Monee (weekend build)** | No bank linking, no login, no subscription; CSV import + manual entry; runs entirely client-side. Proves the "privacy-first, dead-simple" segment is real. | No persistence across devices; no multi-user; no recurring-entry support; limited to browser-local storage. No account concept. | dev.to/eastkap (2026) |
| **Mint (defunct, reference)** | Set the standard for free, auto-synced expense tracking; 25M users at peak. | Shut down Jan 2024 — users lost a decade of data. Proved that free + bank-sync is not durable. | Multiple sources; industry-wide post-Mint analysis |

**Key patterns from research:**
- **Friction kills retention.** The #1 reason users quit within 90 days: missed entries compound, dashboard becomes inaccurate, trust erodes, app is abandoned. (TheFrontKit, DDH)
- **Bank credentials are a real adoption barrier.** A significant segment of users will never link bank accounts to a third-party app. Manual entry + CSV import is a viable alternative. (Woodo, dev.to/Monee)
- **Categories must match the user's mental model, not the app's taxonomy.** Rigid 50-category systems cause miscategorization, which erodes dashboard trust. (TheFrontKit, Woodo)
- **Dashboards must answer the top question in seconds.** If the default view doesn't show the user's most important number immediately, they stop opening the app. (Masterly fintech dashboard analysis)
- **Reports without actionable comparisons are emotional tax.** Showing "$1,400 on Restaurants" without context (vs. last month, vs. average) creates guilt, not behavior change. (TheFrontKit)
- **Account-level tracking is table stakes for serious users.** YNAB, Monarch, and Spend Split all support multiple account types. Users with >1 account (checking + credit card + e-wallet) need per-account visibility or the dashboard feels incomplete. (YNAB docs, Spend Split)
- **Lending/borrowing tracking is underserved.** Only Spend Split explicitly targets this use case. Most apps treat all money as "owned" — ignoring the common real-world pattern of informal lending between family and friends. (Spend Split)

---

## 5. Functional requirements

### 5.1 — Account Management

| ID | Requirement | Priority | Acceptance criterion |
|----|-------------|:--------:|----------------------|
| **FR-1** | **Create an account** — The user can create a financial account with: name (e.g., "BPI Savings"), type (Debit / Credit / Lent / Borrowed / Invest), and optional description/note. | **P0** | Submitting a valid account (name present, type selected) persists it. The account appears in the account list. Duplicate names are allowed (user may have two accounts named "Savings" at different banks) but the system warns if the exact same name+type combination already exists. |
| **FR-2** | **Edit an account** — The user can modify the name, type, or description of an existing account. | **P1** | After editing and saving, the account reflects the new values. All entries already tied to this account remain associated. Changing the account type does not retroactively recategorize entries — it only affects future balance interpretation. |
| **FR-3** | **Delete an account** — The user can delete an account. | **P1** | If the account has zero entries, it is deleted immediately. If the account has entries, the system prompts the user to either (a) reassign all entries to another account, or (b) confirm deletion of the account AND all its entries. Orphaned entries are not allowed. See Open Question #1 for alternative handling. |
| **FR-4** | **List/view accounts** — The user can see all accounts with their type, current balance, and entry count. | **P0** | The account list shows: account name, type icon/label, current balance (see FR-5 for balance definition), and number of entries. Accounts are sortable by name or balance. The list is accessible from the dashboard and the entry form. |
| **FR-5** | **View per-account balance** — Each account displays a balance derived from its entries. | **P0** | For Debit accounts: balance = (income to this account) − (expenses from this account). For Credit accounts: balance = total expenses charged (representing amount owed/used). For Lent accounts: balance = total lent − total repaid (positive = still owed to user). For Borrowed accounts: balance = total borrowed − total repaid (positive = still owed by user). For Invest accounts: balance = total invested (income entries to this account). The balance updates immediately when entries are added, edited, or deleted. See Open Question #2 for balance semantics. |
| **FR-6** | **Account type definitions** — The system enforces the five account types with clear semantics. | **P0** | The five types are available at account creation and cannot be renamed or removed by the user. Each type has a distinct visual indicator (icon or color). The type determines how the account balance is interpreted (per FR-5). |

**Account type semantics (reference for FR-5 and FR-6):**

| Type | Definition | Balance meaning | Example |
|------|-----------|----------------|---------|
| **Debit** | User's own money stored in an account. | Net cash available. | Checking, Savings, Petty Cash, GCash, Maya |
| **Credit** | Borrowed money available to spend (revolving or line of credit). | Total amount charged/used (liability). | BDO Credit Card, Citibank CC, Atome |
| **Lent** | Money the user lent to someone else — expected to be returned. | Net amount still owed TO the user. | "Lent to Mark — ₱5,000" |
| **Borrowed** | Money the user borrowed from someone else — expected to be repaid. | Net amount still owed BY the user. | "Borrowed from Mom — ₱10,000" |
| **Invest** | Money placed in investments. | Total amount invested (cost basis). | Stocks, Bonds, Mutual Funds, MP2, Crypto |

### 5.2 — Entry Management

| ID | Requirement | Priority | Acceptance criterion |
|----|-------------|:--------:|----------------------|
| **FR-7** | **Log an expense** — The user can record an expense with: amount, date, category, account (required), and optional note. | **P0** | Submitting a valid expense (amount > 0, date present, category selected, account selected) persists it. The expense is deducted from the selected account's balance. Dashboard KPIs update immediately. Submitting amount ≤ 0 or missing required fields shows a clear, field-specific error. |
| **FR-8** | **Log income** — The user can record income with: amount, date, income category, account (required), and optional note. | **P0** | Submitting valid income persists it. The income is added to the selected account's balance. Dashboard "Total Income" KPI updates immediately. Amount ≤ 0 is rejected with a clear error. |
| **FR-9** | **Edit an entry** — The user can modify any field of a previously logged income or expense entry, including changing the associated account. | **P1** | After editing and saving, the entry reflects the new values. Dashboard KPIs, charts, and both the old and new account balances recalculate. The original entry is not duplicated. |
| **FR-10** | **Delete an entry** — The user can delete any income or expense entry. | **P1** | Deleting an entry removes it from all views and recalculates KPIs, charts, and the associated account's balance. A confirmation prompt prevents accidental deletion ("Are you sure you want to delete this ₱500 Groceries entry from BPI Savings?"). |
| **FR-11** | **Bulk-delete entries** — The user can select multiple entries and delete them in one action. | **P2** | Selecting ≥ 2 entries and confirming deletion removes all selected entries. KPIs, charts, and affected account balances recalculate once. |

### 5.3 — Categories

| ID | Requirement | Priority | Acceptance criterion |
|----|-------------|:--------:|----------------------|
| **FR-12** | **Select from default expense categories** — The user chooses a category when logging an expense from a predefined list. | **P0** | Default expense categories: Food & Dining, Transportation, Housing & Utilities, Shopping, Entertainment, Health, Education, Subscriptions, Insurance, Other — are available at first launch. "Other" is always present as a fallback. |
| **FR-13** | **Select from default income categories** — The user chooses a category when logging income from a predefined list. | **P0** | Default income categories: Salary, Freelance, Gift, Investment, Refund, Other Income — are available at first launch. "Other Income" is always present as a fallback. |
| **FR-14** | **Create custom categories** — The user can add, rename, or remove expense and income categories. | **P1** | Creating a new category makes it available in the category picker immediately. Renaming a category updates all existing entries under that category. Deleting a category prompts the user to reassign its entries to another category — orphaned entries are not allowed. |
| **FR-15** | **Category with icon/color** — Each category has a visual identifier (icon or color) for quick dashboard recognition. | **P2** | Category colors/icons are consistent across the entry form, category breakdown chart, and entry list. Changing a category's color updates all views. |

### 5.4 — Dashboard & KPIs

| ID | Requirement | Priority | Acceptance criterion |
|----|-------------|:--------:|----------------------|
| **FR-16** | **Dashboard KPI cards** — The dashboard displays three summary cards: Total Income, Total Expenses, and Net Balance for the selected period. | **P0** | KPIs reflect the currently selected time filter. Net Balance = Total Income − Total Expenses. All three update within 2 seconds of any entry being added, edited, or deleted. |
| **FR-17** | **Category breakdown chart** — A visual chart (pie, donut, or bar) shows expense distribution by category for the selected period. | **P0** | Chart displays each category as a proportion of total expenses. Categories with 0 spend in the period are hidden. Hover/click reveals exact amount and percentage. Chart updates when entries change. |
| **FR-18** | **Income breakdown chart** — A visual chart shows income distribution by income category for the selected period. | **P1** | Chart displays each income category as a proportion of total income. Categories with 0 income in the period are hidden. Hover/click reveals exact amount and percentage. |
| **FR-19** | **Month-over-month comparison** — The dashboard shows current month vs. prior month for at least Total Expenses and Total Income, with a directional indicator (▲ increase / ▼ decrease) and percentage change. | **P1** | Comparison is visible on the dashboard without navigation. If prior month has no data, the comparison shows "No prior data" instead of a misleading 0% or 100% change. |
| **FR-20** | **Recent entries list** — The dashboard shows the 10 most recent entries (income + expense mixed), sorted by date descending. | **P1** | Each row shows: date, type icon (income/expense), category, amount, account name, and an edit/delete action. Clicking a row opens the edit form for that entry. |
| **FR-21** | **Account summary on dashboard** — The dashboard displays a summary of all accounts with their current balances. | **P0** | Each account shows: name, type icon, and current balance. The list is visible on or immediately accessible from the main dashboard. Balances update when entries change. |

### 5.5 — Time Filters

| ID | Requirement | Priority | Acceptance criterion |
|----|-------------|:--------:|----------------------|
| **FR-22** | **Preset time filters** — The user can filter the dashboard to: This Month, Last Month, Last 3 Months, This Year, or All Time. | **P0** | Selecting a filter recalculates all KPIs, the category chart, and the recent-entries list for that period. The active filter is visually indicated. Default filter on load is "This Month." |
| **FR-23** | **Custom date range** — The user can set a custom start and end date to filter all dashboard data. | **P2** | Entering a valid start ≤ end date filters all views. Invalid ranges (end before start, future-only dates) show a clear error. |

### 5.6 — Data Integrity

| ID | Requirement | Priority | Acceptance criterion |
|----|-------------|:--------:|----------------------|
| **FR-24** | **No duplicate detection on manual entry** — The system does not prevent the user from logging two identical-looking entries (same amount, date, category, account). Manual entry assumes user intent. | **P1** | Two entries with identical amount, date, category, and account are both persisted. The system does not block or merge them. (Rationale: same-day same-category expenses are legitimate — e.g., two separate grocery runs from the same account.) |
| **FR-25** | **Entry audit trail** — Each entry records a creation timestamp and a last-modified timestamp. | **P2** | Created-at and updated-at timestamps are stored per entry. These are visible in the entry detail/edit view but not on the main dashboard (to avoid clutter). |
| **FR-26** | **Account-entry referential integrity** — Every entry must be associated with exactly one account. An account cannot be deleted while entries reference it unless the user explicitly reassigns or deletes those entries. | **P0** | Attempting to delete an account with entries triggers the resolution flow described in FR-3. The system never leaves entries with a dangling account reference. |
| **FR-27** | **Account balance consistency** — The displayed balance of any account must always equal the sum of its entries (per the balance formula for that account type). | **P0** | After any entry create/edit/delete operation, the affected account's balance is recalculated and must match the sum of its entries. A test case: create account A, add 3 entries (₱100, ₱200, −₱50), balance must show ₱250. Edit the ₱200 to ₱150, balance must show ₱200. |

---

## 6. Non-functional requirements

| ID | Category | Requirement |
|----|----------|-------------|
| **NFR-1** | **Households** | **v1: Single-household, single-user.** The system serves one household with one user account. No multi-household, no multi-user, no shared access, no role-based permissions. Confirmed by Gino. |
| **NFR-2** | **Data Privacy** | All financial data is stored server-side and accessible only to the authenticated user. No bank credentials are ever requested, stored, or transmitted. No third-party analytics or tracking scripts may exfiltrate financial data. The system must not require Plaid, Yodlee, or any bank-linking service. |
| **NFR-3** | **Data Storage & Persistence** | Data must survive server restarts, browser refreshes, and session timeouts. The user's entries and accounts must be durable — no data loss on normal operation. |
| **NFR-4** | **Volume** | The system must handle at least 5,000 entries across up to 20 accounts without perceptible dashboard slowdown. |
| **NFR-5** | **Performance** | Dashboard KPI cards, category chart, and account summary must render in ≤ 2 seconds on a cold load with 1,000 entries and 10 accounts. Entry save (create/edit/delete) must complete and update the UI in ≤ 1 second. |
| **NFR-6** | **Offline** | **v1: Online-only.** The app requires an active internet connection. No offline-entry queue, no local-first sync. Confirmed by Gino. |
| **NFR-7** | **Accessibility** | The dashboard must meet **WCAG 2.1 Level AA** minimum: (a) all KPI cards, chart data, and account balances have text equivalents, (b) color is never the sole differentiator for category identity, account type, or status, (c) all interactive elements are keyboard-navigable, (d) form fields have visible labels and error messages are announced to screen readers. |
| **NFR-8** | **Browser Support** | The app must function correctly on the latest stable versions of Chrome, Firefox, Edge, and Safari (desktop). Mobile browser support is P2 — the dashboard should be usable but is not required to be mobile-optimized in v1. |
| **NFR-9** | **Data Portability** | The user must be able to export all their entries in CSV format with columns: ID, type (income/expense), amount, date, category, account, note, created-at, updated-at. Accounts should also be exportable (ID, name, type, description). CSV is sufficient for v1. Confirmed by Gino. |
| **NFR-10** | **Error Handling** | All server errors must return user-facing messages that do not expose stack traces, database schemas, or internal paths. Validation errors must reference the specific field that failed. |
| **NFR-11** | **Currency** | **v1: Single currency (PHP).** All amounts are in Philippine Pesos. No multi-currency support, no conversion logic. A currency label (₱) on entries and account balances is acceptable. Confirmed by Gino. |
| **NFR-12** | **Hosting** | **v1: Self-hosted / local first.** The app runs on the user's own machine or home server. Can move to cloud later. Confirmed by Gino. |
| **NFR-13** | **Account Data Integrity** | Account balances must be derivable from entries at all times. The system must not store a cached balance that can drift from the sum of entries. Balance is always computed, never stored. |

---

## 7. MVP boundary

### In v1 (must ship)

| Area | What's included |
|------|----------------|
| **Account management** | Create, edit, delete accounts. Five account types: Debit, Credit, Lent, Borrowed, Invest. Per-account balance view. Account summary on dashboard. |
| **Entry logging** | Manual income + expense entry with amount, date, category, account (required), optional note |
| **Categories** | 10 default expense categories + 6 default income categories + ability to create/rename/delete custom categories |
| **Dashboard KPIs** | Total Income, Total Expenses, Net Balance — all period-aware |
| **Category chart** | Donut/bar chart showing expense breakdown by category |
| **Income chart** | Donut/bar chart showing income breakdown by income category |
| **Time filters** | This Month (default), Last Month, Last 3 Months, This Year, All Time |
| **Month-over-month** | Current vs. prior month comparison with directional indicator and % change |
| **Entry management** | Edit and delete individual entries |
| **Data integrity** | Durable persistence; no data loss on restart/refresh; account-entry referential integrity; computed (not cached) account balances |
| **Accessibility** | WCAG 2.1 AA baseline (keyboard nav, screen-reader labels, color-not-sole-differentiator) |
| **Data export** | CSV export of all entries (with account column) and accounts |

### Deferred to v2 (explicitly out of v1 scope)

- Recurring/scheduled expenses (auto-log rent on the 1st)
- Budget targets and alerts ("You've spent 80% of your Dining Out budget")
- Multi-household support
- Multi-user / shared household access
- CSV/PDF import (bank statement ingestion)
- Receipt image upload/attachment
- Savings goals / goal tracking
- Mobile-native app or mobile-optimized responsive layout
- Dark mode
- Bank-sync / Plaid integration
- AI-powered categorization or spending insights
- Custom date range filter (FR-23 is P2 — may ship in v1 if trivial, but not a v1 blocker)
- Account-to-account transfers (moving money between Debit accounts)
- Partial repayment tracking for Lent/Borrowed accounts (v1: single repayment = full settlement of the account)
- Multi-currency support

---

## 8. Open questions (for Gino at G1 revision)

1. **Account deletion with entries — reassign or cascade-delete?** FR-3 proposes two options: (a) reassign entries to another account, or (b) delete the account AND all its entries. Is a third option needed — "archive" the account (hide it but preserve entries)? Archiving is common in accounting software but adds complexity. Which approach(es) should v1 support?

2. **Per-account balance — period-filtered or all-time?** FR-5 defines per-account balance as the sum of ALL entries in that account (all-time). Should the account balance also respect the dashboard's time filter? E.g., if the dashboard is filtered to "This Month," should the account balance show only this month's activity, or always the all-time balance? Recommendation: account balance is always all-time (it represents "how much is in this account right now"), while dashboard KPIs are period-filtered. Confirm or override.

3. **Payment method — keep as separate field or replace with account?** v1 BRD included "payment method" as a field on expense entries. With accounts now in the MVP, the account itself indicates the source/destination of funds. Recommendation: remove "payment method" as a separate field — the account selection replaces it. If the user pays for groceries from their BPI Savings account, the account IS the payment method. This reduces entry friction (one less field). Confirm or override.

4. **Lent/Borrowed accounts — how are repayments logged?** When the user lends ₱5,000 to Mark (Lent account) and Mark repays ₱2,000, how is the repayment recorded? Options: (a) log an income entry to the same Lent account (reduces the balance), (b) a dedicated "repayment" entry type, (c) a transfer from Lent account to a Debit account. Recommendation for v1: option (a) — log income to the Lent account. The balance formula handles it (lent − repaid). A dedicated repayment flow can come in v2. Confirm or override.

5. **Credit account balance — positive or negative display?** For Credit accounts, the balance represents a liability (money owed). Should it display as a positive number (₱15,000 = you owe ₱15,000) or a negative number (−₱15,000)? Positive is more intuitive for non-accountants ("I've charged ₱15,000 on this card"). Negative is more technically correct (it's a liability). Recommendation: display as positive with a "liability" indicator (e.g., red color, "(owed)" label). Confirm or override.

6. **Invest accounts — how are gains/losses tracked?** FR-5 defines Invest balance as total invested (cost basis). Market gains/losses are not tracked — the user would need to manually adjust. Is cost-basis-only sufficient for v1, or should the user be able to record a "current value" separately from cost basis? Recommendation: cost-basis-only for v1. Market value tracking is a v2 feature. Confirm or override.

7. **Default account on first launch?** Should the system auto-create a default Debit account (e.g., "Cash" or "My Wallet") on first launch so the user can start logging entries immediately without creating an account first? Or should account creation be an explicit first step? Recommendation: auto-create a "Cash" (Debit) account on first launch. The user can rename, add more, or delete it later. This avoids a blank-state dead end. Confirm or override.

---

## 9. Sign-off

- **Approved by Gino at G1 on:** 2026-07-10 17:44 (PHT)  ·  **Notes:** Approved with analyst's recommended answers to all 7 open questions. Q1: reassign or cascade-delete (no archive). Q2: all-time balance. Q3: drop payment method, account replaces it. Q4: repayments as income to same Lent/Borrowed account. Q5: positive with liability indicator. Q6: cost-basis only. Q7: auto-create "Cash" (Debit) account on first launch.

### Resolved open questions (G1 sign-off, 2026-07-10)

| # | Question | Resolution |
|---|----------|------------|
| Q1 | Account deletion with entries | Reassign or cascade-delete. No archive in v1. |
| Q2 | Per-account balance scope | All-time (not period-filtered). KPIs are period-filtered; account balances aren't. |
| Q3 | Payment method vs account | **Payment method field removed.** Account selection replaces it. |
| Q4 | Lent/Borrowed repayments | Log as income entry to the same Lent/Borrowed account. Balance formula handles it. |
| Q5 | Credit balance display | Positive number with liability indicator (red color / "(owed)" label). |
| Q6 | Invest account tracking | Cost-basis only for v1. Market value = v2. |
| Q7 | Default account on first launch | Auto-create a "Cash" (Debit) account on first launch. |

---

## Appendix A: Sources cited

1. "I Tested 9 Expense Tracker Apps for 3 Months — Here's What Actually Worked" — Digital Dashboard Hub (2026). https://digitaldashboardhub.com/best-expense-tracker-app-tested-2026/
2. "What the Typical Finance Tracking App Gets Wrong About Households" — Woodo Finance (2026). https://woodofinance.com/blog/finance-tracking-app-for-households-what-goes-wrong
3. "Why Most Budget Apps Fail After 90 Days" — TheFrontKit (2026). https://thefrontkit.com/blogs/why-most-budget-apps-fail-after-90-days
4. "I built a budget tracker in a weekend — here's what I learned about why people hate finance apps" — dev.to / eastkap (2026). https://dev.to/eastkap/i-built-a-budget-tracker-in-a-weekend-heres-what-i-learned-about-why-people-hate-finance-apps-46km
5. "Fintech Dashboard Design: Patterns That Work (And the Mistakes That Kill Retention)" — Masterly (2026). https://www.themasterly.com/blog/fintech-dashboard-design-guide
6. "10 Best Expense Tracker Apps for 2026" — The Money Decoded (2026). https://themoneydecoded.com/blog/best-expense-tracking-apps
7. "Best Personal Finance Apps in 2026: Features, Pricing, and Honest Picks" — Finny Blog (2026). https://getfinny.app/blog/best-personal-finance-apps-2026
8. "Account Types in YNAB (Budget, Loan, and Tracking): An Overview" — YNAB Support (2026). https://support.ynab.com/en_us/account-types-an-overview-BkmGM0qCq
9. "Spend Split — Budget Planner, Bill Split & IOU Tracker" — SpendWise (2026). https://www.getspendwise.co/

## Appendix B: Requirement summary

| Priority | Count | IDs |
|:--------:|:-----:|-----|
| **P0** | 14 | FR-1, FR-4, FR-5, FR-6, FR-7, FR-8, FR-12, FR-13, FR-16, FR-17, FR-21, FR-22, FR-26, FR-27 |
| **P1** | 9 | FR-2, FR-3, FR-9, FR-10, FR-14, FR-18, FR-19, FR-20, FR-24 |
| **P2** | 4 | FR-11, FR-15, FR-23, FR-25 |
| **Total FRs** | **27** | (up from 16 in v1) |
| **NFRs** | **13** | NFR-1 through NFR-13 (up from 10 in v1) |
| **Open questions** | **7** | Q1–Q7 (down from 10 in v1; 3 resolved, 7 new) |

---

## Appendix C: Revision changelog (v1 → v2)

| Change | Detail |
|--------|--------|
| **Added: Accounts entity** | New section 5.1 with 6 FRs (FR-1 through FR-6) covering account CRUD, types, and balance views. |
| **Modified: Entry FRs** | FR-7 (expense) and FR-8 (income) now require account selection. FR-9 (edit) allows changing account. FR-10 (delete) shows account name in confirmation. FR-20 (recent entries) includes account name. |
| **Added: Income categories** | FR-13 adds income categorization with 6 default categories (Salary, Freelance, Gift, Investment, Refund, Other Income). FR-18 adds income breakdown chart. |
| **Added: Account dashboard summary** | FR-21 requires account balances visible on/from dashboard. |
| **Added: Data integrity FRs** | FR-26 (referential integrity) and FR-27 (balance consistency) added. |
| **Updated: Categories** | Default expense categories expanded from 8 to 10 (added Subscriptions, Insurance per Gino). |
| **Updated: NFRs** | NFR-1 (single-user confirmed), NFR-6 (online-only confirmed), NFR-9 (CSV columns specified), NFR-11 (PHP only, new), NFR-12 (self-hosted, new), NFR-13 (computed balances, new). NFR-4 (volume updated to include accounts). |
| **Updated: MVP boundary** | Accounts section added to v1 scope. Income chart added. Deferred list updated (transfers, partial repayments, multi-currency). |
| **Updated: Personas** | All three personas updated with account-related jobs-to-be-done. |
| **Updated: Research** | Added Spend Split (lending tracker) and YNAB account types to comparable products. Added account-level tracking and lending/borrowing patterns. |
| **Resolved: Q1** | Single-user confirmed. |
| **Resolved: Q2** | Single currency (PHP) confirmed. |
| **Resolved: Q4** | CSV columns specified. |
| **Resolved: Q5** | Online-only confirmed. |
| **Resolved: Q6** | Default categories confirmed + expanded. |
| **Resolved: Q7** | Income categorization confirmed. |
| **Resolved: Q8** | Period net confirmed for dashboard; per-account balance added as separate concept. |
| **Resolved: Q9** | No created_by field for v1. |
| **Resolved: Q10** | Self-hosted/local confirmed. |
| **Open: Q3 (v1)** | Payment method vs. account — now re-framed as new Open Question #3 with recommendation. |
| **New: Q1–Q7** | Seven new open questions from accounts feature (deletion handling, balance filtering, repayments, credit display, invest tracking, default account). |
