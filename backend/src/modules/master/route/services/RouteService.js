const prisma = require('../../../../config/database');
const AuditLogService = require('../../../../services/audit-log.service');

class RouteService {
  async getAll() {
    return prisma.route.findMany({
      include: { area: { include: { regional: true } } }
    });
  }

  async getById(id) {
    return prisma.route.findUnique({
      where: { id: parseInt(id) },
      include: { area: { include: { regional: true } } }
    });
  }

  async create(data) {
    return prisma.route.create({
      data,
      include: { area: { include: { regional: true } } }
    });
  }

  async update(id, data) {
    return prisma.route.update({
      where: { id: parseInt(id) },
      data,
      include: { area: { include: { regional: true } } }
    });
  }

  async updateStatus(id, is_active) {
    return prisma.route.update({
      where: { id: parseInt(id) },
      data: { is_active },
      include: { area: { include: { regional: true } } }
    });
  }
}

module.exports = new RouteService();
