const prisma = require('../../../../config/database');

class CustomerCategoryService {
  async getAll() {
    return prisma.customerCategory.findMany();
  }

  async getById(id) {
    return prisma.customerCategory.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async create(data) {
    return prisma.customerCategory.create({
      data
    });
  }

  async update(id, data) {
    return prisma.customerCategory.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async updateStatus(id, is_active) {
    return prisma.customerCategory.update({
      where: { id: parseInt(id) },
      data: { is_active }
    });
  }
}

module.exports = new CustomerCategoryService();
