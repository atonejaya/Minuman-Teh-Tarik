const pino = require('pino');
const env = require('./env');

const logger = pino({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive fields — never log credentials or tokens
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'Authorization',
      'jwt',
      'DATABASE_URL',
      'JWT_SECRET',
      'cookie',
      'Cookie',
      'set-cookie',
      'refresh_token',
      'access_token',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.refresh_token',
    ],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
});

module.exports = logger;
