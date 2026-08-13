const express = require('express');
const router = express.Router();
const arQueryController = require('../controllers/ar-query.controller');
const authenticate = require('../../../../middleware/auth.middleware');
const authorize = require('../../../../middleware/role.middleware');

// Protect all routes
router.use(authenticate);

// Sales View (AR-01) - Authorized for SALES, OWNER, ADMIN
router.get('/outlets/:warungId/ar', authorize(['SALES', 'OWNER', 'ADMIN']), arQueryController.getSalesOutletAR);

// Owner Collection View (AR-02) - Authorized for OWNER, ADMIN only
router.get('/ar/collection', authorize(['OWNER', 'ADMIN']), arQueryController.getOwnerCollectionAR);

module.exports = router;
