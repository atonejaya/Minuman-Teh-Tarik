const express = require('express');
const router = express.Router();
const MasterLookupController = require('../controllers/MasterLookupController');

router.get('/', MasterLookupController.getAllLookups);

module.exports = router;
