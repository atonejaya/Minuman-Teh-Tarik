const AuthService = require('../services/auth.service');
const ResponseHelper = require('../helpers/response.helper');
const { loginSchema } = require('../validators/auth.validator');

class AuthController {
  static async login(req, res, next) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', 'Validasi gagal', parsed.error.flatten().fieldErrors);
      }

      const { username, password, remember_me } = parsed.data;
      const data = await AuthService.login(username, password, remember_me);
      
      return ResponseHelper.success(res, data, null, 'Login berhasil');
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      return ResponseHelper.success(res, null, null, 'Logout berhasil');
    } catch (error) {
      next(error);
    }
  }

  static async getMeDashboard(req, res, next) {
    try {
      const { sub } = req.user;
      
      const data = await AuthService.getProfileDashboard(sub);

      return ResponseHelper.success(res, data, null, 'Dashboard retrieved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
