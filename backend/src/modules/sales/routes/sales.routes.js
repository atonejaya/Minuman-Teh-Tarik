const express = require('express');
const router = express.Router();
const SalesTransactionController = require('../controllers/SalesTransactionController');
const authMiddleware = require('../../../middleware/auth'); // assuming standard auth middleware exists

// Note: You can uncomment authMiddleware if authentication is required for all these routes
// router.use(authMiddleware);

router.post('/draft', SalesTransactionController.createDraft);
router.post('/:id/items', SalesTransactionController.addItems);
router.post('/:id/confirm', SalesTransactionController.confirmTransaction);
router.post('/:id/payment', SalesTransactionController.receivePayment);

module.exports = router;
