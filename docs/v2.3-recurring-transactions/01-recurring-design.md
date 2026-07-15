# SAD — US-16: Recurring Bills/Income

**Version:** 1.0
**Date:** 2026-07-15
**Author:** Architect (DARKLING, direct — Ollama Cloud hit a session usage limit mid-dispatch after `architect-pondo`'s reference-gathering subagent completed; rather than block the sprint, this design was written directly against the same reference material `architect-pondo` had already pulled)
**Status:** Draft → G3 pending

---

## 1. Stack Decision

**No new dependencies.** Same stack as v2.1/v2.2:

- **Backend:** Node/Express + Supabase (PostgreSQL).
- **Scheduling:** Vercel Cron (already in use — `vercel.json` `crons` array), not a new mechanism. **No `setInterval`/`setTimeout` anywhere in this design** — Vercel serverless functions have no persistent process between invocations, so any interval-based approach silently does nothing in production. This bit nothing this session only because both v2.1 and v2.2 avoided it by design; this is the first feature that actually needs to write real rows on a schedule, so it's the first time this constraint is load-bearing rather than theoretical.
- **Frontend:** React + Tailwind, same conventions as `Budgets.jsx`/`Categories.jsx`.

**Rationale:** This is the largest non-cloud story in the backlog (XL, Medium-High risk, kept alone in its own sprint per `docs/recon/sprint-backlog.md`), but its complexity is in state management and edge cases, not in needing new infrastructure. Vercel Cron + a stored `next_due_date` anchor is sufficient.

---

## 2. Data Model

### 2.1 DDL — `recurrences` table

```sql
CREATE TABLE recurrences (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id            BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id           BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  type                  TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount                DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  note                  TEXT,
  mode                  TEXT NOT NULL CHECK (mode IN ('repeat', 'installment', 'subscription')),
  cycle                 TEXT NOT NULL CHECK (cycle IN ('weekly', 'monthly')),
  start_date            DATE NOT NULL,
  end_date              DATE,                       -- subscription: optional cancel date; installment: derived, see §2.3
  occurrences_total     INTEGER CHECK (occurrences_total > 0),      -- installment only
  occurrences_completed INTEGER NOT NULL DEFAULT 0,
  auto_post             BOOLEAN NOT NULL DEFAULT true,
  next_due_date         DATE NOT NULL,
  archived_at           TIMESTAMP WITH TIME ZONE,    -- NULL = active; set = paused/cancelled/completed
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT installment_needs_occurrences CHECK (
    mode != 'installment' OR occurrences_total IS NOT NULL
  )
);

-- Cron sweep scans exactly this shape: "not archived, due today or earlier"
CREATE INDEX idx_recurrences_due ON recurrences(next_due_date) WHERE archived_at IS NULL;

-- Management page filters by account/category
CREATE INDEX idx_recurrences_account ON recurrences(account_id);
CREATE INDEX idx_recurrences_category ON recurrences(category_id);
```

**Design decisions:**

| Decision | Rationale |
|---|---|
| `ON DELETE RESTRICT` on `account_id`/`category_id` | Unlike `budgets.category_id`'s `ON DELETE CASCADE`, a recurrence represents a standing financial commitment (a bill, a loan installment) — silently deleting it as a side effect of deleting an account/category is the wrong default for money the user is still expecting to be tracked. Blocking the delete forces an explicit decision. This is a recommendation, not a unilateral call — see Open Question 1. |
| No `cycle_end`/`custom` cycle (unlike budgets) | Budgets needed `custom` because a budget window can be any arbitrary date range. A recurrence's cadence is inherently periodic — "every week" or "every month" — a one-off custom range isn't a recurrence at all, it's just an entry. Only `weekly`/`monthly` are offered. |
| `occurrences_total` / `occurrences_completed` nullable except for `installment` | `repeat` and `subscription` run indefinitely (subscription until `end_date` or manual archive); only `installment` has a fixed count. The `installment_needs_occurrences` CHECK constraint enforces this at the DB level, mirroring how `budgets`' `superRefine` enforces `custom` requiring `cycle_end` at the Zod level — here it's enforced one layer deeper since it's a hard invariant, not a UI nicety. |
| `next_due_date` stored, not computed on-the-fly | Budgets could compute `getCurrentCycle()` on every read because nothing needed to *change* as a side effect of a cycle boundary passing. Recurrences must **write** a new `entries` row when `next_due_date` arrives — that's a stateful transition that has to be checkpointed somewhere, so it's a real column, advanced by the cron endpoint (§4). |
| `auto_post` boolean | Directly implements the AC's "auto-posts or prompts one-tap confirm (configurable)". Default `true` (auto-post) — matches how `budgets.reuse_next` defaults to `false`/opt-in for its own different reason; here auto-post is the lower-friction default since manual confirmation is the extra step, not the baseline. |
| `archived_at` timestamp, not a boolean | Same soft-pause pattern as `entries.deleted_at`/`accounts.deleted_at` from v2.1 — records *when* something was paused, supports an "Archived" list with dates, and never actually deletes the row (the AC explicitly asks for an archived list, not a trash can). |

### 2.2 `entries` table addition

```sql
ALTER TABLE entries ADD COLUMN IF NOT EXISTS recurrence_id BIGINT REFERENCES recurrences(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_entries_recurrence_id ON entries(recurrence_id) WHERE recurrence_id IS NOT NULL;
```

Same nullable-FK-plus-partial-index shape as `transfer_group_id` from `003_add_transfer_group_id.sql`. `ON DELETE SET NULL` (not `CASCADE`, not `RESTRICT`): if a recurrence is later hard-deleted (an edge case — the normal flow is archive, not delete), the entries it already posted are real transaction history and must survive; they just lose the traceability link back to a recurrence that no longer exists.

### 2.3 Installment completion semantics

An installment's `end_date` is **derived, not user-entered** — computed at creation time from `start_date + (occurrences_total - 1) cycles` and stored for query convenience (e.g. "this loan finishes Dec 2027" without recomputing). It is NOT authoritative — `occurrences_completed >= occurrences_total` is what actually triggers archival (§4), because a user editing `occurrences_total` after creation (e.g. renegotiated a loan from 12 to 8 payments) must not require also hand-recalculating `end_date`; the processing endpoint recomputes and overwrites `end_date` whenever `occurrences_total` changes.

### 2.4 Entity relationship

```
accounts   (1) ──── (0..N) recurrences
categories (1) ──── (0..N) recurrences
recurrences(1) ──── (0..N) entries      [via entries.recurrence_id, nullable]
```

---

## 3. Due-Date Calculation

### 3.1 Reuses `budget-cycle.js`'s clamping logic, does not duplicate it

`server/lib/budget-cycle.js` already solves "given an anchor date and a weekly/monthly cycle, where's the boundary" — including the exact bug this session already found and fixed once (`clampToMonth()`: a `new Date(year, month, day)` constructor silently overflows into next month when `day` exceeds the month's length, e.g. an anchor of the 31st in a 30-day month). A monthly recurrence anchored on the 31st has the identical failure mode for due-date math, so this design does not re-derive that logic — it extracts the shared primitives.

**Action for dev:** move `clampToMonth()` and `addMonths()` out of `budget-cycle.js` into a new shared `server/lib/date-utils.js`, re-export them from `budget-cycle.js` unchanged (so nothing that already imports from `budget-cycle.js` breaks), and import them fresh into a new `server/lib/recurrence-cycle.js`.

### 3.2 `server/lib/recurrence-cycle.js`

```js
const { clampToMonth, addMonths } = require('./date-utils');

/**
 * Given a recurrence's cycle and its current next_due_date, compute the
 * following due date. Pure function — no DB access.
 */
function computeNextDueDate(recurrence) {
  const current = new Date(recurrence.next_due_date + 'T00:00:00');

  if (recurrence.cycle === 'weekly') {
    return new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  if (recurrence.cycle === 'monthly') {
    // Anchor day comes from start_date, NOT from the current due date —
    // otherwise a clamped Feb 28 due date would permanently "downgrade"
    // a day-31 recurrence to the 28th every month after the first
    // clamp. The anchor must stay fixed at the originally chosen day.
    const anchorDay = new Date(recurrence.start_date + 'T00:00:00').getDate();
    const next = addMonths(current, 1);
    return clampToMonth(next.getFullYear(), next.getMonth(), anchorDay);
  }

  throw new Error(`Unknown cycle type: ${recurrence.cycle}`);
}

module.exports = { computeNextDueDate };
```

**Critical edge case flagged explicitly for dev/QA:** the anchor-day-drift bug above (re-deriving the anchor from the *current* due date instead of the original `start_date`) is a realistic and easy mistake — `getCurrentCycle()` in `budget-cycle.js` doesn't have this failure mode because it recomputes from `cycle_start` fresh every single call, but `computeNextDueDate()` is called iteratively (each cycle's output feeds the next cycle's input), so an anchor-day bug here would compound silently, monotonically shrinking every day-29/30/31 recurrence toward the 28th over several months. Unit test with a day-31 monthly recurrence across at least 4 consecutive months (including a February) before this ships.

---

## 4. Processing & Posting Flow

### 4.1 Cron-triggered sweep — reuses the recycle-bin purge auth pattern, with a correction found during implementation

**Correction (found while implementing this section, applies to both this endpoint and the pre-existing `/api/recycle-bin/purge`):** Vercel Cron Jobs always invoke via HTTP **GET**, never POST, and can only send their own fixed `Authorization: Bearer $CRON_SECRET` header (if the `CRON_SECRET` env var is set on the Vercel project) — never a custom header like `X-API-Key`. The recycle-bin purge route, as originally shipped in v2.1, was POST-only and X-API-Key-only, which means its own cron trigger could never have actually authenticated successfully in production (this was never caught because production deploys have been held all session — verified against Vercel's own docs during this build: https://vercel.com/docs/cron-jobs). Both `/api/recycle-bin/purge` and the new `/api/recurrences/process` now accept GET and POST, and either the existing `X-API-Key`/`PURGE_API_KEY` scheme (manual/API-triggered runs) or Vercel's native `Authorization: Bearer $CRON_SECRET` scheme (the real cron trigger). **New deployment prerequisite: a `CRON_SECRET` environment variable must be set on the Vercel project** (in addition to the existing `PURGE_API_KEY`) before either cron job can succeed in production.

New endpoint, gated identically to `server/routes/recycle-bin.js`'s `POST /purge` (same `X-API-Key` header, same `process.env.PURGE_API_KEY`-style env var — reuse `process.env.PURGE_API_KEY` itself rather than minting a second secret, since it's already the "backend-internal cron auth" secret for this app, not a purge-specific one):

```js
// POST /api/recurrences/process
router.post('/process', async (req, res, next) => {
  try {
    const apiKey = req.get('X-API-Key');
    if (!apiKey || !process.env.PURGE_API_KEY || apiKey !== process.env.PURGE_API_KEY) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid API key' } });
    }
    const result = await processRecurrences();
    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

`vercel.json` addition:

```json
"crons": [
  { "path": "/api/recycle-bin/purge", "schedule": "0 3 * * *" },
  { "path": "/api/recurrences/process", "schedule": "0 6 * * *" }
]
```

**Schedule: `0 6 * * *` (6am UTC), not 3am like purge.** Rationale (Open Question 3 asked for this to be justified, not just picked): purge is a cleanup task with no user-facing urgency — any hour works. Recurrence posting is not: a user checking their dashboard first thing in the morning should already see today's auto-posted rent/subscription entries. 6am UTC = 2pm Philippines time (UTC+8) — which is NOT "early morning PH time" and is a real gap, called out honestly in §11 Open Questions rather than hidden, because this app stores no per-user timezone today (confirmed — `entries.date` and every date column in this schema is a bare `DATE`, no timezone tracking exists anywhere). 6am UTC was chosen as a compromise that's defensibly "some reasonable morning somewhere" without pretending to solve a problem the schema can't yet solve.

### 4.2 `processRecurrences()` — the actual sweep logic

```js
async function processRecurrences() {
  const due = await getDueRecurrences(); // WHERE archived_at IS NULL AND next_due_date <= CURRENT_DATE
  const posted = [];
  const pendingConfirm = [];

  for (const r of due) {
    if (r.auto_post) {
      await createEntry({
        type: r.type, amount: r.amount, account_id: r.account_id,
        category_id: r.category_id, note: r.note, date: r.next_due_date,
        recurrence_id: r.id,
      });
      posted.push(r.id);
    } else {
      await markPendingConfirmation(r.id, r.next_due_date);
      pendingConfirm.push(r.id);
    }

    await advanceOrArchive(r);
  }

  return { posted: posted.length, pendingConfirm: pendingConfirm.length };
}

async function advanceOrArchive(r) {
  if (r.mode === 'installment') {
    const completed = r.occurrences_completed + 1;
    if (completed >= r.occurrences_total) {
      return archiveRecurrence(r.id, { occurrences_completed: completed });
    }
    return updateRecurrence(r.id, {
      occurrences_completed: completed,
      next_due_date: computeNextDueDate(r),
    });
  }

  if (r.mode === 'subscription' && r.end_date && r.next_due_date >= r.end_date) {
    return archiveRecurrence(r.id, {});
  }

  // repeat, and subscription with no end_date yet reached
  return updateRecurrence(r.id, { next_due_date: computeNextDueDate(r) });
}
```

**Important:** `advanceOrArchive` runs regardless of whether the recurrence was auto-posted or sent to pending-confirmation. A `auto_post = false` recurrence still advances its `next_due_date` and (for installment) its occurrence count immediately when it becomes due — it does not wait for the user to tap "confirm" first. This is a deliberate simplification flagged for Gino: the alternative (only advancing state after confirmation) means a user who never opens the app leaves `next_due_date` stuck in the past forever, and every subsequent cron run would re-flag the same recurrence as newly due, silently piling up duplicate "pending confirmation" prompts. Treating "due" as "the cycle has occurred, whether or not the user has acknowledged it yet" avoids that pile-up at the cost of the entry-record itself only appearing once the user confirms.

### 4.3 Pending confirmation (`auto_post = false`)

**Revised during implementation** (the original "infer from the gap between the most recent posted entry and the previous `next_due_date`" approach below was ambiguous to implement correctly, since only the *current* `next_due_date` is stored — there's no reliable "previous" value to compare against once it's been advanced): instead, a single `pending_confirmation` boolean column on `recurrences` tracks this explicitly. The cron sweep (§4.2) sets it `true` instead of creating an entry when `auto_post = false` and the recurrence becomes due; `POST /api/recurrences/:id/confirm` clears it back to `false` after posting the entry. `GET /api/recurrences/due` is then a direct `WHERE pending_confirmation = true AND archived_at IS NULL` query — no entries-table comparison needed, no second source of truth to keep in sync beyond this one flag.

<details><summary>Original approach (superseded, kept for record)</summary>

No new table. A pending confirmation is represented as: `recurrences` row where `next_due_date` was just advanced past a cycle boundary but no matching `entries.recurrence_id` row exists for that cycle yet. Concretely: `GET /api/recurrences/due` returns recurrences where `auto_post = false AND archived_at IS NULL` and the most recent posted entry's `date` is earlier than the *previous* `next_due_date` (i.e., a cycle passed with nothing posted for it).

</details>

**Confirmation goes through a dedicated endpoint, `POST /api/recurrences/:id/confirm` — NOT the generic `POST /api/entries`.** This corrects an inconsistency caught during design review against the actual codebase: `recurrence_id` is a linked/derived field exactly like `transfer_group_id`, and the existing precedent (`server/db/queries.js`'s `createEntry()` destructures only `{ type, amount, account_id, category_id, note, date }` — no pass-through for any linkage field; `transfer_group_id` is set exclusively by the `create_transfer` RPC, never by a client-supplied field on the generic entries POST) is that linked entries always get their own dedicated creation path, keeping the generic entries API's validation surface simple and un-spoofable (a client can't forge an arbitrary `recurrence_id` onto an unrelated entry). `POST /api/recurrences/:id/confirm` takes no body — it looks up the recurrence server-side, calls `createEntry()` internally with `recurrence_id` included in that one call site's insert (the only code path allowed to set it), and returns the created entry. `createEntrySchema`/`updateEntrySchema` in `validate.js` are NOT modified — `recurrence_id` is never client-suppliable through them, same as `transfer_group_id` today.

### 4.4 Lazy on-demand fallback (defense-in-depth, matches v2.1's pattern)

`GET /api/dashboard` additionally calls a lightweight `hasOverdueRecurrences()` check (not the full `processRecurrences()` sweep — that does real writes and should stay cron-only to avoid a burst of concurrent dashboard loads all trying to post the same entries) and surfaces a count in the response the client can show as a banner ("3 recurring items are overdue — cron may be delayed"). This mirrors the *spirit* of `recycle-bin.js`'s "run purge on every GET as defense-in-depth" but deliberately does NOT auto-run the write-side sweep on a GET request, because unlike purge (idempotent, deletes are safe to re-attempt), double-posting a recurring entry on a race between two near-simultaneous dashboard loads is a real correctness risk, not just a wasted cycle.

---

## 5. API Surface

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/recurrences` | List, optional `?archived=true` to include archived |
| `GET` | `/api/recurrences/:id` | Single recurrence |
| `POST` | `/api/recurrences` | Create |
| `PUT` | `/api/recurrences/:id` | Update (recompute `end_date` if `occurrences_total` changes, per §2.3) |
| `DELETE` | `/api/recurrences/:id` | Hard delete — only permitted if zero entries reference it (`recurrence_id`); otherwise archive instead (see §7) |
| `POST` | `/api/recurrences/:id/archive` | Soft-pause |
| `POST` | `/api/recurrences/:id/restore` | Un-pause (only if `mode != 'installment'` or occurrences remain — see §7) |
| `GET` | `/api/recurrences/due` | Pending-confirmation list (§4.3) |
| `POST` | `/api/recurrences/:id/confirm` | Post a real entry for a pending (`auto_post = false`) recurrence — no body; server reads amount/account/category from the recurrence itself (§4.3) |
| `POST` | `/api/recurrences/process` | Cron-only, API-key gated (§4.1) |

Validation schema (`server/middleware/validate.js`, same `superRefine` pattern as budgets):

```js
const createRecurrenceSchema = z.object({
  body: z.object({
    account_id: z.number().int().positive(),
    category_id: z.number().int().positive(),
    type: z.enum(['income', 'expense']),
    amount: z.number().positive(),
    note: z.string().max(500).optional(),
    mode: z.enum(['repeat', 'installment', 'subscription']),
    cycle: z.enum(['weekly', 'monthly']),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    occurrences_total: z.number().int().positive().optional(),
    auto_post: z.boolean().optional().default(true),
  }).superRefine((data, ctx) => {
    if (data.mode === 'installment' && !data.occurrences_total) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'occurrences_total is required when mode is "installment"', path: ['occurrences_total'] });
    }
    if (data.mode !== 'installment' && data.occurrences_total !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'occurrences_total must not be set unless mode is "installment"', path: ['occurrences_total'] });
    }
    if (data.mode !== 'subscription' && data.end_date !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'end_date must not be set directly unless mode is "subscription" (installment end_date is derived, see §2.3)', path: ['end_date'] });
    }
  }),
});
```

Category type must match `type` — reuse the exact same check `routes/entries.js`'s `POST /` already does (`category.type !== entryType` → 400), applied to recurrences at creation.

---

## 6. Client-Side Design

### 6.1 Management page: `client/src/pages/Recurrences.jsx`

Modeled on `Budgets.jsx` conventions (same form/modal/actionError patterns). Add form fields: account select, category select (filtered by `type`), amount, note, mode select (Repeat/Installment/Subscription — conditionally reveals `occurrences_total` for installment or `end_date` for subscription, same conditional-field pattern as `Budgets.jsx`'s `cycle === 'custom'` reveal), cycle select, start_date, auto_post checkbox labeled "Post automatically" (default checked) vs "Ask me to confirm each time" when unchecked.

List view: active recurrences grouped separately from an "Archived" section (collapsed by default) — directly satisfies the AC's "Archived list for paused recurrences." Each row shows mode badge, cycle, next due date, and (installment only) "3 of 12 payments" progress text.

### 6.2 Pending-confirmation surface

A new dashboard card, `client/src/components/dashboard/RecurrenceConfirmCard.jsx`, positioned above `BudgetCard` in the right sidebar (confirmation is a today-relevant action item; budgets are passive monitoring — action items outrank monitoring in visual priority). Fetches `GET /api/recurrences/due` on mount. Each pending item shows a one-tap "Confirm ₱X for {category}" button that calls `POST /api/recurrences/:id/confirm` (§4.3 — no body needed, the server looks up the recurrence's stored `amount`/`account_id`/`category_id` itself), then removes itself from the list. Empty state: card doesn't render at all (unlike `BudgetCard`'s "no budgets yet" prompt — an empty confirm-queue isn't something to promote, it's just the normal state).

### 6.3 Navigation

Add `{ path: '/recurrences', label: 'Recurring', icon: Repeat }` to `navigation.js`'s `navItems` (desktop sidebar only, same reasoning as Budgets — `bottomNavItems` is already at its 5-item mobile cap).

---

## 7. Archive/Pause Behavior

| Trigger | Effect |
|---|---|
| User manually archives an active recurrence | `archived_at = NOW()`. `next_due_date` frozen — does not advance while archived. |
| User restores an archived `repeat`/`subscription` recurrence | `archived_at = NULL`. `next_due_date` recomputed from `today` forward (not resumed from its stale frozen value — otherwise a 6-month-paused recurrence would immediately fire 6 "overdue" postings in the next cron sweep, which is very likely not what the user wants). |
| User restores an archived `installment` recurrence where `occurrences_completed >= occurrences_total` | **Blocked** — a fully completed installment has nothing left to pay; restoring it would be re-opening a closed loan. `POST /restore` returns `409 { code: 'INSTALLMENT_COMPLETE' }`. |
| Cron sweep completes an installment's final occurrence | Auto-archived (§4.2) — this is completion, not cancellation, but reuses the same `archived_at` field rather than a separate `completed_at`, since the AC only asks for one "archived list," not a distinction between paused-by-user and finished-naturally. The management page's archived section can still distinguish them in the UI by checking `occurrences_completed >= occurrences_total`. |

---

## 8. FR → Design Traceability Matrix

| BRD/AC Item | Design Element |
|---|---|
| "Recurrence sub-modes: Repeat, Installment, Subscription" | `recurrences.mode` CHECK constraint; conditional form fields in `Recurrences.jsx` |
| "Each with cycle, start/end date" | `cycle`, `start_date`, `end_date` (subscription) / derived `end_date` (installment, §2.3) |
| "Archived list for paused recurrences" | `archived_at` timestamp; §7 archive/restore semantics; archived section in `Recurrences.jsx` |
| "On due date, auto-posts or prompts one-tap confirm (configurable)" | `auto_post` boolean; §4.2/§4.3 processing split; `RecurrenceConfirmCard.jsx` |
| "Creating a real entry each cycle" | `POST /api/entries` with `recurrence_id` set, both in the auto-post path (§4.2) and the confirm path (§6.2) |

---

## 9. Build Order

| Step | What | Who | Depends on |
|---|---|---|---|
| 1 | Extract `clampToMonth()`/`addMonths()` from `budget-cycle.js` into `server/lib/date-utils.js`, re-export unchanged | dev | — |
| 2 | Migration `005_recurring_transactions.sql`: `recurrences` table + `entries.recurrence_id` | dev | — |
| 3 | `server/lib/recurrence-cycle.js` — `computeNextDueDate()` | dev | step 1 |
| 4 | `server/db/queries.js` — recurrence CRUD + `getDueRecurrences`/`markPendingConfirmation`/`advanceOrArchive` helpers | dev | step 2 |
| 5 | `server/routes/recurrences.js` — CRUD + `/due` + `/process` (cron-gated) | dev | steps 3, 4 |
| 6 | Register routes in `server.js`; add `vercel.json` cron entry | dev | step 5 |
| 7 | `client/src/lib/api.js` — recurrence API functions | dev | step 5 |
| 8 | `Recurrences.jsx` management page + `/recurrences` route + nav entry | dev | step 7 |
| 9 | `RecurrenceConfirmCard.jsx` — wire into Dashboard right sidebar (above `BudgetCard`) | dev | step 7 |
| 10 | QA: due-date math across month boundaries (incl. Feb, day-31 anchors, 4+ consecutive months), installment completion/archive, auto-post vs confirm paths, restore-after-pause due-date reset, cron auth | qa | all |

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Anchor-day drift compounding across months (re-deriving anchor from stale due date instead of `start_date`) | Medium | High | Explicitly specified in §3.2 with the exact bug pattern named; unit test across 4+ consecutive months including February, per Build Order step 10. |
| Double-posting on concurrent cron + lazy-check overlap | Low | High (duplicate financial entries) | §4.4 deliberately does NOT run the write-side sweep from the lazy GET fallback — only the cron endpoint posts entries. The fallback only surfaces a count/banner. |
| `auto_post = false` recurrences silently pile up if user never opens the app | Medium | Low | §4.2: `next_due_date` and `occurrences_completed` advance on schedule regardless of confirmation state, so a recurrence can't get "stuck" re-flagging the same cycle forever — it just accumulates missed real-money entries the user still needs to confirm, which is a UX backlog problem, not a data-integrity one. |
| Deleting an account/category with active recurrences | Medium | Medium | `ON DELETE RESTRICT` blocks it outright for now (§2.1) — safest default, but flagged as Open Question 1 since it may be too blunt (e.g., an account closed after a loan recurrence should have already been separately archived by the user, and RESTRICT would force them to do that cleanup first, which may or may not be desired UX). |
| Vercel Cron itself has an outage or delay | Low | Medium | §4.4 lazy fallback surfaces overdue count to the user so it's visible, not silent — same defense-in-depth spirit as v2.1's purge fallback, adapted for the fact that this sweep can't safely auto-run on every GET the way purge could. |
| Timezone gap: 6am UTC cron isn't "morning" for all timezones | Medium (UX only) | Low | Named honestly in §4.1 and §11 rather than hidden. Real fix (per-user timezone storage) is out of scope for this story — flagged for Gino as a possible future story, not solved here. |

---

## 11. Open Questions for Gino (G3)

1. **Deleting an account/category with active recurrences pointing at it:** this design defaults to `ON DELETE RESTRICT` (block the delete, force the user to archive the recurrence first). Acceptable, or should it cascade-archive the recurrence instead (silently pause it rather than blocking the account/category deletion)?
2. **Installment amount:** assumed fixed for the life of the installment (no per-occurrence amount override, e.g. a variable-rate loan payment). Confirm this is in scope, or should `PUT /api/recurrences/:id` allow changing `amount` mid-installment (affecting only future, not already-posted, occurrences)?
3. **Cron schedule (6am UTC):** proposed and justified in §4.1 as a compromise given this app stores no per-user timezone anywhere in its schema today. Acceptable as a v2.3 limitation, or does this need a "morning in the user's actual timezone" fix now rather than later (which would mean adding timezone storage as an in-scope prerequisite, not a follow-up story)?

---
