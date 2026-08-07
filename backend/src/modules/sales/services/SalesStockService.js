const prisma = require('../../../config/database');

class SalesStockService {
  async getProjection(salesId, productId) {
    if (productId) {
      return await prisma.salesStockProjection.findUnique({
        where: {
          sales_id_product_id: {
            sales_id: Number(salesId),
            product_id: Number(productId)
          }
        },
        include: { product: true }
      });
    }

    return await prisma.salesStockProjection.findMany({
      where: { sales_id: Number(salesId) },
      include: { product: true }
    });
  }

  async getLedgerEntries(salesId, productId) {
    const whereClause = { sales_id: Number(salesId) };
    if (productId) {
      whereClause.product_id = Number(productId);
    }

    return await prisma.salesStockLedger.findMany({
      where: whereClause,
      orderBy: { transaction_date: 'desc' },
      include: { product: true }
    });
  }

  async addLedgerEntry(data, tx = null) {
    const db = tx || prisma;

    // Update or create projection
    const projection = await db.salesStockProjection.findUnique({
      where: {
        sales_id_product_id: {
          sales_id: data.sales_id,
          product_id: data.product_id
        }
      }
    });

    const currentQty = projection ? projection.qty_available : 0;
    const DECREASE_TYPES = new Set(['LOAD_OUT', 'SALE', 'RETURN_TO_WAREHOUSE', 'ADJUSTMENT_OUT', 'RESTOCK_OUTLET']);
    const qtyChange = DECREASE_TYPES.has(data.movement_type) ? -data.qty : data.qty;
    const newQty = currentQty + qtyChange;

    if (projection) {
      await db.salesStockProjection.update({
        where: { id: projection.id },
        data: { qty_available: newQty }
      });
    } else {
      await db.salesStockProjection.create({
        data: {
          sales_id: data.sales_id,
          product_id: data.product_id,
          qty_available: newQty
        }
      });
    }

    return await db.salesStockLedger.create({
      data: {
        sales_id: data.sales_id,
        product_id: data.product_id,
        movement_type: data.movement_type,
        qty: data.qty,
        balance: newQty,
        document_type: data.document_type,
        document_id: data.document_id,
        transaction_date: data.transaction_date || new Date()
      }
    });
  }
}

module.exports = new SalesStockService();
