const express = require('express');
const SalesTransactionController = require('../controllers/sales-transaction.controller');
const paymentController = require('../controllers/payment.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const router = express.Router();

router.use(authenticate);

// Sales endpoints
router.post('/', authorize(['SALES']), SalesTransactionController.create);
router.post('/:id/confirm', authorize(['SALES']), SalesTransactionController.confirm);
router.post('/:id/cancel', authorize(['SALES']), SalesTransactionController.cancel);
router.get('/:id', authorize(['SALES', 'ADMIN']), SalesTransactionController.getById);
router.get('/:id/payments', authorize(['SALES', 'ADMIN']), paymentController.getByTransaction);

module.exports = router;
