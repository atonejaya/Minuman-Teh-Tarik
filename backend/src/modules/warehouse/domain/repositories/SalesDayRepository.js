const prisma = require('../../../../config/database');

class SalesDayRepository {
  async findBySalesDate(client, salesId, salesDate) {
    const c = client || prisma;
    return c.salesDay.findUnique({
      where: {
        sales_id_sales_date: {
          sales_id: Number(salesId),
          sales_date: salesDate
        }
      }
    });
  }

  async upsertOpen(client, data) {
    const c = client || prisma;
    const salesDate = data.sales_date;
    const existing = await this.findBySalesDate(c, data.sales_id, salesDate);
    if (existing) return existing;
    return c.salesDay.create({
      data: {
        sales_id: Number(data.sales_id),
        sales_date: salesDate,
        status: 'OPEN',
        closed_by: null,
        closed_at: null
      }
    });
  }

  async update(client, id, data) {
    const c = client || prisma;
    return c.salesDay.update({
      where: { id: Number(id) },
      data
    });
  }

  async list(client, query = {}) {
    const c = client || prisma;
    const { page = 1, pageSize = 20, sales_id, status } = query;
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where = {};
    if (sales_id) where.sales_id = Number(sales_id);
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      c.salesDay.findMany({
        where,
        orderBy: { sales_date: 'desc' },
        take,
        skip
      }),
      c.salesDay.count({ where })
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

module.exports = new SalesDayRepository();
