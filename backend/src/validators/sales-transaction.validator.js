const { z } = require('zod');

const createSalesTransactionSchema = z.object({
  visit_id: z.number().int().positive('Visit ID wajib diisi'),
  payment_method: z.enum(['CASH', 'QRIS', 'TRANSFER', 'CREDIT'], { errorMap: () => ({ message: 'Metode pembayaran tidak valid' }) }),
  transaction_discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.number().int().positive('Product ID wajib diisi'),
    qty: z.number().int().positive('Quantity harus lebih dari 0'),
    discount: z.number().min(0).default(0)
  })).min(1, 'Minimal 1 item')
});

module.exports = {
  createSalesTransactionSchema
};
