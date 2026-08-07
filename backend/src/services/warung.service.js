const WarungRepository = require('../repositories/warung.repository');
const AuditLogService = require('./audit-log.service');
const { createWarungSchema, updateWarungSchema } = require('../validators/warung.validator');
const DTOHelper = require('../helpers/dto.helper');
const { ConflictError, NotFoundError, BadRequestError } = require('../exceptions/api-error');

class WarungService {
  async createWarung(data, userId) {
    const validated = createWarungSchema.parse(data);

    const existsByCode = await WarungRepository.existsByCode(validated.code);
    if (existsByCode) {
      throw new ConflictError('WARUNG_CODE_EXISTS', `Warung with code ${validated.code} already exists`);
    }

    const existsByName = await WarungRepository.existsByName(validated.name);
    if (existsByName) {
      throw new ConflictError('WARUNG_NAME_EXISTS', `Warung with name ${validated.name} already exists`);
    }

    if (validated.assigned_sales_id && validated.visit_day && validated.visit_order) {
      const existsByVisitOrder = await WarungRepository.existsByVisitOrder(
        validated.assigned_sales_id,
        validated.visit_day,
        validated.visit_order
      );
      if (existsByVisitOrder) {
        throw new ConflictError('VISIT_ORDER_TAKEN', `Visit order ${validated.visit_order} already taken for day ${validated.visit_day} by this sales`);
      }
    }

    const warung = await WarungRepository.create(validated);
    await AuditLogService.log('CREATE', 'Warung', warung.id, warung, userId);
    return DTOHelper.toWarung(warung);
  }

  async updateWarung(id, data, userId) {
    const warungId = parseInt(id, 10);
    if (isNaN(warungId)) throw new BadRequestError('INVALID_ID', 'Invalid warung ID');

    const existing = await WarungRepository.findById(warungId);
    if (!existing || existing.deleted_at) {
      throw new NotFoundError('WARUNG_NOT_FOUND', 'Warung not found');
    }

    const validated = updateWarungSchema.parse(data);

    if (validated.code && validated.code !== existing.code) {
      const existsByCode = await WarungRepository.existsByCode(validated.code);
      if (existsByCode) {
        throw new ConflictError('WARUNG_CODE_EXISTS', `Warung with code ${validated.code} already exists`);
      }
    }

    if (validated.name && validated.name !== existing.name) {
      const existsByName = await WarungRepository.existsByName(validated.name);
      if (existsByName) {
        throw new ConflictError('WARUNG_NAME_EXISTS', `Warung with name ${validated.name} already exists`);
      }
    }

    const assigned_sales_id = validated.assigned_sales_id !== undefined ? validated.assigned_sales_id : existing.assigned_sales_id;
    const visit_day = validated.visit_day !== undefined ? validated.visit_day : existing.visit_day;
    const visit_order = validated.visit_order !== undefined ? validated.visit_order : existing.visit_order;

    if (
      assigned_sales_id && visit_day && visit_order &&
      (assigned_sales_id !== existing.assigned_sales_id || visit_day !== existing.visit_day || visit_order !== existing.visit_order)
    ) {
      const existsByVisitOrder = await WarungRepository.existsByVisitOrder(
        assigned_sales_id,
        visit_day,
        visit_order
      );
      if (existsByVisitOrder) {
        throw new ConflictError('VISIT_ORDER_TAKEN', `Visit order ${visit_order} already taken for day ${visit_day} by this sales`);
      }
    }

    const updated = await WarungRepository.update(warungId, validated);
    await AuditLogService.log('UPDATE', 'Warung', updated.id, { before: existing, after: updated }, userId);
    return DTOHelper.toWarung(updated);
  }

  async getWarungById(id) {
    const warungId = parseInt(id, 10);
    if (isNaN(warungId)) throw new BadRequestError('INVALID_ID', 'Invalid warung ID');

    const warung = await WarungRepository.findById(warungId);
    if (!warung || warung.deleted_at) {
      throw new NotFoundError('WARUNG_NOT_FOUND', 'Warung not found');
    }
    return DTOHelper.toWarung(warung);
  }

  async softDeleteWarung(id, userId) {
    const warungId = parseInt(id, 10);
    if (isNaN(warungId)) throw new BadRequestError('INVALID_ID', 'Invalid warung ID');

    const existing = await WarungRepository.findById(warungId);
    if (!existing || existing.deleted_at) {
      throw new NotFoundError('WARUNG_NOT_FOUND', 'Warung not found or already inactive');
    }

    const deleted = await WarungRepository.softDelete(warungId);
    await AuditLogService.log('DELETE', 'Warung', deleted.id, { reason: 'Soft Delete' }, userId);
    return DTOHelper.toWarung(deleted);
  }

  async restoreWarung(id, userId) {
    const warungId = parseInt(id, 10);
    if (isNaN(warungId)) throw new BadRequestError('INVALID_ID', 'Invalid warung ID');

    const existing = await WarungRepository.findById(warungId);
    if (!existing) {
      throw new NotFoundError('WARUNG_NOT_FOUND', 'Warung not found');
    }
    if (!existing.deleted_at) {
      throw new BadRequestError('WARUNG_ALREADY_ACTIVE', 'Warung is already active');
    }

    const restored = await WarungRepository.restore(warungId);
    await AuditLogService.log('RESTORE', 'Warung', restored.id, { reason: 'Restore' }, userId);
    return DTOHelper.toWarung(restored);
  }

  async listWarungs(query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const result = await WarungRepository.findMany({
      page,
      limit,
      search: query.search,
      visit_day: query.visit_day,
      status: query.status,
      assigned_sales_id: query.assigned_sales_id ? parseInt(query.assigned_sales_id, 10) : undefined
    });
    
    return {
      data: DTOHelper.toList(result.data, DTOHelper.toWarung),
      meta: result.meta
    };
  }

  async getTodayRoute(salesId) {
    const jakartaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    const jakartaDate = new Date(jakartaTime);
    
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = days[jakartaDate.getDay()];

    const warungs = await WarungRepository.findRoute({
      visit_day: currentDay,
      assigned_sales_id: salesId
    });

    return warungs.map(w => ({
      visit_order: w.visit_order,
      code: w.code,
      name: w.name,
      owner_name: w.owner_name,
      phone: w.phone,
      address: w.address,
      latitude: w.latitude,
      longitude: w.longitude,
      target_cups: w.target_cups
    }));
  }

  async getRouteByDayAndSales(visit_day, salesId) {
    const warungs = await WarungRepository.findRoute({
      visit_day: visit_day,
      assigned_sales_id: parseInt(salesId, 10)
    });

    return warungs.map(w => ({
      visit_order: w.visit_order,
      code: w.code,
      name: w.name,
      owner_name: w.owner_name,
      phone: w.phone,
      address: w.address,
      latitude: w.latitude,
      longitude: w.longitude,
      target_cups: w.target_cups
    }));
  }
}

module.exports = new WarungService();
