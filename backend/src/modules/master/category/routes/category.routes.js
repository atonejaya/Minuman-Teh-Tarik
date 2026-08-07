const express = require('express');
const router = express.Router();
const CustomerCategoryController = require('../controllers/CustomerCategoryController');
const authMiddleware = require('../../../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', CustomerCategoryController.getAll);
router.get('/:id', CustomerCategoryController.getById);
router.post('/', CustomerCategoryController.create);
router.put('/:id', CustomerCategoryController.update);
router.patch('/:id/status', CustomerCategoryController.updateStatus);

module.exports = router;
