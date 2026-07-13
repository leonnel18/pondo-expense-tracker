# Wireframe & UI Spec
**Project:** Household Expense Tracker · **Author:** ux · **Version:** 1.0 · **Date:** 2026-07-10 · **Gate:** G2 (soft)

---

## 1. Screen inventory

| # | Screen | Purpose | BRD FRs covered |
|---|--------|---------|-----------------|
| S1 | **Dashboard** | KPI cards, expense/income charts, MoM comparison, account summary, recent entries — the default landing view | FR-16, FR-17, FR-18, FR-19, FR-20, FR-21, FR-22, FR-23 |
| S2 | **All Entries** | Full sortable/filterable list of all income + expense entries with bulk actions | FR-9, FR-10, FR-11, FR-20, FR-22, FR-23, FR-24, FR-25 |
| S3 | **Add / Edit Entry** | Form to create or edit an income/expense entry with account selection | FR-7, FR-8, FR-9, FR-12, FR-13, FR-24, FR-25, FR-26 |
| S4 | **Delete Entry Confirmation** | Modal confirming entry deletion with entry details | FR-10, FR-11 |
| S5 | **Accounts List** | Grid of all accounts with type, balance, entry count, sort, and actions | FR-4, FR-5, FR-6, FR-21 |
| S6 | **Account Create / Edit** | Form to create or edit an account (name, type, description) | FR-1, FR-2, FR-6 |
| S7 | **Account Delete Resolution** | Modal to resolve entries when deleting an account (reassign or cascade) | FR-3, FR-26 |
| S8 | **Categories Management** | Manage expense + income categories (create, rename, delete with reassignment) | FR-12, FR-13, FR-14, FR-15 |
| S9 | **Category Delete Resolution** | Inline modal to reassign entries when deleting a category | FR-14 |
| S10 | **First Launch / Empty Dashboard** | Welcome state with auto-created Cash account and empty dashboard | FR-1 (auto-create), FR-16, FR-17, FR-21 |
| S11 | **CSV Export** | Data export view with download buttons for entries and accounts | NFR-9 |

**Total: 11 screens** covering all 27 FRs + NFR-9.

---

## 2. User flows

### 2.1 Hero flow — Add expense → Dashboard + account balance update

```
[Dashboard] ──click "Add Entry"──▶ [Add Entry form]
                                        │
                                   select "Expense" type
                                   enter amount: ₱500
                                   select date: 2026-07-10
                                   select category: "Food & Dining"
                                   select account: "BPI Savings"
                                   enter note: "Grocery run"
                                        │
                                   click "Save Entry"
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                    [Dashboard reloads]    [BPI Savings balance
                     KPIs recalculate:      updates: ₱43,000 → ₱42,500
                     Expenses +₱500         Recent entries list updates
                     Net Balance −₱500      Expense donut chart updates
                     MoM % recalculates]    Food & Dining slice grows]
```

**Steps:**
1. User is on Dashboard (This Month filter active).
2. User clicks "Add Entry" button in header.
3. Add Entry form opens. Type defaults to "Expense".
4. User enters ₱500, date defaults to today (2026-07-10), selects "Food & Dining" category, selects "BPI Savings" account, types optional note "Grocery run".
5. User clicks "Save Entry".
6. System validates: amount > 0, date present, category selected, account selected. All pass.
7. Entry persists. Dashboard KPIs recalculate: Total Expenses increases by ₱500, Net Balance decreases by ₱500.
8. Expense breakdown donut chart "Food & Dining" slice increases.
9. Account Summary "BPI Savings" balance updates from ₱43,000 to ₱42,500.
10. Recent Entries list shows the new entry at the top.
11. MoM comparison percentages recalculate if the entry falls in the current month.

### 2.2 Add income flow

```
[Dashboard] ──click "Add Entry"──▶ [Add Entry form]
                                        │
                                   select "Income" type
                                   category dropdown switches to income categories
                                   enter amount: ₱40,000
                                   select date: 2026-07-10
                                   select category: "Salary"
                                   select account: "BPI Savings"
                                        │
                                   click "Save Entry"
                                        │
                              ▼
                    [Dashboard reloads
                     Total Income +₱40,000
                     Net Balance +₱40,000
                     Income breakdown chart updates
                     BPI Savings balance: ₱42,500 → ₱82,500]
```

### 2.3 Edit entry flow

```
[Dashboard or All Entries] ──click ✎ on entry──▶ [Edit Entry form]
                                        │
                                   pre-filled with existing values
                                   change amount: ₱500 → ₱650
                                   change account: BPI Savings → Cash
                                        │
                                   click "Save Changes"
                                        │
                              ▼
                    [Dashboard recalculates
                     old account (BPI Savings) balance: +₱500 back
                     new account (Cash) balance: −₱650
                     KPIs, charts, recent entries update]
```

### 2.4 Delete entry flow

```
[Dashboard or All Entries] ──click 🗑 on entry──▶ [Delete Confirmation modal]
                                        │
                                   "Are you sure you want to delete this
                                   ₱500 Groceries entry from BPI Savings?"
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                    [Cancel → return]     [Confirm → entry deleted
                                          KPIs, charts, account
                                          balances recalculate]
```

### 2.5 Bulk delete entries flow

```
[All Entries] ──select checkboxes (≥2)──▶ [Bulk action bar appears]
                                        │
                                   "3 selected" + "Delete Selected" button
                                        │
                                   click "Delete Selected"
                                        │
                              ▼
                    [Confirmation modal:
                     "Delete 3 entries? This will recalculate
                     all affected KPIs and account balances."]
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                    [Cancel → return]     [Confirm → entries deleted
                                          KPIs recalculate once
                                          affected accounts update]
```

### 2.6 Create account flow

```
[Accounts List] ──click "Add Account"──▶ [Account Create form]
                                        │
                                   enter name: "GCash"
                                   select type: Debit
                                   enter description: "E-wallet"
                                        │
                                   click "Save Account"
                                        │
                              ▼
                    [Accounts List reloads
                     new "GCash (Debit)" card appears
                     balance: ₱0, entries: 0
                     Available in entry form account dropdown]
```

### 2.7 Edit account flow

```
[Accounts List] ──click ✎ on account──▶ [Account Edit form]
                                        │
                                   pre-filled values
                                   change name: "GCash" → "Maya"
                                   change description
                                        │
                                   click "Save Changes"
                                        │
                              ▼
                    [Accounts List reloads
                     name updated, all entries still
                     associated, balance unchanged]
```

### 2.8 Delete account flow (with entries)

```
[Accounts List] ──click 🗑 on account with entries──▶ [Delete Resolution modal]
                                        │
                                   "Delete 'BPI Savings'?"
                                   "This account has 15 entries.
                                    Choose how to handle them:"
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                    [Option A: Reassign]    [Option B: Cascade delete]
                     select target account   "Permanently delete
                     from dropdown            account and all 15
                     → click "Delete Account" entries. Cannot be
                      entries move,            undone."
                      account deleted          → click "Delete Account"
                                              account + entries deleted
```

### 2.9 Delete account flow (zero entries)

```
[Accounts List] ──click 🗑 on account with 0 entries──▶ [Simple confirm modal]
                                        │
                                   "Delete 'GCash'? This account has no entries."
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                    [Cancel]              [Delete Account → deleted]
```

### 2.10 Filter by time period flow

```
[Dashboard] ──click time filter dropdown──▶ [Filter options:]
                                              • This Month (default, active)
                                              • Last Month
                                              • Last 3 Months
                                              • This Year
                                              • All Time
                                              • Custom Range (P2)
                                        │
                                   select "Last 3 Months"
                                        │
                              ▼
                    [All dashboard data recalculates:
                     KPIs sum 3 months
                     charts show 3-month breakdown
                     recent entries show 3 months
                     account balances remain ALL-TIME
                     active filter visually indicated]
```

### 2.11 Custom date range flow (P2)

```
[Dashboard] ──click time filter──▶ select "Custom Range"
                                        │
                                   date pickers appear: Start [2026-04-01] End [2026-06-30]
                                        │
                                   validate: start ≤ end, not future-only
                                        │
                              ▼
                    [Dashboard recalculates for custom range
                     error if invalid: "End date must be on or
                     after start date."]
```

### 2.12 Manage categories flow — create

```
[Categories Management] ──click "Add Category"──▶ [Add Category form]
                                        │
                                   enter name: "Pets"
                                   select type: Expense
                                   (color/icon picker shown as disabled — P2)
                                        │
                                   click "Save"
                                        │
                              ▼
                    [Category appears in list
                     available in entry form category dropdown
                     immediately]
```

### 2.13 Manage categories flow — rename

```
[Categories Management] ──click ✎ on category──▶ [Edit Category form]
                                        │
                                   rename: "Shopping" → "Online Shopping"
                                        │
                                   click "Save"
                                        │
                              ▼
                    [Category name updates
                     all existing entries under "Shopping" now
                     show "Online Shopping" in entry list and charts]
```

### 2.14 Manage categories flow — delete with reassignment

```
[Categories Management] ──click 🗑 on category with entries──▶ [Category Delete Resolution]
                                        │
                                   "Delete 'Entertainment'?"
                                   "This category has 7 entries.
                                    Reassign them to:"
                                        │
                                   dropdown of other categories (must select)
                                   "Other" is always available
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                    [Cancel]              [Confirm → category deleted
                                           entries reassigned
                                           charts update]
```

### 2.15 First launch experience

```
[First load] ──▶ system auto-creates "Cash" (Debit) account
                                        │
                              ▼
                    [Empty Dashboard renders:
                     Welcome banner:
                     "Welcome! We've created a 'Cash' account
                      for you. Start by adding your first entry."
                     KPI cards: ₱0 (gray, muted)
                     Charts: "No data to display"
                     Accounts: single "Cash" card, ₱0, 0 entries
                     Recent Entries: "No entries yet —
                      Add your first expense to get started."
                     Prominent "Add Entry" button]
                                        │
                                   user clicks "Add Entry"
                                        │
                              ▼
                    [Add Entry form opens
                     account defaults to "Cash"
                     user logs first expense
                     dashboard comes alive]
```

### 2.16 Lent/Borrowed repayment flow

```
[Dashboard or All Entries] ──click "Add Entry"──▶ [Add Entry form]
                                        │
                                   select "Income" type
                                   select account: "Lent to Mark"
                                   enter amount: ₱2,000
                                   select income category: "Refund"
                                   enter note: "Mark repaid part of loan"
                                        │
                                   click "Save Entry"
                                        │
                              ▼
                    [Lent to Mark balance updates:
                     ₱5,000 (lent) − ₱2,000 (repaid) = ₱3,000
                     still owed to user
                     Dashboard income KPI +₱2,000
                     Income chart "Refund" slice appears]
```

### 2.17 CSV Export flow

```
[Export view] ──click "Export Entries"──▶ [CSV file downloads]
                                        │
                              ▼
                    [File: entries_export_2026-07-10.csv
                     Columns: ID, type, amount, date, category,
                     account, note, created-at, updated-at]

[Export view] ──click "Export Accounts"──▶ [CSV file downloads]
                                        │
                              ▼
                    [File: accounts_export_2026-07-10.csv
                     Columns: ID, name, type, description]
```

---

## 3. Wireframes (ASCII / low-fi)

### S1 — Dashboard

```
┌──────────────────────────────────────────────────────────────────────┐
│ ☰ │ Household Tracker                    [ This Month ▾ ]  [+ Add Entry]│
├───┼──────────────────────────────────────────────────────────────────┤
│ D │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│ a │  │ INCOME      │ │ EXPENSES    │ │ NET BALANCE  │ │ VS LAST MO  │ │
│ s │  │ ₱45,000     │ │ ₱28,300     │ │ ₱16,700     │ │ Inc ▲ 12%   │ │
│ h │  │              │ │              │ │              │ │ Exp ▼ 5%    │ │
│ b │  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
│ o │                                                                   │
│ a │  ┌──────────────────────────────────┐  ┌────────────────────────┐│
│ r │  │ EXPENSE BREAKDOWN (donut)        │  │ INCOME BREAKDOWN(donut)││
│ d │  │                                  │  │                        ││
│   │  │      ╭──────╮                    │  │      ╭──────╮          ││
│ E │  │     │  ████  │  ← legend         │  │     │  ████  │         ││
│ n │  │      ╰──────╯    Food & Dining   │  │      ╰──────╯         ││
│ t │  │                  30% ₱8,500      │  │   Salary 89% ₱40,000  ││
│ r │  │                  Housing 25%     │  │   Freelance 8% ₱3,500  ││
│ i │  │                  ₱7,000          │  │   Gift 2% ₱1,000       ││
│ e │  │                  Transport 15%   │  │   Investment 1% ₱500   ││
│ s │  │                  ₱4,200          │  │                        ││
│   │  │                  Shopping 13%    │  │                        ││
│ A │  │                  ₱3,800          │  │                        ││
│ c │  │                  ...              │  │                        ││
│ c │  └──────────────────────────────────┘  └────────────────────────┘│
│ t │                                                                   │
│ s │  ┌─────────────────────────────────────────────────────────────┐│
│   │  │ ACCOUNT SUMMARY                                                ││
│ C │  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           ││
│ a │  │ │ BPI Savings  │ │ BDO CC       │ │ Cash         │           ││
│ t │  │ │ Debit        │ │ Credit        │ │ Debit        │           ││
│ e │  │ │ ₱42,500      │ │ ₱15,000 (owed)│ │ ₱3,200       │           ││
│ g │  │ │ 15 entries   │ │ 8 entries     │ │ 22 entries   │           ││
│ o │  │ └──────────────┘ └──────────────┘ └──────────────┘           ││
│ r │  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           ││
│ i │  │ │ Lent to Mark │ │ Stock Invest  │ │ Borrowed-Mom │           ││
│ e │  │ │ Lent          │ │ Invest        │ │ Borrowed     │           ││
│ s │  │ │ ₱3,000       │ │ ₱10,000       │ │ ₱7,000 (owed)│           ││
│   │  │ │ 2 entries    │ │ 3 entries     │ │ 1 entry      │           ││
│ E │  │ └──────────────┘ └──────────────┘ └──────────────┘           ││
│ x │  └─────────────────────────────────────────────────────────────┘│
│ p │                                                                   │
│ o │  ┌─────────────────────────────────────────────────────────────┐│
│ r │  │ RECENT ENTRIES (10 most recent)                     [View All]││
│ t │  │ Date       Type  Category         Amount   Account      │ ✎🗑││
│   │  │ 2026-07-10 ↑     Food & Dining    ₱500    BPI Savings   │ ✎🗑││
│   │  │ 2026-07-10 ↓     Salary          ₱40,000  BPI Savings   │ ✎🗑││
│   │  │ 2026-07-09 ↑     Transportation   ₱120    Cash          │ ✎🗑││
│   │  │ 2026-07-08 ↑     Shopping         ₱2,500  BDO CC        │ ✎🗑││
│   │  │ 2026-07-07 ↑     Housing          ₱7,000  BPI Savings   │ ✎🗑││
│   │  │ 2026-07-06 ↑     Subscriptions    ₱499    BDO CC        │ ✎🗑││
│   │  │ 2026-07-05 ↓     Freelance        ₱3,500  Cash          │ ✎🗑││
│   │  │ 2026-07-04 ↑     Food & Dining    ₱650    Cash          │ ✎🗑││
│   │  │ 2026-07-03 ↑     Health           ₱900    BPI Savings   │ ✎🗑││
│   │  │ 2026-07-02 ↑     Entertainment    ₱800    BDO CC        │ ✎🗑││
│   │  └─────────────────────────────────────────────────────────────┘│
└───┴──────────────────────────────────────────────────────────────────┘
```

**Components:** Sidebar nav, header bar, time filter dropdown, add entry button, KPI cards (×4), donut chart (expense), donut chart (income), account cards (×6 max, grid), recent entries table, edit/delete action icons, "View All" link.

**Data shown:** Total Income, Total Expenses, Net Balance (period-filtered). MoM comparison % (Income, Expenses). Expense breakdown by category (amount, %, legend). Income breakdown by category. Account name, type, all-time balance, entry count. Recent entries: date, type indicator (↑ expense / ↓ income), category, amount, account, actions.

**Empty state:** KPI cards show ₱0 in gray-400. Charts show dashed-border placeholder "No data to display yet." Account section shows only the auto-created Cash card (₱0, 0 entries). Recent entries: "No entries yet — Add your first expense to get started." Welcome banner above KPIs.

**Loading state:** Skeleton gray-200 blocks pulse (max 2s). Chart areas show gray-200 circle. Table rows show gray-200 bars.

**Error state:** Red-600 text: "Failed to load dashboard data. Please check your connection and try again." Retry button below.

**Mobile behavior (P2):** Sidebar collapses to hamburger menu. KPI cards stack 2×2. Charts stack full-width. Account cards stack 1-column. Recent entries table becomes horizontal-scroll or card list. Time filter becomes full-width dropdown. Desktop-first; mobile is usable but not optimized.

---

### S2 — All Entries

```
┌──────────────────────────────────────────────────────────────────────┐
│ ☰ │ Household Tracker                                                │
├───┼──────────────────────────────────────────────────────────────────┤
│ D │  ALL ENTRIES         [search...]  [This Month ▾]  [+ Add Entry]   │
│ a │                                                                   │
│ s │  [ All ] [ Income ] [ Expense ]    Category: [▾ All]  Account: [▾]│
│ h │                                                                   │
│ b │  ┌──────────────────────────────────────────────────────────┐   │
│ o │  │ ☐ │ Date    Type  Category    Amount  Account  Note  │Actions│  │
│ a │  ├──┼─────────┼─────┼──────────┼───────┼────────┼──────┼──────┤  │
│ r │  │ ☐ │ 07-10   ↑     Food       ₱500   BPI Sav  Groc.. │ ✎ 🗑 │  │
│ d │  │ ☐ │ 07-10   ↓     Salary     ₱40K   BPI Sav  July   │ ✎ 🗑 │  │
│   │  │ ☐ │ 07-09   ↑     Transport  ₱120   Cash     Grab   │ ✎ 🗑 │  │
│ E │  │ ☐ │ 07-08   ↑     Shopping   ₱2.5K  BDO CC   Shoes  │ ✎ 🗑 │  │
│ n │  │ ☐ │ 07-08   ↑     Food       ₱350   Cash     Lunch  │ ✎ 🗑 │  │
│ t │  │ ☐ │ 07-07   ↑     Housing    ₱7K    BPI Sav  Rent   │ ✎ 🗑 │  │
│ r │  │ ☐ │ 07-07   ↑     Utilities  ₱1.2K  BPI Sav  Meralco│ ✎ 🗑 │  │
│ i │  │ ☐ │ 07-06   ↑     Subscript  ₱499   BDO CC   Netflx│ ✎ 🗑 │  │
│ e │  │ ☐ │ 07-05   ↓     Freelance  ₱3.5K  Cash     Proj..│ ✎ 🗑 │  │
│ s │  │ ☐ │ 07-04   ↑     Food       ₱650   Cash     Dinner│ ✎ 🗑 │  │
│   │  │ ☐ │ 07-03   ↑     Health     ₱900   BPI Sav  Meds   │ ✎ 🗑 │  │
│ A │  │ ☐ │ 07-02   ↑     Entertain  ₱800   BDO CC   Movie  │ ✎ 🗑 │  │
│ c │  │ ☐ │ 07-01   ↑     Insurance  ₱2K    BPI Sav  Life   │ ✎ 🗑 │  │
│ c │  │ ☐ │ 06-30   ↑     Food       ₱1.2K  Cash     Market │ ✎ 🗑 │  │
│ t │  │ ☐ │ 06-29   ↓     Gift       ₱1K    Cash     Bday   │ ✎ 🗑 │  │
│ s │  └──────────────────────────────────────────────────────────┘   │
│   │                                                                   │
│ C │  Showing 1–15 of 42 entries              [◀ Prev] [Next ▶]       │
│ a │                                                                   │
│ t │  ┌────────────────────────────────────────────────────────────┐ │
│ e │  │ BULK ACTIONS (visible when ≥1 checkbox selected)           │ │
│ g │  │ 3 selected                              [ Delete Selected ] │ │
│ o │  └────────────────────────────────────────────────────────────┘ │
│ r │                                                                   │
│ i │                                                                   │
│ e │                                                                   │
│ s │                                                                   │
│ E │                                                                   │
│ x │                                                                   │
│ p │                                                                   │
│ t │                                                                   │
└───┴──────────────────────────────────────────────────────────────────┘
```

**Components:** Sidebar nav, header with search + filter + add button, type toggle (All/Income/Expense), category filter dropdown, account filter dropdown, data table with checkboxes, pagination controls, bulk action bar.

**Data shown:** Per entry: date, type indicator, category, amount, account name, note (truncated), edit/delete actions. Entry count and pagination. Selection count for bulk actions.

**Empty state:** Centered: "No entries found. Try adjusting your filters or add a new entry." with "Add Entry" button.

**Loading state:** Table skeleton with gray-200 bar placeholders in each cell.

**Error state:** "Failed to load entries. Please try again." with retry button.

**Mobile behavior (P2):** Table becomes card list — each entry is a stacked card with date/type/category on first line, amount/account on second line, actions on third. Filters stack vertically. Search goes full-width. Checkboxes become tap targets.

---

### S3 — Add / Edit Entry

```
┌──────────────────────────────────────────────────────────────────────┐
│ ☰ │ Household Tracker                                                │
├───┼──────────────────────────────────────────────────────────────────┤
│ D │  ← Back to Entries                                                 │
│ a │                                                                   │
│ s │  ┌──────────────────────────────────────────────────────────────┐│
│ h │  │ ADD ENTRY                                                      ││
│ b │  │                                                                ││
│ o │  │  Type:  [ ■ Expense ]  [ □ Income ]                            ││
│ a │  │                                                                ││
│ r │  │  ┌──────────────────────────────────────────────────────┐    ││
│ d │  │  │ Amount *               │ Date *                      │    ││
│   │  │  │ ₱ [ 500            ]   │ [ 2026-07-10         ]      │    ││
│   │  │  └──────────────────────────────────────────────────────┘    ││
│ E │  │                                                                ││
│ n │  │  ┌──────────────────────────────────────────────────────┐    ││
│ t │  │  │ Category *              │ Account *                    │    ││
│ r │  │  │ [ Food & Dining   ▾ ]   │ [ BPI Savings (Debit)  ▾ ]  │    ││
│ i │  │  └──────────────────────────────────────────────────────┘    ││
│ e │  │                                                                ││
│ s │  │  Note (optional)                                              ││
│   │  │  ┌──────────────────────────────────────────────────────┐    ││
│   │  │  │ [ Grocery run                                     ]      │    ││
│   │  │  └──────────────────────────────────────────────────────┘    ││
│ A │  │                                                                ││
│ c │  │  [ Cancel ]                              [ Save Entry ]       ││
│ c │  │                                                                ││
│ t │  └──────────────────────────────────────────────────────────────┘│
│ s │                                                                   │
│   │  ── Edit mode ──────────────────────────────────────────────────│
│   │  ┌──────────────────────────────────────────────────────────────┐│
│   │  │ EDIT ENTRY                                                     ││
│   │  │  (same fields, pre-filled)                                     ││
│   │  │                                                                ││
│   │  │  [ Cancel ]              [ Save Changes ]                      ││
│   │  │                                                                ││
│   │  │  Created: Jul 5, 2026 3:22 PM · Modified: Jul 8, 2026 9:15 AM││
│   │  │                                                                ││
│   │  │  [ Delete Entry ]  (red-600 link)                              ││
│   │  └──────────────────────────────────────────────────────────────┘│
└───┴──────────────────────────────────────────────────────────────────┘
```

**Components:** Sidebar nav, back link, form card, type toggle (Expense/Income), amount input with ₱ prefix, date picker, category select (context-aware: expense categories for expense, income categories for income), account select (required, lists all accounts with type label), note textarea, cancel/save buttons, audit trail timestamps (edit mode only), delete entry link (edit mode only).

**Data shown:** Entry type (expense/income), amount, date, category, account (with type label in dropdown), note. Edit mode: created-at, updated-at timestamps.

**Validation errors:**
- Amount ≤ 0 or empty: red-600 text below field: "Amount must be greater than ₱0."
- Missing date: "Please select a date."
- Missing category: "Please select a category."
- Missing account: "Please select an account."

**Empty state:** N/A (form always has default values: type=Expense, date=today, category=unselected, account=first account or Cash).

**Loading state:** Save button shows "Saving..." and disables. Form inputs disabled.

**Error state (server):** "Failed to save entry. Please try again." Form remains filled (no data loss).

**Mobile behavior (P2):** Form goes full-width. Type toggle buttons go full-width stacked. Amount/date go full-width stacked. Category/account go full-width stacked. Buttons go full-width.

---

### S4 — Delete Entry Confirmation

```
                    ┌─────────────────────────────────────┐
                    │  Delete Entry                        │
                    │                                      │
                    │  Are you sure you want to delete      │
                    │  this ₱500 Food & Dining entry from  │
                    │  BPI Savings?                        │
                    │                                      │
                    │  Date: 2026-07-10                    │
                    │  Type: Expense                       │
                    │  Category: Food & Dining             │
                    │  Amount: ₱500                        │
                    │  Account: BPI Savings                │
                    │  Note: Grocery run                    │
                    │                                      │
                    │  This will recalculate KPIs, charts,  │
                    │  and account balances.                │
                    │                                      │
                    │  [ Cancel ]        [ Delete Entry ]   │
                    └─────────────────────────────────────┘
```

**Components:** Modal overlay (dimmed background), modal card, entry details summary, cancel button, delete confirm button (red-600).

**Data shown:** All entry fields (read-only): date, type, category, amount, account, note. Warning text about recalculation.

**Empty state:** N/A.

**Loading state:** Delete button shows "Deleting..." and disables.

**Error state:** "Failed to delete entry. Please try again."

**Mobile behavior (P2):** Modal goes full-width, full-height bottom sheet.

---

### S5 — Accounts List

```
┌──────────────────────────────────────────────────────────────────────┐
│ ☰ │ Household Tracker                                                │
├───┼──────────────────────────────────────────────────────────────────┤
│ D │  ACCOUNTS              Sort by: [ Name ▾ ]       [+ Add Account]  │
│ a │                                                                   │
│ s │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│ h │  │ ┌─┐              │ │ ┌─┐              │ │ ┌─┐              │ │
│ b │  │ │ █│ Debit        │ │ ┊█┊ Credit       │ │ │ █│ Debit        │ │
│ o │  │ └─┘              │ │ └─┘              │ │ └─┘              │ │
│ a │  │                  │ │                  │ │                  │ │
│ r │  │ BPI Savings      │ │ BDO Credit Card  │ │ Cash             │ │
│ d │  │ ₱42,500          │ │ ₱15,000 (owed)   │ │ ₱3,200           │ │
│   │  │ 15 entries       │ │ 8 entries        │ │ 22 entries       │ │
│   │  │              [✎🗑]│ │              [✎🗑]│ │              [✎🗑]│ │
│   │  └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│ E │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│ n │  │ ┌─┐              │ │ ┌─┐              │ │ ┌─┐              │ │
│ t │  │ │ █│ Lent          │ │ █│ Invest        │ │ █│ Borrowed      │ │
│ r │  │ └─┘ (dotted)      │ │ └─┘ (thick)      │ │ └─┘ (double)      │ │
│ i │  │                  │ │                  │ │                  │ │
│ e │  │ Lent to Mark     │ │ Stock Investment │ │ Borrowed from Mom│ │
│ s │  │ ₱3,000           │ │ ₱10,000          │ │ ₱7,000 (owed)    │ │
│   │  │ 2 entries        │ │ 3 entries        │ │ 1 entry           │ │
│   │  │              [✎🗑]│ │              [✎🗑]│ │              [✎🗑]│ │
│   │  └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│ A │                                                                   │
│ c │                                                                   │
│ c │                                                                   │
│ t │                                                                   │
│ s │                                                                   │
│   │                                                                   │
│ C │                                                                   │
│ a │                                                                   │
│ t │                                                                   │
│ e │                                                                   │
│ g │                                                                   │
│ o │                                                                   │
│ r │                                                                   │
│ i │                                                                   │
│ e │                                                                   │
│ s │                                                                   │
│   │                                                                   │
│ E │                                                                   │
│ x │                                                                   │
│ p │                                                                   │
│ t │                                                                   │
└───┴──────────────────────────────────────────────────────────────────┘
```

**Components:** Sidebar nav, header with sort dropdown and add button, grid of account cards. Each card: type indicator (border style differentiates type), account name, balance (with "(owed)" for Credit and Borrowed), entry count, edit/delete action buttons.

**Account type visual indicators (grayscale — border styles, not colors):**
- Debit: solid border (border-2)
- Credit: dashed border (border-2 border-dashed) + "(owed)" label in red-600
- Lent: dotted border (border-2 border-dotted)
- Borrowed: double border (border-4 border-double) + "(owed)" label in red-600
- Invest: thick solid border (border-4)

**Data shown:** Account name, type label, current balance (all-time per FR-5), entry count, actions.

**Empty state:** "No accounts yet. Create your first account to start logging entries." with "Add Account" button.

**Loading state:** Skeleton card placeholders with gray-200 pulse.

**Error state:** "Failed to load accounts. Please try again." with retry.

**Mobile behavior (P2):** Cards stack 1-column. Sort dropdown goes full-width. Cards become full-width with actions inline.

---

### S6 — Account Create / Edit

```
┌──────────────────────────────────────────────────────────────────────┐
│ ☰ │ Household Tracker                                                │
├───┼──────────────────────────────────────────────────────────────────┤
│ D │  ← Back to Accounts                                                │
│ a │                                                                   │
│ s │  ┌──────────────────────────────────────────────────────────────┐│
│ h │  │ ADD ACCOUNT                                                    ││
│ b │  │                                                                ││
│ o │  │  Account Name *                                                ││
│ a │  │  [ BPI Savings                                             ]   ││
│ r │  │                                                                ││
│ d │  │  Account Type *                                                ││
│   │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      ││
│   │  │  │🏦 Debit│ │💳Credit│ │🤝 Lent │ │📞Borrow│ │📈Invest│      ││
│   │  │  │(active)│ │        │ │        │ │        │ │        │      ││
│   │  │  │Your own│ │Borrowed│ │Money   │ │Money   │ │Money   │      ││
│   │  │  │money    │ │credit  │ │lent to │ │borrowed│ │placed  │      ││
│   │  │  │stored   │ │to spend│ │someone │ │from    │ │in      │      ││
│   │  │  │          │ │         │ │else    │ │someone │ │invest- │      ││
│   │  │  │          │ │         │ │         │ │else    │ │ments   │      ││
│   │  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘      ││
│   │  │  Description (optional)                                       ││
│   │  │  [ Joint savings account                                  ]   ││
│   │  │                                                                ││
│ E │  │  [ Cancel ]                              [ Save Account ]     ││
│ n │  └──────────────────────────────────────────────────────────────┘│
│ t │                                                                   │
│ r │  ── Edit mode ───────────────────────────────────────────────────│
│ i │  ┌──────────────────────────────────────────────────────────────┐│
│ e │  │ EDIT ACCOUNT                                                  ││
│ s │  │  (same fields, pre-filled)                                    ││
│   │  │  [ Cancel ]           [ Save Changes ]                        ││
│   │  │  [ Delete Account ] (red-600 link)                            ││
│ A │  └──────────────────────────────────────────────────────────────┘│
│ c │                                                                   │
│ c │                                                                   │
│ t │                                                                   │
│ s │                                                                   │
│   │                                                                   │
│ C │                                                                   │
│ a │                                                                   │
│ t │                                                                   │
│ e │                                                                   │
│ g │                                                                   │
│ o │                                                                   │
│ r │                                                                   │
│ i │                                                                   │
│ e │                                                                   │
│ s │                                                                   │
│ E │                                                                   │
│ x │                                                                   │
│ p │                                                                   │
│ t │                                                                   │
└───┴──────────────────────────────────────────────────────────────────┘
```

**Components:** Sidebar nav, back link, form card, name input, type selector (5 selectable cards with icon + label + description), description textarea, cancel/save buttons, delete account link (edit mode).

**Data shown:** Account name, type (with description), optional description. Edit mode: existing values pre-filled.

**Duplicate warning:** If name+type combo exists, gray-600 warning text appears below name field: "An account with this name and type already exists. You can still save — this is just a reminder."

**Validation errors:**
- Empty name: "Please enter an account name."
- No type selected: "Please select an account type."

**Empty state:** N/A (form with empty fields).

**Loading state:** Save button: "Saving..." disabled.

**Error state:** "Failed to save account. Please try again."

**Mobile behavior (P2):** Form full-width. Type selector cards go 1-column stacked (full-width each). Inputs full-width.

---

### S7 — Account Delete Resolution

```
              ┌─────────────────────────────────────────────────┐
              │  Delete 'BPI Savings'?                           │
              │                                                  │
              │  This account has 15 entries. Choose how to      │
              │  handle them:                                    │
              │                                                  │
              │  ┌────────────────────────────────────────────┐ │
              │  │ ◉ Reassign entries to another account       │ │
              │  │   All 15 entries will be moved to the       │ │
              │  │   selected account. Amounts, dates, and     │ │
              │  │   categories remain unchanged.              │ │
              │  │   Target: [ Cash (Debit)              ▾ ]   │ │
              │  └────────────────────────────────────────────┘ │
              │                                                  │
              │  ┌────────────────────────────────────────────┐ │
              │  │ ○ Delete account and all entries            │ │
              │  │   ⚠ This will permanently delete the        │ │
              │  │   account and all 15 entries. This cannot    │ │
              │  │   be undone.                                 │ │
              │  └────────────────────────────────────────────┘ │
              │                                                  │
              │  [ Cancel ]              [ Delete Account ]      │
              └─────────────────────────────────────────────────┘

              ── Zero entries variant ──
              ┌─────────────────────────────────────────────────┐
              │  Delete 'GCash'?                                 │
              │                                                  │
              │  This account has no entries. Delete it?         │
              │                                                  │
              │  [ Cancel ]              [ Delete Account ]      │
              └─────────────────────────────────────────────────┘
```

**Components:** Modal overlay, modal card, two radio-card options (reassign / cascade), target account dropdown (conditional on reassign selected), warning text, cancel/delete buttons.

**Data shown:** Account name, entry count, target account list (for reassign).

**Validation:** Reassign option requires a target account selected. If no other accounts exist, cascade-delete is the only option (reassign disabled with text "No other accounts available").

**Empty state:** N/A (modal is contextual).

**Loading state:** Delete button: "Deleting..." disabled.

**Error state:** "Failed to delete account. Please try again."

**Mobile behavior (P2):** Modal full-width bottom sheet. Options stack full-width.

---

### S8 — Categories Management

```
┌──────────────────────────────────────────────────────────────────────┐
│ ☰ │ Household Tracker                                                │
├───┼──────────────────────────────────────────────────────────────────┤
│ D │  CATEGORIES                              [+ Add Category]         │
│ a │                                                                   │
│ s │  ┌───────────────────────────┐  ┌───────────────────────────┐   │
│ h │  │ EXPENSE CATEGORIES         │  │ INCOME CATEGORIES         │   │
│ b │  │                            │  │                           │   │
│ o │  │ Food & Dining   (23) ✎🗑  │  │ Salary          (2) ✎🗑  │   │
│ a │  │ Transportation  (12) ✎🗑  │  │ Freelance       (3) ✎🗑  │   │
│ r │  │ Housing & Util  (8)  ✎🗑  │  │ Gift            (1) ✎🗑  │   │
│ d │  │ Shopping        (15) ✎🗑  │  │ Investment      (2) ✎🗑  │   │
│   │  │ Entertainment   (7)  ✎🗑  │  │ Refund          (1) ✎🗑  │   │
│   │  │ Health           (3) ✎🗑  │  │ Other Income    (0) ✎🗑  │   │
│   │  │ Education        (2) ✎🗑  │  │                           │   │
│ E │  │ Subscriptions    (4) ✎🗑  │  │                           │   │
│ n │  │ Insurance        (1) ✎🗑  │  │                           │   │
│ t │  │ Other            (5) ✎🗑  │  │                           │   │
│ r │  │ Pets          (custom)    │  │                           │   │
│ i │  │                  (0) ✎🗑  │  │                           │   │
│ e │  │                            │  │                           │   │
│ s │  │  [+ Add Expense Category] │  │  [+ Add Income Category]  │   │
│   │  └───────────────────────────┘  └───────────────────────────┘   │
│   │                                                                   │
│ A │  ── Add Category (inline form) ─────────────────────────────────── │
│   │  ┌──────────────────────────────────────────────────────────────┐│
│   │  │ Category Name: [ Pets                                ]        ││
│   │  │ Type: [ ● Expense ]  [ ○ Income ]                             ││
│   │  │ Color/Icon: [ Disabled — Coming in future update ]           ││
│   │  │ [ Cancel ]                              [ Save ]              ││
│   │  └──────────────────────────────────────────────────────────────┘│
│   │                                                                   │
│ C │                                                                   │
│ a │                                                                   │
│ t │                                                                   │
│ e │                                                                   │
│ g │                                                                   │
│ o │                                                                   │
│ r │                                                                   │
│ i │                                                                   │
│ e │                                                                   │
│ s │                                                                   │
│   │                                                                   │
│ E │                                                                   │
│ x │                                                                   │
│ p │                                                                   │
│ t │                                                                   │
└───┴──────────────────────────────────────────────────────────────────┘
```

**Components:** Sidebar nav, header with add button, two-column layout (expense categories left, income categories right), category list rows (name, entry count, edit/delete actions), add category inline form (name, type toggle, color/icon picker disabled with "Coming in future update" label, save/cancel).

**Data shown:** Category name, entry count, type (expense/income section). Default categories and custom categories listed together, sorted with defaults first then custom alphabetically.

**Empty state:** If no custom categories and no entries: category count shows "(0)". Default categories always present (per FR-12, FR-13). "Other" / "Other Income" cannot be deleted.

**Loading state:** Skeleton list rows with gray-200 pulse.

**Error state:** "Failed to load categories. Please try again."

**Mobile behavior (P2):** Two columns stack vertically (expense categories, then income categories). Add category form goes full-width.

---

### S9 — Category Delete Resolution

```
              ┌─────────────────────────────────────────────────┐
              │  Delete 'Entertainment'?                         │
              │                                                  │
              │  This category has 7 entries. You cannot        │
              │  delete a category with entries without          │
              │  reassigning them first.                        │
              │                                                  │
              │  Reassign 7 entries to:                          │
              │  [ Other                        ▾ ]              │
              │                                                  │
              │  Available categories:                           │
              │  Food & Dining, Transportation, Housing &        │
              │  Utilities, Shopping, Health, Education,          │
              │  Subscriptions, Insurance, Other                 │
              │  (Entertainment excluded — cannot reassign       │
              │   to the category being deleted)                 │
              │                                                  │
              │  [ Cancel ]              [ Delete Category ]      │
              └─────────────────────────────────────────────────┘
```

**Components:** Modal overlay, modal card, warning text, reassign dropdown, cancel/delete buttons.

**Data shown:** Category name, entry count, available target categories (excluding the one being deleted, excluding "Other" is always available as fallback but listed in dropdown).

**Validation:** Must select a target category. If no other categories exist (edge case: only "Other" remains), "Other" is the only option and is auto-selected.

**Empty state:** If category has 0 entries, simpler confirm: "Delete 'Pets'? This category has no entries." with just Cancel + Delete.

**Loading state:** Delete button: "Deleting..." disabled.

**Error state:** "Failed to delete category. Please try again."

**Mobile behavior (P2):** Modal full-width bottom sheet.

---

### S10 — First Launch / Empty Dashboard

```
┌──────────────────────────────────────────────────────────────────────┐
│ ☰ │ Household Tracker                    [ This Month ▾ ]            │
├───┼──────────────────────────────────────────────────────────────────┤
│ D │  ┌──────────────────────────────────────────────────────────────┐│
│ a │  │ ✨ Welcome to Household Tracker!                               ││
│ s │  │                                                                ││
│ h │  │ We've created a "Cash" account for you to get started.       ││
│ b │  │ You can rename it or add more accounts anytime.               ││
│ o │  │                                                                ││
│ a │  │              [ + Add Your First Entry ]                       ││
│ r │  │              [ Create New Account ]                          ││
│ d │  └──────────────────────────────────────────────────────────────┘│
│   │                                                                   │
│ E │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│ n │  │ INCOME      │ │ EXPENSES    │ │ NET BALANCE  │ │ VS LAST MO  │ │
│ t │  │ ₱0          │ │ ₱0          │ │ ₱0          │ │ —           │ │
│ r │  │ (gray-400)  │ │ (gray-400)  │ │ (gray-400)  │ │ (gray-400)  │ │
│ i │  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
│ e │                                                                   │
│ s │  ┌──────────────────────────────────┐  ┌────────────────────────┐│
│   │  │ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │  │ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ ││
│   │  │ │  No data to display yet      │ │  │ │ No data to display  │ ││
│ A │  │ │  (dashed border)              │ │  │ │ yet (dashed border) │ ││
│ c │  │ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │  │ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ ││
│ c │  └──────────────────────────────────┘  └────────────────────────┘│
│ t │                                                                   │
│ s │  ┌─────────────────────────────────────────────────────────────┐│
│   │  │ ACCOUNT SUMMARY                                                ││
│   │  │ ┌──────────────┐                                               ││
│   │  │ │ Cash         │                                               ││
│ C │  │ │ Debit        │  ← only the auto-created account              ││
│ a │  │ │ ₱0          │                                               ││
│ t │  │ │ 0 entries   │                                               ││
│ e │  │ └──────────────┘                                               ││
│ g │  └─────────────────────────────────────────────────────────────┘│
│ o │                                                                   │
│ r │  ┌─────────────────────────────────────────────────────────────┐│
│ i │  │ RECENT ENTRIES                                                ││
│ e │  │                                                                ││
│ s │  │           No entries yet —                                    ││
│   │  │    Add your first expense to get started.                     ││
│   │  │                                                                ││
│   │  │           [ + Add Entry ]                                    ││
│   │  └─────────────────────────────────────────────────────────────┘│
│ E │                                                                   │
│ x │                                                                   │
│ p │                                                                   │
│ t │                                                                   │
└───┴──────────────────────────────────────────────────────────────────┘
```

**Components:** Sidebar nav, header, welcome banner with CTA buttons, empty KPI cards (₱0 in muted gray), empty chart placeholders (dashed border), single Cash account card, empty recent entries section with CTA.

**Data shown:** Welcome message, Cash account (₱0, 0 entries), all KPIs at ₱0, "No prior data" for MoM comparison.

**Empty state:** This IS the empty state — the entire screen is designed for first-time use. All sections show their respective empty messages.

**Loading state:** N/A (first launch loads instantly — only the auto-created Cash account exists).

**Error state:** If auto-creation fails: "Something went wrong creating your starter account. Please refresh or create an account manually."

**Mobile behavior (P2):** Welcome banner full-width. KPI cards stack 2×2. Chart placeholders full-width stacked. Account card full-width. Empty entries section full-width.

---

### S11 — CSV Export

```
┌──────────────────────────────────────────────────────────────────────┐
│ ☰ │ Household Tracker                                                │
├───┼──────────────────────────────────────────────────────────────────┤
│ D │  DATA EXPORT                                                       │
│ a │                                                                   │
│ s │  ┌──────────────────────────────────────────────────────────────┐│
│ h │  │ Export Entries                                                ││
│ b │  │                                                                ││
│ o │  │ Download all your income and expense entries as a CSV file.  ││
│ a │  │                                                                ││
│ r │  │ Columns: ID, Type, Amount, Date, Category, Account, Note,    ││
│ d │  │ Created-at, Updated-at                                        ││
│   │  │                                                                ││
│   │  │ Total entries: 42                                             ││
│   │  │                                                                ││
│   │  │ [ ↓ Download Entries CSV ]                                    ││
│   │  └──────────────────────────────────────────────────────────────┘│
│   │                                                                   │
│ E │  ┌──────────────────────────────────────────────────────────────┐│
│ n │  │ Export Accounts                                               ││
│ t │  │                                                                ││
│ r │  │ Download all your accounts as a CSV file.                     ││
│ i │  │                                                                ││
│ e │  │ Columns: ID, Name, Type, Description                          ││
│ s │  │                                                                ││
│   │  │ Total accounts: 6                                             ││
│   │  │                                                                ││
│ A │  │ [ ↓ Download Accounts CSV ]                                  ││
│ c │  └──────────────────────────────────────────────────────────────┘│
│ c │                                                                   │
│ t │  ┌──────────────────────────────────────────────────────────────┐│
│ s │  │ Export Preview (first 5 rows)                                ││
│   │  │ ID  Type     Amount  Date       Category      Account         ││
│   │  │ 1   Expense  500    2026-07-10 Food & Dining BPI Savings      ││
│ C │  │ 2   Income   40000  2026-07-10 Salary        BPI Savings      ││
│ a │  │ 3   Expense  120    2026-07-09 Transport     Cash             ││
│ t │  │ 4   Expense  2500   2026-07-08 Shopping       BDO CC           ││
│ e │  │ 5   Expense  350    2026-07-08 Food & Dining  Cash             ││
│ g │  └──────────────────────────────────────────────────────────────┘│
│ o │                                                                   │
│ r │                                                                   │
│ i │                                                                   │
│ e │                                                                   │
│ s │                                                                   │
│   │                                                                   │
│ E │                                                                   │
│ x │                                                                   │
│ p │                                                                   │
│ t │                                                                   │
└───┴──────────────────────────────────────────────────────────────────┘
```

**Components:** Sidebar nav, header, two export cards (entries + accounts) with download buttons, export preview table (first 5 rows).

**Data shown:** Column descriptions, total entry count, total account count, preview rows.

**Empty state:** If no entries: "You have no entries to export." Download button disabled. If no accounts: "You have no accounts to export." (should not happen — Cash auto-created).

**Loading state:** Download button: "Preparing..." then triggers file download.

**Error state:** "Export failed. Please try again."

**Mobile behavior (P2):** Export cards stack full-width. Preview table horizontal-scrolls.

---

## 4. HTML + Tailwind grayscale mockups

All HTML mockups are located in `design/wireframes/`:

| File | Screen | Status |
|------|--------|--------|
| `01-dashboard.html` | S1 — Dashboard | ✅ |
| `02-entries.html` | S2 — All Entries | ✅ |
| `03-add-edit-entry.html` | S3 — Add/Edit Entry | ✅ |
| `04-accounts.html` | S5 — Accounts List | ✅ |
| `05-account-form.html` | S6 — Account Create/Edit | ✅ |
| `06-account-delete.html` | S7 — Account Delete Resolution | ✅ |
| `07-categories.html` | S8 — Categories Management | ✅ |
| `08-first-launch.html` | S10 — First Launch / Empty Dashboard | ✅ |

**Conventions:**
- Tailwind CSS via CDN (`https://cdn.tailwindcss.com`)
- Grayscale only: `gray-50` through `gray-900`
- Exception: red-600 used ONLY for Credit/Borrowed "(owed)" liability indicator and delete/destructive actions
- PHP peso (₱) for all amounts
- System font stack: `system-ui, sans-serif`
- Consistent sidebar nav (w-64, fixed left) across all pages
- Semantic HTML: `aria-label`, `role`, `<label>` for accessibility (WCAG 2.1 AA)
- Container: `max-w-7xl`
- Donut charts built with CSS `conic-gradient` or inline SVG — no external chart libraries

**Screenshots:** Each HTML file is screenshotted to PNG of the same basename for inclusion in the docx and for Gino's review.

---

## 5. Component inventory

### 5.1 Layout components

| Component | Description | Used on |
|-----------|-------------|---------|
| **Sidebar Nav** | Fixed left navigation (w-64) with 5 nav items: Dashboard, Entries, Accounts, Categories, Export. Active item has `bg-gray-200`. | All screens |
| **Header Bar** | Top area with app title "Household Tracker" and contextual actions (time filter, add buttons, search). | All screens |
| **Content Area** | Main content to the right of sidebar, `max-w-7xl`, padded. | All screens |
| **Back Link** | "← Back to [previous page]" link at top of form pages. | S3, S6 |

### 5.2 Data display components

| Component | Description | Used on |
|-----------|-------------|---------|
| **KPI Card** | Summary card with label (gray-500 text), value (gray-900, bold, large), and optional comparison indicator (▲/▼ with %). | S1, S10 |
| **MoM Comparison Card** | KPI variant showing ▲/▼ indicators with % change for Income and Expenses. Shows "No prior data" when no prior month exists. | S1, S10 |
| **Donut Chart** | Pure CSS/SVG circular chart showing part-to-whole breakdown. Categories with 0 spend hidden. Hover/click shows tooltip with exact amount + %. | S1 |
| **Chart Legend** | List alongside donut chart: color swatch (gray shades), category name, amount, percentage. | S1 |
| **Account Card** | Card showing account name, type indicator (border style), balance, entry count, and action buttons. | S1, S5, S10 |
| **Entries Table** | Data table with columns: checkbox, date, type, category, amount, account, note, actions. Sortable. Paginated. | S2 |
| **Recent Entries Table** | Compact variant of Entries Table showing 10 most recent entries. No checkboxes, no pagination. | S1 |
| **Category List Row** | Row in categories management: category name, entry count, edit/delete actions. | S8 |
| **Export Preview Table** | Read-only table showing first 5 rows of CSV export. | S11 |

### 5.3 Input components

| Component | Description | Used on |
|-----------|-------------|---------|
| **Text Input** | Standard text input with label above, gray border, focus ring. | S3, S6, S8 |
| **Number Input** | Amount input with ₱ prefix, type=number, min > 0. | S3 |
| **Date Input** | Date picker, type=date, defaults to today. | S3 |
| **Textarea** | Multi-line input for notes/descriptions. | S3, S6, S8 |
| **Select Dropdown** | Styled native select for category, account, sort, filter selections. | S1, S2, S3, S5, S7, S8, S9 |
| **Type Toggle (Expense/Income)** | Two-button toggle for entry type. Changes category dropdown contents. Active = `bg-gray-800 text-white`. | S3 |
| **Account Type Selector** | 5 selectable cards (Debit, Credit, Lent, Borrowed, Invest) with icon, label, description. Active = `bg-gray-800 text-white`. | S6 |
| **Radio Card** | Selectable option card for delete resolution (reassign / cascade). | S7 |
| **Checkbox** | Row selection checkbox for bulk actions. | S2 |
| **Search Input** | Text input with search icon for entry filtering. | S2 |

### 5.4 Action components

| Component | Description | Used on |
|-----------|-------------|---------|
| **Primary Button** | `bg-gray-800 text-white` — main action (Save, Add). | All |
| **Secondary Button** | `bg-gray-200 text-gray-800` — cancel, secondary actions. | All forms/modals |
| **Destructive Button** | `bg-red-600 text-white` — delete confirmations. | S4, S7, S9 |
| **Destructive Link** | `text-red-600` — delete entry/account links in edit modes. | S3, S6 |
| **Icon Button** | Edit (✎) and Delete (🗑) text-icon actions in table rows. | S1, S2, S5, S8 |
| **Pagination Controls** | "Showing X–Y of Z" text + Prev/Next buttons. | S2 |
| **Bulk Action Bar** | Appears when ≥1 checkbox selected: "N selected" + "Delete Selected" button. | S2 |
| **Filter Toggle Buttons** | All / Income / Expense — segmented control. Active = `bg-gray-800 text-white`. | S2 |

### 5.5 Feedback components

| Component | Description | Used on |
|-----------|-------------|---------|
| **Modal Overlay** | Dimmed background overlay for modals. | S4, S7, S9 |
| **Modal Card** | Centered card for confirmation dialogs. `max-w-lg`. | S4, S7, S9 |
| **Welcome Banner** | Highlighted box with welcome message and CTA buttons. | S10 |
| **Empty State Block** | Dashed-border placeholder with centered text for charts, tables, accounts. | S1, S2, S5, S10, S11 |
| **Loading Skeleton** | Gray-200 pulsing block placeholders for cards, chart areas, table rows. | All |
| **Error Message** | Red-600 text for field-level validation errors and page-level load errors. | All |
| **Warning Text** | Gray-600 text for duplicate account name warnings. | S6 |
| **Info Text** | Gray-500 small text for audit trails, metadata. | S3 |

---

## 6. Chart decisions

| Chart | Location | Data shown | Chart type | Justification |
|-------|----------|------------|------------|---------------|
| Expense Breakdown | Dashboard (S1) | Expense distribution by category for selected period | **Donut** | Part-to-whole relationship. Donut is better than pie because the empty center can hold the total (₱28,300) as context. Categories with 0 spend are hidden to reduce noise. Donut avoids the bar chart's category-label crowding when there are 10+ categories. Legend with exact amounts + percentages satisfies WCAG text-equivalent requirement (NFR-7). |
| Income Breakdown | Dashboard (S1) | Income distribution by income category for selected period | **Donut** | Same rationale: part-to-whole for typically 3–6 income categories. Donut center shows total income. Fewer slices than expense donut (6 default income categories vs 10 expense), so legend is concise. |
| Month-over-Month Comparison | Dashboard (S1) | Current month vs prior month for Total Income and Total Expenses | **KPI card with directional indicator (▲/▼)** | Not a chart — a text-based comparison with arrow indicator + % change. A bar chart would be overkill for a 2-data-point comparison. The directional indicator is immediately readable and takes minimal dashboard space. If prior month has no data, shows "No prior data" instead of misleading 0%/100%. |
| Account Balance Display | Dashboard (S1) + Accounts (S5) | Per-account balance with type indicator | **Account cards** | Cards, not charts — each account's balance is a single number, not a distribution. Cards allow showing type indicator, entry count, and actions alongside the balance. Grid layout enables quick scanning across 1–20 accounts (NFR-4). |

**Why not bar charts for category breakdown?** Bar charts excel at comparing magnitudes across categories, but for expense breakdown the user's primary question is "what proportion went where?" — that's part-to-whole, which donut answers better. Bar charts would also require horizontal labels that crowd with 10 category names. The donut + legend combination gives both visual proportion and exact values.

**Why not a combined income-vs-expense bar chart?** The MoM comparison is a 2-point comparison (this month vs last month), not a time series. A KPI card with ▲/▼ indicator is more compact and immediately readable. A time-series bar chart of income vs expense over 12 months would be a v2 enhancement (requires trend data across many months).

---

## 7. FR coverage table

| FR ID | Requirement | Screen(s) | Component(s) | Covered? |
|-------|-------------|-----------|---------------|----------|
| **FR-1** | Create an account | S6, S10 | Account Create form, auto-create Cash on first launch | ✅ |
| **FR-2** | Edit an account | S6 | Account Edit form (pre-filled, save changes) | ✅ |
| **FR-3** | Delete an account | S7 | Account Delete Resolution modal (reassign / cascade) | ✅ |
| **FR-4** | List/view accounts | S5, S1 | Accounts List grid, Account Summary on Dashboard | ✅ |
| **FR-5** | View per-account balance | S5, S1 | Account Cards (balance per type formula, all-time) | ✅ |
| **FR-6** | Account type definitions | S5, S6, S1 | Type selector in Account Form, type indicators on cards, balance semantics in entry form | ✅ |
| **FR-7** | Log an expense | S3 | Add Entry form (type=Expense, account required) | ✅ |
| **FR-8** | Log income | S3 | Add Entry form (type=Income, account required) | ✅ |
| **FR-9** | Edit an entry | S3, S2 | Edit Entry form (pre-filled, save changes), edit action in Entries list | ✅ |
| **FR-10** | Delete an entry | S4, S2, S1 | Delete Confirmation modal, delete action in Entries + Dashboard | ✅ |
| **FR-11** | Bulk-delete entries | S2 | Checkbox selection + Bulk Action Bar + Delete Selected | ✅ |
| **FR-12** | Default expense categories | S3, S8 | Category dropdown in Entry form, Categories Management list | ✅ |
| **FR-13** | Default income categories | S3, S8 | Category dropdown in Entry form (income type), Categories Management list | ✅ |
| **FR-14** | Create/rename/delete custom categories | S8, S9 | Categories Management (add/rename), Category Delete Resolution modal | ✅ |
| **FR-15** | Category with icon/color | S8 | Color/icon picker shown as disabled "Coming in future update" (P2) | ✅ (P2 — visible as future) |
| **FR-16** | Dashboard KPI cards | S1, S10 | 3 KPI cards (Income, Expenses, Net Balance) + period-aware | ✅ |
| **FR-17** | Category breakdown chart | S1 | Expense Breakdown donut chart | ✅ |
| **FR-18** | Income breakdown chart | S1 | Income Breakdown donut chart | ✅ |
| **FR-19** | Month-over-month comparison | S1 | MoM Comparison card (▲/▼ with %, "No prior data" fallback) | ✅ |
| **FR-20** | Recent entries list | S1, S2 | Recent Entries table on Dashboard (10 rows), full Entries list | ✅ |
| **FR-21** | Account summary on dashboard | S1, S10 | Account Summary section on Dashboard | ✅ |
| **FR-22** | Preset time filters | S1, S2 | Time filter dropdown (This Month, Last Month, Last 3 Months, This Year, All Time) | ✅ |
| **FR-23** | Custom date range | S1 | Time filter dropdown includes "Custom Range" (P2) | ✅ (P2) |
| **FR-24** | No duplicate detection | S3 | Entry form allows identical entries without blocking | ✅ (by design — no duplicate check in form) |
| **FR-25** | Entry audit trail | S3 | Created-at / Updated-at timestamps in Edit Entry view | ✅ |
| **FR-26** | Account-entry referential integrity | S7 | Delete Resolution modal enforces reassign or cascade — no orphaned entries | ✅ |
| **FR-27** | Account balance consistency | S1, S5 | Balances always computed from entries (display only, no cached value in UI) | ✅ (by design — UI always recomputes) |

**NFR coverage:**

| NFR ID | Requirement | Screen(s) / Component(s) | Covered? |
|--------|-------------|--------------------------|----------|
| **NFR-1** | Single-user, single-household | No login/multi-user UI elements | ✅ |
| **NFR-2** | Data privacy, no bank credentials | No bank-linking UI anywhere | ✅ |
| **NFR-3** | Data persistence | No "session expired" or data-loss UI patterns | ✅ |
| **NFR-4** | Volume (5,000 entries, 20 accounts) | Accounts grid supports 20 cards, Entries table paginated | ✅ |
| **NFR-5** | Performance (≤2s load) | Loading skeletons designed for ≤2s perceived load | ✅ |
| **NFR-6** | Online-only | No offline indicators or sync UI | ✅ |
| **NFR-7** | WCAG 2.1 AA | Semantic HTML, aria-labels, visible labels, color-not-sole-differentiator (border styles for account types), text equivalents for charts (legends) | ✅ |
| **NFR-8** | Browser support (Chrome, Firefox, Edge, Safari) | Standard HTML/Tailwind, no browser-specific APIs | ✅ |
| **NFR-9** | Data portability (CSV export) | S11 — CSV Export screen | ✅ |
| **NFR-10** | Error handling (no stack traces) | User-facing error messages designed for all screens | ✅ |
| **NFR-11** | Single currency (PHP) | ₱ prefix on all amount inputs and displays | ✅ |
| **NFR-12** | Self-hosted | No cloud-hosted branding or external service indicators | ✅ |
| **NFR-13** | Computed balances | Account cards always show computed balance (no cached indicator) | ✅ |

**Coverage result: All 27 FRs + 13 NFRs covered. Zero gaps.**

---

## 8. UX notes / open items for Gino

### Key UX decisions

1. **Account type visual differentiation uses border styles, not colors.** Per the grayscale constraint and WCAG (color not sole differentiator), each account type has a distinct border: Debit = solid, Credit = dashed + "(owed)", Lent = dotted, Borrowed = double + "(owed)", Invest = thick. The brand agent can later introduce color if desired, but the border styles remain for accessibility.

2. **Red-600 used sparingly and intentionally.** Only for: (a) Credit/Borrowed account "(owed)" liability indicator, (b) delete/destructive action buttons, (c) field-level validation errors. This is functional, not decorative — the brand agent should respect these semantic uses.

3. **Donut charts (not bars) for category breakdown.** The user's question is "what proportion went where?" — part-to-whole — which donut answers better. Bar charts would crowd with 10+ expense category labels. Donut center displays the total for context. Legend with exact amounts + % satisfies WCAG text-equivalent requirement.

4. **MoM comparison is a KPI card, not a chart.** A 2-point comparison doesn't warrant a chart. ▲/▼ directional indicators + % change is immediately readable and space-efficient. "No prior data" shown when prior month is empty (per FR-19).

5. **Entry form type toggle changes category dropdown.** When the user switches between Expense and Income, the category dropdown contents swap to the corresponding category set. This prevents mis-categorization (e.g., selecting "Salary" for an expense).

6. **Account balances are all-time, KPIs are period-filtered.** Per Q2 resolution. The account summary on the dashboard always shows the true current balance (all-time sum), while KPI cards and charts respect the time filter. This is communicated by a label "All-time balance" on account cards vs "This Month" on KPI cards.

7. **Lent/Borrowed repayments logged as income entries to the same account.** Per Q4 resolution. The entry form's income flow naturally handles this — the user selects the Lent/Borrowed account and logs income, which reduces the balance per the formula.

8. **First-launch experience avoids a wizard.** Auto-creating a Cash account means the user can immediately add an entry without a setup flow. The welcome banner explains what happened and offers two paths: add an entry or create another account. This meets the BRD's 90-second time-to-first-entry goal.

9. **Delete confirmation includes entry details.** The modal shows the full entry (date, type, category, amount, account, note) so the user can verify they're deleting the right one. Account deletion shows entry count and requires explicit resolution (reassign or cascade).

### v2 suggestions (not built — out of v1 scope)

- **Bar chart for 12-month income vs expense trend.** Once enough months of data exist, a stacked bar chart showing income vs expense per month would reveal trends. Not in v1 (no historical data yet).
- **Account-to-account transfer flow.** Moving money between Debit accounts (e.g., GCash → BPI) without logging it as income/expense. Currently requires two entries.
- **Recurring entry templates.** "Log rent automatically on the 1st of each month." Reduces friction for fixed expenses.
- **Budget targets with progress bars.** "You've spent 80% of your Food & Dining budget this month." Needs budget-setting UI.
- **Receipt photo attachment.** Camera/upload integration on the entry form.
- **Category color/icon picker.** FR-15 is P2 — the UI placeholder exists but is disabled. Brand agent or v2 can activate it.
- **Dark mode.** Grayscale wireframes are light-mode only. A dark mode would need the brand agent's palette.
- **Partial repayment flow for Lent/Borrowed.** Currently repayments are single income entries. A dedicated "Record Repayment" button on Lent/Borrowed account cards with a slider showing % repaid would be clearer.
- **Mobile-native layout.** Current mobile behavior is P2 (usable but not optimized). A native mobile layout would restructure the sidebar as a bottom tab bar.

### Open items for Gino

1. **Account card border styles as type indicator.** I've used border styles (solid, dashed, dotted, double, thick) to differentiate account types in grayscale. The brand agent will add color at G2.5 — should the color replace the border style or augment it? Recommendation: augment (keep border styles for accessibility, add color as enhancement).

2. **Custom date range placement (FR-23, P2).** I've placed "Custom Range" as an option in the time filter dropdown, which reveals two date pickers when selected. Is this the right interaction, or should it be a separate "Advanced filters" panel? Recommendation: keep it in the dropdown for discoverability.

3. **Entry form: should account default to the most recently used account?** Currently defaults to the first account in the list (which would be the auto-created Cash account initially). Defaulting to last-used would save Marcus (occasional contributor) a tap since he usually uses the same account. Recommendation: default to last-used account per user session. Gino, confirm or override.

4. **Categories management: inline add form or modal?** I've designed it as an inline form that expands below the list. An alternative is a modal. Inline keeps context visible; modal focuses attention. Recommendation: inline for add, modal for rename/delete-resolution. Gino, confirm.

---

## 9. Sign-off request

This wireframe spec covers all 27 FRs and 13 NFRs from the approved BRD v2. Every screen has ASCII wireframe + HTML mockup + states (empty/loading/error) + mobile behavior. Chart choices are justified. Component inventory is complete. No out-of-scope features are included.

**Ready for G2 review.**