const pinoHttp = require('pino-http');
const logger = require('../config/logger');

const loggerMiddleware = pinoHttp({
  logger,
  customProps: (req, res) => {
    return {
      request_id: req.id,
      user_id: req.user ? req.user.id : null,
      method: req.method,
      endpoint: req.url,
      status: res.statusCode,
    };
  },
  serializers: {
    req: () => undefined,
    res: () => undefined,
  },
});

module.exports = loggerMiddleware;
