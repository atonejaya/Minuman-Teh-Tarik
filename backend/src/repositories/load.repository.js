const prisma = require('../config/database');

class LoadRepository {
  async create(data, tx = prisma) {
    return tx.load.create({
      data,
      include: {
        items: true
      }
    });
  }

  async findById(id, tx = prisma) {
    return tx.load.findUnique({
      where: { id },
      include: {
        sales: {
          select: { id: true, name: true, phone: true }
        },
        confirmer: {
          select: { id: true, name: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, code: true, name: true, unit: true, category: true }
            }
          }
        }
      }
    });
  }

  async findMany({ page = 1, limit = 10, sales_id, status, start_date, end_date }, tx = prisma) {
    const skip = (page - 1) * limit;

    const where = {};
    if (sales_id) where.sales_id = sales_id;
    if (status) where.status = status;
    if (start_date && end_date) {
      where.load_date = {
        gte: new Date(start_date),
        lte: new Date(end_date)
      };
    }

    const [data, total] = await Promise.all([
      tx.load.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          sales: { select: { id: true, name: true } }
        }
      }),
      tx.load.count({ where })
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_previous: page > 1
      }
    };
  }

  async update(id, data, tx = prisma) {
    return tx.load.update({
      where: { id },
      data,
      include: { items: true }
    });
  }

  async exists(id, tx = prisma) {
    const count = await tx.load.count({ where: { id } });
    return count > 0;
  }
}

module.exports = new LoadRepository();
