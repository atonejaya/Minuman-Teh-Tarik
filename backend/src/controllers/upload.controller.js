const ResponseHelper = require('../helpers/response.helper');
const UploadService = require('../services/upload.service');

class UploadController {
  static async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        return ResponseHelper.badRequest(res, 'FILE_MISSING', 'File is required');
      }
      
      const fileUrl = await UploadService.uploadImage(req.file);
      
      return ResponseHelper.success(res, { file_url: fileUrl }, null, 'File uploaded successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UploadController;
