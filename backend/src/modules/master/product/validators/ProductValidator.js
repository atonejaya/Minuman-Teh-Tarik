const Joi = require('joi');

const ProductValidator = {
  create: Joi.object({
    name: Joi.string().required(),
    short_name: Joi.string().allow(null, ''),
    description: Joi.string().allow(null, ''),
    barcode: Joi.string().allow(null, ''),
    category_id: Joi.number().integer().required(),
    brand_id: Joi.number().integer().required(),
    packaging_id: Joi.number().integer().required(),
    unit_id: Joi.number().integer().required(),
    supplier_id: Joi.number().integer().allow(null),
    tax_id: Joi.number().integer().allow(null),
    warehouse_id: Joi.number().integer().allow(null),
    cost_price: Joi.number().min(0).required(),
    minimum_stock: Joi.number().integer().min(0).default(0),
    maximum_stock: Joi.number().integer().min(Joi.ref('minimum_stock')).allow(null)
      .messages({ 'number.min': 'Maximum stock must be greater than or equal to minimum stock' }),
    reorder_level: Joi.number().integer().min(0).default(0),
    weight: Joi.number().min(0).allow(null),
    volume: Joi.number().min(0).allow(null),
    shelf_life: Joi.number().integer().min(0).required(),
    display_order: Joi.number().integer().default(0),
    is_sellable: Joi.boolean().default(true),
    is_active: Joi.boolean().default(true)
  }),

  update: Joi.object({
    name: Joi.string(),
    short_name: Joi.string().allow(null, ''),
    description: Joi.string().allow(null, ''),
    barcode: Joi.string().allow(null, ''),
    category_id: Joi.number().integer(),
    brand_id: Joi.number().integer(),
    packaging_id: Joi.number().integer(),
    unit_id: Joi.number().integer(),
    supplier_id: Joi.number().integer().allow(null),
    tax_id: Joi.number().integer().allow(null),
    warehouse_id: Joi.number().integer().allow(null),
    cost_price: Joi.number().min(0),
    minimum_stock: Joi.number().integer().min(0),
    maximum_stock: Joi.number().integer().allow(null),
    reorder_level: Joi.number().integer().min(0),
    weight: Joi.number().min(0).allow(null),
    volume: Joi.number().min(0).allow(null),
    shelf_life: Joi.number().integer().min(0),
    display_order: Joi.number().integer(),
    is_sellable: Joi.boolean(),
    is_active: Joi.boolean()
  }).min(1),

  updateStatus: Joi.object({
    status: Joi.string().valid('ACTIVE', 'INACTIVE').required()
  })
};

module.exports = ProductValidator;
