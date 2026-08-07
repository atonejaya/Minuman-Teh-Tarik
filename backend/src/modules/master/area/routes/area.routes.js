const express = require('express');
const router = express.Router();
const AreaController = require('../controllers/AreaController');
const authMiddleware = require('../../../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', AreaController.getAll);
router.get('/:id', AreaController.getById);
router.post('/', AreaController.create);
router.put('/:id', AreaController.update);
router.patch('/:id/status', AreaController.updateStatus);

module.exports = router;
