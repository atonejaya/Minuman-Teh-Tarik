const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../../middleware/auth.middleware');
const roleMiddleware = require('../../../../middleware/role.middleware');
const SalesVisitController = require('../controllers/SalesVisitController');

const VISIT_ROLES = ['SALES', 'ADMIN', 'OWNER'];

router.use(authMiddleware);
router.use(roleMiddleware(VISIT_ROLES));

router.post('/', SalesVisitController.createVisit);
router.get('/', SalesVisitController.listVisits);
router.get('/:id', SalesVisitController.getVisit);
router.get('/:id/timeline', SalesVisitController.getTimeline);
router.get('/:id/inventory', SalesVisitController.getInventory);
router.get('/:id/sales-history', SalesVisitController.getSalesHistory);

router.post('/:id/check-in', SalesVisitController.checkIn);
router.post('/:id/stock-count', SalesVisitController.recordStockCount);
router.post('/:id/order', SalesVisitController.recordOrder);
router.post('/:id/delivery', SalesVisitController.recordDelivery);
router.post('/:id/check-out', SalesVisitController.checkOut);
router.post('/:id/complete', SalesVisitController.complete);
router.post('/:id/cancel', SalesVisitController.cancel);
router.post('/:id/notes', SalesVisitController.addNote);
router.post('/:id/photos', SalesVisitController.addPhoto);

module.exports = router;
