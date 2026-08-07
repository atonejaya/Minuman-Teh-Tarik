const prisma = require('../../config/database');

class DailySalesSummaryRepository {
  async getDailySummary(date, salesId, warehouseId) {
    const where = {};
    if (date) where.date = new Date(date);
    if (salesId) where.sales_id = Number(salesId);
    if (warehouseId) where.warehouse_id = Number(warehouseId);

    return prisma.dailySalesSummary.findMany({
      where,
      orderBy: { date: 'desc' }
    });
  }
}

module.exports = new DailySalesSummaryRepository();
