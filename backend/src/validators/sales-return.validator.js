const { z } = require('zod');

const createReturnSchema = z.object({
  visit_id: z.number().int().positive().optional(),
  transaction_id: z.number().int().positive({ message: "Transaction ID is required" }),
  return_date: z.string().refine(date => !isNaN(Date.parse(date)), { message: "Invalid date format" }),
  notes: z.string().optional()
});

const addReturnItemSchema = z.object({
  product_id: z.number().int().positive({ message: "Product ID is required" }),
  batch_id: z.number().int().positive({ message: "Batch ID is required" }),
  qty: z.number().int().positive({ message: "Quantity must be greater than 0" }),
  condition: z.enum(['GOOD', 'DAMAGED'], { errorMap: () => ({ message: "Condition must be GOOD or DAMAGED" }) }),
  reason: z.enum(['DAMAGED', 'LEAKED', 'WRONG_ITEM', 'EXPIRED', 'NOT_SOLD', 'OTHER']),
  item_price: z.number().positive({ message: "Item price must be positive" })
});

module.exports = {
  createReturnSchema,
  addReturnItemSchema
};
