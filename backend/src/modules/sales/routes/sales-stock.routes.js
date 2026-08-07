const express = require('express');
const router = express.Router();
const SalesStockController = require('../controllers/SalesStockController');

router.get('/:salesId/projection', SalesStockController.getProjection);
router.get('/:salesId/ledger', SalesStockController.getLedger);

module.exports = router;
