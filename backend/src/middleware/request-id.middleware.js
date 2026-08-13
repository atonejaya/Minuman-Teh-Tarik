const { v4: uuidv4 } = require('uuid');

const requestIdMiddleware = (req, res, next) => {
  // Honor X-Request-ID from client (e.g., from API gateway or upstream service)
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.id = requestId;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

module.exports = requestIdMiddleware;
