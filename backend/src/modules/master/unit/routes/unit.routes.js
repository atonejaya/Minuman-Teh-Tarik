const express = require('express');
const router = express.Router();
const UnitController = require('../controllers/UnitController');
const authMiddleware = require('../../../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', UnitController.getAll);
router.get('/:id', UnitController.getById);
router.post('/', UnitController.create);
router.put('/:id', UnitController.update);
router.patch('/:id/status', UnitController.updateStatus);

module.exports = router;
