'use strict';

const prisma = require('../../../../config/database');

/**
 * Repository timeline SalesVisit. Seluruh aktivitas bersifat append-only
 * (immutable) - tidak ada update/delete yang diekspos.
 */
class SalesVisitActivityRepository {
  async create(client, data) {
    const c = client || prisma;
    return c.salesVisitActivity.create({ data });
  }

  async listByVisit(client, visitId) {
    const c = client || prisma;
    return c.salesVisitActivity.findMany({
      where: { visit_id: Number(visitId) },
      orderBy: [{ occurred_at: 'asc' }, { id: 'asc' }]
    });
  }
}

module.exports = new SalesVisitActivityRepository();
