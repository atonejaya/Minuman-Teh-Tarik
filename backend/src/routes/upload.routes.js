const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const UploadController = require('../controllers/upload.controller');
const authenticate = require('../middleware/auth.middleware');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename using crypto
    const uniqueSuffix = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage: storage });

// POST /api/v1/uploads
router.post('/', authenticate, upload.single('file'), UploadController.uploadFile);

module.exports = router;
