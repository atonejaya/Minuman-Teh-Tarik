const loadRepository = require('../repositories/load.repository');
const inventoryService = require('./inventory.service');
const NumberGeneratorService = require('./number-generator.service');
const AuditLogService = require('./audit-log.service');
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require('../exceptions/api-error');
const prisma = require('../config/database');

class LoadService {
  async createLoad(warehouseId, salesId, date, notes, items, user) {
    if (user.role !== 'OWNER') {
      throw new ForbiddenError('FORBIDDEN', 'Hanya OWNER yang dapat membuat Load');
    }

    // Generate code
    const code = await NumberGeneratorService.generateCode('LOAD');

    // Prepare data
    const loadData = {
      code,
      warehouse_id: warehouseId,
      sales_id: salesId,
      load_date: new Date(date),
      status: 'DRAFT',
      notes,
      created_by: user.id,
      items: {
        create: items.map(item => ({
          product_id: item.product_id,
          batch_id: item.batch_id,
          qty: item.qty
        }))
      }
    };

    const load = await loadRepository.create(loadData);

    await AuditLogService.log(
      'CREATE',
      'Load',
      load.id,
      { code, warehouse_id: warehouseId, sales_id: salesId, items_count: items.length },
      user.id
    );

    return load;
  }

  async confirmLoad(id, user) {
    if (user.role !== 'OWNER') {
      throw new ForbiddenError('FORBIDDEN', 'Hanya OWNER yang dapat melakukan konfirmasi Load');
    }

    const load = await loadRepository.findById(id);
    if (!load) {
      throw new NotFoundError('LOAD_NOT_FOUND', 'Data Load tidak ditemukan');
    }

    if (load.status !== 'DRAFT') {
      throw new ConflictError('INVALID_STATUS', 'Hanya Load dengan status DRAFT yang dapat dikonfirmasi');
    }

    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update Load Status first to prevent another process from picking up a draft
      const updatedLoad = await loadRepository.update(id, {
        status: 'CONFIRMED',
        confirmed_by: user.id,
        confirmed_at: new Date()
      }, tx);

      for (const item of load.items) {
        // 1. Decrease Warehouse Stock
        const whSnapshot = await inventoryService.decreaseWarehouseStock(load.warehouse_id, item.product_id, item.batch_id, item.qty, 'GOOD', tx);
        
        // 2. Increase Mobile Stock
        const msSnapshot = await inventoryService.increaseMobileStock(load.sales_id, item.product_id, item.batch_id, item.qty, 'GOOD', tx);

        // 3. Create LOAD_OUT Movement for Warehouse
        await inventoryService.createInventoryMovement({
          movement_type: 'LOAD_OUT',
          source_type: 'WAREHOUSE',
          source_id: load.warehouse_id,
          destination_type: 'SALES',
          destination_id: load.sales_id,
          qty_before: whSnapshot.qty_before,
          qty_change: whSnapshot.qty_change,
          qty_after: whSnapshot.qty_after,
          reference_document: load.code,
          reference_type: 'LOAD',
          product_id: item.product_id,
          batch_id: item.batch_id,
          batch_number: whSnapshot.batch_number,
          expired_at: whSnapshot.expired_at,
          created_by: user.id
        }, tx);

        // 4. Create LOAD_IN Movement for Sales
        await inventoryService.createInventoryMovement({
          movement_type: 'LOAD_IN',
          source_type: 'WAREHOUSE',
          source_id: load.warehouse_id,
          destination_type: 'SALES',
          destination_id: load.sales_id,
          qty_before: msSnapshot.qty_before,
          qty_change: msSnapshot.qty_change,
          qty_after: msSnapshot.qty_after,
          reference_document: load.code,
          reference_type: 'LOAD',
          product_id: item.product_id,
          batch_id: item.batch_id,
          batch_number: msSnapshot.batch_number,
          expired_at: msSnapshot.expired_at,
          created_by: user.id
        }, tx);
      }

      // 5. Create Audit Log
      await AuditLogService.log(
        'CONFIRM',
        'Load',
        load.id,
        { code: load.code, sales_id: load.sales_id },
        user.id,
        tx
      );

      return updatedLoad;
    });

    return result;
  }

  async cancelLoad(id, user) {
    const load = await loadRepository.findById(id);
    if (!load) {
      throw new NotFoundError('LOAD_NOT_FOUND', 'Data Load tidak ditemukan');
    }

    if (load.status !== 'DRAFT') {
      throw new ConflictError('INVALID_STATUS', 'Hanya Load dengan status DRAFT yang dapat dibatalkan');
    }

    const updatedLoad = await loadRepository.update(id, {
      status: 'CANCELLED'
    });

    await AuditLogService.log(
      'CANCEL',
      'Load',
      load.id,
      { code: load.code },
      user.id
    );

    return updatedLoad;
  }

  async getLoads(query) {
    return loadRepository.findMany(query);
  }

  async getLoadById(id) {
    const load = await loadRepository.findById(id);
    if (!load) {
      throw new NotFoundError('LOAD_NOT_FOUND', 'Data Load tidak ditemukan');
    }
    return load;
  }
}

module.exports = new LoadService();
