const prisma = require('../../../../config/database');

class ProductCategoryService {
  async getAll() {
    return prisma.productCategory.findMany();
  }

  async getById(id) {
    return prisma.productCategory.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async create(data) {
    return prisma.productCategory.create({
      data
    });
  }

  async update(id, data) {
    return prisma.productCategory.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async updateStatus(id, status) {
    return prisma.productCategory.update({
      where: { id: parseInt(id) },
      data: { status }
    });
  }
}

module.exports = new ProductCategoryService();
