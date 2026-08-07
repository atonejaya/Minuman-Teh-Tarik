const path = require('path');
const fs = require('fs');
const { BadRequestError } = require('../exceptions/api-error');

class UploadService {
  static async uploadImage(file) {
    if (!file) {
      throw new BadRequestError('FILE_MISSING', 'File is required');
    }

    // Since we'll use multer to save it to an uploads/ directory locally for now,
    // this service will simply validate and format the URL.
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      // Clean up the invalid uploaded file
      fs.unlinkSync(file.path);
      throw new BadRequestError('INVALID_FILE_TYPE', 'Only JPEG, PNG, and WebP are allowed');
    }

    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxFileSize) {
      fs.unlinkSync(file.path);
      throw new BadRequestError('FILE_TOO_LARGE', 'File size exceeds 5MB');
    }

    // Assuming multer is configured to save to 'public/uploads'
    // Format the URL relative to the public directory
    const fileUrl = `/uploads/${file.filename}`;
    return fileUrl;
  }
}

module.exports = UploadService;
