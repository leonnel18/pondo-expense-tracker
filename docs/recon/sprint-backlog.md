# Pondo — Sprint Backlog & Version Roadmap (Gate S2)

**Cycle:** InnerGrow reference-app discovery, post-v1 · **Consolidator:** recon-po · **Status:** **Gate S2 — APPROVED 2026-07-12.** *(Header corrected 2026-07-12 by pm — this line previously read "DRAFT — awaiting APPROVE S2," predating the actual approval; same staleness pattern recon-po flagged on `kill-absorb-review.md`'s S1 header, corrected here for consistency ahead of .docx publication.)*

**Source:** `docs/recon/kill-absorb-review.md` §7 (41 independently-banded stories + the cloud-migration epic, sized by `recon-feasibility` 2026-07-12) · **Prior sprint history:** none — Pondo's v1 (`artifacts/milestone-log.md`) was built by FRIDAY's original Workshop Crew before Forge/Recon existed, so this is the first Recon→Forge cycle with no velocity to calibrate against.

**Paperwork note (resolved 2026-07-12 by pm):** the kill-absorb-review header previously still read "DRAFT — awaiting `APPROVE S1`," even though §4 showed Gino's two 2026-07-12 resolutions (F-20 kept-parked, US-22 selected over US-26) and `recon-feasibility` had already run its sizing pass explicitly "post-S1." That header has now been corrected to reflect the actual S1 approval — see `docs/recon/kill-absorb-review.md`'s header line.

**Gino's extended ask this cycle, addressed below:** (1) a plan covering all 41+epic increments, not one sprint; (2) organized as a shippable version series; (3) a concrete, sensibly-sequenced cloud-migration path, not an isolated afterthought.

---

## 0. Capacity model (working convention — first cycle, no velocity yet)

No Forge build-session velocity exists for Pondo yet, so this roadmap uses a stated, consistent point conversion of `recon-feasibility`'s own effort bands — **not a new estimate**, just a common unit to sum bands for capacity planning:

| Band | XS | S | M | L | XL | Spike |
|---|---|---|---|---|---|---|
| Points | 1 | 2 | 3 | 5 | 8 | 2 (timeboxed) |

Ranged bands (e.g. "XS–S") are rounded to the larger value for safety. **Capacity ceiling: 12 pts/sprint** (a working placeholder for "a typical Forge build session," to be replaced with real measured velocity after Sprint v1.1 closes). **Target: ≤90% of ceiling (≤~11 pts), with real margin, not a stretch fit** — most sprints below land at 67–83% deliberately, tighter only where the grouping is unusually clean.

## 1. Sequencing rationale (why this isn't one flat Major/Minor split)

Three structural decisions, stated so they can be checked against Gino's intent:

1. **All Minor-tagged + already-verified-built items go first (v1.1–v1.5), on the current architecture.** Cheapest, lowest-risk, highest trust-per-effort work, shipped before touching anything structural.
2. **Every Major-tagged story — cloud-dependent or not — is sequenced *after* the cloud migration (v2.1+), not spread across v1.x.** Reason: `recon-feasibility`'s own finding (§7 intro, §7.2) is that `server/db/queries.js` (~750 lines, zero shared abstraction) "gets substantially rewritten, not lightly adapted" by the migration, regardless of hosting target. Every non-cloud Major story below (recurring, budgets, tags, transfers, CSV import, goals, recycle bin, counterparty tracking) adds new schema/aggregation surface to that exact file. Building 71 points of new schema-heavy work on the driver that's about to be substantially rewritten risks doing that work twice. Clearing the cheap backlog first, then migrating, then building the big epics once against the stable new data layer is the sequencing that avoids the rework — which is also *why* the cloud epic is scheduled right after the Minor backlog clears (v2.0), not held until "eventually": that's what "sequenced sensibly, not an isolated afterthought" means in practice here.
3. **US-38 and US-39's self-hosted-only slices don't strictly require cloud**, but are deferred alongside the other Majors for the same capacity/rework-avoidance reason, not because they're blocked. Flagged so this isn't mistaken for a feasibility constraint.

This deviates from the literal "v1.x = quick wins then Minor stories" suggested shape only in scope (it's *all* non-cloud Major work, not just the biggest ones, that waits) — the shape itself (Minor-first → dedicated cloud release → Major backlog after) is followed as given.

**Excluded from this roadmap entirely:** **US-26** (Ledgers) — de-scoped 2026-07-12 per Gino's decision in favor of US-22, not sized, not scheduled. **F-20** (native widget) — never promoted to a Keep user story; kept as an explicit future bold bet, see §5 (Deferred/Future Track).

---

## 2. Roadmap at a glance

| Version | Sprints | Goal (one line) |
|---|---|---|
| **v1.1** | 1 | Fix known bugs, verify already-built work, lay a minimal observability foundation |
| **v1.2** | 1 | Privacy, balance reconciliation, pending-state accuracy, mobile quick-capture |
| **v1.3** | 1 | Test infrastructure, input ergonomics, entries-screen polish |
| **v1.4** | 1 | Categorization depth, error logging, design-system enablers |
| **v1.5** | 1 | Habit reinforcement, close out the pre-cloud Minor backlog |
| **v2.0** | 3 | **Cloud migration** — architecture change, not a feature sprint |
| **v2.1** | 1 | Data safety (recycle bin) + mobile navigation, first majors on the new architecture |
| **v2.2** | 1 | Core money movement (transfers) + budget visibility |
| **v2.3** | 1 | Recurring transactions — largest non-cloud epic, isolated |
| **v2.4** | 1 | CSV import / data portability — closes the P1 major backlog |
| **v2.5** | 1 | Entries-screen depth: calendar view + tagging |
| **v2.6** | 1 | AI-assisted capture (OCR/voice/auto-categorization) |
| **v2.7** | 1 | Retention nudges (real push) + savings goals |
| **v2.8** | 1 | Counterparty tracking + receipts + backup polish |
| **v2.9** | 1 | Household sharing (flagged — see priority note) |
| **v2.10** | 1 | Multi-currency (FX spike-gated) |
| **v2.11** | 1 | Personalization/theming — closes the fully-sized backlog |
| **Future track** | — | F-20 (native widget) — parked, not sequenced |

**19 sprints total** across the v1.x / v2.0 / v2.1+ series. **42 of the 43 Keep stories are committed somewhere in this roadmap** (US-23 delivered by the v2.0 epic itself, not separately banded); **1 (US-26) is excluded** per Gino's prior de-scope decision; **F-20 sits in a deferred future track, sequenced nowhere.**

---

## 3. v1.x — Near-term sprints on the current self-hosted architecture

### v1.1 — "Fix what's broken, verify what's already built"

| ID | Story | Effort | Pts | Priority |
|---|---|---|---|---|
| US-01 | Net Worth hero card + fix the underlying sign bug (Credit/Borrowed currently added, not subtracted) | S | 2 | P1 |
| US-10 | Icon/color category picker — **verify against AC, do not rebuild** (already wired) | XS | 1 | P1 |
| US-12 | Per-account icon picker — **verify against AC, do not rebuild** (already wired) | XS | 1 | P1 |
| US-27 | Minimal `app_events` log (observability foundation) | S | 2 | P1 |
| US-29 | Route `accounts.js`/`categories.js` errors through the central error handler | S | 2 | P1 |
| US-30 | Quarantine orphaned `server/schema.js` / stray `database.sqlite` | XS | 1 | P1 |
| US-31 | `parseInt` guard on account ID persistence | XS | 1 | P1 |

**Capacity: 10/12 pts (83%).** **Deferred to v1.2:** US-02, US-03, US-04, US-07, US-32, US-42.

*Note: landing US-30 here also completes half of the cloud epic's Slice 1 (pre-migration hygiene) ahead of schedule — a real, not coincidental, head start for v2.0.*

### v1.2 — "Privacy, reconciliation, pending-state accuracy, mobile quick-capture"

| ID | Story | Effort | Pts | Priority |
|---|---|---|---|---|
| US-02 | App-wide privacy mask toggle (+ D-14 a11y AC) | S | 2 | P1 |
| US-03 | Balance reconciliation via auto-created adjustment entry | S | 2 | P1 |
| US-04 | Pending-entry flag, excluded from balance until confirmed | M | 3 | P1 |
| US-07 | Persistent mobile FAB (+ D-14 a11y AC) | S/XS-S | 2 | P1 |

**Capacity: 9/12 pts (75%).** **Deferred to v1.3:** US-09, US-11, US-32, US-42.

*Note: US-04 is flagged by feasibility as understating real duplication risk (~6-8 hand-written aggregation call sites in `queries.js`) — the 25% margin here is deliberate, not spare capacity to fill.*

### v1.3 — "Test infrastructure, input ergonomics, entries-screen polish"

| ID | Story | Effort | Pts | Priority |
|---|---|---|---|---|
| US-32 | Test suite covering documented failure classes (starts from zero — `jest` referenced but not installed) | M | 3 | P1 |
| US-42 | Arithmetic expressions in the amount field | S | 2 | P1 |
| US-09 | List/Stats segmented toggle on Entries (mobile) | S | 2 | P2 |
| US-11 | Icon-in-circle badge on transaction rows (+ contrast utility) | S | 2 | P2 |

**Capacity: 9/12 pts (75%).** **Deferred to v1.4:** US-13, US-28, US-33, US-34.

### v1.4 — "Categorization depth, error logging, design-system enablers"

| ID | Story | Effort | Pts | Priority |
|---|---|---|---|---|
| US-13 | One-level subcategory (self-referencing FK) | M | 3 | P2 |
| US-28 | Persisted `app_errors` table (error-handler already centralized) | XS-S | 2 | P2 |
| US-33 | Reusable settings-row component (enabler for US-41/US-43/D-12) | S | 2 | P2 |
| US-34 | Compact modal variant for short single-field forms | XS-S | 2 | P2 |

**Capacity: 9/12 pts (75%).** **Deferred to v1.5:** US-35, US-36, US-40, US-41, US-43.

### v1.5 — "Habit reinforcement, close out the pre-cloud Minor backlog"

| ID | Story | Effort | Pts | Priority |
|---|---|---|---|---|
| US-41 | Custom "period start" day, respected across all time-filter presets | M | 3 | P2 |
| US-40 | Logging streak + lifetime transaction count | S | 2 | P2 |
| US-36 | Warmer empty-state illustrations (~5 instances) | S | 2 | P3 |
| US-35 | Compact colored-dot chart legend | XS | 1 | P3 |
| US-43 | Swap red/green income/expense color mapping | S | 2 | P3 |

**Capacity: 10/12 pts (83%).** **Deferred to v2.1+:** all remaining Major-tagged stories (see §4–5). Pre-cloud Minor backlog is fully cleared after this sprint.

---

## 4. v2.0 — Cloud migration (its own release, not a feature sprint)

**This is an architecture change.** No user-visible feature ships in v2.0; it's the prerequisite that unlocks US-22 fully, delivers US-23 by definition, and partially unlocks US-24/US-25's heavier slices (§7.2 of the source review). Effort band: **XL, High risk** — sequenced as 3 sprints against its 6 feasibility-sized slices (§7.2).

### v2.0 · Sprint 1 — "De-risk: hygiene + hosting-target decision"

| Slice | Scope | Effort | Pts |
|---|---|---|---|
| 1. Pre-migration hygiene | Confirm+document the real driver in use (`sqlite3`, not `better-sqlite3` per the SAD); US-30 already landed in v1.1, reducing remaining scope here | M | 3 |
| 2. Hosting-target decision | Spike: Cloudflare Pages+Workers+D1 vs. Pages+VPS vs. managed Postgres — pressure-test D1 compatibility against the current callback-style `queries.js` | Spike | 2 |

**Capacity: 5/12 pts (42%) — deliberately light.** This sprint's output is a decision that gates everything after it; not padded with unrelated work.

### v2.0 · Sprint 2 — "Multi-user auth subsystem"

| Slice | Scope | Effort | Pts |
|---|---|---|---|
| 3. Multi-user auth | User table, session/JWT or magic-link auth, full replacement of the hardcoded `PASSPHRASE` constant in `client/src/lib/api.js` — the single largest sub-piece and the true prerequisite for US-22 | L | 5 |

**Capacity: 5/12 pts (42%) — deliberately isolated.** High risk, security-sensitive rewrite of the entire auth model; kept alone for focus and QA headroom, not run at capacity.

### v2.0 · Sprint 3 — "Cutover: data layer, migration script, ops rework"

| Slice | Scope | Effort | Pts |
|---|---|---|---|
| 4. Data-access layer migration | Rewrite `db/queries.js` against the chosen target's driver/client | M | 3 |
| 5. Data migration script | `pondo.db` → cloud target, schema-version guard (reusing US-39's validation approach), tested rollback | M | 3 |
| 6. Ops/deployment rework | Replace the Windows-desktop/`Ctrl+C`/manual-`cp` runbook with real deploy, secrets, backup, monitoring | S | 2 |

**Capacity: 8/12 pts (67%).**

**v2.0 total: 18 pts across 3 sprints.** **Delivered directly by this release: US-23 (cross-device sync) — not separately committed anywhere else in this roadmap.**

### What breaks / changes for existing self-hosted users

- **Auth:** the shared hardcoded passphrase is retired outright — existing usage must re-onboard under real multi-user auth. Not a compatible upgrade.
- **Data location:** `pondo.db` migrates to the cloud target via the guarded script; the local file becomes a pre-migration backup, not the system of record afterward.
- **Runbook:** `artifacts/06-runbook.md` (Windows-desktop start/stop, manual `cp` backup, terminal-log "monitoring") is fully superseded by Slice 6's replacement — any personal habits built around the old runbook stop being authoritative.
- **Open question, flagged for Gino, not decided here:** does self-hosted deployment remain a supported option after v2.0 (e.g. for privacy-conscious households declining cloud), or is it retired in favor of cloud-only? This determines whether Slice 6 needs to support two deploy targets or one — worth resolving before Sprint 3 starts, not after.

---

## 5. v2.1+ — Post-cloud: Major stories, cloud-unlocked and web-only alike

Sequenced P1 → P2 → P3 within the Major backlog (§1's rationale for why *all* Majors, not just cloud-dependent ones, land here).

### v2.1 — "Data safety + mobile navigation" (P1 majors, lowest-risk first)

| ID | Story | Effort | Pts |
|---|---|---|---|
| US-05 | Recycle bin / soft delete (reclassified Minor→Major by feasibility — ~10 duplicated query call sites + new purge infra) | L | 5 |
| US-06 | Bottom tab nav (mobile) | M | 3 |

**Capacity: 8/12 (67%).** Rationale for going first: lowest architectural risk of the P1 Majors, good validation of the new cloud data layer before the bigger epics.

### v2.2 — "Core money movement + budget visibility"

| ID | Story | Effort | Pts |
|---|---|---|---|
| US-15 | Transfer between own accounts (atomic dual-balance write; note: adding a `'transfer'` type needs a SQLite/Postgres table-rebuild-style migration or a paired-entry model) | L | 5 |
| US-17 | Per-category budgets with progress visualization | L | 5 |

**Capacity: 10/12 (83%).**

### v2.3 — "Recurring transactions" (isolated — largest non-cloud epic)

| ID | Story | Effort | Pts |
|---|---|---|---|
| US-16 | Recurring bills/income (Repeat/Installment/Subscription modes, scheduler, archived list) | XL | 8 |

**Capacity: 8/12 (67%).** Kept alone given XL band and Medium-High risk.

### v2.4 — "CSV import / data portability" (closes the P1 major backlog)

| ID | Story | Effort | Pts |
|---|---|---|---|
| US-18 | CSV import with column-mapping + duplicate-aware preview (dedup built from zero — none exists today) | XL | 8 |

**Capacity: 8/12 (67%).**

### v2.5 — "Entries-screen depth" (P2 majors begin)

| ID | Story | Effort | Pts |
|---|---|---|---|
| US-08 | Month-grid calendar view (needs a new unpaginated/aggregated fetch path — conflicts with today's 10/page pagination) | L | 5 |
| US-14 | Freeform tags (new M:N schema + dedicated tag report) | L | 5 |

**Capacity: 10/12 (83%).**

### v2.6 — "AI-assisted capture" (isolated)

| ID | Story | Effort | Pts |
|---|---|---|---|
| US-24 | Receipt OCR, voice entry, auto-categorization suggestions | XL | 8 |

**Capacity: 8/12 (67%).** Committed as a whole story — see §6 for why the lighter auto-categorization sub-slice isn't split out and shipped earlier.

### v2.7 — "Retention nudges + savings goals"

| ID | Story | Effort | Pts |
|---|---|---|---|
| US-25 | Daily logging reminder (real push notification, now that public reachability/HTTPS exists post-v2.0) | L | 5 |
| US-19 | Named savings goals (explicitly isolated from Invest's cost-basis logic) | L | 5 |

**Capacity: 10/12 (83%).**

### v2.8 — "Counterparty tracking + receipts + backup polish" (closes P2 backlog)

| ID | Story | Effort | Pts |
|---|---|---|---|
| US-20 | Per-counterparty Lent/Borrowed breakdown | M | 3 |
| US-38 | Photo attachment per entry (self-hosted/local-disk slice pattern, now cloud object storage) | M | 3 |
| US-39 | Backup timestamp + device-transfer flow (local-snapshot slice; off-machine sub-scope requires its own, currently unsized, follow-up — see §6) | M | 3 |

**Capacity: 9/12 (75%).**

### v2.9 — "Household sharing" (P3 tier, flagged)

| ID | Story | Effort | Pts |
|---|---|---|---|
| US-22 | Multi-user household sharing with per-member/per-account visibility | XL | 8 |

**Capacity: 8/12 (67%).** **Priority flag for Gino:** this carries S1's original **P3** tag ("contingent on the hosting decision"), but that contingency is now resolved — US-22 is the flagship reason the cloud migration was requested at all. Recommend reconsidering its sequencing at the next backlog review (e.g. moving it to open v2.1 instead of closing the P3 tier) — not resequenced unilaterally here since the P3 tag is Gino's, not mine to override.

### v2.10 — "Multi-currency" (spike-gated, lowest priority)

| ID | Story | Effort | Pts |
|---|---|---|---|
| US-21 | Per-account currency + base-currency conversion | XL | 8 |

**Capacity: 8/12 (67%).** Feasibility flags a **spike needed** on FX-rate provider/refresh cadence before this can be sized further than "XL, invasive" — this commitment assumes that spike happens first, inside or just before this sprint.

### v2.11 — "Personalization / theming" (closes the fully-sized backlog)

| ID | Story | Effort | Pts |
|---|---|---|---|
| US-37 | Accent-color/card-density/budget-progress-style picker (needs a CSS-custom-properties theming layer — current code hardcodes Tailwind utility classes) | L | 5 |

**Capacity: 5/12 (42%).** Last sprint in the sized backlog; no further Major or Minor items remain uncommitted after this one.

---

## 6. Flagged gaps — not committed anywhere, need a feasibility follow-up before they can be

Per this role's own guardrail (no committed item without a feasibility-sourced effort band), the following are **not** scheduled into any sprint above, even though the source review gestures at them being smaller/independent:

- **US-24's auto-categorization sub-slice** and **US-25's in-app/same-session nudge sub-slice** — §7.2 of the source review explicitly says these could ship *without* waiting for the cloud epic, but `recon-feasibility` sized only the whole stories (XL, L), not these sub-slices individually. Recommend a short feasibility follow-up sizing these two slices specifically — if they come back small, they're strong candidates to pull forward into the v1.x series instead of waiting for v2.6/v2.7.
- **US-39's off-machine (cloud) backup sub-scope** — flagged P3 and "cloud-dependent" in the source review, but no effort band was given for it distinct from the local-snapshot slice (M, committed in v2.8). Needs its own sizing pass; not committed here.

Neither of these is a blocker to the roadmap above — they're upside if resolved, not risk if left alone.

---

## 7. Deferred / Future track — not sequenced into any version

| Item | Status | Why it's not in the roadmap |
|---|---|---|
| **F-20** — Home-screen widget / iOS Live Activity | Gino's 2026-07-12 decision: kept as an explicit future bold bet, contingent on a native mobile app shell existing at all | Never promoted to a Keep user story (no US-ID); blocked on a materially bigger, separate product decision (native app: yes/no) than hosting. Explicitly **not** sequenced behind the cloud epic — it's parked on its own axis per the source review's own instruction, and there's no effort band to schedule against until that decision is made. |

**Also excluded (not deferred, decided against):** **US-26** (named Ledgers) — de-scoped 2026-07-12 in favor of US-22. Not part of this roadmap in any form; recorded here only for audit-trail completeness.

---

## 8. Summary

- **19 sprints** across **17 version increments** (v1.1–v1.5, v2.0's 3 sprints, v2.1–v2.11).
- **42 of 43 Keep stories committed** somewhere in the sequence (24 in v1.x, 1 — US-23 — delivered by the v2.0 epic itself, 17 Major stories across v2.1–v2.11).
- **1 story excluded** (US-26, de-scoped by Gino, not sized).
- **1 item in the deferred/future track** (F-20, unsequenced, contingent on an unresolved native-app decision).
- **2 sub-slice sizing gaps flagged** (US-24 auto-cat, US-25 in-app nudge) as a recommended quick feasibility follow-up that could pull real value earlier — not committed without a real number.
- **Cloud migration (v2.0) lands as the 6th version in the sequence** — immediately after the pre-cloud Minor backlog clears (v1.5) and before any Major-tagged feature work, which is the concrete answer to "sequenced sensibly, not an isolated afterthought": it's early enough to avoid rework on the ~71 points of schema-heavy Major stories that follow it, and late enough that the cheapest, highest-trust wins ship first on the architecture Pondo already has.

*Prepared by recon-po · 2026-07-12 · awaiting `APPROVE S2` / `REJECT S2: <notes>` before handoff to The Forge.*
