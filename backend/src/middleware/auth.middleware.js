const jwt = require('jsonwebtoken');
const ResponseHelper = require('../helpers/response.helper');
const jwtConfig = require('../config/jwt');

const prisma = require('../config/database');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ResponseHelper.unauthorized(res, 'Token tidak ditemukan');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwtConfig.SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    
    if (!user || !user.is_active) {
      return ResponseHelper.unauthorized(res, 'Akun Anda tidak aktif atau tidak ditemukan');
    }
    
    req.user = user;
    next();
  } catch (error) {
    return ResponseHelper.unauthorized(res, 'Token tidak valid atau kadaluarsa');
  }
};

module.exports = authenticate;
