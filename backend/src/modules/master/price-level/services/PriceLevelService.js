const prisma = require('../../../../config/database');

class PriceLevelService {
  async getAll(query = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    return await prisma.priceLevel.findMany({
      where,
      orderBy: { id: 'desc' }
    });
  }

  async getById(id) {
    return await prisma.priceLevel.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async create(data) {
    return await prisma.priceLevel.create({
      data
    });
  }

  async update(id, data) {
    return await prisma.priceLevel.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async updateStatus(id, status) {
    return await prisma.priceLevel.update({
      where: { id: parseInt(id) },
      data: { status }
    });
  }
}

module.exports = new PriceLevelService();
