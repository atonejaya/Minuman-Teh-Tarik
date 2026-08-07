const express = require('express');
const AuthController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/dashboard', authenticate, AuthController.getMeDashboard);

module.exports = router;
