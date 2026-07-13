# Test Plan & UAT Report
**Project:** Pondo — Household Expense Tracker · **Author:** qa · **Version:** 1.0 · **Date:** 2026-07-11 · **Gate:** G6 (HARD)

## 0. Scope & reference
- **Source of truth:** BRD v2 (2026-07-10), SAD v1.0 (2026-07-10), code-docs.md (G5 build).
- **App under test:** React + Vite client at `http://localhost:3000`, Express API at `http://localhost:3001` (Vite proxy configured).
- **Database:** `server/data/pondo.db` (SQLite, WAL mode).
- **Auth:** optional passphrase (`X-App-Passphrase` header); if not set, app is open.
- **Deferred/P2 items (do NOT mark as failed; mark "deferred"):** category color/icon picker (FR-15), custom date range (FR-23), dark mode, mobile optimization, account-to-account transfers, partial repayments, multi-currency, CSV import, receipt upload, savings goals, bank-sync, AI features.
- **Environment reset before UAT:** stop server, delete/rename `server/data/pondo.db`, restart server/client to simulate first launch.

---

## 1. Test cases — functional coverage (one test per FR)

| ID | FR | Preconditions | Steps | Expected result | Priority | Result (P/F/D) |
|----|----|---------------|-------|-----------------|:--------:|:--------------:|
| TC-1 | FR-1 | Fresh install (no DB) | 1. Open `http://localhost:3000`. 2. Complete first-launch setup (or let it auto-complete). | A "Cash" (Debit) account is auto-created and visible in Accounts list. | P0 | |
| TC-2 | FR-1 | First launch completed | 1. Go to Accounts. 2. Click Add Account. 3. Enter name "BPI Savings", type "Debit", note "Joint". 4. Save. | Account appears in list with type badge and zero balance. | P0 | |
| TC-3 | FR-1 | Duplicate account test | 1. Create another account with same name/type as an existing account. | Account is created; UI/API shows a duplicate-name+type warning but persists it. | P0 | |
| TC-4 | FR-2 | Account exists | 1. Open an existing account. 2. Change name and/or note. 3. Save. | Account reflects new values; entries tied to it remain associated. | P1 | |
| TC-5 | FR-2 | Account has entries | 1. Edit an account's type. 2. Save. 3. Check balance formula. | Entries remain tied; balance is now interpreted using the new type (not retroactively recategorized). | P1 | |
| TC-6 | FR-3 | Account has zero entries | 1. Create an account. 2. Delete it without adding entries. | Account is removed immediately. | P1 | |
| TC-7 | FR-3 | Account has entries | 1. Attempt to delete an account that has entries. 2. Choose "Reassign" and pick a target account. 3. Confirm. | Entries are reassigned; account is deleted; no orphaned entries. | P1 | |
| TC-8 | FR-3 | Account has entries (cascade) | 1. Attempt to delete an account that has entries. 2. Choose "Delete all entries". 3. Confirm. | Account and all its entries are deleted; dashboard KPIs recalculate. | P1 | |
| TC-9 | FR-4 | Accounts exist | 1. Go to Accounts page. 2. Sort by name. 3. Sort by balance. | List shows name, type, balance, entry count for each account; sorting works both ways. | P0 | |
| TC-10 | FR-5 | Debit account with entries | 1. Create a Debit account. 2. Add income ₱1,000. 3. Add expense ₱300. | Account balance displays ₱700. | P0 | |
| TC-11 | FR-5 | Credit account with entries | 1. Create a Credit account. 2. Add expense ₱500. | Account balance displays ₱500 with liability indicator (e.g., "owed" / red text). | P0 | |
| TC-12 | FR-5 | Lent account with entries | 1. Create a Lent account. 2. Add expense (lent) ₱1,000. 3. Add income (repayment) ₱400. | Account balance displays ₱600 (still owed to user). | P0 | |
| TC-13 | FR-5 | Borrowed account with entries | 1. Create a Borrowed account. 2. Add income (borrowed) ₱2,000. 3. Add expense (repayment) ₱500. | Account balance displays ₱1,500 with liability indicator (still owed by user). | P0 | |
| TC-14 | FR-5 | Invest account with entries | 1. Create an Invest account. 2. Add income (investment) ₱5,000. | Account balance displays ₱5,000. | P0 | |
| TC-15 | FR-6 | Account creation form | 1. Open Add Account. | Only five types appear: Debit, Credit, Lent, Borrowed, Invest; each has a visual indicator. | P0 | |
| TC-16 | FR-7 | At least one account exists | 1. Click "Add Expense". 2. Fill amount ₱250, date today, category "Food & Dining", account, note. 3. Save. | Expense persists; account balance decreases by ₱250; dashboard Total Expenses and Net update. | P0 | |
| TC-17 | FR-8 | At least one account exists | 1. Click "Add Income". 2. Fill amount ₱10,000, date today, category "Salary", account. 3. Save. | Income persists; account balance increases by ₱10,000; dashboard Total Income and Net update. | P0 | |
| TC-18 | FR-9 | Entry exists | 1. Edit an existing entry: change amount, category, account, and note. 2. Save. | Entry shows new values; old account balance and new account balance recalculate; no duplicate entry. | P1 | |
| TC-19 | FR-10 | Entry exists | 1. Click Delete on an entry. 2. Confirm in prompt that shows amount, category, account. 3. Confirm. | Entry removed; KPIs, chart, account balance recalculate. | P1 | |
| TC-20 | FR-11 | Multiple entries exist | 1. Select ≥2 entries. 2. Click Bulk Delete. 3. Confirm. | Selected entries removed; KPIs/recalculations run once. | P2 | |
| TC-21 | FR-12 | Fresh DB / first launch | 1. Check expense category dropdown. | All 10 defaults present: Food & Dining, Transportation, Housing & Utilities, Shopping, Entertainment, Subscriptions, Health, Education, Insurance, Other. | P0 | |
| TC-22 | FR-13 | Fresh DB / first launch | 1. Check income category dropdown. | All 6 defaults present: Salary, Freelance, Gift, Investment, Refund, Other Income. | P0 | |
| TC-23 | FR-14 | Categories page | 1. Add custom expense category "Pets". 2. Use it in an entry. | New category appears in picker immediately; entry saves correctly. | P1 | |
| TC-24 | FR-14 | Custom category with entries | 1. Rename a custom category. 2. Delete a custom category and reassign its entries to "Other". | Renamed category updates all existing entries; deleted category entries move to "Other"; no orphans. | P1 | |
| TC-25 | FR-15 | Categories page / dashboard | 1. View categories and charts. | Default colors are consistent between form, chart, and list. (Icon/color picker is deferred — note only.) | P2 | |
| TC-26 | FR-16 | Dashboard loaded | 1. Add income and expenses. 2. Observe KPI cards. | Total Income, Total Expenses, Net Balance cards reflect selected period; update within 2 seconds of any change. | P0 | |
| TC-27 | FR-17 | Dashboard with expenses | 1. Add several expenses in different categories. 2. View dashboard. | Donut/bar chart shows proportional breakdown; 0-spend categories hidden; hover shows amount and %. | P0 | |
| TC-28 | FR-18 | Dashboard with income | 1. Add income in different categories. 2. View dashboard. | Income breakdown chart shows proportions; 0 categories hidden; hover shows amount and %. | P1 | |
| TC-29 | FR-19 | Dashboard with data spanning 2+ months | 1. Filter "This Month". | MoM cards show current vs prior equivalent period with directional indicator and % change. | P1 | |
| TC-30 | FR-19 | No prior-period data | 1. Filter a period with no prior entries. | MoM shows "No prior data" instead of misleading 0%/100%. | P1 | |
| TC-31 | FR-20 | Dashboard loaded | 1. Add income and expense entries on different dates. 2. View dashboard Recent Entries. | Up to 10 most recent entries shown (mixed types) with date, type icon, category, amount, account, edit/delete actions. | P1 | |
| TC-32 | FR-21 | Dashboard loaded | 1. Have multiple accounts with entries. 2. View dashboard Account Summary. | All accounts show name, type icon, and all-time balance; update when entries change. | P0 | |
| TC-33 | FR-22 | Dashboard loaded | 1. Click time filter. 2. Select each preset: This Month, Last Month, Last 3 Months, This Year, All Time. | KPIs, charts, recent entries recalculate for each preset; active preset visually highlighted. | P0 | |
| TC-34 | FR-23 | Dashboard/Entries | 1. Open custom date range. 2. Enter start ≤ end. | Data filters correctly. (Basic implementation — P2; mark as deferred if picker is missing/rough.) | P2 | |
| TC-35 | FR-24 | Same account, category, date | 1. Log two expenses with identical amount/date/category/account. | Both persisted; system does not block or merge them. | P1 | |
| TC-36 | FR-25 | Entry exists | 1. Create an entry. 2. Edit it. 3. Open entry detail/edit view. | Created-at and updated-at timestamps are visible; updated-at changes after edit. | P2 | |
| TC-37 | FR-26 | Account has entries | 1. Try to delete account via direct API call without resolution body. | API rejects with error; no orphaned entries; DB FK enforces referential integrity. | P0 | |
| TC-38 | FR-27 | Account with multiple entries | 1. Create Debit account. 2. Add income ₱100, income ₱200, expense ₱50. 3. Edit ₱200 income to ₱150. | Balance first shows ₱250, then ₱200 after edit. | P0 | |

---

## 2. Edge & negative cases

| ID | Scenario | Steps | Expected result | Result |
|----|----------|-------|-----------------|--------|
| EC-1 | Amount = 0 or negative | Submit expense with amount 0, then −50. | Both rejected with field-specific error; nothing persisted; dashboard unchanged. | |
| EC-2 | Missing required fields | Submit expense with blank amount, blank date, no category, no account. | Form/API rejects each missing field with clear message. | |
| EC-3 | Future date | Submit entry with date tomorrow. | Rejected or handled per app rule (SAD allows today). | |
| EC-4 | Invalid date format | Send `date: "2026/07/10"` via API. | Rejected with validation error. | |
| EC-5 | Huge amount / precision | Submit amount = 999,999,999.99 and amount = 0.005. | Large amount accepted (if within max); tiny amount rejected or rounded to 2 decimals; no crash. | |
| EC-6 | Empty dashboard (no data) | Open dashboard on fresh first launch with no entries. | Clean empty state with 0 KPIs, no broken charts, helpful prompt to add first entry. | |
| EC-7 | Delete last entry | Add one entry, then delete it. | Dashboard KPIs return to zero/income-expense state; account balance returns to zero. | |
| EC-8 | Delete last account | Delete the only account when it has zero entries. | Allowed; accounts list empty; user can still create new account. | |
| EC-9 | Reassign to self / invalid target | API call: `DELETE /api/accounts/1` with `target_account_id: 1`. | Rejected with 400/409; no data changed. | |
| EC-10 | Delete default category | Attempt to delete "Other" or "Other Income". | Rejected with 403; defaults remain. | |
| EC-11 | Category name conflict | Create two expense categories named "Pets" (case-insensitive). | Second creation rejected with conflict error. | |
| EC-12 | Wrong category type for entry | API: create an expense entry with an income category_id. | Rejected with validation error. | |
| EC-13 | Edit entry to non-existent account/category | PUT /api/entries/:id with `account_id: 99999`. | Rejected with validation/404. | |
| EC-14 | Concurrent edits (simulate) | Open same entry in two tabs; edit amount in Tab A, then in Tab B; save both. | Last write wins; no corruption; balances reflect final saved value. | |
| EC-15 | Long note | Submit note with 501+ characters. | Rejected or truncated per validation (max 500 chars). | |
| EC-16 | Special characters in account/category name | Create account named "BPI <Savings> & 'Test'". | Persisted and displayed correctly (no XSS/script injection). | |
| EC-17 | Sort/filter with no matching entries | Filter Entries page by a category that has no entries. | Empty state shown; no errors. | |
| EC-18 | Passphrase auth | 1. Set passphrase. 2. Call API without header. 3. Call with wrong passphrase. 4. Call with correct passphrase. | No header/wrong → 401; correct → 200. | |
| EC-19 | All Time filter with old data | Add an entry dated 2025-01-01; select All Time. | Entry included in KPIs and charts. | |
| EC-20 | Month-over-month edge (divide by zero) | Filter period where prior-period income and expenses are both 0. | Shows "No prior data"; no NaN/Infinity. | |

---

## 3. Defect log

| ID | Severity | FR/Endpoint/Screen | Steps to reproduce | Expected | Actual | Status |
|----|----------|--------------------|--------------------|----------|--------|--------|
| D-1 | | | | | | open |
| D-2 | | | | | | open |
| D-3 | | | | | | open |
| D-4 | | | | | | open |
| D-5 | | | | | | open |

**Severity definitions:**
- **P0 (Blocker):** crash, data loss, security breach, app won't start, or P0 FR completely non-functional. Certifies FAIL.
- **P1 (Major):** wrong calculation, data integrity issue, broken workflow, or P1 FR non-functional. Must be fixed before sign-off.
- **P2 (Minor):** cosmetic, UX friction, deferred-feature gap, or P2 FR gap. Does not block sign-off unless accumulated friction prevents Gino from completing the walkthrough.

---

## 4. Results summary
- **Cases run:** ____ · **Passed:** ____ · **Failed:** ____ · **Deferred:** ____
- **By priority:** P0 ____ / ____ · P1 ____ / ____ · P2 ____ / ____
- **Edge/negative cases run:** ____ / 20 · **Passed:** ____ · **Failed:** ____
- **Open defects:** P0 ____ · P1 ____ · P2 ____
- **Deferred items noted:** FR-15 (category icon/color picker), FR-23 (custom date range), dark mode, mobile optimization, transfers, partial repayments, multi-currency, CSV import, receipt upload, savings goals, bank-sync, AI.

---

## 5. UAT walkthrough script for Gino

**Environment:** Chrome/Edge/Firefox desktop at `http://localhost:3000`. Server on `localhost:3001`. Reset DB before starting for a clean first-launch experience.

1. **First launch & default account**
   - Open `http://localhost:3000`.
   - If prompted, complete setup (or let it auto-setup).
   - **Check:** A "Cash" (Debit) account appears on the dashboard and Accounts page.

2. **Log your first expense**
   - Click "Add Expense" (or "+ Expense").
   - Amount: ₱350.00 · Date: today · Category: Food & Dining · Account: Cash · Note: "Lunch".
   - Save.
   - **Check:** Dashboard Total Expenses shows ₱350; Net Balance shows −₱350; Cash balance shows −₱350; Recent Entries list shows the entry.

3. **Log income**
   - Click "Add Income".
   - Amount: ₱15,000.00 · Date: today · Category: Salary · Account: Cash · Note: "Payday".
   - Save.
   - **Check:** Total Income = ₱15,000; Net Balance = ₱14,650; Cash balance = ₱14,650.

4. **Add a real account**
   - Go to Accounts → Add Account.
   - Name: "BPI Credit Card" · Type: Credit · Description: "Main CC".
   - Save.
   - **Check:** New account appears with ₱0 balance and liability styling.

5. **Add a credit-card expense**
   - Add Expense: ₱2,500 · Category: Shopping · Account: BPI Credit Card · Note: "Shoes".
   - **Check:** Total Expenses increases to ₱2,850; BPI Credit Card balance shows ₱2,500 (owed).

6. **Add a Lent account and track a loan**
   - Accounts → Add Account: "Lent to Mark" · Type: Lent.
   - Add Expense: ₱1,000 · Category: Other · Account: Lent to Mark · Note: "Lent to Mark".
   - Add Income: ₱400 · Category: Other Income · Account: Lent to Mark · Note: "Mark partial payback".
   - **Check:** Lent account balance = ₱600.

7. **Create a custom category**
   - Go to Categories → Add Category → Expense → "Pets".
   - Add Expense: ₱500 · Category: Pets · Account: Cash.
   - **Check:** Pets appears in the expense breakdown chart.

8. **Edit an entry**
   - In Recent Entries (or Entries page), click the ₱350 Food expense → Edit.
   - Change amount to ₱400 and category to "Entertainment". Save.
   - **Check:** Total Expenses updates; category chart rebalances; Cash balance recalculates.

9. **Delete an entry**
   - Click Delete on the ₱500 Pets expense. Confirm the prompt.
   - **Check:** Entry disappears; Total Expenses and Cash balance decrease; Pets no longer in chart (or 0).

10. **Filter by time period**
    - On dashboard, open the time filter dropdown.
    - Select "Last Month" (add an older entry first if needed).
    - **Check:** KPIs, charts, and Recent Entries update to that period; active filter is highlighted.

11. **Check month-over-month**
    - Return to "This Month".
    - **Check:** MoM card shows current vs prior period with up/down arrow and %.
    - If no prior data exists, **check** it says "No prior data".

12. **View all entries**
    - Go to Entries page.
    - **Check:** table lists entries with pagination, search/filter options, edit/delete actions.

13. **Bulk delete**
    - Select two entries on the Entries page, click Bulk Delete, confirm.
    - **Check:** both removed; dashboard recalculates once.

14. **Export data**
    - Go to Export (or Settings/Export).
    - Download Entries CSV and Accounts CSV.
    - **Check:** Files contain correct columns (Entries: ID, Type, Amount, Date, Category, Account, Note, Created At, Updated At; Accounts: ID, Name, Type, Description).

15. **Try invalid input**
    - Try to add an expense with amount 0.
    - **Check:** clear field-level error; no save.
    - Try to add an expense with no account selected.
    - **Check:** clear field-level error.

16. **Account cleanup — reassign/cascade**
    - Delete an account that still has entries.
    - First choose **Reassign** and pick another account; verify entries moved.
    - Then create another disposable account with entries and delete it choosing **Delete all entries**; verify both gone.

17. **Passphrase (if configured)**
    - If you set a passphrase, close the tab and reopen.
    - **Check:** app prompts for passphrase; wrong passphrase rejected; correct passphrase grants access.

18. **Final dashboard sanity check**
    - Confirm KPI cards, both breakdown charts, account summary, and Recent Entries are all consistent with the remaining entries.

---

## 6. Traceability checklist

| FR | Covered by test case(s) | Walkthrough step(s) | Notes |
|----|------------------------|---------------------|-------|
| FR-1 | TC-1, TC-2, TC-3 | 1, 4 | |
| FR-2 | TC-4, TC-5 | — | |
| FR-3 | TC-6, TC-7, TC-8 | 16 | |
| FR-4 | TC-9 | 1, 4 | |
| FR-5 | TC-10, TC-11, TC-12, TC-13, TC-14 | 2, 3, 5, 6 | |
| FR-6 | TC-15 | 4, 6 | |
| FR-7 | TC-16, EC-1, EC-2, EC-3 | 2, 15 | |
| FR-8 | TC-17, EC-1 | 3 | |
| FR-9 | TC-18, EC-13, EC-14 | 8 | |
| FR-10 | TC-19, EC-7 | 9 | |
| FR-11 | TC-20 | 13 | |
| FR-12 | TC-21 | 2 | |
| FR-13 | TC-22 | 3 | |
| FR-14 | TC-23, TC-24, EC-10, EC-11 | 7 | |
| FR-15 | TC-25 | — | **Deferred** — color/icon picker not implemented. |
| FR-16 | TC-26 | 2, 3, 18 | |
| FR-17 | TC-27 | 2, 7, 18 | |
| FR-18 | TC-28 | 3 | |
| FR-19 | TC-29, TC-30, EC-20 | 11 | |
| FR-20 | TC-31 | 2, 12 | |
| FR-21 | TC-32 | 1, 4, 6, 18 | |
| FR-22 | TC-33 | 10 | |
| FR-23 | TC-34 | 10 | **Deferred** — basic implementation only. |
| FR-24 | TC-35 | — | |
| FR-25 | TC-36 | — | |
| FR-26 | TC-37, EC-9 | 16 | |
| FR-27 | TC-38 | 2, 3, 5, 8, 9 | |

---

## 7. Verdict

**Certification recommendation:** PASS WITH DEFERRED ITEMS (approved by Gino, 2026-07-11)

**Rationale:**
- All P0 FRs have at least one test case and are exercised in Gino's walkthrough.
- P2/deferred items are explicitly noted and must NOT be counted as failures.
- Per G6 hard-gate rules, any open P0 or P1 defect blocks a PASS.

**Open questions / blockers for Gino:**
1. Should the UAT start from a wiped DB (first launch) or from a pre-seeded demo dataset?
2. Is the passphrase already set for the test environment, or should Gino set it during the walkthrough?
3. Are there any v1-deferred items Gino wants treated as must-have before sign-off?

---

## 8. Sign-off

**Gino UAT sign-off (G6):** Gino Valera — APPROVED 2026-07-11 09:50 GMT+8

**G7 deployment decision:** Local-only (Windows desktop). Cloudflare Pages deployment noted as future v1.1/v2 option — requires backend refactoring (Express → Workers) and DB migration (SQLite → D1/Turso).

**Notes / conditions:** Gino signed off based on hands-on testing during build (2026-07-10 evening) + QA test plan coverage (38 test cases, 20 edge cases, full 27-FR traceability). Formal executed UAT run was waived by product owner. DB wipe for fresh start noted. Passphrase to be set post-deploy. All v1-deferred items accepted as deferred (no must-have additions).

**Certification recommendation:** PASS WITH DEFERRED ITEMS

__
