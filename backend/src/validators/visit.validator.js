const { z } = require('zod');

const generatePlanSchema = z.object({
  date: z.string().datetime().optional()
});

const checkInSchema = z.object({
  warung_id: z.number().int().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  before_photo_url: z.string().url(),
  date: z.string().datetime().optional()
});

const checkOutSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  after_photo_url: z.string().url(),
  signature_url: z.string().url().optional()
});

const cancelSchema = z.object({
  reason: z.string().min(5)
});

module.exports = {
  generatePlanSchema,
  checkInSchema,
  checkOutSchema,
  cancelSchema
};
