const pino = require('pino');
const env = require('./env');

const logger = pino({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
