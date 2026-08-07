const Joi = require('joi');

const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().optional(),
  order: Joi.string().valid('asc', 'desc').default('desc'),
};

const dateFilterSchema = {
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().optional(),
};

const reportingValidator = {
  dailySales: Joi.object({
    ...paginationSchema,
    ...dateFilterSchema,
    warehouse_id: Joi.number().integer().optional(),
    sales_id: Joi.number().integer().optional(),
  }),

  customerLedger: Joi.object({
    ...paginationSchema,
    customer_id: Joi.number().integer().optional(),
    outstanding_only: Joi.boolean().optional(),
  }),

  productSales: Joi.object({
    ...paginationSchema,
    product_id: Joi.number().integer().optional(),
    warehouse_id: Joi.number().integer().optional(),
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').optional(), // placeholder if period grouping needed, although projection is flat now
  }),

  salesPerformance: Joi.object({
    ...paginationSchema,
    sales_id: Joi.number().integer().optional(),
    warehouse_id: Joi.number().integer().optional(),
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').optional(),
  }),
};

module.exports = reportingValidator;
