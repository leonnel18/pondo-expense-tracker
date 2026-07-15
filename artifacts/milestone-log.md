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
- **Superseded by the undocumented Supabase/Vercel cutover recorded below (2026-07-13/14) — see "Post-Recon Reconciliation" section.** The sequencing this snapshot describes (v1.1–v1.5 before v2.0) was not what actually happened.

---

## Post-Recon Reconciliation — Supabase/Vercel cutover (2026-07-13 / 2026-07-14)

**Nature of this entry:** unlike every table row above, this section is **not** built from a live-tracked agent session — there is no start/end timestamp, no assigned specialist agent, and no model attribution to report, because none was tracked at build time. It is reconstructed after the fact, purely from file-system evidence (file mtimes, dependency diffs, direct code reads performed this session) gathered 2026-07-14. Where the record can't establish who or what made a change, it says so rather than inventing an agent, model, or duration to match the format of the rows above.

### What happened

Between 2026-07-13 and 2026-07-14, the running application was cut over from a SQLite/self-hosted data layer to **Supabase (Postgres)**, and deployed to **Vercel** as a serverless app. This corresponds functionally to v2.0 Sprint 3, Slices 4 and 5 (data-layer migration and hosting cutover) in `docs/recon/sprint-backlog.md` — but it was **not preceded by v1.1–v1.5** (the approved bug-fix/polish backlog on the old architecture) or by **v2.0 Sprint 2** (multi-user auth), both of which the approved sequencing in `sprint-backlog.md` (Gate S2, approved 2026-07-12) put *before* the data-layer/hosting slices, specifically to avoid layering new cloud work on known-broken code.

**Evidence (file-system, verified directly this session, not assumed):**

- `server/package.json` dependencies are now `@supabase/supabase-js`, `bcrypt`, `cors`, `dotenv`, `express`, `zod` — `sqlite3`/`better-sqlite3` are gone. `devDependencies` adds `@vercel/node`. File mtime 2026-07-14 20:17.
- `server/db/client.js` (mtime 2026-07-13 23:18), `server/db/supabase.js` (mtime 2026-07-13 23:30), `server/db/queries.js` (mtime 2026-07-13 23:33) are fully Supabase-client-based (`.from()/.select()/.eq()` query builder calls, confirmed by direct read). `server/db/migration.sql` (mtime 2026-07-13 23:36) defines the new Postgres schema (`accounts`, `entries`, `categories`, `settings` — no `users` table).
- Root-level `vercel.json` (mtime 2026-07-14 20:14) builds `client/` via Vite (`outputDirectory: client/dist`) and rewrites `/api/*` to `api/index.js`, which does `require('../server/server')` — confirming the Express app is now running as a Vercel serverless function, not a standalone `localhost:3001` process.
- The old data layer was not removed: `server/schema.js` (orphaned dead-code file, already flagged as US-30 in Recon Cycle 1) and `server/database.sqlite` + `server/database.sqlite.backup_20260713_150634` (mtimes 2026-07-13 13:35) are all still present on disk alongside the new Supabase code.
- Gino confirmed today (2026-07-14) that the deployment is live, consistent with `vercel.json`'s same-day mtime.

**Sequencing deviation — flagged, not smoothed over:** the approved roadmap in `sprint-backlog.md` sequenced v1.1–v1.5 (cheap fixes/polish on the *old* architecture) and v2.0 Sprint 1–2 (hosting-target decision, then multi-user auth) *before* v2.0 Sprint 3 (data-layer migration) and hosting cutover. What actually shipped is Sprint 3's data-layer and hosting slices only, direct, with v1.1–v1.5 and Sprint 2 skipped. This log states that deviation as an observed fact from file evidence; it does not assign cause or blame — there is no tracked session record establishing who performed the migration or why the sequencing wasn't followed.

### Known-open defects carried into the new Supabase code (not fixed by the migration)

These three were already flagged as v1.1 backlog items in Recon Cycle 1 (`kill-absorb-review.md` §7, `sprint-backlog.md`) against the *old* SQLite code. Direct code read of the *new* Supabase code (2026-07-14) confirms all three are still present, unfixed, in the migrated codebase:

- **US-01 (net-worth sign bug):** `getDashboardKPIs` and `getAccountBalance` in `server/db/queries.js` still accumulate every account's computed balance into `totalBalance`/`total_balance` via unconditional addition (`totalBalance += accountBalance`), regardless of whether the account type is an asset or a liability — Credit and Borrowed balances are added rather than subtracted. Confirmed at `server/db/queries.js` lines ~756–771 (account-type switch) and ~778 (total_balance assignment).
- **US-29 (central error handler bypass):** `server/routes/accounts.js` and `server/routes/categories.js` still catch errors locally and respond directly (`res.status(500).json({ error: error.message })`) instead of calling `next(error)` to route through the app's central error handler. Confirmed at `accounts.js` lines 18–37 (both GET routes).
- **US-30 (orphaned files never removed):** `server/schema.js` (the dead-code `better-sqlite3` file) and `server/database.sqlite` (plus its `.backup_20260713_150634` copy) are still present on disk, now stale/divergent from the live Supabase database. Confirmed present via directory listing 2026-07-14.

**These are open, not fixed.** They are being addressed in a separate, parallel workstream (not this reconciliation pass) — this entry records their status as of 2026-07-14, it does not claim resolution.

### Open gap: multi-user auth (v2.0 Sprint 2) not done

`sprint-backlog.md`'s v2.0 Sprint 2 scoped multi-user authentication as a prerequisite before the app went publicly reachable. Direct code read confirms this was **not built**:

- `server/middleware/auth.js` still validates a single bcrypt-hashed passphrase stored in `settings` (`getSetting('passphrase_hash')`) against one shared `X-App-Passphrase` header — no per-user identity.
- `client/src/lib/api.js` still stores one passphrase client-side (`sessionStorage.getItem('pondo_passphrase')`) and attaches it as `X-App-Passphrase` on every request.
- `server/db/migration.sql` has no `users` table.

The app is now publicly reachable on Vercel with this single-shared-passphrase model unchanged from v1. This is flagged as a real, currently-open security/scope gap — not resolved by the migration, and not something this reconciliation pass fixes (out of scope; a build/security decision for the parallel workstream or Gino, not a documentation call).

### Also noted, not fixed by this pass

- `artifacts/06-runbook.md` is unchanged since 2026-07-11 and still describes the old self-hosted-Windows deployment (`http://localhost:3001`, SQLite file path). It does not reflect the Vercel+Supabase reality. Rewriting it is a devops task, out of scope here — flagged only.
- `client/package.json` and `server/package.json` both still read `"version": "1.0.0"` despite the data-layer/hosting migration. Left as-is per instruction — a version bump is a separate pm pass, to happen after the three open defects above are fixed.
- No CHANGELOG.md exists for this project; per this project's existing convention (milestone-log.md + PROJECT-BOOK.md, no separate CHANGELOG), none was created for this entry either.

### Reconciliation status snapshot

- **Current phase (actual, as of 2026-07-14):** v2.0 Sprint 3 (data-layer migration, hosting cutover) shipped directly, out of sequence — v1.1–v1.5 and v2.0 Sprint 2 (multi-user auth) were skipped, not completed.
- **Last verified state change:** Supabase+Vercel cutover, file evidence dated 2026-07-13 evening through 2026-07-14.
- **Blockers/open items:** US-01, US-29, US-30 (all open, in new code) · multi-user auth gap (v2.0 Sprint 2, not built, app is public with single shared passphrase) · runbook stale (`06-runbook.md`, out of scope this pass) · versions not bumped (out of scope this pass, deferred to post-bugfix pm pass).
- **Not determined by this record:** which agent/tool/session performed the migration, and why the approved sequencing (v1.1–v1.5 before v2.0) was not followed — no tracked session exists to attribute this to; stated as an open fact, not guessed at.

---

## Session — v1.1 backfill + v2.0 Sprint 2 (auth) requirements & design (2026-07-14)

**Trigger:** Gino asked to start V2.x work and confirmed the three open defects above should be backfilled before continuing, followed by planning (not yet building) the missing multi-user auth slice. Orchestrated by DARKLING (Claude, this session); backfill executed by `forge-dev`/`forge-qa` (Claude, Sonnet tier); auth requirements/design executed by FRIDAY's OpenClaw Workshop Crew (`analyst`, `architect`, Ollama `deepseek-v4-pro:cloud`).

### v1.1 defects fixed (of the three carried open above)

| ID | Fix | Verified |
|----|-----|----------|
| US-01 | `getDashboardKPIs` in `server/db/queries.js` now applies `totalBalance = Σ(Debit)+Σ(Invest)+Σ(Lent) − Σ(Credit)−Σ(Borrowed)` per BRD FR-5, instead of unconditional addition. | Live Supabase test (temp accounts/entries, inserted → computed → deleted): correct result 1200 vs. the old bug's 2600 for the same test mix. |
| US-29 | `server/routes/accounts.js` and `server/routes/categories.js` now call `next(error)` instead of `res.status(500).json({error: error.message})`, matching `entries.js`'s existing pattern and routing through the Postgres-aware central error handler. | `node --check` syntax pass; grep confirms zero remaining local-500-catch occurrences in `server/routes/`. |
| US-30 | Orphaned `server/schema.js` (dead `better-sqlite3` code) and stray `server/database.sqlite` removed, after confirming no live code references either. | Grep-confirmed unreferenced before deletion; files gone after. |

**Also flagged, not fixed (out of scope, follow-up recommended):** `server/db/schema.js` (a second, differently-located dead-code file, same category as US-30 but not in its named scope), `server/check-db.js`, `server/test-schema.js`, and stray `.db`/`.sqlite.backup_*` files from the SQLite era.

**Versions bumped:** `client/package.json` and `server/package.json` → `1.1.0` (was `1.0.0` since v1). `CHANGELOG.md` created at project root (Keep a Changelog style) — first time this project has had one; supersedes the "no CHANGELOG, milestone-log only" convention noted in the prior reconciliation entry.

### v2.0 Sprint 2 (multi-user auth) — requirements & architecture design, APPROVED

Two new artifacts under `docs/v2.0-sprint2-auth/`:

- **`01-requirements-addendum.md`** (analyst) — 15 FRs, 8 NFRs, 6 open questions. Key recommendation: build `public.users` + nullable `user_id` FK on `accounts` now (not deferred to US-22); use Supabase Auth as the provider.
- **`02-architecture-design.md`** (architect) — full SAD for the slice: schema DDL, middleware rewrite, `/api/auth/*` surface, client-side `AuthProvider`/`AuthGate`, 3-phase cutover plan. Notably caught a real conflict the analyst's requirements didn't resolve: Supabase's client SDK defaults to `localStorage` for session tokens, which violates NFR-A4 (no JWT in localStorage) — architect specified the `@supabase/ssr` cookie-based pattern instead.

**Gate:** APPROVED by Gino, 2026-07-14 — equivalent to a G3 architecture gate, given this changes the auth model on a live public app. **Implementation (Phase 4) not yet started** — awaiting separate go-ahead.

### Infrastructure change: per-project OpenClaw agent clones

Eight project-scoped clones (`analyst-pondo`, `ux-pondo`, `brand-pondo`, `architect-pondo`, `dev-pondo`, `qa-pondo`, `devops-pondo`, `pm-pondo`) were created so FRIDAY's Workshop Crew can work directly against this project's real files instead of a sandboxed default workspace. Each clone keeps its own role-specific `AGENTS.md` persona (verified distinct from a generic project-level `AGENTS.md` that was incidentally already sitting in the project root from the undocumented migration above) in a dedicated `~\.openclaw\workspace-<role>-pondo\` directory, with a directory junction (`pondo\`) linking live to this project folder for real file access. Added to `friday`'s `subagents.allowAgents` so FRIDAY itself can delegate to them, not just DARKLING. Gateway restarted 2026-07-14 to apply both changes.

---

## Session — v2.0 Sprint 2 (auth) implementation, QA, and commit (2026-07-15)

**Trigger:** Gino approved the auth requirements/design above and authorized implementation via `dev-pondo`/`qa-pondo` (OpenClaw, Ollama). Orchestrated by DARKLING.

### Implementation (`dev-pondo`, `ollama/qwen3-coder:480b-cloud`)

Built per the approved SAD: `public.users` schema migration (`server/db/migrations/001_add_users_and_account_user_id.sql`), rewritten `server/middleware/auth.js`, new `server/lib/supabase-auth.js`, new `server/routes/auth.js` (`/api/auth/*`), client-side `AuthProvider`/`AuthGate`/sign-in-up-reset pages, `client/src/lib/api.js` refactor. Old `/api/setup` and `/api/set-passphrase` (passphrase-specific logic) removed from `server/routes/system.js`. Did not touch the live database or deploy, per instruction.

### QA — automated run failed, manual review by DARKLING found 3 real defects

A first QA dispatch to `qa-pondo` (`ollama/kimi-k2.7-code:cloud`) with an open-ended "trace every FR" brief failed outright: 194 tool calls, a context-window overflow, one failed auto-compaction attempt, then a timeout after ~19 minutes — no report produced. Rather than retry the same broad scope, DARKLING reviewed the implementation directly and found:

1. **Critical — auth did not actually work end-to-end.** `middleware/auth.js` read the token from an `Authorization` header; `client/src/lib/api.js` only sent `credentials: 'include'` (cookies); `routes/auth.js`'s signup/signin never set a cookie or returned a token. A user could "sign in" successfully and still 401 on the very next request. Also found while investigating: the client's `api.js` called a `/api/auth/refresh` endpoint that didn't exist yet (404).
2. **NFR-A5 violation.** `signup` returned an explicit "email already exists" message on duplicate registration — direct disclosure, despite `signin` two functions later correctly avoiding the same issue.
3. **Documented, not a blocker.** `signout` cannot truly revoke a JWT before its natural expiry (inherent to stateless local verification, bounded by the 1hr access-token lifetime) — flagged for a code comment, not a fix.

### Fix pass (`dev-pondo`, targeted 4-item brief, not a broad re-implementation)

All 3 defects fixed: cookie-parser wired in, `setAuthCookies` helper added, signup/signin now set httpOnly cookies, signout clears them, the missing `/refresh` route was added, signup's duplicate-email response is now generic. DARKLING independently re-verified by reading the actual files (not trusting the self-report a second time) and found one thing the fix report missed: `server.js` called `cookieParser()` but never imported the `cookie-parser` package — a guaranteed `ReferenceError` on server boot. Fixed directly by DARKLING (one-line import). All 4 touched files passed `node --check` afterward.

### Pre-commit hygiene (DARKLING)

- Found and removed stray files sitting in the project root from earlier OpenClaw sessions (before the per-project-clone workspace fix above existed): `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `TOOLS.md`, `USER.md`, `HEARTBEAT.md`, `openclaw-workspace-state.json`, plus debug artifacts `err.txt`/`files.txt`/`out.txt`. Contents checked first — nothing sensitive, just internal scaffolding/debug output that didn't belong in the app repo. Added a `.gitignore` guard against recurrence.
- Found `server/package-lock.json` out of sync with `package.json` — `cookie-parser` was declared but never actually `npm install`ed (matches instructions given to `dev-pondo` not to run installs itself), meaning `npm ci` on Vercel would likely have failed the build. Ran `npm install` in both `client/` and `server/` to resolve properly; `jsonwebtoken` and `@supabase/supabase-js` were already correctly resolved (likely already-transitive/previously-installed).
- Ran a real `npm run build` in `client/` — 1906 modules, built clean, no errors.

### Committed, not pushed

One local commit (`6feaa98`) covering both the v1.1 backfill and the v2.0 Sprint 2 auth implementation — **not pushed to `origin/main`**. The repo has a live GitHub remote (`leonnel18/pondo-expense-tracker`) with no local Vercel CLI link or manual-upload trace, strongly suggesting Vercel's GitHub integration auto-deploys on push to `main` — meaning the push itself, not a separate "deploy" step, is likely the actual trigger. Held deliberately pending two things:

1. **Both the Supabase and Vercel MCP connections dropped mid-session** (session-wide auth expiry, not one connector) — blocking both the DDL migration apply and any Vercel-side verification.
2. **Three environment variables are load-time-required by the new code and unverified in Vercel:** `SUPABASE_JWT_SECRET` (server, `server/lib/supabase-auth.js` throws at require-time if missing — would crash the *entire* app, not just auth, since this is required from `server.js`'s import chain), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client, `client/src/lib/supabase.js` throws at module-load if either is missing). None of these were needed by the app before this change. Missing any one would break production on the next deploy, whenever it happens.

### Status snapshot

- **Current phase:** Auth implementation complete, defect-fixed, independently verified, committed locally. DDL migration NOT applied to production. Not pushed to GitHub. Not deployed.
- **Blockers:** MCP reconnection (Supabase + Vercel) needed before either the migration apply or the push/deploy can proceed safely.
- **Next steps, in order:** reconnect MCP → verify the 3 env vars are set in Vercel → apply migration → push to `main` (likely triggers deploy) → monitor the deployment.

---

## Session — v2.1 (US-05 recycle bin/soft-delete + US-06 mobile bottom nav), overnight autonomous run (2026-07-15)

**Trigger:** Gino authorized DARKLING to proceed through the sprint backlog autonomously overnight (v2.1 through v2.5), via `dev-pondo`/`architect-pondo`/`qa-pondo`, with the same no-push/no-deploy/no-production-DDL boundary held regardless of the broadened authorization. This entry covers v2.1 only.

### Architecture (`architect-pondo`, `ollama/deepseek-v4-pro:cloud`)

`docs/v2.1-recycle-bin-mobile-nav/01-architecture-design.md` — resolved every ambiguity DARKLING flagged in the brief: 30-day retention window, an exhaustive 22-function audit of `server/db/queries.js` (every function that reads/writes `accounts`/`entries`, named individually with the exact required change), account-soft-delete-cascades-to-entries semantics, and the reassign/cascade delete flow's removal under soft-delete. Caught two things independently: Supabase's JS client doesn't propagate `deleted_at` filters through nested joins (meaning `getAccountBalance`/`getDashboardKPIs` need an extra JS-level filter beyond the query-level one, or soft-deleted entries would silently leak into balances), and that the sprint-backlog's own sizing note assumed a `setInterval` purge job — which cannot work on Vercel serverless (no persistent process between requests). Specified Vercel Cron + a lazy on-demand purge as a defense-in-depth fallback instead. This design doc survived a mid-session machine hang/crash intact (verified complete on recovery, not re-run).

### Implementation — split into 3 scoped dev-pondo dispatches after the first attempt timed out

A first, single broad dispatch covering all of §1.2–§2.4 timed out at ~9.5 minutes without completing (35 tool calls, one failed edit). Rather than retry the same broad scope, DARKLING checked what had actually landed: the entire 22-function query audit was done and independently verified correct (including both JS-level join-filter additions) — the run had simply run out of time before starting the remaining files. Split the rest into two further-scoped dispatches:

- **Server-side remainder** (new `getRecycleBin`/`restoreItem`/`purgeExpired` query functions, `accounts.js`/`entries.js` DELETE rewrites, new `server/routes/recycle-bin.js`, `server.js` mount + auth-skip for the cron-only purge endpoint, `validate.js` cleanup) — reported as failed (exit 255, no completion payload — likely a gateway hiccup after the actual file writes had already succeeded), but direct inspection confirmed all 6 assigned files were correctly touched and syntactically valid. Only the `vercel.json` cron entry (item 7) was missed — added directly by DARKLING (one-line JSON addition).
- **Client-side** (`navigation.js`, `BottomNav.jsx`, `RecycleBin.jsx`, `Sidebar.jsx`/`Layout.jsx`/`Header.jsx`/`App.jsx` wiring, `Accounts.jsx`/`Entries.jsx` delete-flow simplification, `api.js` exports) — completed with 3 logged tool-call failures (a failed `apply_patch` on `Accounts.jsx`, "no changes made" on `Entries.jsx` and `Sidebar.jsx`). Direct review found two of the three were harmless (the changes had already landed via a different tool call before the logged failure — `Accounts.jsx`'s modal removal and `Entries.jsx`'s confirm-message update were both correct on inspection), but the third was real: **`Sidebar.jsx` referenced an unimported `Wallet` icon after the refactor to the shared navigation module** — the old inline icon import had covered both the nav array and a standalone logo use, and only the former survived. This would have thrown `ReferenceError: Wallet is not defined` on every single page load (Sidebar renders inside Layout, which every route passes through) — not caught by any build step, since it's a runtime reference error, not a syntax one. Found by direct code read, fixed directly by DARKLING (added the missing `lucide-react` import).

### Verification

All 6 server-side files + `queries.js` passed `node --check`. Full client `npm run build` succeeded clean (1909 modules) both before and after the Sidebar.jsx fix — build success alone would not have caught that specific bug (undefined-variable JSX references aren't a build-time error), so the direct code read was load-bearing, not the green build.

### Committed, not pushed

One local commit (`8b6bd90`) on top of the auth work. Same DDL/push/deploy hold as before — the migration (`002_add_soft_delete_columns.sql`) is written but not applied; Supabase/Vercel MCP still need reconnecting first.

### Status snapshot

- **v2.1: complete, independently verified (including one critical bug found and fixed that self-reports missed), committed locally.**
- **Next:** proceed to v2.2 (US-15 transfers, US-17 budgets) per Gino's overnight authorization, same discipline (design → scoped implementation → independent review → fix → local commit, no production actions).

## Session — v2.2 (US-15 transfers + US-17 budgets), overnight autonomous run continued (2026-07-15)

Same standing authorization and no-push/no-deploy/no-production-DDL discipline as v2.1. `architect-pondo`'s first combined dispatch (transfers+budgets in one brief) failed twice — first burned 174 tool calls with zero writes, retry hit a genuine model idle timeout after 12 reads. Split into two narrower, parallel dispatches (distinct `--session-key`s to avoid session collision) — both succeeded cleanly on retry, producing `docs/v2.2-transfers-budgets/01-transfers-design.md` and `02-budgets-design.md`.

### US-15 Transfers — design, build, verify, commit (complete)

Paired-entry model: a transfer is two linked `entries` rows (expense on the source account, income on the destination) sharing a `transfer_group_id` UUID, deliberately chosen over a third `'transfer'` enum value to avoid touching the `entries` CHECK constraint. Three Postgres RPC functions (`create_transfer`/`update_transfer`/`delete_transfer`) handle the atomic paired writes, since Supabase's JS client has no client-side multi-statement transaction API.

**Critical bug found and fixed:** `server/routes/transfers.js` imported `createTransferSchema` from an orphaned, pre-existing duplicate schema file (`server/zod/schemas/index.js` — dead code, same category as the already-known-dead `server/db/schema.js`) instead of the real schema in `server/middleware/validate.js`. The dead-code version lacks the `body: z.object({...})` wrapper the `validate()` middleware requires, which would have made **every transfer request fail with a 400, including fully valid ones** — a total feature outage on first use. Fixed by correcting the import and reverting dev-pondo's accidental edit to the dead-code file (confirmed via `git diff` it was pre-existing, not newly created).

12 existing query functions across `queries.js` (dashboard KPIs, account balances, restore, bulk-delete, etc.) were patched per the design's exhaustive impact list and spot-verified correct — notably `getDashboardKPIs` correctly excludes transfers from `total_income`/`total_expense` while still letting them net into each account's own balance, and both `restoreItem`/`bulkDeleteEntries` correctly act on both halves of a transfer pair to avoid orphaning one side.

Frontend: `AddTransfer.jsx`/`EditTransfer.jsx` (new pages), `Entries.jsx` updated to show a `⇄ Transfer` badge and single "Edit Transfer" action in place of per-row edit/delete for transfer rows, `App.jsx` routes, `api.js` exports — all reviewed and verified correct.

Committed as `f52d752` (both design docs included, since `02-budgets-design.md` already existed in the working tree at commit time).

### US-17 Budgets — design, backend build + verify + commit (complete); frontend in progress

`docs/v2.2-transfers-budgets/02-budgets-design.md` — on-the-fly cycle-boundary calculation (weekly/monthly/custom) with no cron dependency, consistent with the v2.1 lesson that Vercel serverless has no persistent process for `setInterval`.

**Model retirement mid-session:** `qwen3-coder:480b-cloud` (the `dev`/`devops` roles' assigned model) was retired by Ollama Cloud at exactly `2026-07-15 00:00:00 -0700 PDT`, discovered via a live 410 error mid-dispatch. Fixed by reassigning `dev`, `devops`, `dev-pondo`, `devops-pondo` to `ollama/deepseek-v4-pro:cloud` and restarting the gateway, then successfully redispatching.

**Two critical bugs found and fixed** in the backend implementation:
1. `server/lib/budget-cycle.js` — the monthly-cycle candidate date used `new Date(year, month, anchorDay)`, which silently overflows into the next month instead of clamping when `anchorDay` exceeds the month's real length (e.g. day 31 in April rolls to May 1). This made the cycle-start calculation land a full month too early for the entire month, for any budget anchored on a day past the 28th. Fixed with a new `clampToMonth()` helper, applied to both the candidate-date construction and the previous-month fallback.
2. `server/routes/budgets.js` — `dashboardBudgetsHandler`'s zero-budgets early return called `res.json([])` from inside the async IIFE, but the outer `.then((result) => res.json(result))` would then call `res.json` a second time on the Express response object itself — **breaking the dashboard budgets endpoint for every user with zero budgets configured, i.e. everyone before their first budget.** Fixed by returning the plain value (`return [];`) and leaving the single outer `res.json` call as the only call site.

Backend (migration `004_budgets.sql`, `budget-cycle.js`, `routes/budgets.js`, 6 new `queries.js` functions, `validate.js` Zod schemas with `superRefine` cycle_end conditional logic, `server.js` mounts) fully independently verified — all `module.exports` entries confirmed present, all imports resolve, `node --check` clean across all 4 touched JS files. Committed as `e3346c4`, not yet applied to production Supabase.

Frontend (`BudgetProgressBar.jsx`, `BudgetCard.jsx` on the dashboard, `Budgets.jsx` management page, `api.js` exports, nav entry) dispatched to `dev-pondo` and independently verified clean on first pass — no defects found, a rarity this session (every other dev-pondo dispatch has produced at least one critical bug caught by direct review). All 7 files read in full, `npm run build` reproduced locally (1914 modules, clean), percent-threshold color logic hand-traced at all 4 boundaries, and the `id` vs `budget_id` field-name mismatch between the two budget-list endpoints (plain `getBudgets()` returns `id`, dashboard-enriched `getDashboardBudgets()` returns `budget_id`) confirmed used correctly in each of its two separate consumers. Committed as `6f0d46c`.

### Status snapshot

- **v2.2a (transfers): complete, verified, committed (`f52d752`).**
- **v2.2b (budgets): complete, verified, committed (`e3346c4` backend, `6f0d46c` frontend).**
- **v2.2: fully done.**
- **Next:** v2.3 (US-16 recurring transactions — flagged in advance for the same Vercel-serverless-scheduler constraint as v2.1's purge job and v2.2's cycle math), v2.4 (US-18 CSV import), v2.5 (US-08 calendar view + US-14 tagging), per Gino's standing overnight authorization through v2.5. No push/deploy/production-DDL throughout.
