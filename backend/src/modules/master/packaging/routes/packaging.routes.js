const express = require('express');
const router = express.Router();
const PackagingController = require('../controllers/PackagingController');
const authMiddleware = require('../../../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', PackagingController.getAll);
router.get('/:id', PackagingController.getById);
router.post('/', PackagingController.create);
router.put('/:id', PackagingController.update);
router.patch('/:id/status', PackagingController.updateStatus);

module.exports = router;
