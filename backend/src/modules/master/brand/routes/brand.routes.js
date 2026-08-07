const express = require('express');
const router = express.Router();
const BrandController = require('../controllers/BrandController');
const authMiddleware = require('../../../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', BrandController.getAll);
router.get('/:id', BrandController.getById);
router.post('/', BrandController.create);
router.put('/:id', BrandController.update);
router.patch('/:id/status', BrandController.updateStatus);

module.exports = router;
