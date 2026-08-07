const prisma = require('../../../../config/database');
const AuditLogService = require('../../../../services/audit-log.service');

class RegionalService {
  async getAll() {
    return prisma.regional.findMany();
  }

  async getById(id) {
    return prisma.regional.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async create(data, userId) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.regional.create({ data });
      await AuditLogService.log('CREATE_REGIONAL', 'Regional', created.id, created, userId, tx);
      return created;
    });
  }

  async update(id, data, userId) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.regional.update({ where: { id: parseInt(id) }, data });
      
      
      await AuditLogService.log('UPDATE_REGIONAL', 'Regional', updated.id, updated, userId, tx);
      return updated;
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
