const express = require('express');
const router = express.Router();
const RouteController = require('../controllers/RouteController');
const authMiddleware = require('../../../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', RouteController.getAll);
router.get('/:id', RouteController.getById);
router.post('/', RouteController.create);
router.put('/:id', RouteController.update);
router.patch('/:id/status', RouteController.updateStatus);

module.exports = router;
