const express = require('express');
const router = express.Router();
const ProductCategoryController = require('../controllers/ProductCategoryController');
const authMiddleware = require('../../../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', ProductCategoryController.getAll);
router.get('/:id', ProductCategoryController.getById);
router.post('/', ProductCategoryController.create);
router.put('/:id', ProductCategoryController.update);
router.patch('/:id/status', ProductCategoryController.updateStatus);

module.exports = router;
