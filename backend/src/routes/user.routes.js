const express = require('express');
const UserController = require('../controllers/user.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

const router = express.Router();

router.use(authenticate, authorize(['OWNER']));

router.get('/', UserController.getAll);
router.post('/', UserController.create);
router.get('/:id', UserController.getById);
router.put('/:id', UserController.update);
router.put('/:id/password', UserController.updatePassword);
router.delete('/:id', UserController.delete);

module.exports = router;
