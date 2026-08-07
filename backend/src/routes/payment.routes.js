const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authenticate = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/', paymentController.create);
router.get('/', paymentController.getAll);
router.get('/:id', paymentController.getById);

module.exports = router;
