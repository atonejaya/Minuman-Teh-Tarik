'use strict';

const prisma = require('../../../../config/database');

/**
 * Repository catatan kunjungan. Catatan bersifat immutable - hanya dapat
 * ditambahkan (append), tidak dapat diubah/dihapus.
 */
class SalesVisitNoteRepository {
  async create(client, data) {
    const c = client || prisma;
    return c.salesVisitNote.create({ data });
  }

  async listByVisit(client, visitId) {
    const c = client || prisma;
    return c.salesVisitNote.findMany({
      where: { visit_id: Number(visitId) },
      include: { creator: { select: { id: true, name: true } } },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }]
    });
  }
}

module.exports = new SalesVisitNoteRepository();
