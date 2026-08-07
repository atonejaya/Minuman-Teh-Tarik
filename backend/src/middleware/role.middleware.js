const ResponseHelper = require('../helpers/response.helper');

const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return ResponseHelper.forbidden(res, 'Anda tidak memiliki hak akses untuk aksi ini');
    }
    next();
  };
};

module.exports = authorize;
