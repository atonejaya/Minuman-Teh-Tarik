const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collection.controller');
const collectionValidator = require('../validators/collection.validator');
const authenticate = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/', collectionValidator.createCollection, collectionController.create);
router.post('/:id/invoices', collectionValidator.addInvoice, collectionController.addInvoice);
router.post('/:id/finish', collectionValidator.finishCollection, collectionController.finish);
router.get('/', collectionController.getAll);
router.get('/:id', collectionController.getById);

module.exports = router;
