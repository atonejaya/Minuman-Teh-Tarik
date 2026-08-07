const ResponseHelper = require('../helpers/response.helper');
const logger = require('../config/logger');

const errorMiddleware = (err, req, res, next) => {
  console.error("Unhandled Error Caught:", err.message, err.stack);
  logger.error({ request_id: req.id, err: err.message, stack: err.stack }, 'Unhandled Error');
  
  if (err.isJoi || err.name === 'ZodError') {
    return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', 'Validation Failed', err.errors || err.issues);
  }
  
  return ResponseHelper.error(res, err);
};

module.exports = errorMiddleware;
