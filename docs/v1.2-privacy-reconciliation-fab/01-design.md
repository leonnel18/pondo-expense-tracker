# Pondo v1.2 — Privacy, Reconciliation, Pending-State Accuracy, Mobile Quick-Capture

**Document type:** Software Architecture Document (SAD) — US-02 + US-03 + US-04 + US-07
**Author:** architect (via FRIDAY's OpenClaw Workshop Crew)
**Date:** 2026-07-19
**Feeds from:** `docs/recon/sprint-backlog.md` v1.2, `docs/recon/kill-absorb-review.md` (Gate-S2-approved)
**Feeds into:** `forge-dev` implementation pass
**Parent:** `artifacts/01-BRD.md` (note: `artifacts/03-SAD.md` is stale on stack — this doc supersedes it for the touched surfaces; the live stack is Supabase Postgres, not `better-sqlite3`)
**Status:** Draft — awaiting G3 approval

Grounded entirely in a direct read of the live codebase on 2026-07-19: `server/db/queries.js` (2469 lines, confirmed zero shared aggregation module), `server/db/migrations/001`–`012` (highest existing migration is `012_app_events.sql`), `server/routes/*.js`, `client/src/**`. Two prior per-sprint SADs (`docs/v2.1-recycle-bin-mobile-nav/01-architecture-design.md`, `docs/v2.5-entries-depth/01-calendar-tags-design.md`) were read first and this document follows their depth/format conventions (named files/functions, explicit API contracts, exhaustive audits, flagged conflicts).

---

## Table of Contents

0. [Cross-cutting constraints — how each is satisfied](#0-cross-cutting-constraints--how-each-is-satisfied)
1. [US-02 — Privacy Mask Toggle](#1-us-02--privacy-mask-toggle)
2. [US-03 — Balance Reconciliation](#2-us-03--balance-reconciliation)
3. [US-04 — Pending Entry Flag](#3-us-04--pending-entry-flag)
4. [US-07 — Persistent Mobile FAB](#4-us-07--persistent-mobile-fab)
5. [Migrations assigned this sprint](#5-migrations-assigned-this-sprint)
6. [File manifest](#6-file-manifest)
7. [FR/AC traceability matrix](#7-fracc-traceability-matrix)
8. [Risk register](#8-risk-register)
9. [Build order](#9-build-order)
10. [Open questions / flagged ambiguities for Gino (G3)](#10-open-questions--flagged-ambiguities-for-gino-g3)

---

## 0. Cross-cutting constraints — how each is satisfied

| Constraint | How this design satisfies it |
|---|---|
| **RLS-on-new-tables-from-the-start** | **No new tables are created this sprint.** US-04 adds one column (`pending`) to the existing `entries` table; US-03 adds two rows to the existing `categories` table. Both `entries` and `categories` already have RLS enabled (per migration `006`'s comment: "every table in this schema" has RLS-enabled-no-policies since inception, confirmed by that migration's own remediation of the two tables that had drifted from that baseline). Since neither migration in §5 issues `CREATE TABLE`, the "forgot RLS on a new table" failure mode structurally cannot recur here. Not independently re-verified against a live `get_advisors` call in this design pass (no live DB access from this design session) — **recommend `forge-dev` or DARKLING run `get_advisors` after applying migrations 013/014**, consistent with this project's own established post-migration check. |
| **Central error handler (`next(error)`)** | Every new/touched route handler below uses `next(error)` in its `catch` block, matching the US-29 pattern already applied throughout `accounts.js`/`entries.js`/`budgets.js`/`recurrences.js`. No new `res.status(500)` local catch is introduced anywhere in this design. |
| **NFR-13 (balances always derived, never stored)** | US-03 is designed to **never** touch a `balance` column — there isn't one. Reconciliation works exclusively by computing the current derived balance via the existing `getAccountBalance()`, diffing it against the user-entered actual balance, and inserting one ordinary row into `entries`. The balance the user sees afterward is still 100% computed live by the same `getAccountBalance()`/`getDashboardKPIs()` code path as every other entry. See §2.3. |
| **Flag conflicts rather than silently resolve** | Four material conflicts/ambiguities were found and are flagged explicitly rather than picked silently: (1) `AddEntry.jsx`/`entries/add` route vs. `Entries.jsx`'s own inline add-modal — see §4.4; (2) which query functions in `queries.js` need pending-exclusion beyond the feasibility review's named list — see §3.2 (`getCalendarMonth`, `getTagsReport` were not on the original list); (3) `Accounts.jsx` currently renders **no** balance figure at all, so "accounts" in US-02's AC is reinterpreted — see §1.2; (4) a pre-existing CSV export bug discovered while touching `getEntriesForExport()` — see §3.6. |

---

## 1. US-02 — Privacy Mask Toggle

### 1.1 Architectural decision

| Decision | Verdict | Rationale |
|---|---|---|
| Persistence mechanism | **Existing `settings` key/value table**, new key `privacy_mask_enabled` | Matches the exact precedent already established by `calendar_view_tooltip_dismissed` (v2.5) and `last_used_account_id`. No new table, no new migration. |
| Scope of "user preference" | **Global (household-wide), not per-Supabase-Auth-user** | The `settings` table (`server/db/migration.sql` line 50) has no `user_id` column and nothing in this codebase scopes settings per authenticated user — confirmed by reading `getSetting`/`setSetting`/`getAllSettings` in `queries.js` and the `GET/PUT /api/settings` handlers in `system.js`. Pondo is a single-household app; every existing setting (including the brand-new `calendar_view_tooltip_dismissed`) is global. Introducing per-user scoping for just this one setting would be inconsistent with the rest of the settings surface and is out of scope. **Flagged as a resolved ambiguity**, not a silent assumption: if a future multi-household story (US-22, referenced in the v2.1 doc's risk register) lands, all `settings` keys — not just this one — will need `user_id`/`household_id` scoping together. |
| Where masking logic lives | **Per-component, not a single new shared `formatCurrency` utility** | Six components independently format currency today (`KpiCard.jsx`, `BalanceHero.jsx`, `Entries.jsx`, `CalendarView.jsx`, `AccountSummary.jsx`, `RecentEntries.jsx` — confirmed via grep for `Intl.NumberFormat`/`style: 'currency'`, 13 files total match but 7 are out of this sprint's scope, see below). A full extraction into one shared `formatCurrency()` utility would be the "correct" refactor but is materially larger than this story's **S** sizing. This design instead adds a `usePrivacy()` read to each in-scope component's existing local formatter, sharing a single exported placeholder constant so the redaction style is visually consistent everywhere without consolidating the formatters themselves. **Flagged**: consolidating the six duplicated formatters into one shared util is a good fast-follow, explicitly out of scope here. |
| Redaction style | **Single shared constant, whole-string replacement** | `MASK_PLACEHOLDER = '₱ ••••'` (peso sign retained for context, 4 bullet characters). When masked, the *entire* formatted currency string — including any `+`/`−` sign prefix — is replaced by this constant. Colors (green/red) and icons are **not** masked (they're not "monetary figures" per the AC's own wording, and hiding directional color would make the UI look broken rather than private). Percentage-change indicators in `KpiCard` are **not** masked — a percentage is not a currency figure and doesn't reveal an exact amount held. |
| Scope: which surfaces mask | **Dashboard (`KpiCard`, `BalanceHero`, `AccountSummary`, `RecentEntries`) + Entries (`Entries.jsx` list, `CalendarView.jsx` day totals) only** | See §1.2 for the full reasoning, including why `Accounts.jsx` needs zero changes today and why `Budgets.jsx`/`Recurrences.jsx`/`TagsReport.jsx`/chart components/`RecycleBin.jsx` are explicitly excluded this sprint. |
| Touch-target / contrast | **44×44px button (`w-11 h-11`), `Eye`/`EyeOff` from `lucide-react`, `text-neutral-600` icon on white `Header` background** | `w-11 h-11` = exactly 44×44px in Tailwind's default 4px scale — meets WCAG 2.5.5 exactly, not "close enough." Icon-to-background contrast: `neutral-600` (`#3E463E`) on white computes to **≈9.8:1** (WCAG relative-luminance formula, computed by hand against `tailwind.config.js`'s actual hex value), comfortably exceeding the 3:1 floor in WCAG 1.4.11. `aria-label` is dynamic: `"Hide amounts"` when unmasked, `"Show amounts"` when masked (not a static label — screen reader users need to know the *current* action, not the icon name). |

### 1.2 Scope resolution: what "accounts" means, and why 7 of the 13 currency-rendering files are out of scope

A grep for `Intl.NumberFormat`/`style: 'currency'` across `client/src` returns **13 files**. The feasibility review's fan-out note named only 4 (`KpiCard`, `BalanceHero`, `Entries.jsx`, `Accounts.jsx`). Direct reads of all 13 resolve this:

**`Accounts.jsx` renders no balance at all today.** Its account cards show name, emoji, type badge, description, and `entry_count` — never a balance figure (confirmed by full read, line-by-line). The feasibility note's mention of `Accounts.jsx` was accurate about *intent* but not about *current state*. However, US-03 (§2) adds a reconciliation modal to this exact page that **does** display the account's current computed balance (so the user can compare it against their real-world balance) — so `Accounts.jsx` gains its first monetary figure this same sprint, via US-03, not US-02. That new figure is built with masking support from day one (§2.5), which is how "accounts" in the AC's list gets satisfied without inventing an unrelated balance display just to have something to mask.

**In scope this sprint** (AC's literal "dashboard, entries, accounts"):
- `client/src/components/dashboard/KpiCard.jsx`
- `client/src/components/dashboard/BalanceHero.jsx`
- `client/src/components/dashboard/AccountSummary.jsx` (renders per-account balance on the Dashboard — this is where "accounts" balances actually appear today)
- `client/src/components/dashboard/RecentEntries.jsx` (dashboard widget, shows entry amounts)
- `client/src/pages/Entries.jsx` (entries list `Amount` column)
- `client/src/components/entries/CalendarView.jsx` (`formatNet` — day-cell totals, part of the Entries page's calendar toggle)
- `client/src/pages/Accounts.jsx` + new `ReconcileModal.jsx` (US-03's new balance display, §2.5)

**Explicitly out of scope this sprint** (flagged, not silently dropped):
- `client/src/pages/Budgets.jsx`, `client/src/components/dashboard/BudgetProgressBar.jsx`, `client/src/components/dashboard/BudgetCard.jsx` — budget amounts are a distinct feature surface not named in the AC.
- `client/src/pages/Recurrences.jsx`, `client/src/components/dashboard/RecurrenceConfirmCard.jsx` — same reasoning.
- `client/src/pages/TagsReport.jsx` — same reasoning.
- `client/src/components/dashboard/IncomeChart.jsx`, `client/src/components/dashboard/ExpenseChart.jsx` — chart tooltips/axis labels render amounts, but charts are a materially different masking problem (axis scale, tooltip libraries) and are not named in the AC.
- `client/src/pages/RecycleBin.jsx` — the amount is baked server-side into a pre-formatted `label` string returned by `getRecycleBin()` (`` `${entry.note || 'Untitled'} — ₱${entry.amount.toLocaleString()}` `` in `queries.js`), not a client-side formatted value. Masking it would require either a regex string-surgery hack on the client or a server response shape change (splitting `label` into `note` + `amount`). Neither is justified by the AC. Flagged as a fast-follow if masking coverage needs to be exhaustive later.

**Recommendation to Gino:** if "app-wide" is meant literally (every currency figure everywhere), this is a bigger story than S — treat the above as an explicit v1.3 candidate list rather than silently expanding this sprint.

### 1.3 API contract

No new endpoints. Two existing endpoints are extended.

**`GET /api/settings`** (`server/routes/system.js`) — add `privacy_mask_enabled` to the `keysToInclude` whitelist array (currently `['last_used_account_id', 'first_launch_completed', 'calendar_view_tooltip_dismissed']`).

Response (200), new field:
```json
{
  "last_used_account_id": "3",
  "first_launch_completed": "1",
  "calendar_view_tooltip_dismissed": "1",
  "privacy_mask_enabled": "1"
}
```
Absent key = `false` (unmasked) — matches the existing `calendar_view_tooltip_dismissed` "absent means not-yet-set" convention.

**`PUT /api/settings`** — accept optional `privacy_mask_enabled` in the request body, same pattern as `calendar_view_tooltip_dismissed`:
```js
if (privacy_mask_enabled !== undefined) {
  await setSetting('privacy_mask_enabled', privacy_mask_enabled.toString());
}
```
Add `privacy_mask_enabled` to the destructured body and to the response's `keysToInclude` filter (both GET and PUT use the same array today — one array to update, two call sites).

### 1.4 Client-side design

#### 1.4.1 New: `client/src/contexts/PrivacyContext.jsx`

Mirrors `AuthContext.jsx`'s shape. Fetches `getSettings()` once on mount, exposes:
```js
const { masked, toggleMasked, loading } = usePrivacy();
```
`toggleMasked()` flips local state optimistically, then calls `updateSettings({ privacy_mask_enabled: next ? '1' : '0' })`; on failure, reverts local state and surfaces a toast/console error (masking is a convenience preference, not a critical-path write — matches the fire-and-forget philosophy already used for `calendar_view_tooltip_dismissed`, except this one does report failure since an unexpectedly-unmasked screen is a privacy regression, not a cosmetic one).

#### 1.4.2 New: `client/src/lib/mask.js`

```js
export const MASK_PLACEHOLDER = '₱ ••••';
```
Single source of truth for the redaction string, imported by every touched formatter below.

#### 1.4.3 New: `client/src/components/ui/PrivacyToggle.jsx`

`Eye`/`EyeOff` icon button, `w-11 h-11` touch target, dynamic `aria-label`, mounted in `Header.jsx`'s right-side icon row (always rendered — `Header` has no `md:hidden`, so this is reachable on both desktop and mobile, matching the AC's "one tap" requirement; it is **not** designed to survive scroll — that's the FAB's job in US-07, a different AC).

#### 1.4.4 Touched files (masking read added to existing local formatter)

| File | Function touched | Change |
|---|---|---|
| `client/src/components/dashboard/KpiCard.jsx` | `formatCurrency` | Add `usePrivacy()`; return `MASK_PLACEHOLDER` when `masked` is true, before the `Intl.NumberFormat` call |
| `client/src/components/dashboard/BalanceHero.jsx` | `formatCurrency` | Same pattern |
| `client/src/components/dashboard/AccountSummary.jsx` | `formatCurrency` | Same pattern |
| `client/src/components/dashboard/RecentEntries.jsx` | `formatCurrency` | Same pattern |
| `client/src/pages/Entries.jsx` | `formatCurrency` | Same pattern |
| `client/src/components/entries/CalendarView.jsx` | `formatNet` | Same pattern (note: this function already prepends a `+` sign — when masked, the whole `${sign}${formatted}` output is replaced by `MASK_PLACEHOLDER`, not just the number) |
| `client/src/App.jsx` | — | Wrap `<AuthProvider>` with `<PrivacyProvider>` (or nest inside it) so `usePrivacy()` is available anywhere under `Layout` |

### 1.5 FR traceability — US-02

| AC item | Design element |
|---|---|
| Eye-icon toggle masks all monetary figures app-wide (dashboard, entries, accounts) | §1.2 scope table + §1.4.4 file list; "accounts" resolved to `AccountSummary.jsx` (existing) + `ReconcileModal.jsx` (new, via US-03) since `Accounts.jsx` itself has no balance display today |
| Consistent redaction style | Single exported `MASK_PLACEHOLDER` constant (§1.4.2), used at every touched call site |
| State persists as a user preference | `settings.privacy_mask_enabled`, same mechanism as `calendar_view_tooltip_dismissed` (§1.3) |
| ≥44×44px touch target | `PrivacyToggle.jsx` is `w-11 h-11` (exactly 44×44px) |
| `aria-label` | Dynamic label reflecting current/next state (§1.1) |
| Icon-to-background contrast ≥3:1 | `neutral-600` on white ≈ 9.8:1, computed against `tailwind.config.js`'s actual hex values (§1.1) |

---

## 2. US-03 — Balance Reconciliation

### 2.1 Architectural decision

| Decision | Verdict | Rationale |
|---|---|---|
| How the gap is closed | **One auto-created `entries` row, sign/type derived from account-type-aware balance formula** | NFR-13 forbids a stored balance. The only NFR-13-safe way to "set" a balance is to insert a normal entry whose effect on the existing derivation formula produces the target balance. See §2.3 for the exact formula. |
| Category | **Two new default categories, `"Balance Adjustment"` — one `type='income'`, one `type='expense'`** | `categories.type` is a `NOT NULL CHECK (type IN ('income','expense'))` column (confirmed in `server/db/migration.sql`) — a single category cannot serve both entry types. Whichever direction the adjustment needs (see §2.3), the correctly-typed category is selected. Both rows are `is_default = true` (protected from deletion, same mechanism every other seeded category uses in `categories.js`'s `DELETE` handler). |
| Zero-delta case | **No entry created** | `entries.amount` must be positive (enforced by `createEntrySchema`'s `z.number().positive()`, and there's no reason to write a $0 adjustment). If `actual_balance === current_balance`, the endpoint returns 200 with `adjustment_created: false` and no new row. |
| Where the business logic lives | **New `server/lib/reconciliation.js`, pure function** | Matches the existing project convention of pulling pure date/cycle math out of the route layer (`server/lib/recurrence-cycle.js`, `server/lib/budget-cycle.js` both already exist for exactly this reason). `computeReconciliationEntry(accountType, currentBalance, actualBalance)` is unit-testable in isolation from Express/Supabase. |
| Category lookup mechanism | **New `getBalanceAdjustmentCategory(type)`, exact-name match — deliberately NOT `getFallbackCategory`'s `is_default` lookup** | `getFallbackCategory()` (existing, `queries.js`) does `.eq('type', type).eq('is_default', true).single()`. Every seeded default category in this app has `is_default = true` — there are 10 default expense categories and 6 default income categories, all `is_default = true` (confirmed in `seed_default_categories()`, migration `001`). That means `getFallbackCategory()` already matches **multiple** rows per type today and `.single()` would error given more than one match. This is a **pre-existing bug**, out of this sprint's scope, but it directly informs this design: reusing that lookup pattern for the reconciliation category would inherit the same fragility. `getBalanceAdjustmentCategory(type)` instead filters on the exact literal name `"Balance Adjustment"` in addition to `type`, which is unambiguous by construction (§5 migration inserts exactly one row per type, idempotently). **Flagged**, not silently worked around: `getFallbackCategory()`'s pre-existing multi-row `.single()` bug should be filed as its own fix, separate from this sprint. |
| Are "Balance Adjustment" categories hidden from the normal Add Entry category dropdown? | **No — left selectable, same as every other default category** | Hiding it would require category-list filtering logic threaded through `Entries.jsx`'s inline modal, `AddEntry.jsx`, and `EditEntry.jsx` — a materially larger change than this story's **S** sizing, and the AC does not require it. **Flagged as an accepted simplification**: a user *can* manually create a `"Balance Adjustment"`-categorized entry outside the reconciliation flow, same as they already can with the existing generic `"Other"` category. |

### 2.2 Schema changes

See §5 for the full migration. Summary: `INSERT` two rows into the existing `categories` table (`"Balance Adjustment"`, one per `type`), idempotently. No `ALTER TABLE`, no new table, no RLS action needed (existing table).

### 2.3 Business logic — `server/lib/reconciliation.js`

The existing balance formula (`getAccountBalance()`, `queries.js` lines ~185–230) branches on `account.type`:

```
debit / invest / borrowed:  balance = totalIncome - totalExpense   (an income entry increases balance)
credit / lent:               balance = totalExpense - totalIncome   (an expense entry increases balance)
```

`computeReconciliationEntry` must therefore pick entry `type` based on which direction increases *that specific account type's* balance, not naively "positive delta = income":

```js
// server/lib/reconciliation.js
const INCOME_INCREASES_BALANCE = new Set(['debit', 'invest', 'borrowed']);

const computeReconciliationEntry = (accountType, currentBalance, actualBalance) => {
  const delta = actualBalance - currentBalance; // signed, in "balance" terms — this is what the UI shows the user
  if (delta === 0) return null;

  const incomeIncreases = INCOME_INCREASES_BALANCE.has(accountType);

  if (incomeIncreases) {
    return delta > 0
      ? { type: 'income', amount: delta }
      : { type: 'expense', amount: Math.abs(delta) };
  }
  // credit, lent
  return delta > 0
    ? { type: 'expense', amount: delta }
    : { type: 'income', amount: Math.abs(delta) };
};

module.exports = { computeReconciliationEntry };
```

Worked example (the case most likely to be gotten wrong): a `credit` account currently shows balance `₱2,000` (amount owed). The user's real card statement says they now owe `₱2,500` (delta `+500`). Since `credit` is NOT in `INCOME_INCREASES_BALANCE`, a positive delta creates an **expense** entry of `₱500` — expenses increase a credit account's "amount owed" balance, which is correct (an unlogged purchase, not unlogged income).

### 2.4 API contract

**`POST /api/accounts/:id/reconcile`** — new endpoint, added to `server/routes/accounts.js`.

**Validation (Zod, added to `server/middleware/validate.js`):**
```js
const reconcileAccountSchema = z.object({
  body: z.object({
    actual_balance: z.number(), // signed — negative is valid for credit/lent "amount owed" accounts
  }),
  params: z.object({ id: z.string().regex(/^\d+$/) }),
});
```

**Request:**
```json
{ "actual_balance": 4250.00 }
```

**Response — adjustment created (201):**
```json
{
  "reconciled": true,
  "adjustment_created": true,
  "entry": { "id": 88, "type": "expense", "amount": 150.00, "note": "Balance reconciliation", "date": "2026-07-19", "category_name": "Balance Adjustment", "account_id": 3, "...": "..." },
  "previous_balance": 4400.00,
  "new_balance": 4250.00,
  "delta": -150.00
}
```

**Response — already reconciled, no entry created (200):**
```json
{
  "reconciled": true,
  "adjustment_created": false,
  "previous_balance": 4250.00,
  "new_balance": 4250.00,
  "delta": 0
}
```

**Response (404) — account not found or soft-deleted:**
```json
{ "error": { "code": "NOT_FOUND", "message": "Account not found" } }
```

**Response (400)** — Zod validation failure (missing/non-numeric `actual_balance`), handled by the existing `validate()` middleware.

**Response (500, defensive-only, should never occur post-migration):**
```json
{ "error": { "code": "MISSING_SYSTEM_CATEGORY", "message": "Balance Adjustment category is missing. Contact support." } }
```

**Handler logic (`server/routes/accounts.js`):**
```js
router.post('/:id/reconcile', validate(reconcileAccountSchema), async (req, res, next) => {
  try {
    const id = req.params.id;
    const account = await getAccountById(id);
    if (!account) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Account not found' } });

    const previousBalance = await getAccountBalance(id);
    const adjustment = computeReconciliationEntry(account.type, previousBalance, req.body.actual_balance);

    if (!adjustment) {
      return res.status(200).json({ reconciled: true, adjustment_created: false, previous_balance: previousBalance, new_balance: previousBalance, delta: 0 });
    }

    const category = await getBalanceAdjustmentCategory(adjustment.type);
    if (!category) {
      const err = new Error('Balance Adjustment category is missing. Contact support.');
      err.status = 500; err.code = 'MISSING_SYSTEM_CATEGORY';
      throw err;
    }

    const entry = await createEntry({
      type: adjustment.type,
      amount: adjustment.amount,
      account_id: Number(id),
      category_id: category.id,
      note: 'Balance reconciliation',
      date: getTodayDateString(),
    });

    const newBalance = await getAccountBalance(id);
    logAppEvent('balance_reconciled', { account_type: account.type, delta: req.body.actual_balance - previousBalance });

    res.status(201).json({
      reconciled: true, adjustment_created: true, entry,
      previous_balance: previousBalance, new_balance: newBalance,
      delta: req.body.actual_balance - previousBalance,
    });
  } catch (error) {
    next(error);
  }
});
```
Note: this bypasses `entries.js`'s POST route entirely (calls `createEntry()` from `queries.js` directly) — same established pattern as `processRecurrences`/`confirmRecurrence` in `queries.js`, which also call `createEntry()` directly without going through the HTTP route layer. It intentionally does **not** update `last_used_account_id` (this isn't the user actively choosing an account to spend from) and **does** fire `logAppEvent` for observability (US-27 pattern), never awaited-blocking.

### 2.5 Client-side design

#### 2.5.1 New: `client/src/components/accounts/ReconcileModal.jsx`

Built on the existing `Modal.jsx`/`Input.jsx`/`Button.jsx` primitives (no new UI kit needed). Shows:
- The account's current computed balance (fetched via `GET /api/accounts/:id`, which already returns everything needed — no new GET endpoint required for this display).
- One `Input` (numeric, `prefix="₱"`, matching the existing pattern in `AddEntry.jsx`) for "What's your actual balance right now?"
- On submit, calls new `reconcileAccount(id, actualBalance)` API function → `POST /api/accounts/:id/reconcile`.
- Displays the returned `delta` and either "Reconciled — no adjustment needed" (delta 0) or "Adjustment of {formatted delta} created" before closing.
- The current-balance display and the post-reconcile delta/new-balance display both go through the same `usePrivacy()`/`MASK_PLACEHOLDER` treatment as §1.4 — this is the concrete instance of "accounts" masking coverage referenced in §1.2.

#### 2.5.2 Modified: `client/src/pages/Accounts.jsx`

- New "Reconcile" icon button (e.g. `Scale`/`RefreshCcw` from `lucide-react`) per account card, alongside the existing Edit/Delete buttons, `aria-label="Reconcile balance"`.
- New state: `reconcilingAccount`, opens `ReconcileModal`.
- On successful reconcile, refetch accounts (`fetchAccounts()`) so `entry_count` updates.

#### 2.5.3 `client/src/lib/api.js`

```js
export const reconcileAccount = (id, actualBalance) =>
  apiRequest(`/accounts/${id}/reconcile`, { method: 'POST', body: JSON.stringify({ actual_balance: actualBalance }) });
```

### 2.6 FR traceability — US-03

| AC item | Design element |
|---|---|
| User enters real current balance; system computes delta | `ReconcileModal.jsx` → `POST /api/accounts/:id/reconcile`, `computeReconciliationEntry()` (§2.3) |
| Auto-creates one new entry categorized "Balance Adjustment" that closes the gap | `createEntry()` call in the route handler, using `getBalanceAdjustmentCategory()` (§2.4) |
| No balance field becomes directly editable/stored | No `ALTER TABLE accounts ADD COLUMN balance` anywhere in this design; `getAccountBalance()` is untouched and still the sole source of truth (§2.1, NFR-13) |
| Adjustment entry visibly labeled in entries list | `category_name: "Balance Adjustment"` renders through the existing `Entries.jsx` category column exactly like any other category — no special-case rendering needed, the category name itself is the label |
| `next(error)` from day one | Route handler in §2.4 uses `next(error)`, no local `res.status(500)` |

---

## 3. US-04 — Pending Entry Flag

### 3.1 Architectural decision

| Decision | Verdict | Rationale |
|---|---|---|
| Column | **`entries.pending BOOLEAN NOT NULL DEFAULT false`** | `NOT NULL DEFAULT false` (not nullable) avoids three-state ambiguity (`true` / `false` / `NULL`) in every downstream filter — every read site can use a clean `.eq('pending', false)` instead of an `.or('pending.is.null,pending.eq.false')` workaround. |
| Naming collision with `recurrences.pending_confirmation` | **Kept as `pending` anyway — flagged explicitly** | This codebase already has an unrelated concept called "pending" on a different table: `recurrences.pending_confirmation` (a recurrence awaiting the user's decision to post it — see `RecurrenceConfirmCard.jsx`/`confirmRecurrence()`). `entries.pending` (this story) means something conceptually different — an entry that exists and is counted in the list, but excluded from balance until the user confirms it clears (a bank-pending-transaction concept). They live on different tables and are never read together, so there's no code-level collision, but they are **easy to confuse by name alone**. **Flagged, not silently renamed**: the AC's own language ("mark an entry 'pending'") is the source of the name; renaming to something like `uncleared` would deviate from the AC's wording for a collision that's cosmetic, not functional. |
| Which functions get excluded vs. which just display the flag | **See exhaustive audit, §3.2** | This is the single highest-risk part of this story — the codebase has zero shared aggregation module (confirmed: `queries.js` is 2469 lines, every balance/aggregate function repeats its own inline query). Every function reading `entries` was read individually this session; the table below is exhaustive, not the feasibility review's partial list. |
| Confirm mechanism | **New targeted `confirmPendingEntry(id)`, not a reuse of the general `updateEntry()`** | Mirrors the existing `updateRecurrenceInternal()` pattern in `queries.js` — a minimal, purpose-built mutation that only touches the one field the action actually changes (`pending` + `updated_at`), rather than requiring the caller to reconstruct and resubmit the entire entry payload the way `updateEntry()`'s full-replacement API demands. |

### 3.2 Exhaustive query-function audit — every function reading `entries` in `server/db/queries.js`

Read line-by-line, in full (all 2469 lines), on 2026-07-19. This supersedes and extends the feasibility review's partial list (`getDashboardKPIs`, `getDashboardAccounts`, `getExpenseBreakdown`, `getIncomeBreakdown`, `getAccountBalance`, `getAccounts`' balance-sort branch) — two aggregation functions the review did not name (`getCalendarMonth`, `getTagsReport`, both added in v2.5 after the original feasibility pass) are exactly the kind of miss this audit exists to catch.

#### Group A — MUST add pending-exclusion (balance/financial-total calculations)

| # | Function | Current filter | Change required |
|---|----------|-----------------|------------------|
| 1 | `getAccountBalance(id)` | JS filter `.filter(e => e.type === 'income' \|\| 'expense' && !e.deleted_at)` on the joined `entries(type, amount)` | Select must include `pending`: `entries(type, amount, pending)`. Add `&& !e.pending` to **both** the income and expense JS filter chains (lines ~205–211) — same shape as the existing `!e.deleted_at` addition from v2.1. |
| 2 | `getDashboardKPIs(from, to)` — **entries sub-query** (income/expense totals) | `.is('deleted_at', null)` | Add `.eq('pending', false)` to the query builder chain (server-side filter, no select change needed). |
| 3 | `getDashboardKPIs(from, to)` — **accounts sub-query** (net-worth `total_balance`) | Selects `entries(type, amount, deleted_at)`, JS-filters `!e.deleted_at` | Select must include `pending`: `entries(type, amount, deleted_at, pending)`. Add `&& !e.pending` to the `accountEntries` JS filter (line ~1017). **Two separate fixes inside one function** — easy to do only one and miss the other. |
| 4 | `getDashboardMoM(from, to)` | `.is('deleted_at', null)` | Add `.eq('pending', false)` |
| 5 | `getExpenseBreakdown(from, to)` | `.is('deleted_at', null)` | Add `.eq('pending', false)` |
| 6 | `getIncomeBreakdown(from, to)` | `.is('deleted_at', null)` | Add `.eq('pending', false)` |
| 7 | `getDashboardAccounts(from, to)` | `.is('deleted_at', null)` | Add `.eq('pending', false)` |
| 8 | `getCalendarMonth(month)` (US-08, v2.5) | `.is('deleted_at', null).is('transfer_group_id', null)` | **Not in the original feasibility list — found during this audit.** Add `.eq('pending', false)`. Rationale: the calendar's day-cell net totals are a financial summary exactly like the dashboard's; showing a pending grocery run in "today's net" before it clears would be the same inconsistency this whole story exists to fix. Treated as in-scope, not a separate story. |
| 9 | `getTagsReport(from, to)` (US-14, v2.5) | `.is('entries.deleted_at', null).is('entries.transfer_group_id', null)` | **Not in the original feasibility list — found during this audit.** Add `.eq('entries.pending', false)`. Same rationale as #8: a tag-spend report double-counting an unconfirmed pending charge would misrepresent the household's actual tag-level spend. |

#### Group B — inherits the fix automatically, zero direct code change, still named explicitly per this project's own precedent (v2.1 §1.3 did the same for `getAccounts`)

| # | Function | Why it's safe with no direct change |
|---|----------|--------------------------------------|
| 10 | `getAccounts(sort='balance')` branch | Calls `getAccountBalance(account.id)` per account (line ~142) — inherits fix #1 automatically. |
| 11 | `dashboardBudgetsHandler` (`server/routes/budgets.js`, not `queries.js`, but reads entries transitively) | Calls `getExpenseBreakdown()` (fix #5) to compute `spend` per category for budget progress bars — inherits automatically. Named here because a budget progress bar silently including a pending charge would be exactly the kind of "miss one and it silently counts somewhere" failure this story is designed against, and it's outside `queries.js` so it would be easy to overlook in a `queries.js`-only search. |

#### Group C — NO exclusion (raw listings that must continue to *show* pending entries) — but MUST expose the flag

| # | Function | Change required |
|---|----------|------------------|
| 12 | `getEntries(filters)` | Add `pending` to the `.select()` column list (top-level, alongside `id, type, amount, ...`) and to the flattened return object. **No filter added** — pending entries must remain visible in the list per the AC. |
| 13 | `getEntryById(id)` | Same — add `pending` to select + returned object (needed for the edit-entry form's checkbox state). |
| 14 | `getRecentEntries(from, to, limit)` | Same — add `pending` to select + returned object (needed for the Dashboard's "Recent Activity" widget to render a Pending badge). |
| 15 | `getEntriesForExport(from, to)` | Add `pending` to select + returned object. Not required by any AC, but cheap and directly useful for reconciling a CSV against the app — see §3.6 for why this function gets touched regardless. |

#### Group D — NO change of any kind (existence checks / unrelated to balance)

| # | Function | Why safe |
|---|----------|----------|
| 16 | `getAccountEntryCount(id)` | Counts non-deleted entries for the account-delete "has entries" check — a pending entry is still a real entry that must be accounted for in that check, exclusion would be wrong here. |
| 17 | `getCategoryEntryCount(id)` | Same reasoning for category delete. |
| 18 | `deleteEntry`, `bulkDeleteEntries`, `deleteAccount`, `deleteEntriesByAccount`, `restoreItem`, `purgeExpired` | Deletion/restore/purge are unaffected by pending status — a pending entry soft-deletes and restores exactly like any other entry. |
| 19 | `getAccountsForExport` | Reads `accounts` only, no `entries` join. |
| 20 | All `getBudgets*`/`createBudget`/`updateBudget`/`deleteBudget` (direct budget CRUD, not the dashboard enrichment handler) | Reads `budgets`/`categories` only, no `entries` join. |
| 21 | All `getRecurrence*`/recurrence scheduling functions | Reads `recurrences` only; the entries they eventually create via `createEntry()` are covered by fix #22 below, not by touching the recurrence functions themselves. |
| 22 | `getTags`, `createTag`, `deleteTag` | No `entries` read. |

#### Write paths — accept/persist the new field

| # | Function | Change required |
|---|----------|------------------|
| 23 | `createEntry(entry, internal)` | Destructure `pending` from the `entry` param (alongside `type, amount, account_id, ...`); insert `pending: pending || false`. Entries created by `processRecurrences`/`confirmRecurrence`/the new `POST /accounts/:id/reconcile` route don't pass `pending` — they correctly default to `false` (a recurring auto-post or a reconciliation adjustment is never "pending" in the bank sense). |
| 24 | `updateEntry(id, entry, internal)` | Destructure `pending` from the `entry` param, include in the `.update()` payload — same merge-at-the-route-layer pattern already used for every other field (`req.body.pending !== undefined ? req.body.pending : existingEntry.pending` in `entries.js`'s `PUT` handler). |
| 25 | **New:** `confirmPendingEntry(id)` | Targeted `UPDATE entries SET pending = false, updated_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING ...` — see §3.1 for why this is separate from `updateEntry()`. |

**Total functions touched or explicitly reviewed-and-excluded in `queries.js`: 25**, all named above by number. Nothing in the file was left unexamined.

### 3.3 API contract

**Extend `createEntrySchema` / `updateEntrySchema`** (`server/middleware/validate.js`):
```js
pending: z.boolean().optional(),
```
Added to both schemas' `body` object, alongside the existing `tag_ids` addition from v2.5.

**`POST /api/entries`** — request body gains optional `pending` (default `false` if omitted, handled in `createEntry`).

**`PUT /api/entries/:id`** — request body gains optional `pending`.

**`GET /api/entries`, `GET /api/entries/:id`** — response entries gain a `pending: boolean` field.

**New: `POST /api/entries/:id/confirm`** — added to `server/routes/entries.js`, placed near the other single-entry routes (ordering relative to `/:id` has no collision risk — `/:id/confirm` is a distinct two-segment path, unlike the documented `/calendar` vs `/:id` ordering gotcha from v2.5, which only applies to routes matching the exact `/:id` shape).

```js
router.post('/:id/confirm', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid entry ID' } });

    const existing = await getEntryById(id);
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Entry not found' } });
    if (!existing.pending) return res.status(409).json({ error: { code: 'NOT_PENDING', message: 'This entry is not pending.' } });

    const entry = await confirmPendingEntry(id);
    res.json({ entry });
  } catch (error) {
    next(error);
  }
});
```

**Response (200):**
```json
{ "entry": { "id": 91, "pending": false, "type": "expense", "amount": 320.00, "...": "..." } }
```
**Response (404):** `{ "error": { "code": "NOT_FOUND", "message": "Entry not found" } }`
**Response (409)** — already confirmed, mirrors `confirmRecurrence()`'s existing `NOT_PENDING` pattern for consistency: `{ "error": { "code": "NOT_PENDING", "message": "This entry is not pending." } }`

### 3.4 Client-side design

| File | Change |
|---|---|
| `client/src/lib/api.js` | New: `export const confirmPendingEntry = (id) => apiRequest(`/entries/${id}/confirm`, { method: 'POST' });` |
| `client/src/pages/AddEntry.jsx` | New checkbox "Mark as pending" in the form, wired to `form.pending`, included in the `createEntry()` payload |
| `client/src/pages/Entries.jsx` — inline Add Entry modal | Same checkbox added to `addForm`/`handleAddEntry` — **see §4.4, this form must be kept in sync with `AddEntry.jsx` or the two flows drift** |
| `client/src/pages/EditEntry.jsx` | Same checkbox added to `formData`, pre-populated from `entry.pending`, included in `updateEntry()` payload |
| `client/src/pages/Entries.jsx` — list table | New "Pending" badge (amber pill, matching the existing `bg-amber-50 border-amber-200` convention already used by `RecurrenceConfirmCard.jsx`) rendered when `entry.pending`. New "Confirm" icon button (e.g. `CheckCircle` from `lucide-react`) next to Edit/Delete for pending rows only, calls `confirmPendingEntry(entry.id)` then `fetchEntries()`. |
| `client/src/components/dashboard/RecentEntries.jsx` | Same amber "Pending" badge next to entries where `entry.pending` is true (display only — no confirm action on this compact dashboard widget, consistent with it being a summary surface) |

### 3.5 Amount-field interaction with US-02 masking

No interaction — the `pending` badge is a status pill (text "Pending"), not a monetary figure, so it is unaffected by the privacy mask. The entry's amount next to it still masks per §1.4.

### 3.6 Pre-existing bug discovered in `getEntriesForExport`/`export.js` — flagged, not silently fixed

While auditing `getEntriesForExport` for the `pending` addition (§3.2, item 15), the CSV-building code in `server/routes/export.js` was read in full. Two pre-existing defects, unrelated to this sprint, were found in the exact function this story already needs to touch:

1. **`export.js`'s CSV row builder references `entry.category` and `entry.account`**, but `getEntriesForExport()` returns `category_name` and `account_name` (confirmed by reading the function's actual `return data.map(...)` shape). Every CSV export has always emitted **empty** Category and Account columns.
2. **`getEntriesForExport()` already computes a comma-separated `tags` field** (added in v2.5) but `export.js`'s CSV header/row never references it — tag data is fetched and silently dropped.

Neither is caused by this sprint and neither is required to be fixed by any US-02/03/04/07 AC. They are flagged here because `forge-dev` will already have this exact file open to add the `Pending` column (§3.2 item 15) — leaving two adjacent, obviously-unintentional bugs unfixed in the same file at the same time would be an odd outcome. **Recommendation, not a silent scope expansion**: fix `entry.category`→`entry.category_name`, `entry.account`→`entry.account_name`, and add a `Tags` column, in the same PR as the `Pending` column addition, called out as a distinct commit/diff so review can evaluate it separately from the US-04 work itself.

### 3.7 FR traceability — US-04

| AC item | Design element |
|---|---|
| Optional boolean flag at entry creation/edit | `entries.pending` column (§5); `createEntry`/`updateEntry` extended (§3.2 items 23–24); checkboxes in `AddEntry.jsx`, `Entries.jsx` modal, `EditEntry.jsx` (§3.4) |
| Pending entries appear in list but excluded from balance calculations until confirmed | Group A (§3.2, 9 functions) excludes pending from every balance/aggregate; Group C (4 functions) keeps pending entries visible in every listing |
| One-tap confirm flips pending → counted, updates balance immediately | `POST /api/entries/:id/confirm` (§3.3) → `confirmPendingEntry()` (§3.2 item 25); balance reflects it immediately because every balance read (Group A) already excludes/includes based on the live `pending` column value, no caching layer to invalidate |

---

## 4. US-07 — Persistent Mobile FAB

### 4.1 Architectural decision

| Decision | Verdict | Rationale |
|---|---|---|
| Mount point | **`Layout.jsx`, sibling to `BottomNav`, `md:hidden`** | `Layout.jsx` already conditionally renders `BottomNav` at `< md:` widths (v2.1). The FAB follows the identical breakpoint convention — no new breakpoint logic invented. |
| Positioning | **`fixed`, `right-4`, `bottom` computed to clear `BottomNav`'s height + safe-area + a gap** | `BottomNav` is `h-16` (64px) plus `env(safe-area-inset-bottom)` padding, `z-40`. The FAB uses `bottom: calc(4rem + env(safe-area-inset-bottom, 0px) + 1rem)` (64px nav + 16px gap + device safe-area) and `z-50` (above the nav bar) so it never overlaps the bottom nav on any device, including iPhones with a home indicator. |
| Target | **Navigates to `/entries/add`** | Per this design's instructions and confirmed live in `App.jsx` (`<Route path="entries/add" element={<AddEntry />} />` already exists). See §4.4 for a material discrepancy this surfaces. |
| Touch target / contrast | **`w-14 h-14` (56×56px) circular button, `bg-brand-600`, white `Plus` icon** | Exceeds the 44×44px floor with margin to spare. Contrast: white (`#FFFFFF`) icon on `brand-600` (`#1F7A64`) computes to **≈5.2:1** (WCAG relative-luminance formula, hand-computed against the actual hex value in `tailwind.config.js`), exceeding the 3:1 floor in WCAG 1.4.11 — same AC as US-02's toggle, satisfied independently here. |
| Desktop header button | **Unchanged** | `Header.jsx`'s existing "Add Entry" button (`showAddEntryButton` logic, links to `/entries`) is not touched by this story. |

### 4.2 New: `client/src/components/FloatingActionButton.jsx`

```jsx
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FloatingActionButton = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/entries/add')}
      aria-label="Add entry"
      className="md:hidden fixed right-4 z-50 w-14 h-14 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg flex items-center justify-center transition-colors"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 1rem)' }}
    >
      <Plus className="w-6 h-6" />
    </button>
  );
};

export default FloatingActionButton;
```

### 4.3 Modified: `client/src/components/Layout.jsx`

Add `import FloatingActionButton from './FloatingActionButton';` and render `<FloatingActionButton />` as a sibling to `<BottomNav />` (after `<main>`, same as `BottomNav`'s current placement) — not nested inside `<main>`, so it isn't affected by `main`'s padding/scroll context.

### 4.4 Flagged conflict: two divergent "Add Entry" UIs, not one

This design's instructions state the FAB "routes to the existing `AddEntry.jsx` page (confirmed: router navigation, not a modal — `AddEntry` is a full page today, not a modal component)." That is correct as far as it goes — `AddEntry.jsx` is indeed a full page, and `entries/add` is indeed a registered route. But a full read of the live app surfaces something the "confirmed" framing didn't capture:

- **`AddEntry.jsx` is currently unreachable by any link or button in the app.** `Header.jsx`'s "Add Entry" button (`showAddEntryButton`, visible at `/` and `/entries`) navigates to `/entries`, **not** `/entries/add`.
- The actual add-entry UI users interact with today is **`Entries.jsx`'s own inline modal** (`showAddModal` state, `handleAddEntry`, lines ~503–639 of that file) — a completely separate implementation from `AddEntry.jsx`, with its own duplicated form JSX, its own duplicated validation, its own `TagInput` wiring.
- `entries/add` → `AddEntry.jsx` is, today, dead code reachable only by typing the URL directly.

**This sprint wires the FAB to `/entries/add` as instructed**, which means Pondo will have **two independently-maintained Add Entry forms** after this sprint ships: the desktop-reachable modal in `Entries.jsx`, and the now-mobile-reachable full page `AddEntry.jsx`. This is a real drift risk going forward — the two forms have already required matching upkeep at least once (both got `TagInput` added in v2.5, confirmed by reading both files) and now both need the US-04 pending checkbox (§3.4) added in parallel, in this same sprint, or they will launch out of sync with each other.

**This design's mitigation for *this* sprint**: §3.4 explicitly lists both `AddEntry.jsx` and `Entries.jsx`'s modal as separate line items needing the pending checkbox, specifically so this doesn't silently drift further.

**Recommendation to Gino, not silently actioned**: a fast-follow story to consolidate the two forms into one shared `<EntryForm>` component (used by both `AddEntry.jsx` and `Entries.jsx`'s modal, and arguably `EditEntry.jsx` too, which is a *third*, still-separate implementation) would eliminate this drift risk permanently. Out of scope for v1.2 — flagged, not undertaken here, since it's a refactor with no user-facing AC behind it this sprint.

### 4.5 FR traceability — US-07

| AC item | Design element |
|---|---|
| Brand-600 circular FAB, bottom-right, persistent across scroll, mobile widths | `FloatingActionButton.jsx`, `fixed` positioning, `md:hidden` (§4.1–4.2) |
| Opens the existing Add Entry flow | Navigates to `/entries/add` → `AddEntry.jsx` (§4.1); flagged drift risk vs. the *other* existing Add Entry flow documented in §4.4 |
| Desktop header button unchanged | No changes to `Header.jsx` in this story |
| Same touch-target/contrast AC as US-02 | `w-14 h-14` (56×56, exceeds 44×44 floor); white-on-brand-600 ≈5.2:1 contrast (§4.1) |

---

## 5. Migrations assigned this sprint

Highest existing migration confirmed live: `server/db/migrations/012_app_events.sql`. This sprint assigns **`013`** and **`014`**, kept as two separate files since they touch unrelated tables for unrelated stories and should be independently revertible.

### `server/db/migrations/013_entries_pending_flag.sql` (US-04)

```sql
-- ============================================================
-- Migration: 013_entries_pending_flag
-- Story: US-04 — Pending entry flag (v1.2)
-- Run against: Supabase Postgres
-- Rollback: ALTER TABLE public.entries DROP COLUMN pending;
--           DROP INDEX IF EXISTS idx_entries_pending;
--
-- Purely additive column on an existing, already-RLS-enabled table
-- (per migration 006's baseline) — no new table, so the "RLS on new
-- tables" checklist item does not apply here. Not independently
-- re-verified against a live get_advisors call in this design pass;
-- recommend running get_advisors after applying, per this project's
-- own established post-migration habit (see 006/007/011/012).
-- ============================================================

BEGIN;

ALTER TABLE public.entries
    ADD COLUMN IF NOT EXISTS pending BOOLEAN NOT NULL DEFAULT false;

-- Partial index — the vast majority of entries will have pending = false;
-- this index only covers the small pending subset, same partial-index
-- pattern already established for deleted_at in migration 002.
CREATE INDEX IF NOT EXISTS idx_entries_pending
    ON public.entries(pending)
    WHERE pending = true;

COMMIT;
```

### `server/db/migrations/014_balance_adjustment_categories.sql` (US-03)

```sql
-- ============================================================
-- Migration: 014_balance_adjustment_categories
-- Story: US-03 — Balance reconciliation (v1.2)
-- Run against: Supabase Postgres
-- Rollback: DELETE FROM public.categories WHERE name = 'Balance Adjustment';
--           (safe only if no entries reference these categories yet —
--           if entries exist, reassign them first, same as any other
--           category deletion in this app)
--
-- Purely additive rows on an existing, already-RLS-enabled table — no
-- new table. Uses WHERE NOT EXISTS instead of ON CONFLICT DO NOTHING:
-- there is no UNIQUE constraint on categories(name, type), so an
-- ON CONFLICT clause would have no constraint to target and would
-- silently insert duplicates on a re-run rather than no-op. This
-- project's own history (migrations 006/011/012 are all recorded as
-- "applied directly to production, recorded here retroactively") means
-- accidental re-application is a real operational pattern here, not a
-- hypothetical — this migration is written to be safe under that reality.
-- ============================================================

BEGIN;

INSERT INTO public.categories (name, type, color, icon, is_default, sort_order)
SELECT 'Balance Adjustment', 'income', '#8A9387', '⚖️', true, 100
WHERE NOT EXISTS (
    SELECT 1 FROM public.categories WHERE name = 'Balance Adjustment' AND type = 'income'
);

INSERT INTO public.categories (name, type, color, icon, is_default, sort_order)
SELECT 'Balance Adjustment', 'expense', '#8A9387', '⚖️', true, 100
WHERE NOT EXISTS (
    SELECT 1 FROM public.categories WHERE name = 'Balance Adjustment' AND type = 'expense'
);

COMMIT;
```

---

## 6. File manifest

### New files

| File | Story | Purpose |
|---|---|---|
| `server/db/migrations/013_entries_pending_flag.sql` | US-04 | `pending` column + partial index |
| `server/db/migrations/014_balance_adjustment_categories.sql` | US-03 | Seed the two system categories |
| `server/lib/reconciliation.js` | US-03 | `computeReconciliationEntry()` — pure, testable |
| `client/src/contexts/PrivacyContext.jsx` | US-02 | `usePrivacy()` provider |
| `client/src/lib/mask.js` | US-02 | `MASK_PLACEHOLDER` constant |
| `client/src/components/ui/PrivacyToggle.jsx` | US-02 | Eye/EyeOff header toggle |
| `client/src/components/accounts/ReconcileModal.jsx` | US-03 | Reconciliation UI |
| `client/src/components/FloatingActionButton.jsx` | US-07 | Mobile FAB |

### Modified files

| File | Story | Change summary |
|---|---|---|
| `server/db/queries.js` | US-03, US-04 | New: `getBalanceAdjustmentCategory`, `confirmPendingEntry`. Extended: `createEntry`, `updateEntry` (accept `pending`). Pending-exclusion added to `getAccountBalance`, `getDashboardKPIs` (both sub-queries), `getDashboardMoM`, `getExpenseBreakdown`, `getIncomeBreakdown`, `getDashboardAccounts`, `getCalendarMonth`, `getTagsReport`. Pending exposed (no exclusion) in `getEntries`, `getEntryById`, `getRecentEntries`, `getEntriesForExport`. Full audit: §3.2. |
| `server/routes/accounts.js` | US-03 | New `POST /:id/reconcile` route |
| `server/routes/entries.js` | US-04 | New `POST /:id/confirm` route |
| `server/routes/system.js` | US-02 | `privacy_mask_enabled` added to `GET`/`PUT /api/settings` whitelist |
| `server/middleware/validate.js` | US-03, US-04 | New `reconcileAccountSchema`. `pending: z.boolean().optional()` added to `createEntrySchema`/`updateEntrySchema` |
| `server/routes/export.js` + `getEntriesForExport` | US-04 (+ flagged pre-existing bugfix) | Add `Pending` CSV column; recommended (not silently mandated) fix for the `entry.category`/`entry.account` field-name bug, §3.6 |
| `client/src/App.jsx` | US-02 | Wrap tree with `PrivacyProvider` |
| `client/src/components/Header.jsx` | US-02 | Mount `PrivacyToggle` |
| `client/src/components/Layout.jsx` | US-07 | Mount `FloatingActionButton` |
| `client/src/lib/api.js` | US-03, US-04 | New: `reconcileAccount`, `confirmPendingEntry` |
| `client/src/components/dashboard/KpiCard.jsx` | US-02 | Mask `formatCurrency` |
| `client/src/components/dashboard/BalanceHero.jsx` | US-02 | Mask `formatCurrency` |
| `client/src/components/dashboard/AccountSummary.jsx` | US-02 | Mask `formatCurrency` |
| `client/src/components/dashboard/RecentEntries.jsx` | US-02, US-04 | Mask `formatCurrency`; add Pending badge |
| `client/src/pages/Entries.jsx` | US-02, US-04 | Mask `formatCurrency`; add Pending badge/checkbox/confirm button to list + inline modal |
| `client/src/components/entries/CalendarView.jsx` | US-02 | Mask `formatNet` |
| `client/src/pages/Accounts.jsx` | US-03 | New Reconcile button per account card |
| `client/src/pages/AddEntry.jsx` | US-04, (US-07 makes this reachable) | Add pending checkbox |
| `client/src/pages/EditEntry.jsx` | US-04 | Add pending checkbox |

### Explicitly unchanged (flagged out-of-scope, not overlooked)

| File | Reason |
|---|---|
| `client/src/pages/Budgets.jsx`, `BudgetProgressBar.jsx`, `BudgetCard.jsx` | Out of US-02's masking scope (§1.2) |
| `client/src/pages/Recurrences.jsx`, `RecurrenceConfirmCard.jsx` | Same |
| `client/src/pages/TagsReport.jsx` | Same |
| `client/src/components/dashboard/IncomeChart.jsx`, `ExpenseChart.jsx` | Same |
| `client/src/pages/RecycleBin.jsx` | Same (server-baked label string, §1.2) |
| `server/routes/dashboard.js`, `server/routes/categories.js`, `server/routes/tags.js`, `server/routes/recycle-bin.js`, `server/routes/recurrences.js`, `server/routes/budgets.js` (CRUD routes) | No direct entries-aggregation logic of their own; any pending-exclusion effect flows through `queries.js` (§3.2 Group B) |
| `client/src/components/BottomNav.jsx`, `Sidebar.jsx`, `lib/navigation.js` | Unaffected by any of these four stories |

---

## 7. FR/AC traceability matrix

| Story | AC | Satisfied by |
|---|---|---|
| US-02 | Eye toggle masks all monetary figures (dashboard, entries, accounts) | §1.2, §1.4.4 |
| US-02 | Consistent redaction style | `MASK_PLACEHOLDER` (§1.4.2) |
| US-02 | State persists as user preference | `settings.privacy_mask_enabled` (§1.3) |
| US-02 | ≥44×44px, `aria-label`, ≥3:1 contrast | §1.1, §1.4.3 |
| US-03 | Enter real balance → system computes delta | §2.3, §2.4 |
| US-03 | Auto-creates one "Balance Adjustment" entry | §2.1, §2.4 |
| US-03 | No stored balance field (NFR-13) | §2.1, §0 |
| US-03 | Adjustment visibly labeled in list | §2.6 |
| US-03 | `next(error)` from day one | §2.4 |
| US-04 | Optional pending flag at create/edit | §3.2 items 23–24, §3.4 |
| US-04 | Pending excluded from balance until confirmed | §3.2 Groups A/B (11 functions) |
| US-04 | Pending entries still appear in list | §3.2 Group C (4 functions) |
| US-04 | One-tap confirm, immediate balance update | §3.2 item 25, §3.3 |
| US-07 | Brand-600 circular FAB, persistent, mobile-only | §4.1–4.2 |
| US-07 | Opens existing Add Entry flow | §4.1, flagged drift §4.4 |
| US-07 | Desktop header unchanged | §4.1 |
| US-07 | Same touch-target/contrast AC | §4.1 |

---

## 8. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | A `queries.js` aggregation function is missed for pending-exclusion, silently double-counting an unconfirmed entry | Medium | High | §3.2's exhaustive, numbered audit (25 functions reviewed, not just the 6 named in the original feasibility review) is the authoritative checklist. `forge-dev` and DARKLING's review should check every numbered item off individually, same process the v2.1 doc established for `deleted_at`. |
| R2 | `getDashboardKPIs`' two separate sub-queries (items 2 and 3 in §3.2) — only one gets the pending fix | Medium | High | Called out explicitly as "two separate fixes inside one function" in §3.2, mirroring how v2.1's own audit flagged the same two-sub-queries-in-one-function shape for `deleted_at`. |
| R3 | The reconciliation sign logic (§2.3) is implemented as "positive delta = income" without the account-type branch | Low | High (wrong-direction adjustment on credit/lent accounts) | §2.3 includes a worked example specifically for the case most likely to be gotten backwards (a `credit` account). `computeReconciliationEntry` is a pure function — trivially unit-testable against all 5 account types × both delta signs (10 cases) before wiring to the route. |
| R4 | `AddEntry.jsx` and `Entries.jsx`'s inline modal drift further out of sync now that both are user-reachable (FAB → page, Header → modal) | Medium | Medium | Flagged explicitly in §4.4 with a named fast-follow recommendation (shared `<EntryForm>` component); this sprint mitigates by explicitly listing both forms as separate line items for the US-04 checkbox (§3.4) rather than only updating one. |
| R5 | `getFallbackCategory()`'s pre-existing multi-row `.single()` bug gets inherited by the new reconciliation category lookup | Low (mitigated by design) | Medium | §2.1 explicitly chose NOT to reuse that lookup pattern — `getBalanceAdjustmentCategory()` filters on exact name, sidestepping the bug entirely rather than inheriting it. |
| R6 | Migration 014 re-applied accidentally (this project's own history shows migrations get applied directly to prod and recorded after the fact) | Low–Medium (per this project's track record) | Low (would be silent duplicate categories, not data corruption) | Migration written with `WHERE NOT EXISTS` guards instead of a no-op `ON CONFLICT` that wouldn't actually prevent duplicates (§5) — genuinely idempotent, not just decorated to look idempotent. |
| R7 | Masking scope (§1.2) is narrower than what "app-wide" implies to a user reading only the AC headline | Low | Low–Medium (product expectation mismatch, not a bug) | Explicitly surfaced as a recommendation to Gino in §1.2 rather than silently shipping partial coverage under the "app-wide" label. |
| R8 | Pre-existing export CSV bug (§3.6) gets conflated with this sprint's actual scope during review | Low | Low | Called out as a distinct, clearly-labeled recommendation, not folded silently into the US-04 diff. |

---

## 9. Build order

| Step | File(s) | Notes |
|---|---|---|
| 1 | `server/db/migrations/013_entries_pending_flag.sql` | Apply first — everything else in US-04 depends on the column existing |
| 2 | `server/db/migrations/014_balance_adjustment_categories.sql` | Apply — US-03 depends on these rows existing |
| 3 | `server/lib/reconciliation.js` | Pure function, no dependencies — write + unit test in isolation before wiring |
| 4 | `server/db/queries.js` | All 25 audited functions (§3.2) + `getBalanceAdjustmentCategory` + `confirmPendingEntry` |
| 5 | `server/middleware/validate.js` | `reconcileAccountSchema`; `pending` added to entry schemas |
| 6 | `server/routes/accounts.js` | `POST /:id/reconcile` |
| 7 | `server/routes/entries.js` | `POST /:id/confirm` |
| 8 | `server/routes/system.js` | `privacy_mask_enabled` whitelist |
| 9 | `server/routes/export.js` | `Pending` CSV column (+ flagged bugfix, §3.6, as a separate reviewable diff) |
| 10 | `client/src/contexts/PrivacyContext.jsx`, `client/src/lib/mask.js` | US-02 foundation |
| 11 | `client/src/App.jsx` | Mount `PrivacyProvider` |
| 12 | `client/src/components/ui/PrivacyToggle.jsx`, `Header.jsx` | US-02 UI |
| 13 | `KpiCard.jsx`, `BalanceHero.jsx`, `AccountSummary.jsx`, `RecentEntries.jsx`, `Entries.jsx`, `CalendarView.jsx` | Mask each formatter (§1.4.4) |
| 14 | `client/src/components/accounts/ReconcileModal.jsx`, `Accounts.jsx`, `lib/api.js` (`reconcileAccount`) | US-03 UI |
| 15 | `AddEntry.jsx`, `Entries.jsx` (inline modal), `EditEntry.jsx`, `lib/api.js` (`confirmPendingEntry`) | US-04 UI — pending checkbox in all three forms + confirm button/badge in the list |
| 16 | `client/src/components/FloatingActionButton.jsx`, `Layout.jsx` | US-07 |
| 17 | QA | Full pending-exclusion smoke test: create a pending entry with a known amount, verify it's absent from dashboard KPIs, MoM, expense/income breakdown, calendar day total, tag report, and account balance, but present in the entries list and recent-activity widget with a badge; confirm it, verify all of the above flip immediately. Reconciliation: test all 5 account types × both delta directions. Masking: toggle on, verify all 6 in-scope surfaces redact; toggle off, verify they restore; reload page, verify persistence. FAB: verify it clears the bottom nav on a real iOS device with a home indicator (safe-area), verify it's absent at `md:` width. |

---

## 10. Open questions / flagged ambiguities for Gino (G3)

1. **US-02 scope**: is "app-wide" meant literally? If so, Budgets/Recurrences/TagsReport/charts/RecycleBin need a v1.3 follow-up (§1.2). This design's recommendation is to ship the AC's literal "dashboard, entries, accounts" scope now and treat full coverage as an explicit next story.
2. **US-02 settings scope**: confirm the global (household-wide, not per-Supabase-Auth-user) settings model is intentional and expected to stay that way through any future multi-household work, since all four existing `settings` keys (including this new one) share that model today.
3. **US-03 category visibility**: confirm it's acceptable that "Balance Adjustment" appears as a normal, manually-selectable category in every entry form (§2.1), rather than being hidden from manual selection.
4. **US-04/US-07 interaction (§4.4)**: confirm the FAB should point at `AddEntry.jsx` (making previously-dead code newly load-bearing) rather than, e.g., extracting `Entries.jsx`'s existing modal into something the FAB could trigger instead. This design followed the explicit instruction as given, but the "two Add Entry UIs" consequence is real and should be a conscious choice, not a side effect.
5. **`getFallbackCategory()` bug (§2.1) and the export.js field-name bug (§3.6)**: both are pre-existing, both were discovered incidentally while designing this sprint, neither is fixed by this design. Recommend filing both as separate tickets; the export.js one is cheap enough to bundle into the US-04 PR as a clearly separate commit if Gino agrees (§3.6).

---

*Produced via FRIDAY's OpenClaw Workshop Crew (`architect`). All code samples above are design specifications for `forge-dev` to adapt to exact codebase conventions during implementation — line numbers cited throughout are accurate as of the 2026-07-19 read and should be re-confirmed at implementation time in case of drift from other in-flight work.*
