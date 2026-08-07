const prisma = require('../../../../config/database');
const AuditLogService = require('../../../../services/audit-log.service');

class CustomerCategoryService {
  async getAll() {
    return prisma.customerCategory.findMany();
  }

  async getById(id) {
    return prisma.customerCategory.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async create(data, userId) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.customerCategory.create({ data });
      await AuditLogService.log('CREATE_CATEGORY', 'CustomerCategory', created.id, created, userId, tx);
      return created;
    });
  }

  async update(id, data, userId) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.customerCategory.update({ where: { id: parseInt(id) }, data });
      
      
      await AuditLogService.log('UPDATE_CATEGORY', 'CustomerCategory', updated.id, updated, userId, tx);
      return updated;
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
