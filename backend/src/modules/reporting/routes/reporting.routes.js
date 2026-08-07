const express = require('express');
const router = express.Router();
const ReportingController = require('../controllers/ReportingController');
const authenticate = require('../../../middleware/auth.middleware');

// Apply authentication to all reporting routes
router.use(authenticate);

/**
 * @openapi
 * tags:
 *   name: Reports
 *   description: Enterprise Reporting APIs strictly using CQRS Read Models (Projections)
 */

/**
 * @openapi
 * /reports/daily-sales:
 *   get:
 *     tags: [Reports]
 *     summary: Get Daily Sales Summary
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
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
 *       - in: query
 *         name: warehouse_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sales_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/daily-sales', ReportingController.getDailySales);

/**
 * @openapi
 * /reports/customer-ledger:
 *   get:
 *     tags: [Reports]
 *     summary: Get Customer Ledger
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: outstanding_only
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/customer-ledger', ReportingController.getCustomerLedger);

/**
 * @openapi
 * /reports/product-sales:
 *   get:
 *     tags: [Reports]
 *     summary: Get Product Sales Summary
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: product_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: warehouse_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/product-sales', ReportingController.getProductSales);

/**
 * @openapi
 * /reports/sales-performance:
 *   get:
 *     tags: [Reports]
 *     summary: Get Sales Performance Summary
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: sales_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: warehouse_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/sales-performance', ReportingController.getSalesPerformance);

module.exports = router;
