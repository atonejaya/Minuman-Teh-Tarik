'use strict';

const prisma = require('../../../../config/database');

const VISIT_INCLUDE = {
  sales: { select: { id: true, name: true, username: true } },
  warung: { select: { id: true, code: true, name: true, latitude: true, longitude: true, status: true } },
  activities: { orderBy: [{ occurred_at: 'asc' }, { id: 'asc' }] },
  notes: { orderBy: [{ created_at: 'asc' }, { id: 'asc' }] },
  photos: { orderBy: [{ captured_at: 'asc' }, { id: 'asc' }] }
};

class SalesVisitRepository {
  async create(client, data) {
    const c = client || prisma;
    return c.salesVisit.create({ data });
  }

  async findById(client, id, { includeActivities = true } = {}) {
    const c = client || prisma;
    const include = includeActivities ? VISIT_INCLUDE : {
      sales: VISIT_INCLUDE.sales,
      warung: VISIT_INCLUDE.warung
    };
    return c.salesVisit.findUnique({ where: { id: Number(id) }, include });
  }

  async findByCode(client, code) {
    const c = client || prisma;
    return c.salesVisit.findUnique({ where: { code } });
  }

  async findForDate(client, salesId, warungId, date) {
    const c = client || prisma;
    const target = new Date(date);
    target.setUTCHours(0, 0, 0, 0);
    const end = new Date(target);
    end.setUTCDate(target.getUTCDate() + 1);
    return c.salesVisit.findFirst({
      where: {
        sales_id: Number(salesId),
        warung_id: Number(warungId),
        visit_date: { gte: target, lt: end }
      }
    });
  }

  async update(client, id, data) {
    const c = client || prisma;
    return c.salesVisit.update({ where: { id: Number(id) }, data });
  }

  async list(client, query = {}) {
    const c = client || prisma;
    const { sales_id, warung_id, status, from, to, search, page = 1, pageSize = 20 } = query;

    const where = {};
    if (sales_id) where.sales_id = Number(sales_id);
    if (warung_id) where.warung_id = Number(warung_id);
    if (status) where.status = status;
    if (from || to) {
      where.visit_date = {};
      if (from) where.visit_date.gte = new Date(from);
      if (to) where.visit_date.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { warung: { name: { contains: search } } }
      ];
    }

    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [data, total] = await Promise.all([
      c.salesVisit.findMany({
        where,
        include: {
          sales: VISIT_INCLUDE.sales,
          warung: VISIT_INCLUDE.warung,
          activities: { orderBy: [{ occurred_at: 'desc' }, { id: 'desc' }] }
        },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take,
        skip
      }),
      c.salesVisit.count({ where })
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

module.exports = new SalesVisitRepository();
