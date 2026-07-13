# Milestone Log & Timeline
**Project:** Pondo — Household Expense Tracker · **Maintained by:** pm

## Timeline
| # | Phase | Agent | Model | Artifact (.md + .docx) | Started | Ended | Duration | Gate | Approval | Approved date | docx published |
|---|-------|-------|-------|----------|---------|-------|----------|------|----------|---------------|:---:|
| 0 | Kickoff/Scope | friday | gemini-3-flash:cloud | brief | 2026-07-10 17:30 | 2026-07-10 17:32 | 2m | G0 ○ | Approved | 2026-07-10 | ☐ |
| 1 | Requirements | analyst | deepseek-v4-pro:cloud | 01-BRD | 2026-07-10 17:32 | 2026-07-10 17:44 | 12m | G1 ★ | Approved | 2026-07-10 | ☐ |
| 2 | UX/Wireframes | ux | glm-5.2:cloud | 02-wireframes | 2026-07-10 17:44 | 2026-07-10 17:49 | 5m | G2 ○ | Approved | 2026-07-10 | ☐ |
| 2.5 | Design system | brand | glm-5.2:cloud | 02b-design-system | 2026-07-10 17:49 | 2026-07-10 18:09 | 20m | G2.5 ○ | Approved | 2026-07-10 | ☐ |
| 3 | Architecture | architect | deepseek-v4-pro:cloud | 03-SAD | 2026-07-10 17:52 | 2026-07-10 18:06 | 14m | G3 ★ | Approved | 2026-07-10 | ☐ |
| 4 | Build plan | pm | gemini-3-flash:cloud | milestone-log | 2026-07-11 09:51 | 2026-07-11 10:15 | 24m | G4 ○ | In Progress | — | ☐ |
| 5 | Build | dev | qwen3-coder:480b:cloud | 04-code-docs | 2026-07-10 18:09 | 2026-07-11 04:27 | 10h 18m | G5 ○ | Approved | 2026-07-11 | ☐ |
| 6 | QA/UAT | qa | kimi-k2.7-code:cloud | 05-test-uat | 2026-07-11 09:08 | 2026-07-11 09:50 | 42m | G6 ★ | Approved | 2026-07-11 | ☐ |
| 7 | Deploy prep | devops | qwen3-coder:480b:cloud | 06-runbook | 2026-07-11 09:50 | 2026-07-11 09:58 | 8m | G7 ★ | Approved | 2026-07-11 | ☐ |
| 8 | Post-deploy/Retro | pm | gemini-3-flash:cloud | PROJECT-BOOK | 2026-07-11 10:00 | 2026-07-11 10:30 | ~10m | G8 ○ | v1 Complete | 2026-07-11 | ☐ |

★ = hard gate · ○ = soft gate
Note: QA also used deepseek-v4-flash:cloud for test plan production.

## Change history (gate rejections & re-runs)
| Date | Gate | What changed | Why |
|------|------|--------------|-----|
| 2026-07-10 | G1 | BRD v1 → v2: Added "Accounts" feature (FR-1 to FR-6) | Gino required account-level tracking (checking, credit, etc.) rather than just category-based expenses. |
| 2026-07-10 | G2.5 | Brand rename: "Pera" → "Pondo" | Gino preferred "Pondo" (Filipino for "funds") as a more distinct/trustworthy brand name. |
| 2026-07-10 | G3 | Choice of SQLite over Postgres | Chosen for v1 (single-user, self-hosted) for zero-config file-based portability. |
| 2026-07-10 | G3 | Choice of Passphrase Auth | Selected as a simple security measure for a local-first household app. |
| 2026-07-11 | G5 | CSS @import order fix | Google Fonts import moved to top of index.css to satisfy Vite build warnings. |
| 2026-07-11 | G5 | Dotenv dependency fix | Version mismatch fixed and dependency added to server package.json. |
| 2026-07-11 | G5 | Vite Proxy addition | Added to vite.config.js to resolve CORS issues between client (3000) and server (3001). |
| 2026-07-11 | G5 | Dashboard 500 Fix | `TypeError: schema.parse is not a function` in `routes/accounts.js` fixed by FRIDAY by removing redundant validation from GET route. |
| 2026-07-11 | G5 | External Claude Fixes | Various runtime errors during testing fixed by external Claude instance per Gino's request. |

## Traceability matrix (FR → wireframe → design → SAD → code → test)
| FR | Wireframe | Design token/style | SAD element | Code location | Test case |
|----|-----------|--------------------|-------------|---------------|-----------|
| FR-1 | S6, S10 | brand-600 | POST /api/accounts | Accounts page, AddAccount page | TC-1, TC-2, TC-3 |
| FR-2 | S6 | brand-600 | PUT /api/accounts/:id | Accounts page, EditAccount page | TC-4, TC-5 |
| FR-3 | S7 | negative | DELETE /api/accounts/:id | Accounts page, Delete modal | TC-6, TC-7, TC-8 |
| FR-4 | S5, S1 | neutral-700 | GET /api/accounts | Accounts page | TC-9 |
| FR-5 | S5, S1 | positive/negative | GET /api/accounts/:id | AccountSummary component | TC-10, TC-11, TC-12, TC-13, TC-14 |
| FR-6 | S6, S5 | account-type colors | accounts.type check | AddAccount/EditAccount pages | TC-15 |
| FR-7 | S3, S1 | brand-600 | POST /api/entries | AddEntry page | TC-16 |
| FR-8 | S3, S1 | brand-600 | POST /api/entries | AddEntry page | TC-17 |
| FR-9 | S3 | brand-600 | PUT /api/entries/:id | EditEntry page | TC-18 |
| FR-10 | S1, S2, S4 | negative | DELETE /api/entries/:id | Entries page, Dashboard | TC-19 |
| FR-11 | S2, S4 | neutral-700 | POST /api/entries/bulk-delete | Entries page, bulk delete | TC-20 |
| FR-12 | S3, S8 | Chart Colors 1-10 | GET /api/categories | Categories page, Seed data | TC-21 |
| FR-13 | S3, S8 | Chart Colors 1-6 | GET /api/categories | Categories page, Seed data | TC-22 |
| FR-14 | S8, S9 | brand-600 | POST/PUT/DELETE /api/categories | Categories page | TC-23, TC-24 |
| FR-15 | S8 | colors/icons | categories.color column | UI components | TC-25 |
| FR-16 | S1 | KPI Card styles | GET /api/dashboard (kpi) | Dashboard page, KpiCard | TC-26 |
| FR-17 | S1 | Donut chart colors | expense_breakdown | Dashboard page, ExpenseChart | TC-27 |
| FR-18 | S1 | Donut chart colors | income_breakdown | Dashboard page, IncomeChart | TC-28 |
| FR-19 | S1 | MoM styles | GET /api/dashboard (mom) | Dashboard page, MoM comparison | TC-29, TC-30 |
| FR-20 | S1, S2 | Data table styles | GET /api/dashboard (recent) | Dashboard RecentEntries | TC-31 |
| FR-21 | S1, S5 | Account card styles | GET /api/dashboard (accounts) | Dashboard AccountSummary | TC-32 |
| FR-22 | S1 | Dropdown styles | from/to date filters | Dashboard TimeFilter | TC-33 |
| FR-23 | S2 | Input styles | from/to date filters | Entries page date filters | TC-34 |
| FR-24 | S3 | — | no uniqueness check | Entry creation | TC-35 |
| FR-25 | S3 | audit trail style | created_at/updated_at | Entry forms, audit trail | TC-36 |
| FR-26 | S7 | — | ON DELETE RESTRICT | Entry validation | TC-37 |
| FR-27 | S5, S1 | — | Computed SQL SUMs | Account balance queries | TC-38 |

## Current status snapshot (v1 build, historical)
- **Current phase:** v1 COMPLETE (G8 soft gate passed)
- **Last gate passed:** G8 Post-deploy/Retro (PROJECT-BOOK delivered 2026-07-11)
- **All gates:** G0–G8 complete
- **Blockers:** None
- **Elapsed:** ~17 hours since kickoff (G0 2026-07-10 17:30 → G8 2026-07-11 10:30)
- **Future note:** Cloudflare Pages deployment (pages.dev) considered for v1.1/v2 — requires Express→Workers refactor + SQLite→D1 migration. *(Superseded by the cloud-migration epic sized in Recon Cycle 1 below — see `docs/recon/kill-absorb-review.md` §7.2.)*

---

## Recon Cycle 1 — InnerGrow reference-app discovery (post-v1)

**Crew:** DARKLING's Recon crew (recon-functional, recon-design, recon-market, recon-data, recon-po, recon-feasibility) — first Recon pass on Pondo; v1 above was built pre-Recon/Forge by FRIDAY's original Workshop Crew.

**Note on timestamp granularity:** unlike the v1 build timeline above (which carries HH:MM timestamps from the Forge session), the Recon source artifacts (`docs/recon/idea-pool.md`, `kill-absorb-review.md`, `sprint-backlog.md`) only carry date-level authorship stamps, not intraday times. Dates below are taken as-written from those artifacts rather than estimated.

| # | Phase | Agent(s) | Artifact | Date | Gate | Outcome | Approved date | docx published |
|---|-------|----------|----------|------|------|---------|---------------|:---:|
| R0 | Trigger/Kickoff | Gino → recon crew | *(context only — see idea-pool.md background note)* | 2026-07-11 | — | n/a (informal request: 20 reference screenshots + cloud-migration ask) | — | — |
| R1 | Scan | recon-functional, recon-design, recon-market, recon-data (parallel) | `docs/recon/idea-pool.md` | 2026-07-11 | — | 52 raw ideas produced (27 F, 16 D, 3 M, 6 U) — feeds S1, no independent gate | — | ☐ |
| R2 | Idea Review | recon-po | `docs/recon/kill-absorb-review.md` §§0–6 | drafted 2026-07-11; Gino's 2 follow-up decisions + sign-off 2026-07-12 | **S1 ★** | **Approved** | 2026-07-12 | ☑ |
| R3 | Feasibility sizing | recon-feasibility | `docs/recon/kill-absorb-review.md` §7 | 2026-07-12 | — | 41 of 43 Keep stories sized + cloud-migration epic sized (XL, High risk, 6 slices) — feeds S2, no independent gate | — | *(published as part of R2's docx above)* |
| R4 | Sprint Backlog | recon-po | `docs/recon/sprint-backlog.md` | 2026-07-12 | **S2 ★** | **Approved** | 2026-07-12 | ☑ |

★ = hard gate (Recon convention, per `crew_recon.md`)

**DoD check performed before logging complete:**
- R1 (idea-pool.md): exists, all four scanner sections present with idea IDs, source citations, and an explicit coverage-check footer per scanner (functional 27, design 16, market 3, data 6) — meets scan DoD.
- R2 (kill-absorb-review.md §§0–6): exists, full Keep/Kill/Absorb triage with acceptance criteria per Keep story, both Needs-Gino's-Input items resolved and dated. Header originally read "DRAFT — awaiting APPROVE S1" (stale, predating the actual approval) — **corrected 2026-07-12** to reflect the real S1-approved status (see Housekeeping below).
- R3 (kill-absorb-review.md §7): exists, effort/risk banded against direct codebase inspection (files list cited), cloud epic sliced separately — meets feasibility DoD.
- R4 (sprint-backlog.md): exists, all 43 Keep stories accounted for (42 committed + 1 excluded per Gino's decision), 19 sprints / 17 version increments, capacity model stated. Header also read "DRAFT — awaiting APPROVE S2" despite the cycle being S2-approved — **corrected 2026-07-12** for the same reason (see Housekeeping below; not explicitly requested but fixed for consistency since this file is being published as gate-approved).

### Housekeeping fixed this pass
1. **`docs/recon/kill-absorb-review.md` stale S1-approval header** — corrected from "DRAFT — awaiting APPROVE S1" to reflect Gate S1 APPROVED 2026-07-12 (flagged by recon-po in `sprint-backlog.md`'s "Paperwork note").
2. **`docs/recon/sprint-backlog.md` stale S2-approval header** — same pattern, corrected for consistency prior to .docx publication (not in the original two-item ask, extended here since it was the identical issue on the artifact being published this pass).
3. **US-22's P3 priority tag — NOT changed.** Flagged by recon-po as stale (the tag predates the cloud-hosting decision that resolved its stated contingency), but recon-po's own sprint-backlog.md v2.9 section explicitly declines to resequence it unilaterally ("not resequenced unilaterally here since the P3 tag is Gino's, not mine to override"). Reprioritizing a story is a product/backlog decision outside this role's remit (pm records what specialists/Gino decide, doesn't author it) — left as-is, flagged here and in the traceability section below for Gino's next backlog review, consistent with recon-po's own recommendation.

### Idea-pool traceability (raw idea → triage → story → sprint)

Classic FR-traceability (FR → wireframe → SAD → code → test) does not yet apply to this cycle's output — nothing here is built. The applicable trace for a Recon cycle is idea → disposition → committed sprint slot:

| Stage | Count | Detail |
|---|---|---|
| Raw ideas scanned | 52 | 27 F (functional) + 16 D (design) + 3 M (market) + 6 U (data/usage) |
| Promoted to Keep user stories | 43 (US-01–US-43) | Folds in 6 absorbed ideas (D-3→US-01, D-4→US-02, D-7→US-08, D-14→US-02/US-07, M-1→US-22, M-3→US-03) — 49 of 52 raw ideas represented |
| Killed (no action) | 2 | D-15, D-16 — both explicitly iOS-native-only per recon-design's own scan, not cuts of existing Pondo scope |
| Resolved via Gino's S1 input | 2 items | F-20 (native widget) → kept as unsequenced deferred future bet; US-26 vs US-22 (ledgers vs. granular-visibility sharing) → US-22 selected, US-26 de-scoped |
| Sized by feasibility | 41 of 43 | US-26 not sized (de-scoped before sizing); F-20 not sized (never promoted to a Keep story) |
| Committed to a sprint/version | 42 of 43 | 24 in v1.1–v1.5 (current architecture) + 1 (US-23) delivered directly by the v2.0 cloud epic + 17 Major stories across v2.1–v2.11 |
| Excluded from roadmap | 1 | US-26 (named Ledgers) — de-scoped 2026-07-12 per Gino, recorded for audit trail only |
| Deferred, unsequenced | 1 | F-20 (native widget) — parked pending a separate native-app-shell decision |

**52 → 43 Keep + 6 absorbed-into-Keep + 2 Kill + 1 (F-20, flagged/deferred) = 52.** Reconciles cleanly (US-26/F-17 is already inside the 43 Keep, not a separate bucket) — verified by direct trace through `kill-absorb-review.md`, not taken at face value from its own summary line.

### Conflicts/gaps flagged (not silently resolved)

1. **SAD-vs-reality data-layer conflict.** `artifacts/03-SAD.md` states Pondo runs on `better-sqlite3`. Direct codebase trace by recon-feasibility (`kill-absorb-review.md` §7 intro, finding #1) confirms the live app actually runs the `sqlite3` package (async/callback) via `server/db/schema.js`; `better-sqlite3` is used only by the orphaned dead-code file `server/schema.js` (already flagged as US-30). **This is a real, unresolved conflict between the SAD and the running code** — not corrected in the SAD by this pass (not this role's authoring remit); flagged here so it's visible before the v2.0 data-layer migration (Slice 1, Slice 4) is scoped against the wrong stated driver.
2. **Auth model gap not documented in the SAD.** Feasibility finding #2: `client/src/lib/api.js` hardcodes the app passphrase as a source constant, not session-stored/prompted per SAD §5.1's description. Flagged, not resolved — feeds directly into the v2.0 multi-user auth slice (Slice 3).
3. **US-01 real bug found during sizing:** `getDashboardKPIs`'s `total_balance` formula in `server/db/queries.js` adds Credit's and Borrowed's balances instead of subtracting them (sign error) — confirmed by direct code read, not inferred. Carried as an AC fix inside US-01 (scheduled v1.1), not a separate item.
4. **Suspicious pre-existing file, `tmp/idea-pool-data.md`** — existed before this Recon cycle started, formatted to resemble legitimate scanner output (including an uncorroborated "35% Other category usage" stat and a `reconciled_balance` schema suggestion that would violate NFR-13). recon-data excluded it from all evidence and independently re-derived U-1–U-6 from the real code/DB. Origin unverified — recon-po flagged it directly for Gino (`kill-absorb-review.md` §6) to check personally. Not resolved by this pass; carried forward as an open item, not an app defect.
5. **US-22 priority tag** — see Housekeeping item 3 above. Left open for Gino, not resolved here.

### Recon Cycle 1 status snapshot
- **Current phase:** Recon Cycle 1 COMPLETE through Gate S2 (sprint-backlog.md APPROVED 2026-07-12) — awaiting handoff to The Forge for build (starting with v1.1).
- **Last gate passed:** S2 (Sprint Backlog), 2026-07-12.
- **Blockers:** None for v1.1–v1.5 (current architecture). v2.0 cloud migration's Sprint 1 has an open hosting-target decision (Slice 2 spike) and an open question for Gino (does self-hosted remain supported post-v2.0, or cloud-only — sprint-backlog.md §4 "What breaks" — **per Gino's cycle direction, resolved as cloud-only after v2.0, self-hosted retired, not maintained in parallel**).
- **Open items carried forward, not resolved by this record-keeping pass:** SAD/code driver conflict (#1 above), US-22 priority-tag staleness (Housekeeping #3), `tmp/idea-pool-data.md` origin (#4 above), 2 sub-slice sizing gaps flagged in `sprint-backlog.md` §6 (US-24 auto-cat slice, US-25 in-app-nudge slice — recommended feasibility follow-up, not committed).
- **Two real code-hygiene bugs surfaced incidentally** (not InnerGrow-comparison findings): `accounts.js`/`categories.js` bypass the central error handler (US-29, scheduled v1.1); an orphaned dead-code script created a divergent second SQLite file `server/database.sqlite` (US-30, scheduled v1.1).
