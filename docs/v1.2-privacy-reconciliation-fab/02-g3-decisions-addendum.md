# Pondo v1.2 — G3 Decisions Addendum

**Supersedes relevant sections of `01-design.md` where noted below.** Written directly by DARKLING (not `forge-architect`) recording Gino's live answers to `01-design.md` §10's open questions, 2026-07-19. `01-design.md` remains authoritative for everything not explicitly amended here.

**Process note:** the Forge pipeline was halted at this gate — G3 is approved-with-amendments, but build moves to the OpenClaw TWC crew (`dev-pondo`) instead of `forge-dev`. This doc exists so that handoff isn't working from a stale design.

---

## Decision 1 — US-02 scope: expand to full app-wide masking (supersedes §1.2)

Gino's call: **all 13 currency-rendering files get masking support, not just the 7 named in `01-design.md` §1.2.**

`01-design.md` §1.2 lists the 7 in-scope files and, separately, 7 files marked "explicitly out of scope." **That out-of-scope list is now in-scope.** Add masking to:

- `client/src/pages/Budgets.jsx`, `client/src/components/dashboard/BudgetProgressBar.jsx`, `client/src/components/dashboard/BudgetCard.jsx`
- `client/src/pages/Recurrences.jsx`, `client/src/components/dashboard/RecurrenceConfirmCard.jsx`
- `client/src/pages/TagsReport.jsx`
- `client/src/components/dashboard/IncomeChart.jsx`, `ExpenseChart.jsx` — **flagged as the hardest of the six**: chart tooltips/axis labels are a materially different masking problem than a plain text node (Recharts tooltip content, axis tick formatters). `dev-pondo` should treat this as its own sub-task, not assume it's a copy-paste of the KpiCard pattern.
- `client/src/pages/RecycleBin.jsx` — **flagged as the second-hardest**: per §1.2, the amount is baked server-side into a pre-formatted `label` string in `getRecycleBin()` (`server/db/queries.js`), not a client-formatted value. Masking this requires either (a) a server response shape change splitting `label` into `note` + `amount` fields (client masks `amount` before recombining), or (b) client-side regex extraction against the baked string. **(a) is recommended** — cleaner, and `RecycleBin.jsx` is already consuming a typed response, not a raw string elsewhere.

Everything else in §1.1/§1.3/§1.4 (settings key, redaction constant, toggle component, contrast/touch-target spec) is unchanged and applies identically to these 6 additional files.

**Sizing note, stated plainly:** this materially exceeds v1.2's original S-sized US-02 slot in the Gate-S2 capacity model (`docs/recon/sprint-backlog.md`). Not re-sized here — flagged so whoever tracks velocity afterward knows this sprint ran over its original point estimate by design, not by drift.

## Decision 2 — US-03 category visibility: manually selectable (confirms §2.1, no change)

`01-design.md` §2.1's default (manually selectable, no hidden-category concept) is confirmed as-is. No SAD change needed.

## Decision 3 — FAB target: extract `Entries.jsx`'s modal instead of pointing at `AddEntry.jsx` (supersedes §4.1, §4.4)

`01-design.md` §4.1 designed the FAB to route to `AddEntry.jsx` (full-page nav). **That's overridden.** Instead:

- `Entries.jsx`'s existing inline add-entry modal (already built, already the real desktop flow per §1.2's finding that `AddEntry.jsx`/`entries/add` is dead code) needs to become reachable from `Layout.jsx`, where the FAB lives, not just from within `Entries.jsx`.
- **Recommended approach** (not a full re-design — `dev-pondo` should verify against the actual component before committing): lift the modal's open/close state out of `Entries.jsx` into a shared context (e.g. new `AddEntryModalContext`, mounted alongside `PrivacyProvider` in `App.jsx`) so both `Layout.jsx`'s FAB and `Entries.jsx`'s existing "+" entry point call the same `openAddEntryModal()`. This avoids prop-drilling through `Layout.jsx` → page components, and avoids maintaining two copies of the modal.
- `AddEntry.jsx` (the full-page route) is left as dead code, unchanged — not deleted, not wired to anything new. Consistent with this project's existing pattern of flagging dead code (`server/schema.js`, `server/zod/schemas/index.js`) rather than silently removing it mid-sprint.
- Original open question in §4.4 ("two Add Entry UIs drifting out of sync") is resolved by this decision, not just documented — there's now only one.

This changes the file manifest (`01-design.md` §6): `client/src/pages/AddEntry.jsx` is **removed** from this sprint's modified-files list (no longer touched for US-07). Add: `client/src/contexts/AddEntryModalContext.jsx` (new) and confirm exact extraction scope in `Entries.jsx` once `dev-pondo` reads the current modal implementation directly.

## Decision 4 — Bundle the export.js CSV bugfix; leave `getFallbackCategory()` separate

**Interpreted from free-text, not a clean pick — flagged for Gino to correct if wrong.**

- **Bundle**: `server/routes/export.js` / `getEntriesForExport()`'s pre-existing `entry.category`/`entry.account` → should be `entry.category_name`/`entry.account_name` field-name bug (`01-design.md` §3.6). Already recommended in the original design as cheap and isolated; ship it as a separate, clearly-labeled commit within the US-04 PR (`export.js` is already being touched this sprint for the new `Pending` CSV column).
- **Not bundled**: `getFallbackCategory()`'s pre-existing `.single()` multi-row-match bug (`01-design.md` §2.1, R5). Outside this sprint's approved design — US-03 deliberately built its own lookup (`getBalanceAdjustmentCategory()`) specifically to avoid this bug rather than inherit it, so nothing in v1.2 actually depends on fixing it. File as its own backlog item.

---

## Net effect on `01-design.md`'s Build Order (§9) and Risk Register (§8)

- Step 13 (masking each formatter) now covers 13 files, not 6 — add steps for `Budgets.jsx`/`BudgetProgressBar.jsx`/`BudgetCard.jsx`, `Recurrences.jsx`/`RecurrenceConfirmCard.jsx`, `TagsReport.jsx`, `IncomeChart.jsx`/`ExpenseChart.jsx`, and the `RecycleBin.jsx` + `getRecycleBin()` response-shape change.
- Step 16 changes from "wire FAB to `AddEntry.jsx` via `Layout.jsx`" to "extract `Entries.jsx`'s modal into `AddEntryModalContext`, wire both `Layout.jsx`'s FAB and `Entries.jsx`'s existing entry point to it."
- R4 (`01-design.md` §8, "two Add Entry UIs drift out of sync") is **resolved**, not just mitigated, by Decision 3 — there's one UI now.
- R7 (§8, "masking scope narrower than 'app-wide' implies") is **resolved** by Decision 1.
- New risk to track: the chart-tooltip and Recycle-Bin masking sub-tasks (Decision 1) are the least-specified pieces of this addendum — they inherit the *intent* of §1.1's redaction spec but not a worked implementation. `dev-pondo` should treat these as needing their own short design pass if either turns out to be non-trivial, rather than forcing a bad fit.
