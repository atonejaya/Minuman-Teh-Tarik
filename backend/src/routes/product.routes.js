const express = require('express');
const ProductController = require('../controllers/product.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

const router = express.Router();

// Middleware: Authenticate for all product routes
router.use(authenticate);

// Public (authenticated) routes (OWNER & SALES)
router.get('/', ProductController.getAll.bind(ProductController));
router.get('/active', ProductController.getActive.bind(ProductController));
router.get('/:id', ProductController.getById.bind(ProductController));

// Mutation routes (OWNER only)
router.use(authorize('OWNER'));
router.post('/', ProductController.create.bind(ProductController));
router.put('/:id', ProductController.update.bind(ProductController));
router.delete('/:id', ProductController.delete.bind(ProductController));
router.put('/:id/restore', ProductController.restore.bind(ProductController));

module.exports = router;
