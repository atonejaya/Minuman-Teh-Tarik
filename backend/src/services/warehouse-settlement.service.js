const prisma = require('../config/database');
const warehouseSettlementRepository = require('../repositories/warehouse-settlement.repository');
const inventoryService = require('./inventory.service');
const NumberGeneratorService = require('./number-generator.service');
const outboxRepository = require('../repositories/outbox.repository');
const PricingAccessor = require('./pricing-accessor.service');
const SettlementCompletedEvent = require('../domain/events/SettlementCompletedEvent');
const { ConflictError, NotFoundError, BadRequestError } = require('../exceptions/api-error');
const dayjs = require('dayjs');

class WarehouseSettlementService {
  async createSettlement(salesId, warehouseId) {
    return prisma.$transaction(async (tx) => {
      // 1. Validasi Settlement Ganda
      const hasOpen = await warehouseSettlementRepository.hasOpenSettlement(salesId);
      if (hasOpen) {
        throw new ConflictError('CONFLICT', 'Sales already has an OPEN settlement');
      }

      // 2. Ambil snapshot MobileStock
      const mobileStocks = await tx.mobileStock.findMany({
        where: { sales_id: salesId },
        include: {
          product: true,
          batch: true
        }
      });

      if (mobileStocks.length === 0) {
        throw new BadRequestError('BAD_REQUEST', 'No mobile stock found for this sales');
      }

      // 3. Hitung Cash Reconciliation (hari ini)
      const startOfDay = dayjs().startOf('day').toDate();
      const endOfDay = dayjs().endOf('day').toDate();

      const transactions = await tx.salesTransaction.findMany({
        where: {
          sales_id: salesId,
          status: 'CONFIRMED',
          created_at: { gte: startOfDay, lte: endOfDay }
        }
      });
      const invoiceAmount = transactions.reduce((sum, t) => sum + Number(t.grand_total), 0);

      const payments = await tx.payment.findMany({
        where: {
          created_by: salesId,
          created_at: { gte: startOfDay, lte: endOfDay }
        }
      });
      const paymentReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);

      // Get Sales & Warehouse names
      const sales = await tx.user.findUnique({ where: { id: salesId } });
      const warehouse = await tx.warehouse.findUnique({ where: { id: warehouseId } });

      if (!sales || !warehouse) {
        throw new NotFoundError('NOT_FOUND', 'Sales or Warehouse not found');
      }

      const settlementCode = await NumberGeneratorService.generateCode('STL', new Date(), tx);

      const itemsData = [];
      for (const stock of mobileStocks) {
        const unitPrice = await PricingAccessor.resolveRetailUnitPrice(tx, stock.product_id);
        if (unitPrice === null) {
          throw new BadRequestError('PRICE_NOT_FOUND', `Product ${stock.product.code} has no active RETAIL price`);
        }
        itemsData.push({
          product_id: stock.product_id,
          batch_id: stock.batch_id,
          product_code: stock.product.code,
          product_name: stock.product.name,
          batch_number: stock.batch.batch_number,
          unit_price: unitPrice,
          inventory_value: Number((unitPrice * stock.qty_available).toFixed(2)),
          condition: stock.condition,
          qty_expected: stock.qty_available,
          qty_actual: 0,
          qty_difference: 0
        });
      }

      const settlementData = {
        code: settlementCode,
        sales_id: salesId,
        warehouse_id: warehouseId,
        sales_name: sales.name,
        warehouse_name: warehouse.name,
        invoice_amount: invoiceAmount,
        payment_received: paymentReceived,
        deposit: 0,
        cash_on_hand: 0,
        cash_difference: 0,
        status: 'DRAFT'
      };

      const settlement = await warehouseSettlementRepository.create(settlementData, itemsData, tx);
      
      await tx.auditLog.create({
        data: {
          user_id: salesId,
          action: 'CREATE_SETTLEMENT',
          entity: 'WarehouseSettlement',
          entity_id: settlement.id,
          details: { code: settlementCode }
        }
      });

      return settlement;
    });
  }

  async startCounting(id, userId) {
    return prisma.$transaction(async (tx) => {
      const settlement = await warehouseSettlementRepository.findById(id, tx);
      if (!settlement) throw new NotFoundError('NOT_FOUND', 'Settlement not found');
      if (settlement.status !== 'DRAFT') throw new ConflictError('CONFLICT', 'Settlement is not DRAFT');

      await warehouseSettlementRepository.updateStatus(id, 'COUNTING', tx);

      await tx.auditLog.create({
        data: {
          user_id: userId,
          action: 'START_COUNTING',
          entity: 'WarehouseSettlement',
          entity_id: id,
          details: { status: 'COUNTING' }
        }
      });
      return warehouseSettlementRepository.findById(id, tx);
    });
  }

  async verifySettlement(id, verifierId, payload) {
    const { deposit, cash_on_hand, notes, items, differences } = payload;
    
    return prisma.$transaction(async (tx) => {
      const settlement = await warehouseSettlementRepository.findById(id, tx);
      if (!settlement) throw new NotFoundError('NOT_FOUND', 'Settlement not found');
      if (settlement.status !== 'COUNTING') throw new ConflictError('CONFLICT', 'Settlement must be COUNTING');

      const cash_difference = Number(settlement.payment_received) - (Number(deposit) + Number(cash_on_hand));
      const hasStockDifference = differences && differences.length > 0;
      const result = (cash_difference !== 0 || hasStockDifference) ? 'DIFFERENCE' : 'MATCH';

      const verificationData = {
        status: 'VERIFIED',
        result,
        deposit,
        cash_on_hand,
        cash_difference,
        verified_by: verifierId,
        verified_at: new Date(),
        notes
      };

      const updatedItemsData = items.map(it => {
        const expected = settlement.items.find(i => i.id === it.id).qty_expected;
        return {
          id: it.id,
          qty_actual: it.qty_actual,
          qty_difference: it.qty_actual - expected
        };
      });

      let mappedDifferences = [];
      if (hasStockDifference) {
        mappedDifferences = differences.map(d => {
          const sItem = settlement.items.find(i => i.id === d.item_id);
          return {
            warehouse_settlement_id: id,
            product_id: sItem.product_id,
            batch_id: sItem.batch_id,
            condition: sItem.condition,
            qty: d.qty,
            reason: d.reason,
            notes: d.notes || null
          };
        });
      }

      const verifiedSettlement = await warehouseSettlementRepository.verify(
        id, 
        verificationData, 
        updatedItemsData, 
        mappedDifferences, 
        tx
      );

      await tx.auditLog.create({
        data: {
          user_id: verifierId,
          action: 'VERIFY_SETTLEMENT',
          entity: 'WarehouseSettlement',
          entity_id: id,
          details: { result, cash_difference }
        }
      });

      return verifiedSettlement;
    });
  }

  async completeSettlement(id, approverId) {
    return prisma.$transaction(async (tx) => {
      const settlement = await warehouseSettlementRepository.findById(id, tx);
      if (!settlement) throw new NotFoundError('NOT_FOUND', 'Settlement not found');
      if (settlement.status !== 'VERIFIED') throw new ConflictError('CONFLICT', 'Settlement must be VERIFIED');

      // 1. Validasi Blokir (No pending transactions)
      const activeVisits = await tx.visit.count({ where: { sales_id: settlement.sales_id, status: 'SELLING' } });
      const draftInvoices = await tx.salesTransaction.count({ where: { sales_id: settlement.sales_id, status: 'DRAFT' } });
      const draftReturns = await tx.salesReturn.count({ where: { sales_id: settlement.sales_id, status: 'DRAFT' } });
      const pendingCollections = await tx.collection.count({ where: { sales_id: settlement.sales_id, status: 'PENDING' } });

      if (activeVisits > 0 || draftInvoices > 0 || draftReturns > 0 || pendingCollections > 0) {
        throw new ConflictError('SETTLEMENT_BLOCKED', 'Cannot complete settlement with open transactions (Visit/Invoice/Return/Collection)');
      }

      // 2. Double Entry Inventory Movement & Adjustments
      for (const item of settlement.items) {
        const decreased = await inventoryService.decreaseMobileStock(
          settlement.sales_id, item.product_id, item.batch_id, item.qty_expected, item.condition, tx
        );

        if (item.qty_actual > 0) {
          // Increase Warehouse Stock by actual_qty
          const increased = await inventoryService.increaseWarehouseStock(
            settlement.warehouse_id, item.product_id, item.batch_id, item.qty_actual, item.condition, tx
          );

          // Inventory Movement (SALES -> WAREHOUSE)
          const movementType = item.condition === 'GOOD' ? 'SETTLEMENT_GOOD' : 'SETTLEMENT_DAMAGED';
          await inventoryService.createInventoryMovement({
            movement_type: movementType,
            source_type: 'SALES',
            source_id: settlement.sales_id,
            destination_type: 'WAREHOUSE',
            destination_id: settlement.warehouse_id,
            qty_before: increased.qty_before,
            qty_change: increased.qty_change,
            qty_after: increased.qty_after,
            reference_document: settlement.code,
            reference_type: 'SETTLEMENT',
            product_id: item.product_id,
            batch_id: item.batch_id,
            batch_number: increased.batch_number,
            expired_at: increased.expired_at,
            created_by: approverId
          }, tx);
        }

        // Handle Difference
        if (item.qty_difference !== 0) {
          const absDiff = Math.abs(item.qty_difference);
          const source = item.qty_difference > 0 ? 'ADJUSTMENT' : 'SALES';
          const dest = item.qty_difference > 0 ? 'SALES' : 'ADJUSTMENT';

          await inventoryService.createInventoryMovement({
            movement_type: 'SETTLEMENT_ADJUSTMENT',
            source_type: source,
            source_id: settlement.sales_id,
            destination_type: dest,
            destination_id: settlement.sales_id,
            qty_before: decreased.qty_before,
            qty_change: absDiff,
            qty_after: decreased.qty_before + item.qty_difference,
            reference_document: settlement.code,
            reference_type: 'SETTLEMENT',
            product_id: item.product_id,
            batch_id: item.batch_id,
            batch_number: decreased.batch_number,
            expired_at: decreased.expired_at,
            created_by: approverId
          }, tx);
        }
      }

      // 3. Mark as COMPLETED
      await warehouseSettlementRepository.updateStatus(id, 'COMPLETED', tx);

      await tx.auditLog.create({
        data: {
          user_id: approverId,
          action: 'COMPLETE_SETTLEMENT',
          entity: 'WarehouseSettlement',
          entity_id: id,
          details: { status: 'COMPLETED' }
        }
      });

      // Insert Outbox Event
      const event = new SettlementCompletedEvent(id, {
        code: settlement.code,
        sales_id: settlement.sales_id,
        warehouse_id: settlement.warehouse_id,
        result: settlement.result
      }, { userId: approverId });
      await outboxRepository.insert(event, tx);

      return warehouseSettlementRepository.findById(id, tx);
    });
  }
}

module.exports = new WarehouseSettlementService();
