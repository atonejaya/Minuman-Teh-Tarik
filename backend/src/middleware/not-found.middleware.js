const ResponseHelper = require('../helpers/response.helper');

const notFoundMiddleware = (req, res, next) => {
  return ResponseHelper.notFound(res, 'ENDPOINT_NOT_FOUND', `Endpoint ${req.method} ${req.url} not found`);
};

module.exports = notFoundMiddleware;
