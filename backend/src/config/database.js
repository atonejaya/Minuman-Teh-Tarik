const { PrismaClient } = require('@prisma/client');
const env = require('./env');

const rawConnectionString = env.DATABASE_URL;
const connectionString = rawConnectionString.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
let prisma;

if (connectionString.startsWith('prisma+postgres://')) {
  // Use accelerateUrl for Prisma Dev proxy
  prisma = new PrismaClient({ accelerateUrl: connectionString });
} else {
  const { Pool } = require('pg');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
}

module.exports = prisma;
