const Joi = require('joi');

const commonFilterSchema = {
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').optional(),
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().optional(),
  top: Joi.number().integer().min(1).max(50).default(10),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
};

const dashboardValidator = {
  summary: Joi.object({
    date_from: Joi.date().iso().optional(),
    date_to: Joi.date().iso().optional(),
  }),
  salesAnalytics: Joi.object({
    ...commonFilterSchema
  }),
  productAnalytics: Joi.object({
    ...commonFilterSchema
  }),
  customerAnalytics: Joi.object({
    ...commonFilterSchema
  }),
  receivableAnalytics: Joi.object({
    ...commonFilterSchema
  }),
};

module.exports = dashboardValidator;
