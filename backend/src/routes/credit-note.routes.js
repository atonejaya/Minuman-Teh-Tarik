const express = require('express');
const router = express.Router();
const creditNoteController = require('../controllers/credit-note.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', creditNoteController.getCreditNotes);
router.get('/:id', creditNoteController.getCreditNoteById);

module.exports = router;
