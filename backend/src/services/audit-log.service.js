const prisma = require('../config/database');

class AuditLogService {
  static async log(action, entity, entityId, details, userId = null, tx = null) {
    const client = tx || prisma;
    return client.auditLog.create({
      data: {
        action,
        entity,
        entity_id: entityId ? Number(entityId) : null,
        details,
        user_id: userId ? Number(userId) : null,
      }
    });
  }
}

module.exports = AuditLogService;
