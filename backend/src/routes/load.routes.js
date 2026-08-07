const express = require('express');
const router = express.Router();
const LoadController = require('../controllers/load.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

router.use(authMiddleware);

router.post('/', roleMiddleware(['OWNER']), LoadController.create);
router.get('/', roleMiddleware(['OWNER', 'SALES']), LoadController.getLoads);
router.get('/:id', roleMiddleware(['OWNER', 'SALES']), LoadController.getById);
router.put('/:id/confirm', roleMiddleware(['OWNER']), LoadController.confirm);
router.put('/:id/cancel', roleMiddleware(['OWNER']), LoadController.cancel);

module.exports = router;
