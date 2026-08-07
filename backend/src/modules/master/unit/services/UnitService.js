const prisma = require('../../../../config/database');

class UnitService {
  async getAll() {
    return prisma.unit.findMany();
  }

  async getById(id) {
    return prisma.unit.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async create(data) {
    return prisma.unit.create({
      data
    });
  }

  async update(id, data) {
    return prisma.unit.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async updateStatus(id, status) {
    return prisma.unit.update({
      where: { id: parseInt(id) },
      data: { status }
    });
  }
}

module.exports = new UnitService();
