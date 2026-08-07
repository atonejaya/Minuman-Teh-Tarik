const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const prisma = require('./config/database');

const server = app.listen(env.PORT, () => {
  logger.info(`Server is running on port ${env.PORT}`);
  logger.info(`API Prefix: ${env.API_PREFIX}`);
  logger.info(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone} (Enforcing UTC for Database/Core)`);
});

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed. Stop receiving new requests.');
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');
    } catch (err) {
      logger.error(err, 'Error during database disconnection.');
    }
    logger.info('Flushing logs and exiting.');
    logger.flush();
    process.exit(0);
  });
  
  // Force exit if taking too long
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error(err, 'Unhandled Rejection');
  gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  logger.error(err, 'Uncaught Exception');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
