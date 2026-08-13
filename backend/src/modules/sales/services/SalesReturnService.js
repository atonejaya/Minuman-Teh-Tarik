const prisma = require('../../../config/database');
const { NotFoundError, ConflictError, BadRequestError, ForbiddenError } = require('../../../exceptions/api-error');
const SalesReturnApprovedEvent = require('../domain/events/SalesReturnApprovedEvent');

const RETURNABLE_TRANSACTION_STATUSES = ['CONFIRMED'];
const MANAGER_ROLES = ['ADMIN', 'OWNER'];

class SalesReturnService {
  async _loadReturn(tx, id) {
    const salesReturn = await tx.salesReturn.findUnique({
      where: { id: Number(id) },
      include: { items: true }
    });
    if (!salesReturn) throw new NotFoundError('NOT_FOUND', 'Sales Return not found');
    return salesReturn;
  }

  _ensureReturnOwnership(salesReturn, user) {
    if (!MANAGER_ROLES.includes(user.role) && Number(salesReturn.sales_id) !== Number(user.id)) {
      throw new ForbiddenError('ACCESS_DENIED', 'Tidak berhak mengakses sales return ini');
    }
  }

  _validateQty(item) {
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new BadRequestError('INVALID_QTY', 'Qty must be a positive integer');
    }
    return { ...item, qty };
  }
  async _generateCode(tx) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const prefix = `SR-${dateStr}-`;
    
    const lastReturn = await tx.salesReturn.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' }
    });

    let seq = 1;
    if (lastReturn && lastReturn.code) {
      const lastSeq = parseInt(lastReturn.code.split('-')[2], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  async _emitDomainEvent(tx, event) {
    await tx.outboxEvent.create({
      data: {
        event_name: event.eventName,
        aggregate_id: event.aggregateId.toString(),
        aggregate_type: event.aggregateType,
        correlation_id: event.correlationId,
        causation_id: event.causationId,
        event_version: event.version,
        payload: event.payload,
        metadata: event.metadata,
        occurred_at: new Date(event.occurredAt)
      }
    });
  }

  async createDraft(data, user) {
    const referenceType = data.reference_type || 'SALES';

    if (referenceType === 'SALES') {
      const transactionId = data.transaction_id;
      if (!transactionId) throw new NotFoundError('TRANSACTION_NOT_FOUND', 'Transaction is required for SALES returns');

      return await prisma.$transaction(async (tx) => {
        const transaction = await tx.salesTransaction.findUnique({
          where: { id: Number(transactionId) },
          include: { items: true }
        });
        if (!transaction) throw new NotFoundError('TRANSACTION_NOT_FOUND', 'Transaction not found');

        const isManager = MANAGER_ROLES.includes(user.role);
        if (!isManager && Number(transaction.sales_id) !== Number(user.id)) {
          throw new ForbiddenError('ACCESS_DENIED', 'Tidak berhak membuat return untuk transaksi ini');
        }

        if (!RETURNABLE_TRANSACTION_STATUSES.includes(transaction.status)) {
          throw new ConflictError('INVALID_INVOICE_STATUS', `Invoice status ${transaction.status} is not returnable`);
        }

        const items = (data.items || []).map(item => this._validateQty(item));

        for (const item of items) {
          const invoiceItem = transaction.items.find(
            it => Number(it.product_id) === Number(item.product_id) && Number(it.batch_id) === Number(item.batch_id)
          );
          if (!invoiceItem) {
            throw new ConflictError('BATCH_NOT_ON_INVOICE', 'Product/Batch not found in the original invoice');
          }
        }

        const requestedQtyByBatch = new Map();
        for (const item of items) {
          const key = `${item.product_id}:${item.batch_id}`;
          requestedQtyByBatch.set(key, (requestedQtyByBatch.get(key) || 0) + item.qty);
        }

        for (const [key, requestedQty] of requestedQtyByBatch.entries()) {
          const [productId, batchId] = key.split(':').map(Number);
          const invoiceItem = transaction.items.find(
            it => Number(it.product_id) === productId && Number(it.batch_id) === batchId
          );
          const priorReturns = await tx.salesReturnItem.aggregate({
            where: {
              product_id: productId,
              batch_id: batchId,
              sales_return: {
                transaction_id: transaction.id,
                status: { not: 'CANCELLED' }
              }
            },
            _sum: { qty: true }
          });
          const priorQty = priorReturns._sum.qty || 0;
          if (priorQty + requestedQty > Number(invoiceItem.qty)) {
            throw new ConflictError('RETURN_QTY_EXCEEDS_INVOICE', `Return quantity exceeds invoice quantity. Max available to return: ${Number(invoiceItem.qty) - priorQty}`);
          }
        }

        const salesId = isManager ? Number(data.sales_id || transaction.sales_id) : Number(user.id);
        const warungId = transaction.warung_id;

        const code = await this._generateCode(tx);

        const salesReturn = await tx.salesReturn.create({
          data: {
            code,
            reference_type: referenceType,
            transaction_id: transaction.id,
            delivery_id: null,
            visit_id: data.visit_id || transaction.visit_id,
            sales_id: salesId,
            warung_id: warungId,
            status: 'DRAFT',
            return_date: data.return_date ? new Date(data.return_date) : new Date(),
            total_amount: data.total_amount || 0,
            notes: data.notes,
            items: {
              create: items.map(item => ({
                product_id: item.product_id,
                batch_id: item.batch_id,
                qty: item.qty,
                condition: item.condition,
                reason: item.reason,
                item_price: item.item_price || 0,
                subtotal: item.subtotal || 0,
                return_type: item.return_type
              }))
            }
          },
          include: { items: true }
        });

        return salesReturn;
      });
    }

    return await prisma.$transaction(async (tx) => {
      const isManager = MANAGER_ROLES.includes(user.role);
      const code = await this._generateCode(tx);

      const salesReturn = await tx.salesReturn.create({
        data: {
          code,
          reference_type: referenceType,
          transaction_id: null,
          delivery_id: data.delivery_id,
          visit_id: data.visit_id,
          sales_id: isManager ? Number(data.sales_id || user.id) : Number(user.id),
          warung_id: data.warung_id,
          status: 'DRAFT',
          return_date: data.return_date ? new Date(data.return_date) : new Date(),
          total_amount: data.total_amount || 0,
          notes: data.notes,
          items: {
            create: (data.items || []).map(item => ({
              product_id: item.product_id,
              batch_id: item.batch_id,
              qty: item.qty,
              condition: item.condition,
              reason: item.reason,
              item_price: item.item_price || 0,
              subtotal: item.subtotal || 0,
              return_type: item.return_type
            }))
          }
        },
        include: { items: true }
      });

      return salesReturn;
    });
  }

  async checkReturn(id, user) {
    return await prisma.$transaction(async (tx) => {
      const salesReturn = await this._loadReturn(tx, id);
      this._ensureReturnOwnership(salesReturn, user);
      const updated = await tx.salesReturn.update({
        where: { id: Number(id) },
        data: { status: 'CHECKED' },
        include: { items: true }
      });
      return updated;
    });
  }

  async approveReturn(id, user) {
    return await prisma.$transaction(async (tx) => {
      const salesReturn = await this._loadReturn(tx, id);
      this._ensureReturnOwnership(salesReturn, user);

      const updated = await tx.salesReturn.update({
        where: { id: Number(id) },
        data: { status: 'APPROVED' },
        include: { items: true }
      });

      const event = new SalesReturnApprovedEvent(updated.id, {
        id: updated.id,
        code: updated.code,
        reference_type: updated.reference_type,
        transaction_id: updated.transaction_id,
        visit_id: updated.visit_id,
        sales_id: updated.sales_id,
        warung_id: updated.warung_id,
        status: updated.status,
        return_date: updated.return_date,
        total_amount: Number(updated.total_amount),
        notes: updated.notes,
        items: updated.items.map(i => ({
          id: i.id,
          product_id: i.product_id,
          batch_id: i.batch_id,
          qty: i.qty,
          condition: i.condition,
          reason: i.reason,
          item_price: Number(i.item_price),
          subtotal: Number(i.subtotal),
          return_type: i.return_type
        }))
      }, { userId: user.id });

      await this._emitDomainEvent(tx, event);
      
      return updated;
    });
  }

  async completeReturn(id, user) {
    return await prisma.$transaction(async (tx) => {
      const salesReturn = await this._loadReturn(tx, id);
      this._ensureReturnOwnership(salesReturn, user);
      const updated = await tx.salesReturn.update({
        where: { id: Number(id) },
        data: { status: 'COMPLETED' },
        include: { items: true }
      });
      return updated;
    });
  }

  async cancelReturn(id, user) {
    return await prisma.$transaction(async (tx) => {
      const salesReturn = await this._loadReturn(tx, id);
      this._ensureReturnOwnership(salesReturn, user);
      const updated = await tx.salesReturn.update({
        where: { id: Number(id) },
        data: { status: 'CANCELLED' },
        include: { items: true }
      });
      return updated;
    });
  }

  async getAll() {
    return await prisma.salesReturn.findMany({
      include: {
        items: true,
        sales: { select: { id: true, name: true } },
        warung: { select: { id: true, name: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getById(id) {
    return await prisma.salesReturn.findUnique({
      where: { id: Number(id) },
      include: {
        items: true,
        sales: { select: { id: true, name: true } },
        warung: { select: { id: true, name: true } }
      }
    });
  }
}

module.exports = new SalesReturnService();
