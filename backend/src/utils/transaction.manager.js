const prisma = require('../config/database');

class TransactionManager {
  /**
   * Executes a callback within a Prisma transaction.
   * Enforces atomic operations for multi-table updates.
   * 
   * @param {Function} callback - Function that receives the transaction client (tx)
   * @returns {Promise<any>}
   */
  static async execute(callback) {
    return await prisma.$transaction(async (tx) => {
      return await callback(tx);
    });
  }
}

module.exports = TransactionManager;
