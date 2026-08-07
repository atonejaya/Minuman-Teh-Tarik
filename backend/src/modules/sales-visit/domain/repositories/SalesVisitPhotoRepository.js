'use strict';

const prisma = require('../../../../config/database');

/**
 * Repository metadata foto kunjungan. Hanya metadata (filename/path/
 * timestamp/uploader) - upload file ditangani domain lain di sprint
 * mendatang. Bersifat append-only.
 */
class SalesVisitPhotoRepository {
  async create(client, data) {
    const c = client || prisma;
    return c.salesVisitPhoto.create({ data });
  }

  async listByVisit(client, visitId) {
    const c = client || prisma;
    return c.salesVisitPhoto.findMany({
      where: { visit_id: Number(visitId) },
      include: { creator: { select: { id: true, name: true } } },
      orderBy: [{ captured_at: 'asc' }, { id: 'asc' }]
    });
  }
}

module.exports = new SalesVisitPhotoRepository();
