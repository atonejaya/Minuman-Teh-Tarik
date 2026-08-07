const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  API_PREFIX: z.string().default('/api/v1'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL must be provided'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET must be provided'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REMEMBER_EXPIRES_IN: z.string().default('30d'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('uploads'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Application failed to start.');
  console.error('Missing or invalid Environment Variables:');
  _env.error.issues.forEach(issue => {
    console.error(`- ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

module.exports = _env.data;
