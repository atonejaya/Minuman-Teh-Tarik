const env = require('./env');

module.exports = {
  SECRET: env.JWT_SECRET,
  EXPIRES_IN: env.JWT_EXPIRES_IN,
  REMEMBER_EXPIRES_IN: env.JWT_REMEMBER_EXPIRES_IN,
};
