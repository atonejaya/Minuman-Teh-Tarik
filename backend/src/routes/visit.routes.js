const express = require('express');
const router = express.Router();
const VisitController = require('../controllers/visit.controller');
const authenticate = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

router.use(authenticate);

// Generate Visit Plan (Can be called by SALES or system, here we allow SALES)
router.post('/generate-plan', roleMiddleware(['SALES', 'OWNER']), VisitController.generateVisitPlan);

router.get('/today', roleMiddleware(['SALES']), VisitController.getTodayVisits);
router.get('/:id', VisitController.getVisitById);

router.post('/checkin', roleMiddleware(['SALES']), VisitController.checkIn);
router.post('/:id/start-selling', roleMiddleware(['SALES']), VisitController.startSelling);
router.post('/:id/checkout', roleMiddleware(['SALES']), VisitController.checkOut);
router.post('/:id/complete', roleMiddleware(['SALES']), VisitController.complete);
router.post('/:id/cancel', roleMiddleware(['SALES']), VisitController.cancel);

module.exports = router;
