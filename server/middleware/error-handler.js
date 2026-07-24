// Global error handler
const supabase = require('../db/client');

// US-28: fire-and-forget persistence of every handled error into app_errors,
// alongside the existing console.error below. Never awaited by the caller
// and never allowed to affect the real error response — a logging failure
// here must not crash or delay the actual response sent to the client.
const persistAppError = (err, req, severity) => {
  (async () => {
    try {
      const { error: insertError } = await supabase
        .from('app_errors')
        .insert({
          severity,
          route: req.originalUrl || req.url || null,
          message: err.message || 'Unknown error',
          stack: err.stack || null,
          metadata: err.code ? { db_code: err.code } : null,
        });

      if (insertError) {
        console.error('Failed to persist app_errors row:', insertError.message);
      }
    } catch (logErr) {
      console.error('Failed to persist app_errors row:', logErr.message);
    }
  })();
};

const errorHandler = (err, req, res, next) => {
  // Log the error for debugging (in production, use a proper logger)
  console.error('Error:', err);

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const fieldErrors = {};
    err.errors.forEach((error) => {
      const path = error.path.join('.');
      fieldErrors[path] = error.message;
    });

    persistAppError(err, req, 'warn'); // 400 — 4xx

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please fix the following errors.',
        fields: fieldErrors,
      },
    });
  }

  // Handle PostgreSQL errors
  if (err.code) {
    // Handle constraint violations
    if (err.code === '23503') { // foreign_key_violation
      persistAppError(err, req, 'warn'); // 409 — 4xx

      return res.status(409).json({
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Cannot delete item because it is referenced by other records.',
        },
      });
    }

    if (err.code === '23505') { // unique_violation
      persistAppError(err, req, 'warn'); // 409 — 4xx

      return res.status(409).json({
        error: {
          code: 'UNIQUE_VIOLATION',
          message: 'Item already exists.',
        },
      });
    }

    // Handle undefined table
    if (err.code === '42P01') { // undefined_table
      persistAppError(err, req, 'error'); // 500

      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database error occurred.',
        },
      });
    }

    // Handle other PostgreSQL errors
    persistAppError(err, req, 'error'); // 500

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Database error occurred.',
      },
    });
  }

  // Handle general errors
  if (err.status) {
    persistAppError(err, req, err.status >= 500 ? 'error' : 'warn');

    return res.status(err.status).json({
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An error occurred.',
      },
    });
  }

  // Default to 500 for unhandled errors
  persistAppError(err, req, 'error');

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    },
  });
};

module.exports = errorHandler;
