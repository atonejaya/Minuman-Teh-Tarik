const prisma = require('../../../../config/database');

class OutletStockProjectionRepository {
  async findByWarungProduct(client, warungId, productId) {
    const c = client || prisma;
    return c.outletStockProjection.findUnique({
      where: {
        warung_id_product_id: {
          warung_id: Number(warungId),
          product_id: Number(productId)
        }
      }
    });
  }

  async upsert(client, warungId, productId, data) {
    const c = client || prisma;
    return c.outletStockProjection.upsert({
      where: {
        warung_id_product_id: {
          warung_id: Number(warungId),
          product_id: Number(productId)
        }
      },
      create: {
        warung_id: Number(warungId),
        product_id: Number(productId),
        ...data,
        version: 1
      },
      update: {
        ...data,
        version: { increment: 1 }
      }
    });
  }

  /**
   * Optimistic lock update: hanya berhasil bila version masih sama dengan
   * yang dibaca (BigInt). Mengembalikan true bila 1 baris ter-update.
   */
  async updateIfVersion(client, id, expectedVersion, data) {
    const c = client || prisma;
    const result = await c.outletStockProjection.updateMany({
      where: { id: Number(id), version: BigInt(expectedVersion) },
      data: { ...data, version: { increment: 1 } }
    });
    return result.count === 1;
  }

  async listByWarung(client, warungId) {
    const c = client || prisma;
    return c.outletStockProjection.findMany({
      where: { warung_id: Number(warungId) },
      include: { product: { select: { id: true, name: true, code: true, sku: true } } },
      orderBy: { product_id: 'asc' }
    });
  }

  /**
   * Menerapkan hasil stock count ke projection.
   * total_sales diakumulasi; current_stock = stok fisik terakhir (sumber dari ledger).
   */
  async applyCountResult(client, warungId, productId, { currentStock, calculatedSales, requiredRefill, sellThrough, averageDailySales, salesIncrement, lastVisitId, lastCountAt }) {
    const c = client || prisma;
    const existing = await this.findByWarungProduct(c, warungId, productId);

    if (!existing) {
      return c.outletStockProjection.create({
        data: {
          warung_id: Number(warungId),
          product_id: Number(productId),
          current_stock: currentStock,
          total_sales: salesIncrement,
          calculated_sales: calculatedSales,
          required_refill: requiredRefill,
          average_daily_sales: averageDailySales,
          sell_through: sellThrough,
          last_visit_id: lastVisitId,
          last_count_at: lastCountAt,
          version: 1
        }
      });
    }

    return c.outletStockProjection.update({
      where: { id: existing.id },
      data: {
        current_stock: currentStock,
        total_sales: { increment: salesIncrement },
        calculated_sales: calculatedSales,
        required_refill: requiredRefill,
        average_daily_sales: averageDailySales,
        sell_through: sellThrough,
        last_visit_id: lastVisitId,
        last_count_at: lastCountAt,
        version: { increment: 1 }
      }
    });
  }

  /**
   * Menerapkan delivery (stock-in) ke projection (SPRINT 11.1A).
   * current_stock dan total_refill diakumulasi; sinkron dengan ledger
   * yang di-tulis pada transaksi yang sama (Source of Truth).
   */
  async applyDelivery(client, warungId, productId, { qty, deliveredAt }) {
    const c = client || prisma;
    const existing = await this.findByWarungProduct(c, warungId, productId);

    if (!existing) {
      return c.outletStockProjection.create({
        data: {
          warung_id: Number(warungId),
          product_id: Number(productId),
          current_stock: qty,
          total_refill: qty,
          last_refill_at: deliveredAt,
          version: 1
        }
      });
    }

    return c.outletStockProjection.update({
      where: { id: existing.id },
      data: {
        current_stock: { increment: qty },
        total_refill: { increment: qty },
        last_refill_at: deliveredAt,
        version: { increment: 1 }
      }
    });
  }

  /**
   * Menyinkronkan par_qty ke projection saat Par Stock diubah.
   */
  async syncParQty(client, warungId, productId, parQty) {
    const c = client || prisma;
    const existing = await this.findByWarungProduct(c, warungId, productId);

    if (!existing) {
      return c.outletStockProjection.create({
        data: {
          warung_id: Number(warungId),
          product_id: Number(productId),
          par_qty: parQty,
          version: 1
        }
      });
    }

    return c.outletStockProjection.update({
      where: { id: existing.id },
      data: {
        par_qty: parQty,
        version: { increment: 1 }
      }
    });
  }
}

module.exports = new OutletStockProjectionRepository();
