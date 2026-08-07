const prisma = require('../config/database');

class WarungRepository {
  async create(data, tx = prisma) {
    return tx.warung.create({ data });
  }

  async update(id, data, tx = prisma) {
    return tx.warung.update({
      where: { id },
      data
    });
  }

  async findById(id, tx = prisma) {
    return tx.warung.findUnique({
      where: { id }
    });
  }

  async softDelete(id, tx = prisma) {
    return tx.warung.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        deleted_at: new Date()
      }
    });
  }

  async restore(id, tx = prisma) {
    return tx.warung.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        deleted_at: null
      }
    });
  }

  async existsByCode(code, tx = prisma) {
    const count = await tx.warung.count({
      where: { code }
    });
    return count > 0;
  }

  async existsByName(name, tx = prisma) {
    const count = await tx.warung.count({
      where: { name }
    });
    return count > 0;
  }

  async existsByVisitOrder(assigned_sales_id, visit_day, visit_order, tx = prisma) {
    const count = await tx.warung.count({
      where: {
        assigned_sales_id,
        visit_day,
        visit_order
      }
    });
    return count > 0;
  }

  async findMany({ page = 1, limit = 10, search, visit_day, status, assigned_sales_id }, tx = prisma) {
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { owner_name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (visit_day) {
      where.visit_day = visit_day;
    }

    if (status) {
      where.status = status;
    } else {
      where.deleted_at = null; // Default exclude soft-deleted
    }

    if (assigned_sales_id) {
      where.assigned_sales_id = assigned_sales_id;
    }

    const [data, total] = await Promise.all([
      tx.warung.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { visit_order: 'asc' },
          { name: 'asc' },
          { created_at: 'desc' }
        ]
      }),
      tx.warung.count({ where })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit)
      }
    };
  }

  async findRoute({ visit_day, assigned_sales_id }, tx = prisma) {
    return tx.warung.findMany({
      where: {
        visit_day,
        assigned_sales_id,
        status: 'ACTIVE',
        deleted_at: null
      },
      orderBy: {
        visit_order: 'asc'
      }
    });
  }
}

module.exports = new WarungRepository();
