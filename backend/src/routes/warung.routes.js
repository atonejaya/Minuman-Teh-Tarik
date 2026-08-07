const express = require('express');
const WarungController = require('../controllers/warung.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

const router = express.Router();

router.use(authenticate);

// Routes for both OWNER and SALES
router.get('/today', authorize(['OWNER', 'SALES']), WarungController.getToday);
router.get('/route', authorize(['OWNER', 'SALES']), WarungController.getRoute);
router.get('/', authorize(['OWNER', 'SALES']), WarungController.list);
router.get('/:id', authorize(['OWNER', 'SALES']), WarungController.getById);

// Routes for OWNER only
router.post('/', authorize(['OWNER']), WarungController.create);
router.put('/:id', authorize(['OWNER']), WarungController.update);
router.delete('/:id', authorize(['OWNER']), WarungController.delete);
router.put('/:id/restore', authorize(['OWNER']), WarungController.restore);

module.exports = router;
