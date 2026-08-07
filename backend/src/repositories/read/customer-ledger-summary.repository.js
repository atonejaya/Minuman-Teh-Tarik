const prisma = require('../../config/database');

class CustomerLedgerSummaryRepository {
  async getLedgerSummary(customerId) {
    const where = {};
    if (customerId) where.customer_id = Number(customerId);

    return prisma.customerLedgerSummary.findMany({
      where,
      orderBy: { last_transaction_date: 'desc' }
    });
  }
}

module.exports = new CustomerLedgerSummaryRepository();
