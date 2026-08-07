const { z } = require('zod');
const ResponseHelper = require('../helpers/response.helper');
const { BadRequestError } = require('../exceptions/api-error');

const createSettlementSchema = z.object({
  warehouse_id: z.number().int().positive()
});

const verifySettlementSchema = z.object({
  deposit: z.number().min(0),
  cash_on_hand: z.number().min(0),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    id: z.number().int().positive(),
    qty_actual: z.number().int().min(0)
  })).min(1),
  differences: z.array(z.object({
    item_id: z.number().int().positive(),
    qty: z.number().int().positive(),
    reason: z.enum(['LOST', 'DAMAGED_IN_TRANSIT', 'DATA_ENTRY_ERROR', 'THEFT', 'EXPIRED', 'BROKEN', 'OTHER']),
    notes: z.string().optional().nullable()
  })).optional()
});

class WarehouseSettlementValidator {
  validateCreate(req, res, next) {
    try {
      createSettlementSchema.parse(req.body);
      next();
    } catch (error) {
      return ResponseHelper.error(res, new BadRequestError('VALIDATION_ERROR', error.errors[0].message), 400);
    }
  }

  validateVerify(req, res, next) {
    try {
      verifySettlementSchema.parse(req.body);
      next();
    } catch (error) {
      return ResponseHelper.error(res, new BadRequestError('VALIDATION_ERROR', error.errors[0].message), 400);
    }
  }
}

module.exports = new WarehouseSettlementValidator();
