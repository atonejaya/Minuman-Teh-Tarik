const express = require('express');
const router = express.Router();
const LoadController = require('../controllers/load.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

router.use(authMiddleware);

router.get('/mobile-stock', roleMiddleware(['OWNER', 'SALES']), LoadController.getMobileStock);

module.exports = router;
