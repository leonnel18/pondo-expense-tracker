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