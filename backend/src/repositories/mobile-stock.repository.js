const prisma = require('../config/database');

class MobileStockRepository {
  async findBySalesAndProduct(salesId, productId, tx = prisma) {
    return tx.mobileStock.findUnique({
      where: {
        sales_id_product_id: {
          sales_id: salesId,
          product_id: productId
        }
      }
    });
  }

  async findManyBySalesId(salesId, tx = prisma) {
    return tx.mobileStock.findMany({
      where: { sales_id: salesId },
      include: {
        product: {
          select: { id: true, code: true, name: true, unit: true, category: true }
        }
      },
      orderBy: { product: { name: 'asc' } }
    });
  }

  async upsert(salesId, productId, qtyToAdd, tx = prisma) {
    return tx.mobileStock.upsert({
      where: {
        sales_id_product_id: {
          sales_id: salesId,
          product_id: productId
        }
      },
      update: {
        qty: { increment: qtyToAdd }
      },
      create: {
        sales_id: salesId,
        product_id: productId,
        qty: qtyToAdd
      }
    });
  }
}

module.exports = new MobileStockRepository();
