const prisma = require('../../../../config/database');

class PackagingService {
  async getAll() {
    return prisma.packaging.findMany();
  }

  async getById(id) {
    return prisma.packaging.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async create(data) {
    return prisma.packaging.create({
      data
    });
  }

  async update(id, data) {
    return prisma.packaging.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async updateStatus(id, status) {
    return prisma.packaging.update({
      where: { id: parseInt(id) },
      data: { status }
    });
  }
}

module.exports = new PackagingService();
