const express = require('express');
const warehouseSettlementController = require('../controllers/warehouse-settlement.controller');
const warehouseSettlementValidator = require('../validators/warehouse-settlement.validator');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post(
  '/',
  warehouseSettlementValidator.validateCreate,
  warehouseSettlementController.createSettlement
);

router.put(
  '/:id/counting',
  warehouseSettlementController.startCounting
);

router.put(
  '/:id/verify',
  warehouseSettlementValidator.validateVerify,
  warehouseSettlementController.verifySettlement
);

router.put(
  '/:id/complete',
  warehouseSettlementController.completeSettlement
);

module.exports = router;
