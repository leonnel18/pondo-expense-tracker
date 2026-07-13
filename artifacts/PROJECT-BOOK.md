# PROJECT-BOOK — Pondo Household Expense Tracker
**Project:** Pondo · **Version:** 1.0 (shipped) + Recon Cycle 1 backlog (v1.1–v2.11 planned) · **Date:** 2026-07-12 · **Status:** v1 COMPLETE (G8) · Recon Cycle 1 COMPLETE through Gate S2 — 19-sprint roadmap approved, awaiting Forge handoff

---

## 1. Executive Summary
**Pondo** (Filipino for "funds") is a privacy-first, manual-entry household expense tracker built for users who want financial clarity across multiple accounts without the risks of bank-linking. The project was initiated to fill the gap left by automated tools like Mint, focusing on a "dead-simple" user experience that respects the user's mental model of their money.

Key outcomes include a fully functional React/Express/SQLite stack with support for five distinct account types (Debit, Credit, Lent, Borrowed, Invest), automated dashboard KPIs, and period-aware spending/income visualizations. The project successfully navigated a rapid 16-hour development cycle from kickoff to local deployment, resulting in a durable, self-hosted tool that provides immediate financial visibility.

---

## 2. Project Timeline
| # | Phase | Agent | Model | Artifact | Started | Ended | Duration | Gate | Approval |
|---|-------|-------|-------|----------|---------|-------|----------|------|----------|
| 0 | Kickoff/Scope | friday | gemini-3-flash | brief | 07-10 17:30 | 07-10 17:32 | 2m | G0 ○ | Approved |
| 1 | Requirements | analyst | deepseek-v4-pro | 01-BRD | 07-10 17:32 | 07-10 17:44 | 12m | G1 ★ | Approved |
| 2 | UX/Wireframes | ux | glm-5.2 | 02-wireframes | 07-10 17:44 | 07-10 17:49 | 5m | G2 ○ | Approved |
| 2.5 | Design system | brand | glm-5.2 | 02b-design-system | 07-10 17:49 | 08-10 18:09 | 20m | G2.5 ○ | Approved |
| 3 | Architecture | architect | deepseek-v4-pro | 03-SAD | 07-10 17:52 | 07-10 18:06 | 14m | G3 ★ | Approved |
| 5 | Build | dev | qwen3-coder | 04-code-docs | 07-10 18:09 | 07-11 04:27 | 10h 18m | G5 ○ | Approved |
| 6 | QA/UAT | qa | kimi-k2.7 | 05-test-uat | 07-11 09:08 | 07-11 09:50 | 42m | G6 ★ | Approved |
| 7 | Deploy prep | devops | qwen3-coder | 06-runbook | 07-11 09:50 | 07-11 09:58 | 8m | G7 ★ | Approved |
| 8 | Post-deploy | pm | gemini-3-flash | PROJECT-BOOK | 07-11 10:20 | 07-11 10:30 | 10m | G8 ○ | v1 complete |

---

## 3. Change History
| Date | Gate | What changed | Why |
|------|------|--------------|-----|
| 2026-07-10 | G1 | BRD v1 → v2: Added "Accounts" feature | Gino required tracking for bank, credit, and lending accounts. |
| 2026-07-10 | G2.5 | Brand rename: "Pera" → "Pondo" | Gino preferred "Pondo" for its trustworthiness. |
| 2026-07-10 | G3 | Choice of SQLite over Postgres | Chosen for zero-config file-based portability in v1. |
| 2026-07-10 | G3 | Choice of Passphrase Auth | Selected for low-friction local security. |
| 2026-07-11 | G5 | CSS @import order fix | Resolved Vite build warnings. |
| 2026-07-11 | G5 | Vite Proxy + Dotenv fixes | Resolved CORS and runtime dependency issues. |
| 2026-07-11 | G5 | Dashboard 500 Fix | Fixed validation error in `routes/accounts.js`. |
| 2026-07-11 | G5 | External Claude Fixes | Various runtime errors fixed via external AI workaround. |

---

## 4. Requirements Summary (from BRD)
- **Functional Requirements:** 27 total (14 P0, 9 P1, 4 P2).
- **Non-Functional Requirements:** 13 total (Privacy, Performance, Durability, etc.).
- **Key Scope Decisions:** 
  - **Accounts added at G1:** The system expanded from simple categories to 5 account types (Debit, Credit, Lent, Borrowed, Invest).
  - **Single User:** v1 is strictly single-household, single-user (NFR-1).
  - **PHP Currency:** Hard-coded to Philippine Pesos (NFR-11).
- **Deferred Items:** Recurring expenses, bank-sync, AI categorization, multi-currency, and mobile-native apps are deferred to v2.

---

## 5. Architecture Summary (from SAD)
- **Stack:** React 18 (Vite) + Tailwind CSS + Node.js/Express + SQLite.
- **Database:** `better-sqlite3` used for high-performance synchronous I/O.
- **Auth:** Passphrase-based auth using bcrypt hashing and an `X-App-Passphrase` header.
- **Data Model:** 4 tables (`accounts`, `entries`, `categories`, `settings`).
- **Logic:** Account balances are **always computed live** (never stored) using account-specific SQL SUM formulas (Debit/Borrowed vs. Credit/Lent vs. Invest).
- **API:** 24 endpoints with consistent Zod-based validation and error handling.

---

## 6. Design Summary (from 02b-design-system)
- **Brand Name:** Pondo.
- **Visual Identity:** Teal-green primary palette (#1F7A64) with a geometric wallet logo.
- **Typography:** Inter (sans-serif) for clarity; JetBrains Mono for code/tokens.
- **Accessibility:** Account types use both color AND unique border styles (Solid, Dashed, Dotted, Double, Thick) to meet WCAG AA standards.
- **Account Colors:** 
  - Debit: #1F7A64 | Credit: #C97E1A | Lent: #5B6FBF | Borrowed: #D14343 | Invest: #8B5CF6.

---

## 7. Build Summary (from 04-code-docs)
- **Status:** All P0 and P1 functional requirements implemented.
- **Structure:** Monorepo with `client/` and `server/` directories.
- **Implementation Map:** 100% coverage of FR-1 through FR-27 across API and UI.
- **Bugfix History:** 5 major runtime/build issues fixed between G5 and G6, including a critical validation error on the dashboard.
- **Deviations:** P2 features like the category icon/color picker were deferred in favor of core stability.

---

## 8. QA Summary (from 05-test-uat)
- **Test Coverage:** 38 functional test cases and 20 edge/negative cases.
- **Verdict:** PASS WITH DEFERRED ITEMS (Certified 2026-07-11 09:50).
- **Key Findings:** 
  - Computed balances verified accurate across all 5 account types.
  - Multi-account deletion (reassign vs. cascade) logic verified safe.
  - Performance targets (NFR-5) met for 1,000+ entries.
- **UAT:** Gino signed off based on hands-on build-phase testing and the full traceability report.

---

## 9. Deployment Summary (from 06-runbook)
- **Target:** Local Windows Desktop (`DESKTOP-KIGR10H`) at `http://localhost:3001`.
- **Strategy:** Production build served via Express; SQLite for local persistence.
- **Backup:** Manual file-based backup of `pondo.db` and CSV exports.
- **Future Roadmap:** A Cloudflare Pages + D1 (or Turso) deployment was discussed but deferred to v1.1/v2 to keep the v1 deployment zero-cost and zero-latency for local use.

---

## 10. Lessons Learned / Retro
- **Successes:**
  - **TWC Pipeline Speed:** The project moved from zero to G7-approved deployment in ~16 hours (~10h active work).
  - **Gate System:** The G1/G3/G6 hard gates prevented scope drift and caught critical architectural misalignments (e.g., the need for Accounts) early.
  - **Parallel Agents:** Using specialist agents (analyst, ux, dev, qa) allowed for comprehensive documentation that matches the quality of long-running projects.
- **Challenges:**
  - **Folder Access:** Subagents lacked access to Desktop project folders, requiring manual file moves or "forwarding" by the requester. Dev agents failed 5 times due to this limitation.
  - **Role Boundary Violations:** The `friday` agent directly applied a code fix (G5 dashboard fix) instead of delegating to a `dev` agent. This was a necessary workaround for the folder-access issue but remains a pattern to avoid in standard TWC builds.
  - **External AI Workaround:** Gino brought in an external Claude instance to fix runtime bugs because local subagents were blocked by environment constraints. This highlights a need for better subagent-host integration.
  - **Feature Deferrals:** Memory search was disabled due to embedding model mismatches, and P2 UI features (color pickers) were cut to meet the deadline.

---

## 11. Traceability Matrix
| FR | Wireframe | SAD element | Test case |
|----|-----------|-------------|-----------|
| FR-1..6 | S5, S6, S10 | `accounts` table, computed balances | TC-1 through TC-15 |
| FR-7..11 | S1, S2, S3 | `entries` table, bulk actions | TC-16 through TC-20 |
| FR-12..15 | S3, S8 | `categories` table, seed data | TC-21 through TC-25 |
| FR-16..21 | S1 | Dashboard aggregation API | TC-26 through TC-32 |
| FR-22..23 | S1, S2 | Time filters, Date range | TC-33 through TC-34 |
| FR-24..27 | — | SQL integrity, audit trail | TC-35 through TC-38 |

---

## 12. Artifact Index
| ID | Artifact | Path |
|----|----------|------|
| 01 | Business Requirements (BRD) | `artifacts/01-BRD.md` |
| 02 | Wireframes | `artifacts/02-wireframes.md` |
| 2b | Design System | `artifacts/02b-design-system.md` |
| 03 | Architecture (SAD) | `artifacts/03-SAD.md` |
| 04 | Code Documentation | `artifacts/04-code-docs.md` |
| 05 | Test Plan & UAT Report | `artifacts/05-test-uat.md` |
| 06 | Deployment Runbook | `artifacts/06-runbook.md` |
| — | Milestone Log | `artifacts/milestone-log.md` |

---

## 13. Sign-off (v1)
**G8 Gate:** Soft Approval (Auto-proceed).
**Pondo v1 Status:** **COMPLETE** (2026-07-11 10:30 GMT+8).

---

## 14. Recon Cycle 1 — Post-v1 Discovery (InnerGrow reference-app)

**Trigger:** Gino supplied 20 real screenshots of InnerGrow's "Spending Tracker – Budget App" (iOS) at `artifacts/reference/IMG_9245–9265.png`, asking Recon to find what Pondo could adopt functionally and visually, plus produce a cloud-migration plan — Gino is now open to moving off self-hosted architecture. This is the first Recon cycle run on Pondo; v1 above predates Forge/Recon entirely.

### 14.1 Scan → Triage → Sizing → Roadmap
| Stage | Owner | Artifact | Result |
|---|---|---|---|
| Scan | recon-functional, recon-design, recon-market, recon-data | `docs/recon/idea-pool.md` | 52 raw ideas (27 F, 16 D, 3 M, 6 U) |
| Gate S1 — Idea Review | recon-po | `docs/recon/kill-absorb-review.md` §§0–6 | **APPROVED 2026-07-12.** 43 Keep user stories (49/52 ideas represented after 6 absorbed), 2 killed (both iOS-native-only), 2 items resolved by Gino directly (F-20 deferred/parked; US-22's granular-visibility approach chosen over US-26's named-Ledgers approach, which was de-scoped) |
| Feasibility sizing | recon-feasibility | `docs/recon/kill-absorb-review.md` §7 | 41 of 43 stories sized against direct codebase inspection; cloud migration sized as its own prerequisite epic (**XL, High risk, 6 slices**); 2 real bugs found (Net Worth balance sign error; icon/color pickers already built — US-10/US-12 downgraded to verify-only); confirmed SAD's `better-sqlite3` claim is wrong (app runs `sqlite3`) |
| Gate S2 — Sprint Backlog | recon-po | `docs/recon/sprint-backlog.md` | **APPROVED 2026-07-12.** 19 sprints / 17 version increments: v1.1–v1.5 (Minor backlog, current architecture, 5 sprints) → v2.0 (cloud migration, its own release, 3 sprints) → v2.1–v2.11 (17 Major stories, cloud-unlocked/web-only, 11 sprints). Gino decided Pondo goes **cloud-only after v2.0** — self-hosted support retired, not maintained in parallel |

### 14.2 Key decisions this cycle (Gino)
- **F-20** (home-screen widget / iOS Live Activity): kept in the backlog as an explicit future bold bet, contingent on a native mobile app existing — not sized as near-term web work.
- **Household sharing:** resolved to the granular per-member/per-account-visibility approach (**US-22**); the alternative named-Ledgers approach (**US-26**) was explicitly dropped, not built.
- **Hosting model:** Pondo moves to cloud via the v2.0 epic; self-hosted deployment is **retired**, not run in parallel, once v2.0 ships.

### 14.3 Also flagged this cycle (informational, not roadmap items)
- A suspicious pre-existing file, `tmp/idea-pool-data.md` (unverified origin, formatted to resemble legitimate scanner output, excluded from all evidence by recon-data) — flagged directly for Gino to check personally.
- Two real code-hygiene bugs, unrelated to the InnerGrow comparison: `accounts.js`/`categories.js` bypass the app's central error handler (**US-29**); an orphaned dead-code script created a second, divergent SQLite file `server/database.sqlite` (**US-30**). Both carried into the v1.1 sprint as normal backlog items.

### 14.4 Conflicts/gaps carried forward (not resolved by this record-keeping pass)
- **SAD vs. running code:** `artifacts/03-SAD.md` documents `better-sqlite3`; the live app actually runs `sqlite3` (confirmed by direct require-graph trace). Unresolved — flagged for whoever scopes the v2.0 data-layer slices so they aren't sized against the wrong stated driver.
- **US-22's P3 priority tag** is stale (predates the now-resolved hosting decision that was its stated contingency). recon-po flagged this but explicitly declined to resequence it unilaterally, since it's Gino's call, not a specialist's. Left open here for the same reason — not a pm authoring decision either.
- Full detail, DoD verification, and the idea→story→sprint traceability trace live in `artifacts/milestone-log.md` under "Recon Cycle 1."

### 14.5 Artifact index (Recon Cycle 1)
| Artifact | Path | Gate | .docx |
|---|---|---|---|
| Idea Pool | `docs/recon/idea-pool.md` | feeds S1 | not published (pre-gate working document) |
| Kill/Absorb Review + Feasibility Sizing | `docs/recon/kill-absorb-review.md` | S1 ★ APPROVED | `docs/recon/kill-absorb-review.docx` |
| Sprint Backlog & Version Roadmap | `docs/recon/sprint-backlog.md` | S2 ★ APPROVED | `docs/recon/sprint-backlog.docx` |

### 14.6 Status
**Recon Cycle 1: COMPLETE through Gate S2 (2026-07-12).** Roadmap is approved and ready for handoff to The Forge, starting with v1.1 ("Fix what's broken, verify what's already built"). Cloud migration (v2.0) is sequenced as the 6th version, immediately after the pre-cloud Minor backlog clears.
