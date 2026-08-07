const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const prisma = require('./config/database');
const { readFileSync } = require('fs');
const path = require('path');

const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const server = app.listen(env.PORT, () => {
  logger.info({
    event: 'server_started',
    version: pkg.version,
    environment: env.NODE_ENV,
    port: parseInt(env.PORT, 10),
    pid: process.pid,
    node: process.version,
    corsOrigin: env.CORS_ORIGIN,
  }, `Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// Order: stop accepting → wait pending requests → disconnect DB → flush logs → exit
const gracefulShutdown = async (signal) => {
  logger.info({ event: 'server_stopping', signal }, `Received ${signal}. Starting graceful shutdown...`);

  // Force-kill if shutdown takes too long (10 seconds)
  const forceKillTimer = setTimeout(() => {
    logger.error({ event: 'server_forced_exit' }, 'Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
  forceKillTimer.unref(); // Don't keep process alive just for this timer

  // Step 1: Stop accepting new connections, wait for pending requests to finish
  server.close(async () => {
    logger.info({ event: 'http_server_closed' }, 'HTTP server closed. No new requests accepted.');

    // Step 2: Disconnect database after all requests are done
    try {
      await prisma.$disconnect();
      logger.info({ event: 'database_disconnected' }, 'Database connection closed.');
    } catch (err) {
      logger.error({ event: 'database_disconnect_error', err }, 'Error during database disconnection.');
    }

    // Step 3: Flush logs and exit cleanly
    logger.info({ event: 'server_stopped' }, 'Shutdown complete. Exiting.');
    logger.flush();
    clearTimeout(forceKillTimer);
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error({ event: 'unhandled_rejection', err }, 'Unhandled Promise Rejection');
  gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  logger.error({ event: 'uncaught_exception', err }, 'Uncaught Exception');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
