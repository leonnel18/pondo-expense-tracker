# Pondo v2.0 Sprint 2 — Multi-User Auth: Architecture Design

**Document type:** Software Architecture Document (SAD) — auth slice only  
**Author:** architect (via FRIDAY's OpenClaw Workshop Crew, `ollama/deepseek-v4-pro:cloud`)  
**Date:** 2026-07-14  
**Feeds from:** `01-requirements-addendum.md` (analyst, same date)  
**Feeds into:** implementation pass (next)  
**Parent:** `artifacts/01-BRD.md` + `docs/recon/sprint-backlog.md` Gate S2  
**Approval:** APPROVED by Gino, 2026-07-14 (gate equivalent to G3 — new auth model on a live public app)

---

## Table of Contents

1. [Architectural decisions & analyst-assumption review](#1-architectural-decisions--analyst-assumption-review)
2. [Schema changes](#2-schema-changes)
3. [Server-side middleware](#3-server-side-middleware)
4. [API surface](#4-api-surface)
5. [Client-side integration](#5-client-side-integration)
6. [Migration & cutover plan](#6-migration--cutover-plan)
7. [Error code taxonomy](#7-error-code-taxonomy)
8. [Environment & configuration](#8-environment--configuration)
9. [Risk register](#9-risk-register)

---

## 1. Architectural decisions & analyst-assumption review

### 1.1 Decisions ratified (analyst recommendations confirmed)

| Decision | Verdict | Rationale |
|----------|---------|-----------|
| Supabase Auth as provider | **Confirmed** | `@supabase/supabase-js` already in `server/package.json` (v2.39.0). Free tier covers 50k MAU. Avoids building custom JWT signing, refresh, password-reset, and magic-link infrastructure. |
| `public.users` table + `user_id` FK on `accounts` now | **Confirmed** | The analyst's recommendation is architecturally sound. Adding the FK now costs one migration and avoids a second schema change later. See §2 for exact DDL. |
| Queries remain unscoped (service-role key) | **Confirmed** | No change to `server/db/supabase.js` or any query function. The service-role key bypasses RLS, which is correct for this slice. RLS stays enabled-but-toothless. |
| `user_id` on `accounts` only (not `entries`/`categories`) | **Confirmed** | Q1 resolved. `entries` are already scoped via `account_id` FK; `categories` are household-wide. Adding `user_id` to `entries`/`categories` now would be dead weight with no consumer. US-22 can add them later with a standard migration. |
| First sign-up post-cutover owns existing data | **Confirmed** | Q5 resolved. See §6.3 for the exact mechanism. No claim-code flow. |
| Remove `/api/setup` and `/api/set-passphrase` entirely | **Confirmed** | Q6 resolved. No deprecation period — these are passphrase-specific endpoints with no value after cutover. |
| Email confirmation disabled for v2.0 | **Confirmed** | Q4 resolved. Immediate access reduces re-onboarding friction. Can be toggled later in Supabase dashboard. |
| Magic-link as P1 | **Confirmed** | Q3 resolved. Additive, not structural. Design includes the endpoint surface but implementation can be deferred. |

### 1.2 Analyst assumptions that need architectural qualification

**Assumption: "service-role key bypasses RLS, so we don't need to touch RLS."**  
*Qualification:* Correct for this slice, but there's a subtlety. The service-role client (`server/db/supabase.js`) is used for all data queries. The new auth middleware will use a **separate Supabase client instance** initialized with the **anon key** (or a dedicated JWT-secret client) for token verification only — it never touches data. The service-role data client remains unchanged. This two-client pattern is standard Supabase architecture and avoids accidentally downgrading data-access privileges.

**Assumption: "JWT validation ≤50ms median (NFR-A6)."**  
*Qualification:* Supabase Auth JWTs are signed with HS256 (shared secret). Verification is a single HMAC operation — sub-millisecond in Node.js. The 50ms budget is generous and will be met trivially. The real latency driver is the network round-trip to Supabase Auth's `/auth/v1/user` endpoint if we choose to validate by calling Supabase rather than verifying locally. **Decision: verify JWTs locally** using the JWT secret (available from Supabase dashboard → Project Settings → API → JWT Secret). This eliminates the network dependency and keeps validation well under 1ms.

**Assumption: "httpOnly cookie or secure memory only for token storage (NFR-A4)."**  
*Qualification:* Supabase Auth's client SDK (`@supabase/supabase-js` on the browser) stores the session in `localStorage` by default. This violates NFR-A4. **Decision: configure the client-side Supabase client with `storage` set to a cookie-based adapter, or use Supabase's `auth-helpers` pattern.** The design below uses the `@supabase/ssr` package pattern (cookie-based session management) which stores tokens in httpOnly cookies via the server, not in browser-accessible storage. This is the only Supabase-recommended pattern that satisfies NFR-A4 for SPAs. See §5.1 for details.

**Assumption: "Graceful degradation if Supabase Auth is unavailable (NFR-A8)."**  
*Qualification:* With local JWT verification, the auth middleware does not call Supabase Auth on every request — only on sign-in/up/refresh. If Supabase Auth is down, existing sessions with valid tokens continue to work. New sign-ins fail with a 503. This is the best possible degradation profile and is designed into the middleware below.

---

## 2. Schema changes

### 2.1 Design rationale: `public.users` mirror table vs. relying solely on `auth.users`

Supabase's `auth` schema is **not directly queryable** by the `public` schema (it lives in a separate schema with restricted permissions). While you *can* expose `auth.users` via a view or grant, the standard Supabase pattern is a `public.users` (or `public.profiles`) table that mirrors `auth.users` via a trigger on `auth.users` insert. This gives us:

- A table we fully control (add columns later for display name, avatar, household membership, etc.)
- A clean join target for `accounts.user_id`
- No dependency on Supabase's internal schema (which can change between versions)

**Decision: `public.users` mirror table with an `ON INSERT` trigger on `auth.users`.**

### 2.2 DDL — Migration 001: `add_users_and_account_user_id`

```sql
-- ============================================================
-- Migration: 001_add_users_and_account_user_id
-- Sprint: v2.0 Sprint 2 (Multi-User Auth)
-- Run against: Supabase Postgres (via Supabase SQL Editor or migration tool)
-- Rollback: see §6.5
-- ============================================================

BEGIN;

-- 1. Create public.users mirror table
CREATE TABLE IF NOT EXISTS public.users (
    id          UUID PRIMARY KEY,              -- mirrors auth.users.id
    email       TEXT NOT NULL,                  -- mirrors auth.users.email (denormalized for query convenience)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS on public.users (consistent with other tables — toothless for now)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Trigger: auto-create public.users row when a new auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists (idempotent re-run safety)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Add nullable user_id FK to accounts
ALTER TABLE public.accounts
    ADD COLUMN IF NOT EXISTS user_id UUID
    REFERENCES public.users(id)
    ON DELETE SET NULL;  -- soft-delete safety: if a user is deleted, accounts become unowned, not cascade-deleted

-- 5. Index for future user-scoped queries (US-22)
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- 6. Backfill existing accounts: assign to the first user in public.users (if any)
--    This is the "first sign-up owns existing data" mechanism (FR-A11, Q5).
--    If no user exists yet (pre-cutover), this is a no-op — the backfill runs
--    as part of the cutover script (see §6.3).
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    SELECT id INTO first_user_id FROM public.users ORDER BY created_at ASC LIMIT 1;
    IF first_user_id IS NOT NULL THEN
        UPDATE public.accounts SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
END $$;

COMMIT;
```

**Key design choices:**

- **`ON DELETE SET NULL`** on the FK: If a user is ever deleted (out of scope for v2.0, but defensive), accounts become unowned rather than cascade-deleted. This prevents accidental data loss. US-22 can tighten this later.
- **`SECURITY DEFINER`** on the trigger function: The trigger runs as the function owner (typically `postgres` or the migration user), which has permission to insert into `public.users` even though the `auth` schema trigger context might not.
- **Backfill in the migration itself**: The `DO $$` block at the end is a best-effort backfill. If the migration runs *before* any user signs up, it's a no-op. If it runs *after* (e.g., during a re-run), it catches up. The definitive backfill happens in the cutover script (§6.3).
- **No `user_id` on `entries` or `categories`**: Confirmed per Q1. `entries` join through `accounts.account_id → accounts.user_id`. `categories` are household-wide.

### 2.3 What does NOT change

- `entries`, `categories`, and `settings` tables: zero schema changes.
- RLS: stays enabled on all tables, zero policies. No change.
- `passphrase_hash` row in `settings`: **deleted during cutover** (see §6.3), not in this migration. The migration only adds columns; it never deletes data.

---

## 3. Server-side middleware

### 3.1 Two-client architecture

The server will use **two separate Supabase client instances**:

| Client | Key | Purpose | File |
|--------|-----|---------|------|
| **Data client** | Service-role key | All data queries (unchanged) | `server/db/supabase.js` (unchanged) |
| **Auth client** | Anon key + JWT secret | Token verification, user lookup | `server/lib/supabase-auth.js` (new) |

The data client is unchanged. The auth client is a thin wrapper that provides `verifyToken(token)` → `{ id, email }` using local JWT verification.

### 3.2 New file: `server/lib/supabase-auth.js`

```javascript
// Supabase Auth utilities — JWT verification and user context
// Uses LOCAL verification (HS256 + JWT secret) — no network call to Supabase Auth per request.
// This satisfies NFR-A6 (≤50ms median) and NFR-A8 (works when Supabase Auth API is down).

const jwt = require('jsonwebtoken');  // ADD to server/package.json dependencies

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET is required for JWT verification');
}

/**
 * Verify a Supabase-issued JWT and return the user payload.
 * Supabase JWTs are HS256-signed with the project JWT secret.
 *
 * @param {string} token - Raw JWT string (from Authorization header)
 * @returns {{ id: string, email: string, aud: string, exp: number, iat: number }} User payload
 * @throws {Error} With .code property for distinguishable error handling (FR-A7)
 */
function verifyToken(token) {
    try {
        const payload = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: process.env.SUPABASE_URL,  // Supabase JWTs have iss = project URL
            // audience: 'authenticated' is the default Supabase aud, but we validate it below
        });

        // Supabase access tokens have aud === 'authenticated'
        if (payload.aud !== 'authenticated') {
            const err = new Error('Invalid token audience');
            err.code = 'TOKEN_TAMPERED';
            throw err;
        }

        // Ensure required claims exist
        if (!payload.sub || !payload.email) {
            const err = new Error('Token missing required claims');
            err.code = 'TOKEN_TAMPERED';
            throw err;
        }

        return {
            id: payload.sub,       // Supabase user UUID
            email: payload.email,
            aud: payload.aud,
            exp: payload.exp,
            iat: payload.iat,
        };
    } catch (err) {
        // If we already set a code, re-throw
        if (err.code) throw err;

        // Map jwt.verify errors to distinguishable codes (FR-A7)
        if (err.name === 'TokenExpiredError') {
            const e = new Error('Token has expired');
            e.code = 'TOKEN_EXPIRED';
            throw e;
        }
        if (err.name === 'JsonWebTokenError') {
            const e = new Error('Token is invalid or tampered');
            e.code = 'TOKEN_TAMPERED';
            throw e;
        }
        if (err.name === 'NotBeforeError') {
            const e = new Error('Token not yet active');
            e.code = 'TOKEN_TAMPERED';
            throw e;
        }
        // Unknown error — treat as tampered (fail closed)
        const e = new Error('Token verification failed');
        e.code = 'TOKEN_TAMPERED';
        throw e;
    }
}

module.exports = { verifyToken };
```

**Dependency addition:** `jsonwebtoken` must be added to `server/package.json`:
```bash
npm install jsonwebtoken
```

### 3.3 Replacement: `server/middleware/auth.js`

The existing `auth.js` (bcrypt passphrase check) is **replaced entirely**. The new middleware:

```javascript
// Auth middleware — Supabase JWT validation
// Replaces the old bcrypt passphrase middleware.
// Attaches req.user = { id, email } on success (FR-A9).
// Returns distinguishable error codes (FR-A7).

const { verifyToken } = require('../lib/supabase-auth');

const authMiddleware = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                error: {
                    code: 'NO_TOKEN',
                    message: 'Authentication required',
                },
            });
        }

        // Expect "Bearer <token>" format
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({
                error: {
                    code: 'TOKEN_TAMPERED',
                    message: 'Invalid authorization header format',
                },
            });
        }

        const token = parts[1];

        // Verify the JWT locally (no network call)
        let user;
        try {
            user = verifyToken(token);
        } catch (verifyErr) {
            // Map distinguishable error codes to HTTP responses (FR-A7)
            const code = verifyErr.code || 'TOKEN_TAMPERED';
            const status = code === 'TOKEN_EXPIRED' ? 401 : 401;

            return res.status(status).json({
                error: {
                    code,
                    message: code === 'TOKEN_EXPIRED'
                        ? 'Token has expired'
                        : 'Invalid or tampered token',
                },
            });
        }

        // Attach user to request (FR-A9)
        req.user = {
            id: user.id,
            email: user.email,
        };

        next();
    } catch (error) {
        // Catch-all for unexpected errors (e.g., JWT secret misconfiguration)
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            error: {
                code: 'AUTH_INTERNAL_ERROR',
                message: 'Authentication service error',
            },
        });
    }
};

module.exports = authMiddleware;
```

### 3.4 Middleware application in `server/server.js`

The existing `app.use('/api', authMiddleware)` line stays — the middleware is a drop-in replacement. However, **auth routes must be exempted** from the middleware since sign-up/sign-in/magic-link/password-reset are unauthenticated by definition.

**Change in `server/server.js`:**

```javascript
// OLD (line ~28):
// app.use('/api', authMiddleware);

// NEW:
// Auth routes are unauthenticated — apply before the global auth middleware
app.use('/api/auth', authRouter);  // new router, see §4

// Apply auth middleware to all OTHER API routes
app.use('/api', (req, res, next) => {
    // Skip auth for /api/auth/* and /api/health
    if (req.path.startsWith('/auth') || req.path === '/health') {
        return next();
    }
    authMiddleware(req, res, next);
});
```

Alternatively, apply `authMiddleware` explicitly to each protected router rather than globally. The global approach with a path-skip is simpler and less error-prone (no risk of forgetting to protect a new route).

### 3.5 `req.user` shape

```typescript
// TypeScript-style definition for documentation
interface RequestUser {
    id: string;     // UUID — Supabase auth.users.id
    email: string;  // User's email address
}
```

Downstream handlers access `req.user.id` and `req.user.email`. No other fields are attached in this slice. US-22 can extend this (e.g., `display_name`, `household_id`) by adding columns to `public.users` and enriching the middleware.

---

## 4. API surface

### 4.1 New endpoints: `server/routes/auth.js`

All auth endpoints are under `/api/auth`. They are **not** protected by the JWT middleware (they are the entry point for obtaining a token).

The server does **not** handle sign-up/sign-in directly — these are Supabase Auth operations. The server provides **proxy endpoints** that:

1. Call Supabase Auth's REST API (`POST /auth/v1/signup`, `POST /auth/v1/token?grant_type=password`) using the **anon key** (not the service-role key — the anon key is the correct key for client-facing auth operations).
2. Return Supabase's response to the client, with error normalization (NFR-A5, NFR-A7).
3. For sign-in/up, set the session in an httpOnly cookie (NFR-A4) rather than returning the token in the response body.

**Why proxy through our server instead of calling Supabase directly from the client?**
- NFR-A4 requires httpOnly cookie storage. The browser client cannot set httpOnly cookies; only the server can.
- Error normalization: we control the error shape and ensure no email-existence leakage (NFR-A5).
- Single origin: all API calls go to our Vercel domain, avoiding CORS complexity with Supabase's auth domain.

#### 4.1.1 `POST /api/auth/signup`

**Purpose:** Register a new user (FR-A1).  
**Auth:** None (unauthenticated).  
**Request body:**
```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

**Validation (server-side, before calling Supabase):**
- `email`: non-empty, looks like an email (basic regex)
- `password`: string, ≥8 characters (NFR-A1)

**Server logic:**
1. Validate input. Return 400 on invalid.
2. Call Supabase Auth: `POST {SUPABASE_URL}/auth/v1/signup` with `{ email, password }` using the **anon key**.
3. Supabase response:
   - **Success (200):** Returns `{ user, session }`. The session contains `access_token` and `refresh_token`.
   - **Duplicate email (400):** Supabase returns `"User already registered"`. **Normalize this** — return a generic 409 with message `"An account with this email already exists"` (this is the one case where we DO disclose existence, because the user is trying to sign up — they need to know to sign in instead. This is standard UX and does not violate NFR-A5, which applies to sign-in/reset endpoints).
4. On success: set the session in an httpOnly cookie (see §4.1.7) and return the user object (without tokens).

**Response (201):**
```json
{
    "user": {
        "id": "uuid",
        "email": "user@example.com",
        "created_at": "2026-07-14T..."
    }
}
```

**Response (409 — duplicate email):**
```json
{
    "error": {
        "code": "EMAIL_EXISTS",
        "message": "An account with this email already exists. Please sign in instead."
    }
}
```

**Response (400 — validation):**
```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Password must be at least 8 characters"
    }
}
```

#### 4.1.2 `POST /api/auth/signin`

**Purpose:** Sign in with email/password (FR-A2).  
**Auth:** None.  
**Request body:**
```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

**Server logic:**
1. Validate input (both fields non-empty).
2. Call Supabase Auth: `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` with `{ email, password }` using the **anon key**.
3. Supabase response:
   - **Success (200):** `{ access_token, refresh_token, user }`
   - **Invalid credentials (400):** `"Invalid login credentials"` — Supabase does NOT disclose whether the email exists or the password is wrong. This satisfies NFR-A5 by default.
4. On success: set session cookie, return user object.
5. On failure: return generic 401 `"Invalid email or password"` (NFR-A5).

**Response (200):**
```json
{
    "user": {
        "id": "uuid",
        "email": "user@example.com"
    }
}
```

**Response (401):**
```json
{
    "error": {
        "code": "INVALID_CREDENTIALS",
        "message": "Invalid email or password"
    }
}
```

#### 4.1.3 `POST /api/auth/signout`

**Purpose:** Sign out, invalidate session (FR-A5).  
**Auth:** Required (JWT).  
**Request body:** None.

**Server logic:**
1. Call Supabase Auth: `POST {SUPABASE_URL}/auth/v1/logout` with the user's token (from the Authorization header) using the **anon key**.
2. Clear the session cookie (set `Set-Cookie` with `Max-Age=0`).
3. Return 204 No Content.

**Response (204):** No body.

#### 4.1.4 `POST /api/auth/magic-link` (P1)

**Purpose:** Request a magic-link sign-in email (FR-A3).  
**Auth:** None.  
**Request body:**
```json
{
    "email": "user@example.com"
}
```

**Server logic:**
1. Call Supabase Auth: `POST {SUPABASE_URL}/auth/v1/magiclink` with `{ email }` using the **anon key**.
2. Supabase **always returns 200** for magic-link requests (even for unregistered emails) — this is Supabase's built-in NFR-A5 compliance. We pass through the response.
3. Return generic success message.

**Response (200):**
```json
{
    "message": "If an account with that email exists, a sign-in link has been sent."
}
```

#### 4.1.5 `POST /api/auth/reset-password` (P1)

**Purpose:** Request a password reset email (FR-A4).  
**Auth:** None.  
**Request body:**
```json
{
    "email": "user@example.com"
}
```

**Server logic:**
1. Call Supabase Auth: `POST {SUPABASE_URL}/auth/v1/recover` with `{ email }` using the **anon key**.
2. Same NFR-A5 behavior as magic-link — Supabase always returns 200.
3. Return generic success message.

**Response (200):**
```json
{
    "message": "If an account with that email exists, a password reset link has been sent."
}
```

#### 4.1.6 `GET /api/auth/me`

**Purpose:** Return the current user's session info (used by client to validate session on app load — FR-A13).  
**Auth:** Required (JWT).  
**Request body:** None.

**Server logic:**
1. `req.user` is already populated by the auth middleware.
2. Return the user object.

**Response (200):**
```json
{
    "user": {
        "id": "uuid",
        "email": "user@example.com"
    }
}
```

#### 4.1.7 `POST /api/auth/refresh`

**Purpose:** Refresh an expired access token using the refresh token (FR-A8).  
**Auth:** None (uses refresh token from cookie, not access token).  
**Request body:** None (refresh token comes from httpOnly cookie).

**Server logic:**
1. Read the refresh token from the `pondo_refresh_token` cookie.
2. If no refresh token: return 401 `TOKEN_EXPIRED` (client should redirect to sign-in).
3. Call Supabase Auth: `POST {SUPABASE_URL}/auth/v1/token?grant_type=refresh_token` with `{ refresh_token }` using the **anon key**.
4. On success: set new session cookies, return 200.
5. On failure (refresh token expired/revoked): clear cookies, return 401.

**Response (200):**
```json
{
    "user": {
        "id": "uuid",
        "email": "user@example.com"
    }
}
```

**Response (401):**
```json
{
    "error": {
        "code": "REFRESH_FAILED",
        "message": "Session expired. Please sign in again."
    }
}
```

#### 4.1.8 Cookie configuration

The server sets two httpOnly cookies on successful sign-in/up/refresh:

| Cookie | Content | httpOnly | Secure | SameSite | Path | Max-Age |
|--------|---------|----------|--------|----------|------|---------|
| `pondo_access_token` | Supabase access token (JWT) | ✅ | ✅ (prod) | Lax | `/` | 3600s (1hr) |
| `pondo_refresh_token` | Supabase refresh token | ✅ | ✅ (prod) | Lax | `/api/auth` | 604800s (7 days) |

**Why SameSite=Lax?** The SPA and API are same-origin (both served from the Vercel domain). Lax allows the cookie on top-level navigations (which we don't use) and same-site requests (which we do). Strict would break the refresh flow on some browsers.

**Why `pondo_refresh_token` path is `/api/auth`?** The refresh token is only needed by the refresh endpoint. Restricting its path reduces exposure — it won't be sent on every data API call, only on refresh requests.

**The auth middleware reads from the `Authorization: Bearer` header, not the cookie.** The client reads the access token from the cookie (via a server endpoint or by the server reading its own cookie on API requests) and sends it as a header. This is the standard pattern: cookies for storage, Authorization header for transport.

**Alternative considered:** Have the server read the `pondo_access_token` cookie directly in the auth middleware instead of requiring the client to send an Authorization header. This is simpler for the client but means every API request sends the cookie (larger payload). **Decision: use the Authorization header pattern** — the client includes the token as a header, and the server validates it. The cookie is purely for secure storage; the client reads it via a lightweight endpoint or by the server exposing it on the initial page load.

**Simplification for v2.0:** Rather than building a cookie-reader endpoint, the server-side auth middleware will check **both** the `Authorization` header and the `pondo_access_token` cookie (header takes precedence). This means the client doesn't need to manually extract the token from the cookie — it just makes requests, and the server reads the cookie. The client still sends `Authorization: Bearer <token>` for explicitness, but the cookie fallback handles edge cases.

### 4.2 Endpoints to remove

| Endpoint | Current file | Action |
|----------|-------------|--------|
| `POST /api/setup` | `server/routes/system.js` lines 56-110 | **Remove route handler entirely.** The first-launch setup logic (seed categories, create Cash account) is no longer tied to passphrase setting. It should be triggered by the first sign-up instead (see §6.3). |
| `POST /api/set-passphrase` | `server/routes/system.js` lines 112-145 | **Remove route handler entirely.** |
| `GET /api/settings` (passphrase-related) | `server/routes/system.js` lines 147-162 | **Keep the endpoint** but ensure `passphrase_hash` is never returned (it's already filtered by the `keysToInclude` whitelist — no change needed). |
| `setupSchema` and `setPassphraseSchema` | `server/middleware/validate.js` | **Remove these Zod schemas.** They have no remaining consumers. |

### 4.3 Endpoints that change behavior

| Endpoint | Change |
|----------|--------|
| `GET /api/status` | Currently returns `first_launch` based on `first_launch_completed` setting. After cutover, this should also indicate whether any user has signed up (for the re-onboarding flow — FR-A12). Add a `has_users` boolean field. |
| All data endpoints (`/api/accounts`, `/api/entries`, etc.) | No behavior change. They continue to use the service-role key. The only difference is that `req.user` is now available (but unused in this slice). |

### 4.4 Complete API route map (post-cutover)

```
# Auth (new — unauthenticated except /me and /signout)
POST   /api/auth/signup          # FR-A1
POST   /api/auth/signin          # FR-A2
POST   /api/auth/signout         # FR-A5 (authenticated)
POST   /api/auth/magic-link      # FR-A3 (P1)
POST   /api/auth/reset-password  # FR-A4 (P1)
POST   /api/auth/refresh         # FR-A8 (P1)
GET    /api/auth/me              # FR-A13 (authenticated)

# System (modified)
GET    /api/status               # Modified: add has_users field
GET    /api/health               # Unchanged
GET    /api/settings             # Unchanged (already filters passphrase_hash)
PUT    /api/settings             # Unchanged

# Data (unchanged — all now JWT-protected)
GET    /api/accounts
POST   /api/accounts
GET    /api/accounts/:id
PUT    /api/accounts/:id
DELETE /api/accounts/:id
GET    /api/categories
POST   /api/categories
GET    /api/categories/:id
PUT    /api/categories/:id
DELETE /api/categories/:id
GET    /api/entries
POST   /api/entries
GET    /api/entries/:id
PUT    /api/entries/:id
DELETE /api/entries/:id
POST   /api/entries/bulk-delete
GET    /api/dashboard
GET    /api/dashboard/mom
GET    /api/export/entries
GET    /api/export/accounts

# Removed
POST   /api/setup               # REMOVED
POST   /api/set-passphrase      # REMOVED
```

---

## 5. Client-side integration

### 5.1 Supabase client in the browser

The client needs `@supabase/supabase-js` added to `client/package.json`:

```bash
cd client && npm install @supabase/supabase-js
```

**Client initialization** — new file `client/src/lib/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // CRITICAL: Do NOT use localStorage (violates NFR-A4).
        // The server manages sessions via httpOnly cookies.
        // The client SDK's auth methods (signIn, signUp, signOut) will call
        // our server proxy endpoints, not Supabase directly.
        // We disable the built-in storage to prevent accidental localStorage usage.
        storage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
        },
        autoRefreshToken: false,  // Server handles refresh via httpOnly cookie
        persistSession: false,    // Server manages session persistence
        detectSessionInUrl: false,
    },
});
```

**Important architectural note:** The client-side Supabase client is used **only** for its type definitions and as a convenience wrapper. All actual auth operations (signIn, signUp, signOut) go through our server proxy endpoints (`/api/auth/*`), not through the Supabase client directly. This is because:

1. The server must set httpOnly cookies (NFR-A4).
2. The server normalizes error responses (NFR-A5, NFR-A7).
3. We avoid exposing the anon key in the client for auth operations (though it's already public in Supabase's model — this is defense-in-depth).

**Alternative considered:** Use the Supabase client directly in the browser for auth, with a custom `storage` adapter that uses cookies. This is the `@supabase/ssr` pattern. It's more complex to set up but gives us Supabase's built-in session management. **Decision: server-proxy pattern** — simpler, gives us full control over error normalization, and the client code is just `fetch()` calls to our own API. The trade-off is we lose Supabase's built-in `onAuthStateChange` subscription; we replace it with our own React context.

### 5.2 Auth context (FR-A15)

New file: `client/src/contexts/AuthContext.jsx`

```javascript
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);        // { id, email } or null
    const [isLoading, setIsLoading] = useState(true); // true during initial session check
    const [error, setError] = useState(null);

    // Check for existing session on mount (FR-A13)
    useEffect(() => {
        const checkSession = async () => {
            try {
                const data = await apiRequest('/auth/me');
                setUser(data.user);
            } catch (err) {
                // No valid session — user is null (not an error state)
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkSession();
    }, []);

    const signIn = useCallback(async (email, password) => {
        setError(null);
        const data = await apiRequest('/auth/signin', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setUser(data.user);
        return data.user;
    }, []);

    const signUp = useCallback(async (email, password) => {
        setError(null);
        const data = await apiRequest('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setUser(data.user);
        return data.user;
    }, []);

    const signOut = useCallback(async () => {
        setError(null);
        await apiRequest('/auth/signout', { method: 'POST' });
        setUser(null);
    }, []);

    const refreshSession = useCallback(async () => {
        try {
            const data = await apiRequest('/auth/refresh', { method: 'POST' });
            setUser(data.user);
            return data.user;
        } catch {
            setUser(null);
            return null;
        }
    }, []);

    const value = {
        user,
        isLoading,
        error,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        refreshSession,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
```

### 5.3 Changes to `client/src/lib/api.js`

The existing `api.js` must be refactored to:

1. **Remove** `getStoredPassphrase()`, the `X-App-Passphrase` header logic, and `buildHeaders()`.
2. **Add** JWT token attachment from the httpOnly cookie (the server reads the cookie — the client just needs to send credentials).
3. **Add** automatic token refresh on 401 with `TOKEN_EXPIRED` code (FR-A8).
4. **Remove** `setupApp()` export (the `/api/setup` endpoint is being removed).

**Key change to `apiRequest`:**

```javascript
const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE}${endpoint}`;

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        // Send cookies (httpOnly) with every request
        credentials: 'include',
    };

    let response = await fetch(url, config);

    // If 401 with TOKEN_EXPIRED, attempt refresh and retry once (FR-A8)
    if (response.status === 401) {
        const body = await response.json().catch(() => ({}));
        if (body.error?.code === 'TOKEN_EXPIRED') {
            // Attempt refresh
            const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
            });

            if (refreshRes.ok) {
                // Retry the original request
                response = await fetch(url, config);
            }
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(parseErrorMessage(error, `HTTP error! status: ${response.status}`));
    }

    if (response.status === 204) return null;
    return response.json();
};
```

**Removed exports:**
- `setupApp` — the `/api/setup` endpoint is removed. First-launch setup is now triggered server-side on first sign-up.

### 5.4 Auth gate & protected routes (FR-A13, FR-A14)

New file: `client/src/components/AuthGate.jsx`

```javascript
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AuthGate({ children }) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // Show loading spinner while checking session
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirect to sign-in, preserving the intended destination (FR-A14)
        return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
    }

    return children;
}
```

### 5.5 Sign-in / sign-up pages

New files:
- `client/src/pages/SignIn.jsx` — Sign-in form (email + password), link to sign-up, link to reset password
- `client/src/pages/SignUp.jsx` — Sign-up form (email + password + confirm password), link to sign-in
- `client/src/pages/ResetPassword.jsx` — Password reset request form (email input)
- `client/src/pages/UpdatePassword.jsx` — New password form (after clicking reset link — P1)

### 5.6 Re-onboarding flow (FR-A12)

The `SignUp` page detects whether this is a "first user" scenario by checking `GET /api/status`:

- If `has_users === false`: Show the re-onboarding message: *"Pondo now uses individual accounts. Create your account to access your existing data."* The sign-up form is displayed. After sign-up, the user sees their existing data immediately (because the backfill trigger assigns all existing `accounts` rows to the first user).
- If `has_users === true`: Show the standard sign-up form (or redirect to sign-in, since most visitors will be existing users).

### 5.7 Changes to `App.jsx`

```javascript
import { AuthProvider } from './contexts/AuthContext';
import { AuthGate } from './components/AuthGate';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ResetPassword from './pages/ResetPassword';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Public routes — no auth required */}
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* Protected routes — wrapped in AuthGate */}
                    <Route path="/" element={
                        <AuthGate><Layout /></AuthGate>
                    }>
                        <Route index element={<Dashboard />} />
                        <Route path="entries" element={<Entries />} />
                        {/* ... all existing protected routes ... */}
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}
```

### 5.8 Header changes (FR-A15)

The `Header` component (`client/src/components/Header.jsx`) should display the user's email and a sign-out button:

```javascript
import { useAuth } from '../contexts/AuthContext';

function Header({ onMenuToggle }) {
    const { user, signOut } = useAuth();

    return (
        <header>
            {/* ... existing header content ... */}
            <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-600">{user?.email}</span>
                <button onClick={signOut} className="text-sm text-neutral-500 hover:text-neutral-700">
                    Sign out
                </button>
            </div>
        </header>
    );
}
```

### 5.9 Changes to `Layout.jsx`

The existing `Layout.jsx` has first-launch detection logic (`getSystemStatus()`, `setupApp()`) that must be refactored:

1. **Remove** the `setupApp()` call — first-launch setup is now triggered server-side on first sign-up.
2. **Remove** the passphrase-related logic (the `isFirstLaunch` state and the passphrase prompt).
3. The `isLoading` / `error` states remain but now reflect auth session loading (from `useAuth()`) rather than passphrase checking.
4. The welcome banner ("Welcome to Pondo!") can stay but should only show for genuinely new users (first sign-up), not on every page load.

---

## 6. Migration & cutover plan

### 6.1 Pre-cutover state

- Production is live on Vercel with the shared-passphrase auth.
- The `passphrase_hash` row exists in `settings`.
- All 4 tables have data.
- RLS is enabled, zero policies.
- The server uses the service-role key for all queries.

### 6.2 Cutover sequence (ordered, must-run-in-this-order)

#### Phase 1: Preparation (can be done days before cutover, zero downtime)

1. **Add environment variables to Vercel:**
   - `SUPABASE_JWT_SECRET` — from Supabase Dashboard → Project Settings → API → JWT Secret
   - `SUPABASE_ANON_KEY` — from Supabase Dashboard → Project Settings → API → anon/public key (already may exist; confirm)
   - These are additive — the existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` stay.

2. **Run the DDL migration** (§2.2) against the production Supabase database:
   - Creates `public.users` table, trigger, `user_id` column on `accounts`, index.
   - The backfill `DO $$` block is a no-op at this point (no users exist yet).
   - **Zero downtime** — the new columns are nullable, the trigger fires on `auth.users` insert (which doesn't happen yet), and no existing code references these columns.

3. **Deploy the new server code** (middleware, auth routes, removed passphrase endpoints) to a **staging/preview deployment** on Vercel. Verify:
   - `POST /api/auth/signup` works against the production Supabase project (creates a test user).
   - `POST /api/auth/signin` works.
   - `GET /api/auth/me` returns the test user.
   - Existing data endpoints still work with the JWT (the service-role data client is unchanged).
   - **Delete the test user** from Supabase Auth dashboard after verification.

#### Phase 2: Cutover (the actual switch — ~5 minutes of "auth required" for existing users)

4. **Deploy the new server code to production** (Vercel production deployment):
   - The new auth middleware is now live.
   - The old passphrase endpoints (`/api/setup`, `/api/set-passphrase`) are gone.
   - All data endpoints now require a valid JWT (the old `X-App-Passphrase` header is ignored).
   - **Impact:** Existing users with the old passphrase in `sessionStorage` will get 401 on their next request. The client will redirect them to the sign-up page (re-onboarding flow).

5. **Deploy the new client code to production** (Vite build → Vercel):
   - The SPA now has the `AuthProvider`, `AuthGate`, sign-in/up pages.
   - The old passphrase prompt is gone.
   - On first load, the client checks `GET /api/auth/me` → 401 → redirects to `/signup`.
   - The sign-up page detects `has_users === false` and shows the re-onboarding message.

6. **First user signs up:**
   - `POST /api/auth/signup` → Supabase creates `auth.users` row → trigger creates `public.users` row.
   - **The cutover script runs** (see §6.3) — all existing `accounts` rows get `user_id = <new_user_id>`.
   - The user is redirected to the dashboard and sees all their existing data.

7. **Delete the `passphrase_hash` row** from `settings`:
   ```sql
   DELETE FROM public.settings WHERE key = 'passphrase_hash';
   ```
   This is a manual cleanup step. It can be done immediately after the first sign-up or as part of the cutover script. It is not urgent — the row is harmless but should be removed for cleanliness (FR-A10).

#### Phase 3: Post-cutover verification

8. **Verify:**
   - Existing data is visible to the first user.
   - Second user sign-up works (they see an empty dashboard — no data assigned to them).
   - Sign-out and sign-back-in works.
   - Session persists across browser restart (FR-A6).
   - Old passphrase header is rejected (401, not 500).

### 6.3 First-sign-up backfill mechanism (FR-A11, Q5)

The backfill is implemented as a **database trigger** that fires on the first insert into `public.users`:

```sql
-- Run this alongside the DDL migration (Phase 1, step 2)
-- It is idempotent: only fires once (when the first user is created and accounts have NULL user_id)

CREATE OR REPLACE FUNCTION public.backfill_first_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Count existing users (including the one just inserted)
    SELECT COUNT(*) INTO user_count FROM public.users;

    -- Only backfill for the FIRST user
    IF user_count = 1 THEN
        -- Assign all existing accounts to this user
        UPDATE public.accounts SET user_id = NEW.id WHERE user_id IS NULL;

        -- Mark first launch as completed (if not already)
        INSERT INTO public.settings (key, value)
        VALUES ('first_launch_completed', '1')
        ON CONFLICT (key) DO NOTHING;

        -- Seed default categories if none exist (migrated from old /api/setup logic)
        -- This ensures the first user gets the default categories even if
        -- the old setup flow never ran.
        PERFORM seed_default_categories();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to the existing handle_new_user trigger, or create a separate one
DROP TRIGGER IF EXISTS on_first_user_backfill ON public.users;
CREATE TRIGGER on_first_user_backfill
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.backfill_first_user();
```

**The `seed_default_categories()` function** replicates the old `/api/setup` logic in the database:

```sql
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS void AS $$
DECLARE
    cat_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO cat_count FROM public.categories;
    IF cat_count = 0 THEN
        INSERT INTO public.categories (name, type, color, is_default, sort_order) VALUES
            ('Food & Dining',    'expense', '#1F7A64', true, 1),
            ('Transportation',   'expense', '#2A9A7D', true, 2),
            ('Housing & Utilities','expense','#45B095', true, 3),
            ('Shopping',         'expense', '#6FC9B0', true, 4),
            ('Entertainment',    'expense', '#E89C2A', true, 5),
            ('Subscriptions',    'expense', '#F5B042', true, 6),
            ('Health',           'expense', '#F9C55A', true, 7),
            ('Education',        'expense', '#5B6FBF', true, 8),
            ('Insurance',        'expense', '#8B5CF6', true, 9),
            ('Other',            'expense', '#D14343', true, 10),
            ('Salary',           'income',  '#1B8E4E', true, 1),
            ('Freelance',        'income',  '#2A9A7D', true, 2),
            ('Gift',             'income',  '#45B095', true, 3),
            ('Investment',       'income',  '#F5B042', true, 4),
            ('Refund',           'income',  '#5B6FBF', true, 5),
            ('Other Income',     'income',  '#8B5CF6', true, 6);

        -- Also create the default Cash account
        INSERT INTO public.accounts (name, type, description)
        VALUES ('Cash', 'debit', 'Default cash account');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Why a trigger and not application-level logic?**
- The trigger is atomic with the user creation — no race condition where a second user signs up between the first user's sign-up and the backfill.
- It works regardless of how the user is created (sign-up API, magic link, or even direct Supabase Auth API call).
- It's idempotent — the `IF user_count = 1` guard ensures it only fires once.

### 6.4 Client-side cutover behavior

The client deployment (Phase 2, step 5) must handle the transition gracefully:

1. **Old client (with passphrase) → new server:** The old client sends `X-App-Passphrase`. The new server ignores it and checks for a JWT. No JWT → 401. The old client shows an error. The user refreshes → gets the new client code (Vercel deploys atomically).

2. **New client → old server (race condition during deploy):** The new client sends `Authorization: Bearer <token>` (or no token, with `credentials: 'include'`). The old server's passphrase middleware sees no `X-App-Passphrase` → 401. The new client redirects to sign-in. This is a transient state lasting <1 minute during Vercel's atomic deploy. Acceptable.

3. **`sessionStorage` cleanup:** The new client should clear `pondo_passphrase` from `sessionStorage` on first load to prevent stale data:
   ```javascript
   // In AuthProvider mount effect
   sessionStorage.removeItem('pondo_passphrase');
   ```

### 6.5 Rollback plan

If the cutover fails critically (e.g., Supabase Auth is down, JWT secret is wrong, migration breaks something):

1. **Revert the Vercel deployment** to the previous commit (pre-cutover server + client). Vercel supports instant rollback.
2. **The DDL migration is NOT rolled back** — the new columns and trigger are harmless to the old code (they're additive, nullable, and the old code never references them). Rolling back DDL is riskier than leaving it.
3. **If the first user already signed up:** Their `auth.users` row and `public.users` row exist. The `accounts.user_id` is populated. Rolling back the server code means they can't sign in (the old passphrase middleware is back), but no data is lost. When the cutover is re-attempted, the backfill trigger won't fire again (the `IF user_count = 1` guard already passed), but the accounts are already assigned — no harm.
4. **If the `passphrase_hash` row was deleted:** Re-insert it from a backup or from the pre-cutover database snapshot. The value is a bcrypt hash — it can be re-inserted as-is.

**Rollback risk assessment: LOW.** The DDL is purely additive. The only destructive action is deleting the `passphrase_hash` row, which is reversible from backups.

---

## 7. Error code taxonomy

### 7.1 Server → Client error codes (FR-A7)

| Code | HTTP Status | Meaning | Client Action |
|------|-------------|---------|---------------|
| `NO_TOKEN` | 401 | No Authorization header or cookie | Redirect to sign-in |
| `TOKEN_EXPIRED` | 401 | JWT is past its `exp` claim | Attempt refresh; if refresh fails, redirect to sign-in |
| `TOKEN_TAMPERED` | 401 | JWT signature invalid, wrong audience, or malformed | Redirect to sign-in (do not attempt refresh — token is bad) |
| `INVALID_CREDENTIALS` | 401 | Email/password don't match (sign-in only) | Show "Invalid email or password" (NFR-A5) |
| `EMAIL_EXISTS` | 409 | Duplicate email on sign-up | Show "An account with this email already exists" |
| `REFRESH_FAILED` | 401 | Refresh token expired or revoked | Clear session, redirect to sign-in |
| `VALIDATION_ERROR` | 400 | Input validation failed | Show field-level errors |
| `AUTH_INTERNAL_ERROR` | 500 | Unexpected auth middleware error | Show generic error, offer retry |
| `AUTH_SERVICE_UNAVAILABLE` | 503 | Supabase Auth API is unreachable (NFR-A8) | Show "Authentication service temporarily unavailable. Please try again." |

### 7.2 Error normalization rules (NFR-A5, NFR-A7)

1. **Sign-in failures:** Always return `INVALID_CREDENTIALS` with message "Invalid email or password." Never vary the message based on whether the email exists.
2. **Magic-link requests:** Always return the same success message regardless of email registration status. Supabase Auth does this natively — we pass through.
3. **Password reset requests:** Same as magic-link — generic success message.
4. **Token validation failures:** Return the appropriate code (`TOKEN_EXPIRED` vs `TOKEN_TAMPERED`) but never include the raw token, the expected signature, or any internal state in the error response.
5. **All error responses:** Use the existing error envelope format:
   ```json
   { "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
   ```

---

## 8. Environment & configuration

### 8.1 New environment variables

| Variable | Where | Purpose | Source |
|----------|-------|---------|--------|
| `SUPABASE_JWT_SECRET` | Vercel (server) | Local JWT verification (HS256) | Supabase Dashboard → Settings → API → JWT Secret |
| `SUPABASE_ANON_KEY` | Vercel (server) | Auth proxy calls to Supabase Auth REST API | Supabase Dashboard → Settings → API → anon/public key |
| `VITE_SUPABASE_URL` | Vercel (client build) | Supabase project URL for client SDK init | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Vercel (client build) | Anon key for client SDK init | Same as `SUPABASE_ANON_KEY` |

### 8.2 Existing variables (unchanged)

| Variable | Status |
|----------|--------|
| `SUPABASE_URL` | Keep — used by data client and auth client |
| `SUPABASE_SERVICE_ROLE_KEY` | Keep — used by data client (unchanged) |

### 8.3 Supabase Auth settings (configured in Supabase Dashboard)

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Site URL** | `https://<project>.vercel.app` | For magic-link/reset redirects |
| **JWT expiry** | 3600 seconds (1 hour) | Default; matches NFR-A2 |
| **Refresh token inactivity** | 7 days | Default; matches NFR-A2 |
| **Minimum password length** | 8 | Matches NFR-A1 |
| **Confirm email** | Disabled | Q4 — immediate access for v2.0 |
| **Rate limit (sign-in)** | 5 attempts per email per hour | Default; matches NFR-A3 |

---

## 9. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | **Supabase Auth outage during cutover** — first user can't sign up, existing users can't access data. | Low | High | Phase 1 verification (step 3) confirms Supabase Auth is reachable. If it's down during Phase 2, roll back the Vercel deploy (revert to passphrase auth). NFR-A8 ensures existing sessions continue working if Auth goes down post-cutover. |
| R2 | **JWT secret mismatch** — wrong secret in `SUPABASE_JWT_SECRET` env var causes all tokens to fail validation. | Medium | High | Verify in staging (Phase 1, step 3). The secret is copy-pasted from Supabase Dashboard — human error is the only failure mode. |
| R3 | **First user is not the data owner** — someone else in the household signs up first and gets all the data (Q5). | Medium | Medium | Accepted risk per analyst decision. Mitigated by re-onboarding copy: "Create your account to access your existing data." If this is a real problem, the data owner should be told to sign up first. A future slice can add a claim-code flow. |
| R4 | **Race condition on first sign-up** — two users sign up simultaneously, both trigger the backfill. | Low | Low | The `IF user_count = 1` guard in the trigger is evaluated per-row within the transaction. The second user's trigger sees `user_count = 2` and skips the backfill. The first user's trigger runs and backfills. Postgres serializes inserts — no race. |
| R5 | **httpOnly cookie not set in Vercel serverless** — Vercel's edge network strips or modifies `Set-Cookie` headers. | Low | High | Vercel serverless functions support `Set-Cookie` headers natively. Test in staging (Phase 1, step 3). If issues arise, fall back to returning tokens in the response body and storing in memory (downgrades NFR-A4 from httpOnly to secure-memory-only — still better than localStorage). |
| R6 | **`bcrypt` dependency becomes unused** — removing passphrase auth means `bcrypt` is no longer needed. | N/A | Low | Keep `bcrypt` in `server/package.json` for now. It's a native module that doesn't add bundle size. Remove in a cleanup PR post-cutover. |
| R7 | **Client-side Supabase SDK conflicts with server-proxy pattern** — the client SDK's built-in auth listeners interfere with our custom auth context. | Low | Medium | The client SDK is initialized with `autoRefreshToken: false` and `persistSession: false`, and a no-op storage adapter. It should not interfere. If it does, remove the client-side SDK entirely and use plain `fetch()` for the few places we might use it (we're already using `apiRequest` for everything). |
| R8 | **Existing `first_launch_completed` setting causes confusion** — the old setup flow set this. The new flow uses the trigger. | Low | Low | The trigger's `seed_default_categories()` function checks if categories already exist before seeding. The `first_launch_completed` setting is kept but its semantics change: it now means "the app has been set up at least once" (which is true). The re-onboarding flow uses `has_users` (from `GET /api/status`) to decide whether to show the re-onboarding message, not `first_launch_completed`. |

---

## Appendix A: File manifest (new & changed files)

### New files
| File | Purpose |
|------|---------|
| `server/lib/supabase-auth.js` | JWT verification utility |
| `server/routes/auth.js` | Auth endpoint router (signup, signin, signout, magic-link, reset, refresh, me) |
| `client/src/lib/supabase.js` | Client-side Supabase SDK initialization |
| `client/src/contexts/AuthContext.jsx` | React auth context provider + hook |
| `client/src/components/AuthGate.jsx` | Protected route wrapper |
| `client/src/pages/SignIn.jsx` | Sign-in page |
| `client/src/pages/SignUp.jsx` | Sign-up page (with re-onboarding variant) |
| `client/src/pages/ResetPassword.jsx` | Password reset request page (P1) |
| `client/src/pages/UpdatePassword.jsx` | New password form after reset link (P1) |

### Changed files
| File | Change |
|------|--------|
| `server/middleware/auth.js` | **Full rewrite** — bcrypt passphrase → Supabase JWT validation |
| `server/server.js` | Add `/api/auth` router before global auth middleware; add path-skip for auth routes |
| `server/routes/system.js` | Remove `/setup` and `/set-passphrase` handlers; add `has_users` to `/status` response |
| `server/middleware/validate.js` | Remove `setupSchema` and `setPassphraseSchema` |
| `server/package.json` | Add `jsonwebtoken` dependency |
| `client/src/lib/api.js` | Remove passphrase logic; add `credentials: 'include'`; add token refresh on 401; remove `setupApp` export |
| `client/src/App.jsx` | Wrap in `AuthProvider`; add public routes (signin, signup, reset); wrap protected routes in `AuthGate` |
| `client/src/components/Layout.jsx` | Remove passphrase/setup logic; use `useAuth()` for loading state |
| `client/src/components/Header.jsx` | Add user email display + sign-out button |
| `client/package.json` | Add `@supabase/supabase-js` dependency |

### Removed files
| File | Reason |
|------|--------|
| *(none)* | No files are deleted — only code within files is removed. |

### Unchanged files
| File | Note |
|------|------|
| `server/db/supabase.js` | Service-role client — unchanged |
| `server/db/client.js` | Re-exports supabase.js — unchanged |
| `server/db/queries.js` | All query functions — unchanged (queries remain unscoped) |
| `server/routes/accounts.js` | Unchanged |
| `server/routes/entries.js` | Unchanged |
| `server/routes/categories.js` | Unchanged |
| `server/routes/dashboard.js` | Unchanged |
| `server/routes/export.js` | Unchanged |
| `server/middleware/error-handler.js` | Unchanged (existing error codes still work) |
| All client pages except those listed above | Unchanged |

---

## Appendix B: Open questions resolved

| Q# | Question | Resolution |
|----|----------|------------|
| Q1 | `user_id` on `entries`/`categories`? | **Accounts only.** Confirmed. |
| Q2 | Supabase Auth as provider? | **Confirmed.** |
| Q3 | Magic-link P0 or P1? | **P1.** Endpoints designed, implementation deferrable. |
| Q4 | Email confirmation required? | **No.** Immediate access for v2.0. |
| Q5 | First sign-up owns existing data? | **Yes.** Implemented via `backfill_first_user` trigger. |
| Q6 | Remove old endpoints? | **Yes.** Removed entirely, not deprecated. |

---

*Produced via FRIDAY's OpenClaw Workshop Crew (`architect`, `ollama/deepseek-v4-pro:cloud`). All code samples above are design specifications, not copy-paste-ready implementations — the implementer should adapt them to the actual codebase conventions (e.g., import style, error envelope format, existing utility functions).*
