const logger = require('../config/logger');

const errorMiddleware = (err, req, res, next) => {
  const requestId = res.locals.requestId || req.id;

  // Log with pino only — never console.error in production
  logger.error({ request_id: requestId, err }, 'Unhandled Error');

  // Joi / Zod validation errors → 400
  if (err.isJoi || err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation Failed',
      details: err.errors || err.issues,
      requestId,
    });
  }

  // Domain validation error → 422 (preserve domain code e.g. INVALID_STATUS)
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      success: false,
      code: err.code || 'UNPROCESSABLE_ENTITY',
      message: err.message,
      requestId,
    });
  }

  // Domain conflict → 409 (preserve domain code e.g. INSUFFICIENT_STOCK, DUPLICATE_VISIT)
  if (err.name === 'ConflictError') {
    return res.status(409).json({
      success: false,
      code: err.code || 'CONFLICT',
      message: err.message,
      requestId,
    });
  }

  // Domain not found → 404 (preserve domain code)
  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      success: false,
      code: err.code || 'NOT_FOUND',
      message: err.message,
      requestId,
    });
  }

  // Domain forbidden → 403 (preserve domain code)
  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      success: false,
      code: err.code || 'FORBIDDEN',
      message: err.message,
      requestId,
    });
  }

  // JWT errors → 401
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Token tidak valid atau kadaluarsa',
      requestId,
    });
  }

  // Fallback: respect err.status if domain layer sets it (covers 403, 422, custom codes)
  if (err.status && err.status >= 400 && err.status < 600) {
    return res.status(err.status).json({
      success: false,
      code: err.code || 'ERROR',
      message: err.message,
      requestId,
    });
  }

  // Generic 500
  return res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Terjadi kesalahan pada server',
    requestId,
  });
};

module.exports = errorMiddleware;
