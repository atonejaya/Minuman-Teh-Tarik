const prisma = require('../../../config/database');

class SalesPerformanceReportRepository {
  async getSalesPerformance(filters, pagination) {
    const { sales_id } = filters;
    const { page, limit, sort, order } = pagination;

    const where = {};
    if (sales_id) where.sales_id = sales_id;

    const orderBy = {};
    if (sort) {
      orderBy[sort] = order;
    } else {
      orderBy.sales_id = 'asc';
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.salesPerformanceSummary.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.salesPerformanceSummary.count({ where }),
    ]);

    // Calculate Summary
    const summaryData = await prisma.salesPerformanceSummary.aggregate({
      where,
      _sum: {
        total_invoice: true,
        total_sales: true,
        total_collection: true,
      }
    });

    const invoice_count = summaryData._sum.total_invoice || 0;
    const revenue = Number(summaryData._sum.total_sales || 0);
    const collection = Number(summaryData._sum.total_collection || 0);
    const outstanding = revenue - collection;

    return {
      data,
      total,
      summary: {
        invoice_count,
        revenue,
        collection,
        outstanding,
      }
    };
  }
}

module.exports = new SalesPerformanceReportRepository();
