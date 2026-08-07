const prisma = require('../../../../config/database');

class RegionalService {
  async getAll() {
    return prisma.regional.findMany();
  }

  async getById(id) {
    return prisma.regional.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async create(data) {
    return prisma.regional.create({
      data
    });
  }

  async update(id, data) {
    return prisma.regional.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async updateStatus(id, is_active) {
    return prisma.regional.update({
      where: { id: parseInt(id) },
      data: { is_active }
    });
  }
}

module.exports = new RegionalService();
