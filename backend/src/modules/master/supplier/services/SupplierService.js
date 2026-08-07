const prisma = require('../../../../config/database');

class SupplierService {
  async getAll(query = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    return await prisma.supplier.findMany({
      where,
      orderBy: { id: 'desc' }
    });
  }

  async getById(id) {
    return await prisma.supplier.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async create(data) {
    return await prisma.supplier.create({
      data
    });
  }

  async update(id, data) {
    return await prisma.supplier.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async updateStatus(id, status) {
    return await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: { status }
    });
  }
}

module.exports = new SupplierService();
