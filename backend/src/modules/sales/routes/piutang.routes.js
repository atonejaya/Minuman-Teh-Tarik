const express = require('express');
const router = express.Router();
const piutangController = require('../controllers/PiutangController');

router.get('/', piutangController.getDashboardMetrics);

module.exports = router;
