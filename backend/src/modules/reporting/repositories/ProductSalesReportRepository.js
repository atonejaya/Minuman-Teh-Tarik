const prisma = require('../../../config/database');

class ProductSalesReportRepository {
  async getProductSales(filters, pagination) {
    const { product_id } = filters;
    const { page, limit, sort, order } = pagination;

    const where = {};
    if (product_id) where.product_id = product_id;
    // Note: ProductSalesSummary model in Prisma does not currently have warehouse_id or period fields natively.
    // If we need them in the future we'll need to expand the projection.
    // We will stick to what the Projection provides.

    const orderBy = {};
    if (sort) {
      orderBy[sort] = order;
    } else {
      orderBy.product_id = 'asc';
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.productSalesSummary.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.productSalesSummary.count({ where }),
    ]);

    // Calculate Summary
    const summaryData = await prisma.productSalesSummary.aggregate({
      where,
      _sum: {
        net_sales_qty: true,
        sales_value: true,
      }
    });

    const qty_sold = summaryData._sum.net_sales_qty || 0;
    const revenue = Number(summaryData._sum.sales_value || 0);
    const average_price = qty_sold > 0 ? (revenue / qty_sold) : 0;

    return {
      data,
      total,
      summary: {
        qty_sold,
        revenue,
        average_price,
      }
    };
  }
}

module.exports = new ProductSalesReportRepository();
