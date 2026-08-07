const { z } = require('zod');
const ResponseHelper = require('../helpers/response.helper');

class CollectionValidator {
  static createCollection(req, res, next) {
    const schema = z.object({
      warung_id: z.number().int().positive(),
      visit_id: z.number().int().positive(),
      collection_date: z.string().datetime()
        .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format')),
      notes: z.string().optional()
    });

    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      const errors = error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', 'Validation Failed', errors);
    }
  }

  static addInvoice(req, res, next) {
    const schema = z.object({
      transaction_id: z.number().int().positive()
    });

    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      const errors = error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', 'Validation Failed', errors);
    }
  }

  static finishCollection(req, res, next) {
    const schema = z.object({
      failure_reason: z.enum([
        'CUSTOMER_NOT_FOUND',
        'CUSTOMER_CLOSED',
        'CUSTOMER_REFUSED',
        'CUSTOMER_NO_CASH',
        'CUSTOMER_PROMISE_TO_PAY',
        'OTHER'
      ]).optional(),
      notes: z.string().optional()
    });

    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      const errors = error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', 'Validation Failed', errors);
    }
  }
}

module.exports = CollectionValidator;
