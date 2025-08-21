const logger = require('../utils/logger');
const config = require('../utils/config');

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't send stack traces in production
  const sendStack = config.NODE_ENV === 'development';

  // Default error response
  let status = 500;
  let message = 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  } else if (err.code === 11000) {
    status = 409;
    message = 'Duplicate entry';
  } else if (err.status) {
    status = err.status;
    message = err.message;
  }

  // Construct error response
  const errorResponse = {
    error: {
      message: message,
      status: status,
      timestamp: new Date().toISOString()
    }
  };

  // Add stack trace in development
  if (sendStack) {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err.message;
  }

  res.status(status).json(errorResponse);
}

/**
 * 404 handler middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function notFoundHandler(req, res) {
  logger.warn(`404 - Not Found: ${req.method} ${req.url}`);
  
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method
    }
  });
}

/**
 * Async error wrapper for route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function that catches async errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Rate limiting middleware (simple implementation)
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware function
 */
function rateLimit(options = {}) {
  const { windowMs = 15 * 60 * 1000, max = 100 } = options;
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    if (requests.has(key)) {
      const userRequests = requests.get(key);
      const validRequests = userRequests.filter(time => time > windowStart);
      
      if (validRequests.length >= max) {
        return res.status(429).json({
          error: {
            message: 'Too many requests',
            status: 429,
            timestamp: new Date().toISOString(),
            retryAfter: Math.ceil(windowMs / 1000)
          }
        });
      }
      
      validRequests.push(now);
      requests.set(key, validRequests);
    } else {
      requests.set(key, [now]);
    }

    next();
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  rateLimit
};
