const prisma = require('../../../../config/database');

class OutletStockCountRepository {
  async create(client, data) {
    const c = client || prisma;
    return c.outletStockCount.create({
      data: {
        warung_id: data.warung_id,
        sales_id: data.sales_id,
        visit_id: data.visit_id,
        counted_at: data.counted_at,
        created_by: data.created_by,
        items: {
          create: data.items.map(item => ({
            product_id: item.product_id,
            physical_qty: item.physical_qty
          }))
        }
      },
      include: { items: true }
    });
  }

  async getById(client, id) {
    const c = client || prisma;
    return c.outletStockCount.findUnique({
      where: { id: Number(id) },
      include: {
        items: { include: { product: { select: { id: true, name: true, code: true } } } },
        warung: { select: { id: true, name: true, code: true } },
        sales: { select: { id: true, name: true } }
      }
    });
  }

  async listByWarung(client, warungId, query = {}) {
    const c = client || prisma;
    const { page = 1, pageSize = 20 } = query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [data, total] = await Promise.all([
      c.outletStockCount.findMany({
        where: { warung_id: Number(warungId) },
        include: { items: true, sales: { select: { id: true, name: true } } },
        orderBy: { counted_at: 'desc' },
        take,
        skip
      }),
      c.outletStockCount.count({ where: { warung_id: Number(warungId) } })
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
}

module.exports = new OutletStockCountRepository();
