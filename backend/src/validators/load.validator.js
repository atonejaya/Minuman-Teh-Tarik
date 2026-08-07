const { z } = require('zod');

const createLoadSchema = z.object({
  warehouse_id: z.number().int().positive('Warehouse ID harus bilangan bulat positif'),
  sales_id: z.number().int().positive('Sales ID harus bilangan bulat positif'),
  load_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Format tanggal tidak valid',
  }),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      product_id: z.number().int().positive('Product ID harus bilangan bulat positif'),
      batch_id: z.number().int().positive('Batch ID harus bilangan bulat positif'),
      qty: z.number().int().positive('Qty harus bilangan bulat positif (> 0)'),
    })
  ).min(1, 'Load harus memiliki minimal 1 item'),
});

const getLoadsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sales_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
  warehouse_id: z.string().regex(/^\d+$/).transform(Number).optional(),
});

module.exports = {
  createLoadSchema,
  getLoadsQuerySchema
};
