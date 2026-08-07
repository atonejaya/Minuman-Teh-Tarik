const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../../middleware/auth.middleware');
const WarehouseTransferController = require('../controllers/WarehouseTransferController');

router.use(authMiddleware);

router.post('/issue', WarehouseTransferController.issueStockToSales);
router.post('/return', WarehouseTransferController.receiveReturnedStock);
router.post('/sales-days/close', WarehouseTransferController.closeSalesDay);

router.get('/sales-days', WarehouseTransferController.getSalesDays);
router.get('/ledger', WarehouseTransferController.getLedger);
router.get('/', WarehouseTransferController.listTransfers);
router.get('/:id', WarehouseTransferController.getTransfer);

module.exports = router;
