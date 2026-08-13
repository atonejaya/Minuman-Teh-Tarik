const prisma = require('../../../../config/database');

class OutletParStockRepository {
  async upsert(client, warungId, data) {
    const c = client || prisma;
    return c.outletParStock.upsert({
      where: {
        warung_id_product_id: {
          warung_id: Number(warungId),
          product_id: Number(data.product_id)
        }
      },
      create: {
        warung_id: Number(warungId),
        product_id: Number(data.product_id),
        par_qty: data.par_qty,
        min_qty: data.min_qty,
        max_qty: data.max_qty,
        priority: data.priority,
        is_active: data.is_active,
        created_by: data.created_by
      },
      update: {
        par_qty: data.par_qty,
        min_qty: data.min_qty,
        max_qty: data.max_qty,
        priority: data.priority,
        is_active: data.is_active
      }
    });
  }

  async findByWarungProduct(client, warungId, productId) {
    const c = client || prisma;
    return c.outletParStock.findUnique({
      where: {
        warung_id_product_id: {
          warung_id: Number(warungId),
          product_id: Number(productId)
        }
      }
    });
  }

  async listByWarung(client, warungId, opts = {}) {
    const c = client || prisma;
    return c.outletParStock.findMany({
      where: { warung_id: Number(warungId), ...(opts.activeOnly ? { is_active: true } : {}) },
      orderBy: [{ priority: 'asc' }, { id: 'asc' }]
    });
  }
}

module.exports = new OutletParStockRepository();
