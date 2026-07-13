// Global error handler
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
    
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please fix the following errors.',
        fields: fieldErrors,
      },
    });
  }
  
  // Handle SQLite errors
  if (err.name === 'SqliteError') {
    // Handle constraint violations (e.g., foreign key violations)
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Database constraint violation.',
        },
      });
    }
    
    // Handle other SQLite errors
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Database error occurred.',
      },
    });
  }
  
  // Handle general errors
  if (err.status) {
    return res.status(err.status).json({
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An error occurred.',
      },
    });
  }
  
  // Default to 500 for unhandled errors
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    },
  });
};

module.exports = errorHandler;