const prisma = require('../../../../config/database');

class AreaService {
  async getAll() {
    return prisma.area.findMany({
      include: { regional: true }
    });
  }

  async getById(id) {
    return prisma.area.findUnique({
      where: { id: parseInt(id) },
      include: { regional: true }
    });
  }

  async create(data) {
    return prisma.area.create({
      data,
      include: { regional: true }
    });
  }

  async update(id, data) {
    return prisma.area.update({
      where: { id: parseInt(id) },
      data,
      include: { regional: true }
    });
  }

  async updateStatus(id, is_active) {
    return prisma.area.update({
      where: { id: parseInt(id) },
      data: { is_active },
      include: { regional: true }
    });
  }
}

module.exports = new AreaService();
