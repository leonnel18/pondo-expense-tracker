const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// Helper function to set auth cookies
const setAuthCookies = (res, session) => {
  const accessToken = session.access_token;
  const refreshToken = session.refresh_token;
  
  // Access token expiry (default to 1 hour per NFR-A2)
  const accessTokenExpiresIn = session.expires_in || 3600; // seconds
  const accessTokenMaxAge = accessTokenExpiresIn * 1000; // milliseconds
  
  // Refresh token expiry (7 days per NFR-A2)
  const refreshTokenMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  };
  
  res.cookie('sb-access-token', accessToken, {
    ...cookieOptions,
    maxAge: accessTokenMaxAge
  });
  
  res.cookie('sb-refresh-token', refreshToken, {
    ...cookieOptions,
    maxAge: refreshTokenMaxAge
  });
};

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Email and password are required',
                },
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Password must be at least 8 characters',
                },
            });
        }

        // Call Supabase Auth signup endpoint
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            // Handle duplicate email case - NFR-A5: No email disclosure
            // Return generic response that doesn't reveal if email exists
            return res.status(200).json({
                message: 'If this email is available, an account has been created. Please check your email to continue.',
            });
        }

        // Success - set auth cookies
        if (data.session) {
            setAuthCookies(res, data.session);
        }

        // Return user data (without tokens for security)
        res.status(201).json({
            user: {
                id: data.user.id,
                email: data.user.email,
                created_at: data.user.created_at,
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/signin
router.post('/signin', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Email and password are required',
                },
            });
        }

        // Call Supabase Auth signin endpoint
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            // Return generic error message (NFR-A5 - no email disclosure)
            return res.status(401).json({
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password',
                },
            });
        }

        // Success - set auth cookies
        if (data.session) {
            setAuthCookies(res, data.session);
        }

        // Return user data
        res.json({
            user: {
                id: data.user.id,
                email: data.user.email,
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/signout
// Note: This only clears cookies but cannot revoke JWT tokens before their natural expiry
// This is an inherent limitation of stateless JWT verification - tokens remain valid
// until they expire (max 1 hour per NFR-A2)
router.post('/signout', async (req, res, next) => {
    try {
        // Clear auth cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        };
        
        res.clearCookie('sb-access-token', cookieOptions);
        res.clearCookie('sb-refresh-token', cookieOptions);
        
        // Return success response
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// GET /api/auth/me
router.get('/me', async (req, res, next) => {
    try {
        // req.user is populated by the auth middleware
        if (!req.user) {
            return res.status(401).json({
                error: {
                    code: 'NO_TOKEN',
                    message: 'Authentication required',
                },
            });
        }

        res.json({
            user: {
                id: req.user.id,
                email: req.user.email,
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
    try {
        // Get refresh token from cookies
        const refreshToken = req.cookies['sb-refresh-token'];
        
        if (!refreshToken) {
            return res.status(401).json({
                error: {
                    code: 'REFRESH_FAILED',
                    message: 'Session expired. Please sign in again.',
                },
            });
        }

        // Call Supabase Auth refresh endpoint
        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken
        });

        if (error || !data.session) {
            // Clear cookies on failure
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/'
            };
            
            res.clearCookie('sb-access-token', cookieOptions);
            res.clearCookie('sb-refresh-token', cookieOptions);
            
            return res.status(401).json({
                error: {
                    code: 'REFRESH_FAILED',
                    message: 'Session expired. Please sign in again.',
                },
            });
        }

        // Set new auth cookies
        setAuthCookies(res, data.session);

        // Return user data
        res.json({
            user: {
                id: data.user.id,
                email: data.user.email,
            },
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;