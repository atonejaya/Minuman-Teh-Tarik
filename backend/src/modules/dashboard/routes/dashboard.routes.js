const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const authenticate = require('../../../middleware/auth.middleware');
const authorize = require('../../../middleware/role.middleware');

router.use(authenticate);

// Owner Routes (Only ADMIN or OWNER)
router.get('/owner/summary', authorize(['OWNER', 'ADMIN']), DashboardController.getOwnerSummary);
router.get('/owner/products', authorize(['OWNER', 'ADMIN']), DashboardController.getOwnerProducts);
router.get('/owner/visits', authorize(['OWNER', 'ADMIN']), DashboardController.getOwnerVisits);

// Sales Routes (Only SALES)
router.get('/sales/summary', authorize(['SALES']), DashboardController.getSalesSummary);
router.get('/sales/visits', authorize(['SALES']), DashboardController.getSalesVisits);
router.get('/sales/inventory', authorize(['SALES']), DashboardController.getSalesInventory);

module.exports = router;
