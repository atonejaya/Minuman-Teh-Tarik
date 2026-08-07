const Joi = require('joi');

const createCustomerSchema = Joi.object({
  name: Joi.string().required(),
  owner_name: Joi.string().required(),
  phone: Joi.string().allow(null, ''),
  whatsapp: Joi.string().allow(null, ''),
  email: Joi.string().email().allow(null, ''),
  address: Joi.string().allow(null, ''),
  province: Joi.string().allow(null, ''),
  city: Joi.string().allow(null, ''),
  district: Joi.string().allow(null, ''),
  village: Joi.string().allow(null, ''),
  postal_code: Joi.string().allow(null, ''),
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  visit_day: Joi.string().valid('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY').allow(null),
  visit_week: Joi.string().valid('WEEK_1', 'WEEK_2', 'WEEK_3', 'WEEK_4', 'ALL_WEEKS').allow(null),
  visit_order: Joi.number().integer().allow(null),
  payment_term: Joi.number().integer().default(0),
  credit_limit: Joi.number().precision(2).default(0),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'BLACKLIST', 'CLOSED').default('ACTIVE'),
  assigned_sales_id: Joi.number().integer().allow(null),
  category_id: Joi.number().integer().allow(null),
  area_id: Joi.number().integer().allow(null),
  route_id: Joi.number().integer().allow(null)
});

const updateCustomerSchema = createCustomerSchema.keys({
  name: Joi.string().optional(),
  owner_name: Joi.string().optional(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional()
}).append({
  transfer_reason: Joi.string().allow(null, ''),
  override_transfer_restriction: Joi.boolean().default(false)
});

const updateCustomerStatusSchema = Joi.object({
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'BLACKLIST', 'CLOSED').required()
});

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
  updateCustomerStatusSchema
};
