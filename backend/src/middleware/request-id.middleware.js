const { v4: uuidv4 } = require('uuid');

const requestIdMiddleware = (req, res, next) => {
  const requestId = uuidv4();
  req.id = requestId;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

module.exports = requestIdMiddleware;
