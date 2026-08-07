const rateLimit = require('express-rate-limit');
const ResponseHelper = require('../helpers/response.helper');

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 failed requests per windowMs
  skipSuccessfulRequests: true, // Optional: Only limit failed attempts
  handler: (req, res, next, options) => {
    return res.status(options.statusCode).json({
      success: false,
      code: 'TOO_MANY_REQUESTS',
      message: 'Terlalu banyak percobaan login gagal. Coba lagi dalam 15 menit.',
      request_id: res.locals.requestId,
    });
  },
});

module.exports = {
  loginRateLimiter,
};
