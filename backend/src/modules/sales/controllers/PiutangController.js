const PiutangService = require('../services/PiutangService');
const ResponseHelper = require('../../../helpers/response.helper');

class PiutangController {
  async getDashboardMetrics(req, res, next) {
    try {
      const metrics = await PiutangService.getDashboardMetrics();
      return ResponseHelper.success(res, metrics, null, 'Piutang metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PiutangController();
