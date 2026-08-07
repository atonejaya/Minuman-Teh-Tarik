const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../../middleware/auth.middleware');
const OutletInventoryController = require('../controllers/OutletInventoryController');

router.use(authMiddleware);

router.put('/par-stock', OutletInventoryController.upsertParStock);
router.get('/par-stock', OutletInventoryController.getParStock);

router.get('/:warungId/projection', OutletInventoryController.getProjection);
router.get('/:warungId/ledger', OutletInventoryController.getLedger);
router.get('/:warungId/stock-counts', OutletInventoryController.getStockCounts);
router.post('/:warungId/stock-count', OutletInventoryController.recordStockCount);

module.exports = router;
