const { z } = require('zod');

const createUserSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter").max(50),
  password: z.string().min(8, "Password minimal 8 karakter"),
  name: z.string().min(1, "Nama tidak boleh kosong").max(100),
  phone: z.string().min(5).max(20).optional().nullable(),
  role: z.enum(['OWNER', 'SALES']),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(5).max(20).optional().nullable(),
  role: z.enum(['OWNER', 'SALES']).optional(),
  is_active: z.boolean().optional(),
});

const updatePasswordSchema = z.object({
  password: z.string().min(8, "Password minimal 8 karakter"),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  updatePasswordSchema,
};
