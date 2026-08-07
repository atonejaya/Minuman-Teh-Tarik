const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
  remember_me: z.boolean().optional(),
});

module.exports = {
  loginSchema,
};
