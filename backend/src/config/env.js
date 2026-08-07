const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  API_PREFIX: z.string().default('/api/v1'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL must be provided'),
  DIRECT_URL: z.string().optional(), // Used by prisma migrate deploy only

  // Auth
  JWT_SECRET: z.string().min(1, 'JWT_SECRET must be provided'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REMEMBER_EXPIRES_IN: z.string().default('30d'),

  // CORS — required in production, defaults to localhost in development
  CORS_ORIGIN: z.string().optional(),

  // Build metadata (injected by CI/CD)
  BUILD_COMMIT: z.string().optional(),
  BUILD_DATE: z.string().optional(),

  // Supabase (optional — only needed for file uploads)
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
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

const env = _env.data;

// Production safety: CORS_ORIGIN must be set explicitly — never silently allow '*'
if (env.NODE_ENV === 'production' && !env.CORS_ORIGIN) {
  console.error('❌ Application failed to start.');
  console.error('  - CORS_ORIGIN: required in production. Set to your frontend domain (e.g., https://app.example.com).');
  process.exit(1);
}

// Apply defaults per environment
if (!env.CORS_ORIGIN) {
  env.CORS_ORIGIN = 'http://localhost:3000';
}

module.exports = env;
