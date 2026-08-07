const express = require('express');
const router = express.Router();
const ProductPriceController = require('../controllers/ProductPriceController');
const authMiddleware = require('../../../../middleware/auth.middleware');

router.get('/:id/prices', authMiddleware, ProductPriceController.getPricesByProductId);
router.post('/:id/prices', authMiddleware, ProductPriceController.createPrice);
router.put('/:id/prices/:priceId', authMiddleware, ProductPriceController.updatePrice);
router.patch('/:id/prices/:priceId/status', authMiddleware, ProductPriceController.updatePriceStatus);

module.exports = router;
