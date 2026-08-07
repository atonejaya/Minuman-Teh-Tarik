const express = require('express');
const router = express.Router();
const SalesStockIssueController = require('../controllers/SalesStockIssueController');

router.get('/', SalesStockIssueController.getAll);
router.get('/:id', SalesStockIssueController.getById);
router.post('/', SalesStockIssueController.createDraft);
router.post('/:id/confirm', SalesStockIssueController.confirm);
router.post('/:id/close', SalesStockIssueController.close);

module.exports = router;
