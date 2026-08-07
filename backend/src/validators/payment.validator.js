const { z } = require('zod');

const createPaymentSchema = z.object({
  transaction_id: z.number().int().positive('Transaction ID tidak valid'),
  payment_method: z.enum(['CASH', 'QRIS', 'TRANSFER', 'CREDIT'], {
    errorMap: () => ({ message: 'Metode pembayaran tidak valid' })
  }),
  payment_date: z.string().datetime({ message: 'Format tanggal pembayaran tidak valid' }),
  amount: z.number().positive('Nominal pembayaran harus lebih besar dari 0'),
  notes: z.string().optional(),
  collection_id: z.number().int().positive().optional()
});

module.exports = {
  createPaymentSchema
};
