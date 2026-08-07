const express = require('express');
const router = express.Router();
const SalesReturnController = require('../controllers/SalesReturnController');

router.post('/', SalesReturnController.createDraft);
router.get('/', SalesReturnController.getAll);
router.get('/:id', SalesReturnController.getById);

router.post('/:id/check', SalesReturnController.checkReturn);
router.post('/:id/approve', SalesReturnController.approveReturn);
router.post('/:id/complete', SalesReturnController.completeReturn);
router.post('/:id/cancel', SalesReturnController.cancelReturn);

module.exports = router;
