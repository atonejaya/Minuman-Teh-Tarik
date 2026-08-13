const arQueryService = require('../services/ar-query.service');
const ApiError = require('../../../../exceptions/api-error');

class ARQueryController {
  async getSalesOutletAR(req, res, next) {
    try {
      const { warungId } = req.params;
      const salesId = req.user.id;
      const role = req.user.role;

      const result = await arQueryService.getSalesOutletAR(warungId, salesId, role);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getOwnerCollectionAR(req, res, next) {
    try {
      const { aging_bucket, sort_by, sort_dir } = req.query;
      
      // Validation
      const validBuckets = ['CURRENT', '1_7_DAYS', '8_14_DAYS', '15_30_DAYS', 'OVER_30_DAYS'];
      if (aging_bucket && !validBuckets.includes(aging_bucket)) {
        throw new ApiError(422, 'Invalid aging_bucket');
      }
      
      const validSort = ['outstanding', 'overdue', 'due_date'];
      if (sort_by && !validSort.includes(sort_by)) {
        throw new ApiError(422, 'Invalid sort_by');
      }
      
      const validDir = ['asc', 'desc'];
      if (sort_dir && !validDir.includes(sort_dir)) {
        throw new ApiError(422, 'Invalid sort_dir');
      }

      const result = await arQueryService.getOwnerCollectionAR(req.query);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ARQueryController();
