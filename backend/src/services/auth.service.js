const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const jwtConfig = require('../config/jwt');
const DTOHelper = require('../helpers/dto.helper');
const { UnauthorizedError, NotFoundError } = require('../exceptions/api-error');

class AuthService {
  static async login(username, password, rememberMe) {
    const userList = await userRepository.findMany({ username });
    const user = userList.length > 0 ? userList[0] : null;

    if (!user || !user.is_active) {
      throw new UnauthorizedError('INVALID_LOGIN', 'Username tidak ditemukan atau akun tidak aktif');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('INVALID_LOGIN', 'Password salah');
    }

    await userRepository.update(user.id, { last_login_at: new Date() });

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const expiresIn = rememberMe ? '30d' : jwtConfig.EXPIRES_IN;
    const token = jwt.sign(payload, jwtConfig.SECRET, { expiresIn });

    return {
      token,
      user: DTOHelper.toUser(user),
    };
  }

  static async getProfileDashboard(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', 'User tidak ditemukan');
    }

    // Dummy dashboard metrics for now. Will be provided by DashboardService later.
    const dashboard = {
      total_sales: 0,
      visit_progress: 0
    };

    return {
      profile: DTOHelper.toUser(user),
      dashboard
    };
  }
}

module.exports = AuthService;
