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
  
  // Handle PostgreSQL errors
  if (err.code) {
    // Handle constraint violations
    if (err.code === '23503') { // foreign_key_violation
      return res.status(409).json({
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Cannot delete item because it is referenced by other records.',
        },
      });
    }
    
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({
        error: {
          code: 'UNIQUE_VIOLATION',
          message: 'Item already exists.',
        },
      });
    }
    
    // Handle undefined table
    if (err.code === '42P01') { // undefined_table
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database error occurred.',
        },
      });
    }
    
    // Handle other PostgreSQL errors
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