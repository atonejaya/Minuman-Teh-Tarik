const prisma = require('../../../../config/database');

class TaxService {
  async getAll(query = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    return await prisma.tax.findMany({
      where,
      orderBy: { id: 'desc' }
    });
  }

  async getById(id) {
    return await prisma.tax.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async create(data) {
    return await prisma.tax.create({
      data
    });
  }

  async update(id, data) {
    return await prisma.tax.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async updateStatus(id, status) {
    return await prisma.tax.update({
      where: { id: parseInt(id) },
      data: { status }
    });
  }
}

module.exports = new TaxService();
