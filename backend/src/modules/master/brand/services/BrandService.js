const prisma = require('../../../../config/database');

class BrandService {
  async getAll() {
    return prisma.brand.findMany();
  }

  async getById(id) {
    return prisma.brand.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async create(data) {
    return prisma.brand.create({
      data
    });
  }

  async update(id, data) {
    return prisma.brand.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async updateStatus(id, status) {
    return prisma.brand.update({
      where: { id: parseInt(id) },
      data: { status }
    });
  }
}

module.exports = new BrandService();
