const rateLimit = require('express-rate-limit');

// Rate limiting is a production-only concern.
// In development and test environments, use a very high limit to avoid false 429s.
const isProduction = process.env.NODE_ENV === 'production';

// Auth rate limiter — strict: 5 failed attempts per 15 minutes
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 5 : 10000,
  skipSuccessfulRequests: true,
  handler: (req, res, next, options) => {
    return res.status(options.statusCode).json({
      success: false,
      code: 'TOO_MANY_REQUESTS',
      message: 'Terlalu banyak percobaan login gagal. Coba lagi dalam 15 menit.',
      requestId: res.locals.requestId,
    });
  },
});

// API rate limiter — general: 100 requests per 15 minutes per IP
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 10000,
  standardHeaders: true,  // Return RateLimit-* headers
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    return res.status(options.statusCode).json({
      success: false,
      code: 'TOO_MANY_REQUESTS',
      message: 'Terlalu banyak permintaan. Coba lagi dalam beberapa menit.',
      requestId: res.locals.requestId,
    });
  },
});

module.exports = {
  loginRateLimiter,
  apiRateLimiter,
};
