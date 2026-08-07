const prisma = require('../../../../config/database');

class WarehouseService {
  async getAll(query = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    return await prisma.warehouse.findMany({
      where,
      orderBy: { id: 'desc' }
    });
  }

  async getById(id) {
    return await prisma.warehouse.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async create(data) {
    return await prisma.warehouse.create({
      data
    });
  }

  async update(id, data) {
    return await prisma.warehouse.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async updateStatus(id, status) {
    return await prisma.warehouse.update({
      where: { id: parseInt(id) },
      data: { status }
    });
  }
}

module.exports = new WarehouseService();
