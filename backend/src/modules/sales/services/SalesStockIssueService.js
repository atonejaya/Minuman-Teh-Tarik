const prisma = require('../../../config/database');
const NumberGeneratorService = require('../../../services/number-generator.service');
const InventoryService = require('../../../services/inventory.service');
const { NotFoundError, ConflictError, ValidationError } = require('../../../exceptions/api-error');
const SalesStockIssuedEvent = require('../../../domain/events/SalesStockIssuedEvent');
const SalesStockConfirmedEvent = require('../../../domain/events/SalesStockConfirmedEvent');
const SalesStockClosedEvent = require('../../../domain/events/SalesStockClosedEvent');

class SalesStockIssueService {
  async _emitDomainEvent(tx, event, userId) {
    await tx.outboxEvent.create({
      data: {
        event_name: event.eventName,
        aggregate_id: event.aggregateId.toString(),
        aggregate_type: event.aggregateType,
        correlation_id: event.correlationId,
        causation_id: event.causationId,
        payload: event.payload,
        metadata: event.metadata,
        occurred_at: new Date(event.occurredAt)
      }
    });
  }

  async createDraft(payload, userId) {
    if (!payload.items || payload.items.length === 0) {
      throw new ValidationError('Items wajib diisi minimal 1 produk');
    }
    if (!payload.warehouse_id || !payload.sales_id) {
      throw new ValidationError('warehouse_id dan sales_id wajib diisi');
    }

    return await prisma.$transaction(async (tx) => {
      const date = payload.issue_date ? new Date(payload.issue_date) : new Date();
      const issue_number = await NumberGeneratorService.generateCode('SSI', date, tx);

      const total_item = payload.items.length;
      const total_qty = payload.items.reduce((sum, item) => sum + item.qty, 0);

      const issue = await tx.salesStockIssue.create({
        data: {
          issue_number,
          issue_date: date,
          warehouse_id: payload.warehouse_id,
          sales_id: payload.sales_id,
          status: 'DRAFT',
          total_item,
          total_qty,
          notes: payload.notes,
          created_by: userId,
          items: {
            create: payload.items.map(item => ({
              product_id: item.product_id,
              qty: item.qty,
              unit_id: item.unit_id,
              remark: item.remark
            }))
          },
          history: {
            create: {
              status_to: 'DRAFT',
              changed_by: userId,
              remarks: 'Draft created'
            }
          }
        },
        include: { items: true, sales: { select: { id: true, name: true } }, warehouse: { select: { id: true, name: true } } }
      });

      const event = new SalesStockIssuedEvent(issue.id, {
        issueId: issue.id,
        issueNumber: issue.issue_number,
        salesId: issue.sales_id,
        warehouseId: issue.warehouse_id,
        items: issue.items.map(i => ({ productId: i.product_id, qty: i.qty }))
      }, { userId });

      await this._emitDomainEvent(tx, event, userId);

      return issue;
    });
  }

  async confirm(id, userId) {
    return await prisma.$transaction(async (tx) => {
      const issue = await tx.salesStockIssue.findUnique({
        where: { id: Number(id) },
        include: { items: true }
      });

      if (!issue) throw new NotFoundError('ISSUE_NOT_FOUND', 'Sales Stock Issue tidak ditemukan');
      if (issue.status !== 'DRAFT') throw new ConflictError('INVALID_STATUS', 'Hanya Sales Stock Issue berstatus DRAFT yang dapat dikonfirmasi');

      // 1. Validasi & Kurangi Warehouse Stock (FEFO)
      const warehouseMutations = [];
      for (const item of issue.items) {
        const reservedBatches = await InventoryService.reserveBatchFEFO(item.product_id, issue.warehouse_id, item.qty, tx);

        const mutations = [];
        for (const batch of reservedBatches) {
          const snapshot = await InventoryService.decreaseWarehouseStock(issue.warehouse_id, item.product_id, batch.batch_id, batch.qty, 'GOOD', tx);
          mutations.push({ item, batch_id: batch.batch_id, ...snapshot });
        }
        warehouseMutations.push(...mutations);
      }

      // 2. Update Status Issue
      const updatedIssue = await tx.salesStockIssue.update({
        where: { id: Number(id) },
        data: {
          status: 'CONFIRMED',
          confirmed_by: userId,
          confirmed_at: new Date()
        },
        include: { items: true }
      });

      // 3. Update SalesStockLedger & SalesStockProjection
      for (const item of issue.items) {
        const projection = await tx.salesStockProjection.findUnique({
          where: {
            sales_id_product_id: {
              sales_id: issue.sales_id,
              product_id: item.product_id
            }
          }
        });

        const currentQty = projection ? projection.qty_available : 0;
        const newQty = currentQty + item.qty;

        if (projection) {
          await tx.salesStockProjection.update({
            where: { id: projection.id },
            data: { qty_available: newQty, last_update: new Date() }
          });
        } else {
          await tx.salesStockProjection.create({
            data: {
              sales_id: issue.sales_id,
              product_id: item.product_id,
              qty_available: newQty
            }
          });
        }

        await tx.salesStockLedger.create({
          data: {
            sales_id: issue.sales_id,
            product_id: item.product_id,
            movement_type: 'ISSUE_FROM_WAREHOUSE',
            qty: item.qty,
            balance: newQty,
            document_type: 'SALES_STOCK_ISSUE',
            document_id: issue.id,
            transaction_date: issue.issue_date
          }
        });
      }

      // 4. Catat InventoryMovement untuk audit stok gudang
      for (const mutation of warehouseMutations) {
        await InventoryService.createInventoryMovement({
          movement_type: 'LOAD_OUT',
          source_type: 'WAREHOUSE',
          source_id: issue.warehouse_id,
          destination_type: 'SALES',
          destination_id: issue.sales_id,
          qty_before: mutation.qty_before,
          qty_change: mutation.qty_change,
          qty_after: mutation.qty_after,
          reference_document: issue.issue_number,
          reference_type: 'LOAD',
          product_id: mutation.item.product_id,
          batch_id: mutation.batch_id,
          batch_number: mutation.batch_number,
          expired_at: mutation.expired_at,
          created_by: userId
        }, tx);
      }

      // 5. Catat History
      await tx.salesStockIssueHistory.create({
        data: {
          issue_id: Number(id),
          status_from: 'DRAFT',
          status_to: 'CONFIRMED',
          changed_by: userId,
          remarks: 'Confirmed by user'
        }
      });

      // 6. Publish Domain Event
      const event = new SalesStockConfirmedEvent(issue.id, {
        issueId: issue.id,
        issueNumber: issue.issue_number,
        salesId: issue.sales_id,
        warehouseId: issue.warehouse_id,
        items: issue.items.map(i => ({ productId: i.product_id, qty: i.qty }))
      }, { userId });

      await this._emitDomainEvent(tx, event, userId);

      return updatedIssue;
    });
  }

  async close(id, userId) {
    return await prisma.$transaction(async (tx) => {
      const issue = await tx.salesStockIssue.findUnique({
        where: { id: Number(id) }
      });

      if (!issue) throw new NotFoundError('ISSUE_NOT_FOUND', 'Sales Stock Issue tidak ditemukan');
      if (issue.status !== 'CONFIRMED') throw new ConflictError('INVALID_STATUS', 'Hanya Sales Stock Issue berstatus CONFIRMED yang dapat ditutup');

      const updatedIssue = await tx.salesStockIssue.update({
        where: { id: Number(id) },
        data: {
          status: 'CLOSED',
          closed_by: userId,
          closed_at: new Date()
        }
      });

      await tx.salesStockIssueHistory.create({
        data: {
          issue_id: Number(id),
          status_from: 'CONFIRMED',
          status_to: 'CLOSED',
          changed_by: userId,
          remarks: 'Closed by user'
        }
      });

      const event = new SalesStockClosedEvent(issue.id, {
        issueId: issue.id,
        issueNumber: issue.issue_number,
        salesId: issue.sales_id
      }, { userId });

      await this._emitDomainEvent(tx, event, userId);

      return updatedIssue;
    });
  }

  async getAll(query = {}) {
    const { status, sales_id, warehouse_id, from, to, search, page = 1, pageSize = 20 } = query;

    const where = {};
    if (status) where.status = status;
    if (sales_id) where.sales_id = Number(sales_id);
    if (warehouse_id) where.warehouse_id = Number(warehouse_id);
    if (from || to) {
      where.issue_date = {};
      if (from) where.issue_date.gte = new Date(from);
      if (to) where.issue_date.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { issue_number: { contains: search } },
        { sales: { name: { contains: search } } },
        { warehouse: { name: { contains: search } } }
      ];
    }

    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [data, total] = await Promise.all([
      prisma.salesStockIssue.findMany({
        where,
        include: {
          items: { include: { product: { select: { id: true, name: true, code: true } }, unit: { select: { id: true, name: true } } } },
          sales: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } }
        },
        orderBy: { created_at: 'desc' },
        take,
        skip
      }),
      prisma.salesStockIssue.count({ where })
    ]);

    return {
      data,
      pagination: {
        page: Math.max(Number(page) || 1, 1),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    };
  }

  async getById(id) {
    const issue = await prisma.salesStockIssue.findUnique({
      where: { id: Number(id) },
      include: {
        items: { include: { product: { select: { id: true, name: true, code: true } }, unit: { select: { id: true, name: true } } } },
        sales: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        history: { orderBy: { changed_at: 'asc' } }
      }
    });

    if (!issue) throw new NotFoundError('ISSUE_NOT_FOUND', 'Sales Stock Issue tidak ditemukan');
    return issue;
  }
}

module.exports = new SalesStockIssueService();
