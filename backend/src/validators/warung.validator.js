const { z } = require('zod');

const DayOfWeekEnum = z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);
const WarungStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'BLACKLIST']);

const createWarungSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(255),
  owner_name: z.string().min(1, 'Owner name is required').max(255),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  visit_day: DayOfWeekEnum.optional().nullable(),
  visit_order: z.number().int().min(1).optional().nullable(),
  target_cups: z.number().int().min(0).default(0),
  status: WarungStatusEnum.default('ACTIVE'),
  assigned_sales_id: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable()
});

const updateWarungSchema = createWarungSchema.partial();

module.exports = {
  createWarungSchema,
  updateWarungSchema
};
