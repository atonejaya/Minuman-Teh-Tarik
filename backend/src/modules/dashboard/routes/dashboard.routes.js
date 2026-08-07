const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const authenticate = require('../../../middleware/auth.middleware');

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   name: Dashboard
 *   description: Operational Dashboard API driven purely by Reporting Layer (CQRS Read Models)
 */

/**
 * @openapi
 * /dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get Dashboard Summary
 *     description: Returns main KPIs like omzet, invoices, total piutang, active customers, etc.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', DashboardController.getSummary);

/**
 * @openapi
 * /dashboard/sales:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get Sales Analytics
 *     description: Returns daily/weekly/monthly trends for sales, invoices, and payments.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/sales', DashboardController.getSalesAnalytics);

/**
 * @openapi
 * /dashboard/products:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get Product Analytics
 *     description: Returns top products, slow moving products, revenue per product, etc.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: top
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/products', DashboardController.getProductAnalytics);

/**
 * @openapi
 * /dashboard/customers:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get Customer Analytics
 *     description: Returns top customers, outstanding by customer, purchase frequency, etc.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: top
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/customers', DashboardController.getCustomerAnalytics);

/**
 * @openapi
 * /dashboard/receivables:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get Receivable Analytics
 *     description: Returns aging receivables, collection rate, credit note summary, etc.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: top
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/receivables', DashboardController.getReceivableAnalytics);

module.exports = router;
