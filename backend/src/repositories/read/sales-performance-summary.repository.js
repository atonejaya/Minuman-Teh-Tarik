const prisma = require('../../config/database');

class SalesPerformanceSummaryRepository {
  async getPerformanceSummary(salesId) {
    const where = {};
    if (salesId) where.sales_id = Number(salesId);

    return prisma.salesPerformanceSummary.findMany({
      where,
      orderBy: { total_sales: 'desc' }
    });
  }
}

module.exports = new SalesPerformanceSummaryRepository();
