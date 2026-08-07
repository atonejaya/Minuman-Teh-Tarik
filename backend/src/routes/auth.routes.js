const express = require('express');
const AuthController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');
const { loginRateLimiter } = require('../middleware/rate-limiter.middleware');

const router = express.Router();

router.post('/login', loginRateLimiter, AuthController.login);
router.post('/logout', authenticate, AuthController.logout);

module.exports = router;
