const prisma = require('../../config/database');

class ProductSalesSummaryRepository {
  async getProductSummary(productId) {
    const where = {};
    if (productId) where.product_id = Number(productId);

    return prisma.productSalesSummary.findMany({
      where,
      orderBy: { net_sales_qty: 'desc' }
    });
  }
}

module.exports = new ProductSalesSummaryRepository();
