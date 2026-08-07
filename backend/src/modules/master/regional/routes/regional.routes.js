const express = require('express');
const router = express.Router();
const RegionalController = require('../controllers/RegionalController');
const authMiddleware = require('../../../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', RegionalController.getAll);
router.get('/:id', RegionalController.getById);
router.post('/', RegionalController.create);
router.put('/:id', RegionalController.update);
router.patch('/:id/status', RegionalController.updateStatus);

module.exports = router;
