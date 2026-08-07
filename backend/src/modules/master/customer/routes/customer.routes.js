const express = require('express');
const router = express.Router();
const controller = require('../controllers/CustomerController');
const authMiddleware = require('../../../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/search', controller.getAll); // /search handles the exact same query params with ?search= keyword
router.get('/', controller.getAll);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.patch('/:id/status', controller.updateStatus);
router.get('/:id/dashboard', controller.getDashboard);

module.exports = router;
