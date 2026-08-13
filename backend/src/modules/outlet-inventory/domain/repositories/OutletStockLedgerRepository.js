const prisma = require('../../../../config/database');

class OutletStockLedgerRepository {
  async create(client, data) {
    const c = client || prisma;
    return c.outletStockLedger.create({ data });
  }

  async listByWarung(client, warungId, query = {}) {
    const c = client || prisma;
    const { product_id, movement_type, from, to, page = 1, pageSize = 20 } = query;

    const where = { warung_id: Number(warungId) };
    if (product_id) where.product_id = Number(product_id);
    if (movement_type) where.movement_type = movement_type;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = new Date(from);
      if (to) where.created_at.lte = new Date(to);
    }

    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [data, total] = await Promise.all([
      c.outletStockLedger.findMany({
        where,
        include: { product: { select: { id: true, name: true, code: true } } },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take,
        skip
      }),
      c.outletStockLedger.count({ where })
    ]);

    return {
      data,
      pagination: {
        page: Math.max(Number(page) || 1, 1),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    };
  }

  async lastByWarungProduct(client, warungId, productId) {
    const c = client || prisma;
    return c.outletStockLedger.findFirst({
      where: { warung_id: Number(warungId), product_id: Number(productId) },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }]
    });
  }
}

module.exports = new OutletStockLedgerRepository();
