// Auth middleware — Supabase JWT validation
// Replaces the old bcrypt passphrase middleware.
// Attaches req.user = { id, email } on success (FR-A9).
// Returns distinguishable error codes (FR-A7).

const { verifyToken } = require('../lib/supabase-auth');

const authMiddleware = async (req, res, next) => {
    try {
        // Extract token from cookies (Defect 1 fix)
        const token = req.cookies['sb-access-token'];
        if (!token) {
            return res.status(401).json({
                error: {
                    code: 'NO_TOKEN',
                    message: 'Authentication required',
                },
            });
        }

        // Verify the JWT against Supabase's JWKS (cached after first fetch per instance)
        let user;
        try {
            user = await verifyToken(token);
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