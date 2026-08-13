const { z } = require('zod');

// Schema for create product
const createProductSchema = z.object({
  code: z.string().min(1, 'Product code is required'),
  name: z.string().min(1, 'Product name is required'),
  category: z.enum([
    'MINUMAN',
    'SIRUP',
    'BUBUK',
    'TOPPING',
    'CUP',
    'LID',
    'SEDOTAN',
    'BAHAN_LAIN'
  ], {
    errorMap: () => ({ message: 'Invalid product category' })
  }),
  unit: z.string().min(1, 'Unit is required'),
  cost_price: z.number().min(0, 'Cost price cannot be negative'),
  shelf_life: z.number().int().min(0, 'Shelf life must be a positive integer'),
  display_order: z.number().int().min(0).default(0),
  description: z.string().optional(),
  is_active: z.boolean().default(true)
});

// Schema for update product
const updateProductSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  category: z.enum([
    'MINUMAN',
    'SIRUP',
    'BUBUK',
    'TOPPING',
    'CUP',
    'LID',
    'SEDOTAN',
    'BAHAN_LAIN'
  ]).optional(),
  unit: z.string().min(1).optional(),
  cost_price: z.number().min(0).optional(),
  shelf_life: z.number().int().min(0).optional(),
  display_order: z.number().int().min(0).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional()
});

module.exports = {
  createProductSchema,
  updateProductSchema
};
