const errorHandler = (err, req, res, next) => {
  console.error('Error:', err)

  // Default error
  let error = {
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
    status: 500
  }

  // Supabase errors
  if (err.code && err.code.startsWith('PGRST')) {
    error = {
      success: false,
      message: 'Database error',
      code: 'DATABASE_ERROR',
      status: 500,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error = {
      success: false,
      message: 'Validation error',
      code: 'VALIDATION_ERROR',
      status: 400,
      details: err.message
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
      status: 401
    }
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
      status: 401
    }
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      success: false,
      message: 'File too large',
      code: 'FILE_TOO_LARGE',
      status: 413
    }
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      success: false,
      message: 'Unexpected file field',
      code: 'UNEXPECTED_FILE',
      status: 400
    }
  }

  // Custom application errors
  if (err.status && err.message) {
    error = {
      success: false,
      message: err.message,
      code: err.code || 'APPLICATION_ERROR',
      status: err.status
    }
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && error.status >= 500) {
    error.message = 'Internal server error'
    error.details = undefined
  }

  res.status(error.status).json({
    success: error.success,
    message: error.message,
    code: error.code,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

module.exports = errorHandler
