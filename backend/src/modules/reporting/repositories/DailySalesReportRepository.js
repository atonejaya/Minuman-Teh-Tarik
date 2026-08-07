const prisma = require('../../../config/database');

class DailySalesReportRepository {
  async getDailySales(filters, pagination) {
    const { date_from, date_to, warehouse_id, sales_id } = filters;
    const { page, limit, sort, order } = pagination;

    const where = {};
    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from);
      if (date_to) where.date.lte = new Date(date_to);
    }
    if (warehouse_id) where.warehouse_id = warehouse_id;
    if (sales_id) where.sales_id = sales_id;

    const orderBy = {};
    if (sort) {
      orderBy[sort] = order;
    } else {
      orderBy.date = 'desc';
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.dailySalesSummary.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.dailySalesSummary.count({ where }),
    ]);

    // Calculate Summary
    const summaryData = await prisma.dailySalesSummary.aggregate({
      where,
      _sum: {
        invoice_count: true,
        sales_amount: true,
        paid_amount: true,
        outstanding_amount: true,
      }
    });

    return {
      data,
      total,
      summary: {
        total_invoice: summaryData._sum.invoice_count || 0,
        total_sales: Number(summaryData._sum.sales_amount || 0),
        total_paid: Number(summaryData._sum.paid_amount || 0),
        outstanding: Number(summaryData._sum.outstanding_amount || 0),
      }
    };
  }
}

module.exports = new DailySalesReportRepository();
