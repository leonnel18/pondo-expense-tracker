# Pondo v2.0 Sprint 2 — Multi-User Auth: Requirements Addendum

**Document type:** BRD addendum (not a full rewrite) · **Author:** analyst (via FRIDAY's OpenClaw Workshop Crew, `ollama/deepseek-v4-pro:cloud`) · **Date:** 2026-07-14 · **Feeds into:** architecture design pass (next) · **Parent:** `artifacts/01-BRD.md` + `docs/recon/sprint-backlog.md` Gate S2

---

## 1. Context & current state

### 1.1 What exists today

- **Auth mechanism:** a single shared passphrase, bcrypt-hashed, stored in a Postgres `settings` table as `passphrase_hash`. Every API request carries it as an `X-App-Passphrase` header. The client stores it in `sessionStorage` after the user enters it once per browser session. There is no `users` table, no per-user identity, no sessions, no JWT, no token refresh.
- **Data layer:** Supabase Postgres, accessed via `@supabase/supabase-js` with the **service-role key** — meaning all server-side queries bypass Row-Level Security entirely. RLS is enabled on all 4 tables (`accounts`, `categories`, `entries`, `settings`) but has zero policies defined — it's a no-op today.
- **Hosting:** Vercel serverless functions (`api/index.js` → Express app), publicly reachable on the internet. The single-shared-passphrase model is a real exposure on a public app, not just a local-network convenience.
- **Client:** React/Vite SPA. No login screen exists — the passphrase is prompted inline by `api.js`'s `buildHeaders()` reading from `sessionStorage`. If the passphrase is missing or wrong, the API returns 401 and the UI shows an error. There is no sign-up, no sign-in, no session management, no logout.

### 1.2 What the sprint backlog says

From `docs/recon/sprint-backlog.md` §4, v2.0 Sprint 2:

> User table, session/JWT or magic-link auth, full replacement of the hardcoded `PASSPHRASE` constant in `client/src/lib/api.js` — the single largest sub-piece and the true prerequisite for US-22 (household sharing, multi-user visibility, sequenced later in the roadmap).

Sized **L (5 pts)**, deliberately isolated in its own sprint "for focus and QA headroom, not run at capacity."

### 1.3 What this addendum covers

This document defines the *what* for the auth slice only. It does not cover:
- Data-access layer migration (Slice 4) — already done (Supabase cutover)
- Data migration script (Slice 5) — already done
- Ops/deployment rework (Slice 6) — already done (Vercel)
- Household sharing / per-member visibility (US-22, v2.9)
- Any other feature work

---

## 2. Who needs to authenticate and why

### 2.1 Current state

Today: one household, one shared passphrase. Everyone who knows the passphrase gets full access to all data. There is no concept of "who logged this entry" or "whose account is this."

### 2.2 Future state (US-22, v2.9)

US-22 wants per-member identity — each household member logs in as themselves, entries are attributable to a person, and account visibility can be scoped per member.

### 2.3 Recommendation: lay the foundation now, don't punt

**Build the `users` table and per-user identity in this slice.** Do not ship a minimal "just replace the passphrase with a JWT and call it done" auth layer that US-22 then has to rip out and rebuild.

Rationale:
- The sprint backlog already calls this "the true prerequisite for US-22" — a prerequisite that doesn't model users isn't actually a prerequisite.
- Adding a `users` table with a `user_id` foreign key on `accounts` (nullable initially, populated later by US-22) costs very little now and avoids a second auth rewrite.
- Supabase Auth gives us user identity for free — the `auth.users` table exists whether we use it or not. The question is whether we wire our own `public.users` mirror table and `user_id` FKs now or later. Now is cheaper.

**What "laying the foundation" means concretely for this slice:**
- A `public.users` table (mirroring Supabase `auth.users` via trigger or application-level sync)
- A `user_id` column on `accounts` (nullable, defaulting to the single user for existing data)
- The auth middleware attaches `req.user` (user ID + email) to every request
- All queries remain un-scoped by user in this slice (they still use the service-role key) — user-scoping is US-22's job
- The `user_id` FK exists so US-22 can add `WHERE user_id = $1` without a schema migration

**Open question #1:** Should `entries` and `categories` also get a `user_id` FK in this slice, or only `accounts`? Recommendation: `accounts` only — entries are already scoped via `account_id`, categories are household-wide. Confirm or override.

---

## 3. Auth provider decision: Supabase Auth (recommended)

### 3.1 The case for Supabase Auth

Pondo already uses Supabase Postgres. Supabase ships a built-in Auth product that:
- Provides email/password sign-up and sign-in out of the box
- Provides magic-link (passwordless) sign-in out of the box
- Provides OAuth (Google, GitHub, etc.) if desired later
- Issues JWTs natively, with built-in token refresh
- Integrates with Supabase's Row-Level Security — `auth.uid()` is available in RLS policies
- Has a client-side SDK (`@supabase/supabase-js`) that handles session persistence, token refresh, and auth state — the same package already in `server/package.json`
- Is free for up to 50,000 monthly active users

### 3.2 The alternative: roll our own

Custom JWT + bcrypt + session system requires: a `users` table, JWT signing/verification middleware, token refresh logic, password reset flow (email sending, token generation, expiry), session invalidation, all tested for security edge cases. This is the "L (5 pts)" estimate's worst-case path.

### 3.3 Recommendation

**Use Supabase Auth for identity and session management.** Not a foregone conclusion — a recommendation based on the Supabase client already being in the dependency tree.

**Open question #2:** Confirm Supabase Auth as the provider, vs. Auth0/Clerk/Firebase/custom. The requirements below hold regardless — only the implementation surface changes.

---

## 4. Functional requirements

### 4.1 — User Identity & Registration

| ID | Requirement | Priority | Acceptance criterion |
|----|-------------|:--------:|----------------------|
| **FR-A1** | Sign up with email/password | **P0** | Valid, unregistered email + password ≥8 chars creates the user. Confirmation email sent if enabled, else immediate sign-in. Duplicate email rejected with a clear error. |
| **FR-A2** | Sign in with email/password | **P0** | Valid credentials return a session (JWT). Invalid credentials return a generic "Invalid email or password" — does not disclose whether the email exists. Redirects to dashboard on success. |
| **FR-A3** | Magic-link sign-in | **P1** | Requesting a link for a registered email sends a single-use link expiring in 1 hour. Expired/used link shows a clear error with a resend option. Unregistered-email requests give the same UX (no disclosure). |
| **FR-A4** | Password reset | **P1** | Reset link single-use, expires in 1 hour. New password ≥8 chars invalidates the old one immediately. No disclosure of registration status. |
| **FR-A5** | Sign out | **P0** | Session token invalidated; subsequent requests with the old token return 401; client clears local session data; redirect to sign-in. |
| **FR-A6** | Session persistence across browser restarts | **P0** | Reopening the app within the session lifetime loads the dashboard directly, no re-auth. |

### 4.2 — Session & Token Management

| ID | Requirement | Priority | Acceptance criterion |
|----|-------------|:--------:|----------------------|
| **FR-A7** | JWT validation on every request | **P0** | Valid non-expired token → proceed. No token → 401. Expired token → 401 with a distinguishable code (client triggers refresh). Tampered token → 401. |
| **FR-A8** | Automatic token refresh | **P1** | Client refreshes silently when the access token nears expiry (<5 min), transparent to the user. Expired/revoked refresh token → redirect to sign-in. |
| **FR-A9** | `req.user` on every authenticated request | **P0** | After JWT validation, `req.user` contains at minimum `id` (UUID) and `email`, available to all downstream handlers. |

### 4.3 — Migration from Shared Passphrase

| ID | Requirement | Priority | Acceptance criterion |
|----|-------------|:--------:|----------------------|
| **FR-A10** | Shared passphrase retired | **P0** | `X-App-Passphrase` ignored/400 after cutover. `passphrase_hash` row deleted. `POST /api/set-passphrase` and passphrase-related `/api/setup` logic removed. |
| **FR-A11** | Existing data assigned to an initial admin user | **P0** | All existing accounts/categories/entries/settings associated with the first user who signs up (or a migration-created admin). No orphaned data. `user_id` populated on existing `accounts` rows. |
| **FR-A12** | Re-onboarding flow for existing users | **P0** | First access after cutover shows: explanation that Pondo now uses individual accounts, a sign-up form, and immediate access to existing data after sign-up. Subsequent users see sign-in. No passphrase referenced. |

### 4.4 — Client-Side Auth Flow

| ID | Requirement | Priority | Acceptance criterion |
|----|-------------|:--------:|----------------------|
| **FR-A13** | Auth gate on app load | **P0** | Valid session → dashboard directly. No session → sign-in screen. Expired session → refresh attempted; success → dashboard, failure → sign-in. |
| **FR-A14** | Protected routes | **P0** | Unauthenticated access to any protected route redirects to sign-in; post-sign-in redirects back to the originally requested route. |
| **FR-A15** | Auth state available to all components | **P1** | React context (or equivalent) exposes `id`, `email`, `isAuthenticated` without prop-drilling; email shown in header/user menu. |

---

## 5. Non-functional requirements (auth-specific)

| ID | Category | Requirement |
|----|----------|-------------|
| **NFR-A1** | Security — password policy | ≥8 characters, no other complexity mandate (NIST SP 800-63B: length over complexity). |
| **NFR-A2** | Security — session lifetime | Access tokens 1hr; refresh tokens 7 days inactivity (Supabase Auth defaults). Active users never interrupted; 7-day-idle users re-authenticate. |
| **NFR-A3** | Security — brute-force protection | Rate-limit sign-in attempts (Supabase Auth default: 5/email/hour, or equivalent if custom). |
| **NFR-A4** | Security — token storage | No JWTs in `localStorage` (XSS risk). httpOnly cookie or secure memory only. |
| **NFR-A5** | Privacy — email disclosure | Sign-in/up/magic-link/reset never disclose whether an email is registered — identical generic response regardless. |
| **NFR-A6** | Performance — auth latency | Server JWT validation ≤50ms median. Client token refresh ≤2s p95. Sign-in/up ≤3s p95 (excluding email delivery). |
| **NFR-A7** | Error handling — no leakage | Auth errors never expose user existence, token-validity detail (to unauthenticated callers), or internal state. |
| **NFR-A8** | Supabase dependency | Graceful degradation if Supabase Auth is unavailable — server returns 503 with a clear message, client shows retry, no crash/blank screen. |

---

## 6. MVP boundary for this slice

### In scope (must ship in Sprint 2)
User identity (`public.users`, nullable `user_id` FK on `accounts`, Supabase Auth email/password) · Session management (JWT middleware, `req.user`, client persistence + refresh) · Sign-in UX (sign-in/up/out, auth gate, protected routes) · Password reset · Magic link (P1) · Migration (retire passphrase, assign existing data, re-onboarding) · Client auth state (React context, email in header).

### Explicitly out of scope (deferred to US-22 or later)
Per-user data scoping (queries stay unscoped, service-role key) · Multi-user household / invite flow · Role-based permissions · OAuth · Email template customization · Account deletion/de-provisioning · RLS policies (remain enabled-but-toothless) · `user_id` on `entries`/`categories`.

---

## 7. Open questions (for Gino)

| # | Question | Recommendation | Impact if deferred |
|---|----------|----------------|-------------------|
| **Q1** | `user_id` FK on `entries`/`categories` too, or just `accounts`? | **Accounts only.** | Low — standard migration to add later. |
| **Q2** | Confirm Supabase Auth as provider? | **Yes** — already in dependency tree, free tier covers scale. | High — decide before architecture design starts. |
| **Q3** | Magic-link: P0 or P1? | **P1** — include if ≤1 day of work, else defer. | Low — additive, not structural. |
| **Q4** | Email confirmation required on sign-up? | **No — immediate access for v2.0** (less friction for re-onboarding). | Low — a config toggle later. |
| **Q5** | If the first person to sign up after cutover isn't the original data owner, they get the existing data. Acceptable? | **Yes, with clear re-onboarding copy** stating "first account created owns the existing data." No claim-code flow this slice. | Medium — real edge case for multi-person households; documented, not solved. |
| **Q6** | Remove old `/api/setup`/`/api/set-passphrase` entirely, or deprecate? | **Remove entirely** — dead code otherwise. | Low. |

---

## 8. Requirement summary

| Priority | Count | IDs |
|:--------:|:-----:|-----|
| **P0** | 10 | FR-A1, FR-A2, FR-A5, FR-A6, FR-A7, FR-A9, FR-A10, FR-A11, FR-A12, FR-A13, FR-A14 |
| **P1** | 5 | FR-A3, FR-A4, FR-A8, FR-A15 |
| **Total FRs** | **15** | FR-A1 – FR-A15 |
| **NFRs** | **8** | NFR-A1 – NFR-A8 |
| **Open questions** | **6** | Q1–Q6 |

---

## 9. Sign-off

- **Reviewed by Gino on:** 2026-07-14
- **Notes:** Approved alongside `02-architecture-design.md`. Implementation (Phase 4) not yet authorized — see architecture design's approval note.

---

*Produced via FRIDAY's OpenClaw Workshop Crew (`analyst`, `ollama/deepseek-v4-pro:cloud`), dispatched and reviewed by DARKLING within this session. Its OpenClaw workspace is sandboxed and could not read the live project files directly (confirmed: `ENOENT` on `artifacts/01-BRD.md`, `docs/recon/sprint-backlog.md`, `server/middleware/auth.js`) — all context above came from the dispatch brief, not independent file access. Content reviewed against the real codebase before being copied here.*
