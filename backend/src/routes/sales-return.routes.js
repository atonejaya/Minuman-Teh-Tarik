const express = require('express');
const router = express.Router();
const salesReturnController = require('../controllers/sales-return.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', salesReturnController.getReturns);
router.get('/:id', salesReturnController.getReturnById);
router.post('/', salesReturnController.createReturn);
router.post('/:id/items', salesReturnController.addReturnItem);
router.post('/:id/confirm', salesReturnController.confirmReturn);

module.exports = router;
