// Supabase Auth utilities — JWT verification and user context
//
// Uses LOCAL verification against Supabase's JWKS (JSON Web Key Set) — no
// per-request call to the Supabase Auth API itself, only a network fetch
// for the public key set, which `jose`'s createRemoteJWKSet caches in
// memory for the life of the serverless function instance (refetched only
// on cache expiry or an unrecognized `kid`). This satisfies NFR-A8 (works
// when Supabase Auth's *token-issuing* API is down) and keeps steady-state
// latency low (NFR-A6) after the first fetch per warm instance.
//
// CORRECTION (found during first real production auth test, 2026-07-15):
// this file originally used `jsonwebtoken` with a static HS256 shared
// secret (`SUPABASE_JWT_SECRET`), matching Supabase's older/legacy JWT
// signing model. This Supabase project (created 2026-07-13) issues ES256
// (asymmetric) tokens by default — confirmed by decoding a real token's
// header (`"alg":"ES256"`) and cross-checking its `kid` against the
// project's live JWKS endpoint. HS256 verification rejected every
// legitimately-issued token outright as an algorithm mismatch, surfaced as
// TOKEN_TAMPERED, regardless of whether the configured secret was correct.
// Rewritten to use `jose`'s JWKS-based ES256 verification, which is what
// Supabase's own docs recommend for this signing model.

const { createRemoteJWKSet, jwtVerify } = require('jose');

const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_URL) {
    throw new Error('SUPABASE_URL is required for JWT verification');
}

// Supabase JWTs have iss = '<project_url>/auth/v1', NOT the bare project
// URL — same issuer format used for both the JWKS endpoint and validation.
const ISSUER = `${SUPABASE_URL}/auth/v1`;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

/**
 * Verify a Supabase-issued JWT and return the user payload.
 * Supabase JWTs are ES256-signed against the project's JWKS.
 *
 * @param {string} token - Raw JWT string (from Authorization header)
 * @returns {Promise<{ id: string, email: string, aud: string, exp: number, iat: number }>} User payload
 * @throws {Error} With .code property for distinguishable error handling (FR-A7)
 */
async function verifyToken(token) {
    let payload;
    try {
        ({ payload } = await jwtVerify(token, JWKS, {
            issuer: ISSUER,
        }));
    } catch (err) {
        // jose's JWT expiry error
        if (err.code === 'ERR_JWT_EXPIRED') {
            const e = new Error('Token has expired');
            e.code = 'TOKEN_EXPIRED';
            throw e;
        }
        // Signature failure, malformed token, issuer mismatch, unknown kid,
        // JWKS fetch failure, etc. — fail closed, all map to tampered.
        const e = new Error('Token is invalid or tampered');
        e.code = 'TOKEN_TAMPERED';
        throw e;
    }

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
}

module.exports = { verifyToken };