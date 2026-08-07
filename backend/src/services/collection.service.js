const prisma = require('../config/database');
const collectionRepository = require('../repositories/collection.repository');
const NumberGeneratorService = require('./number-generator.service');
const AuditLogService = require('./audit-log.service');
const { ConflictError, NotFoundError, BadRequestError } = require('../exceptions/api-error');
const outboxRepository = require('../repositories/outbox.repository');
const CollectionCompletedEvent = require('../domain/events/CollectionCompletedEvent');

class CollectionService {
  async createCollection(data, userId) {
    return prisma.$transaction(async (tx) => {
      // Validate visit and warung relation (optional but good practice)
      const visit = await tx.visit.findUnique({ where: { id: data.visit_id } });
      if (!visit) throw new NotFoundError('Visit tidak ditemukan');
      if (visit.warung_id !== data.warung_id) {
        throw new ConflictError('Visit tidak cocok dengan Warung');
      }

      const code = await NumberGeneratorService.generateCode('COL', new Date(), tx);
      const collection = await collectionRepository.create({
        code,
        sales_id: data.sales_id,
        warung_id: data.warung_id,
        visit_id: data.visit_id,
        collection_date: new Date(data.collection_date),
        notes: data.notes
      }, tx);

      await AuditLogService.log(
        'CREATE_COLLECTION',
        'Collection',
        collection.id,
        { code, notes: data.notes },
        userId,
        tx
      );

      return collection;
    });
  }

  async addInvoice(collectionId, transactionId, userId) {
    return prisma.$transaction(async (tx) => {
      const collection = await tx.collection.findUnique({ where: { id: collectionId } });
      if (!collection) throw new NotFoundError('Collection tidak ditemukan');
      if (collection.status !== 'PENDING') throw new ConflictError('Collection sudah ditutup');

      const invoice = await tx.salesTransaction.findUnique({ where: { id: transactionId } });
      if (!invoice) throw new NotFoundError('Invoice tidak ditemukan');

      if (invoice.warung_id !== collection.warung_id) {
        throw new ConflictError('Invoice bukan milik Warung ini');
      }

      if (invoice.status !== 'CONFIRMED') {
        throw new ConflictError('Invoice belum CONFIRMED');
      }

      if (invoice.payment_status === 'PAID') {
        throw new ConflictError('INVOICE_ALREADY_PAID');
      }

      const existingItem = await tx.collectionItem.findFirst({
        where: { collection_id: collectionId, sales_transaction_id: transactionId }
      });
      if (existingItem) {
        throw new ConflictError('Invoice sudah ada di Collection ini');
      }

      const item = await collectionRepository.addItem({
        collection_id: collectionId,
        sales_transaction_id: transactionId,
        invoice_total: invoice.grand_total,
        outstanding_before: invoice.outstanding_amount,
        payment_amount: 0,
        outstanding_after: invoice.outstanding_amount
      }, tx);

      await AuditLogService.log(
        'ADD_COLLECTION_ITEM',
        'CollectionItem',
        item.id,
        { transaction_code: invoice.code, outstanding: invoice.outstanding_amount },
        userId,
        tx
      );

      return item;
    });
  }

  async finishCollection(collectionId, data, userId) {
    return prisma.$transaction(async (tx) => {
      const collection = await collectionRepository.findById(collectionId, tx);
      if (!collection) throw new NotFoundError('Collection tidak ditemukan');
      if (collection.status !== 'PENDING') throw new ConflictError('Collection sudah ditutup');

      const items = collection.items;
      if (items.length === 0) {
        throw new ConflictError('Collection tidak memiliki invoice');
      }

      let totalOutstandingBefore = 0;
      let totalPayment = 0;

      for (const item of items) {
        // Calculate total payments for this specific invoice inside this specific collection
        const payments = collection.payments.filter(p => p.transaction_id === item.sales_transaction_id);
        const itemPayment = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        
        const outstandingBefore = Number(item.outstanding_before);
        const outstandingAfter = Math.max(0, outstandingBefore - itemPayment);

        await collectionRepository.updateItem(item.id, {
          payment_amount: itemPayment,
          outstanding_after: outstandingAfter
        }, tx);

        totalOutstandingBefore += outstandingBefore;
        totalPayment += itemPayment;
      }

      let result = 'NONE';
      let status = 'FAILED';
      let failureReason = null;

      if (totalPayment > 0) {
        status = 'COMPLETED';
        if (totalPayment >= totalOutstandingBefore) {
          result = 'FULL';
        } else {
          result = 'PARTIAL';
        }
      } else {
        result = 'NONE';
        status = 'FAILED';
        if (!data.failure_reason) {
          throw new ConflictError('failure_reason wajib diisi jika tidak ada pembayaran');
        }
        failureReason = data.failure_reason;
      }

      const updatedCollection = await collectionRepository.updateCollection(collectionId, {
        status,
        result,
        failure_reason: failureReason,
        notes: data.notes || collection.notes
      }, tx);

      await AuditLogService.log(
        'FINISH_COLLECTION',
        'Collection',
        collection.id,
        { result, status, failure_reason: failureReason },
        userId,
        tx
      );

      // Insert Outbox Event
      const event = new CollectionCompletedEvent(collection.id, {
        code: collection.code,
        status,
        result,
        total_payment: totalPayment
      }, { userId });
      await outboxRepository.insert(event, tx);

      return updatedCollection;
    });
  }

  async getCollectionById(id) {
    const collection = await collectionRepository.findById(id);
    if (!collection) throw new NotFoundError('Collection tidak ditemukan');
    
    // Compute summary
    let totalInvoice = 0;
    let totalOutstanding = 0;
    let totalCollected = 0;
    let remainingOutstanding = 0;

    for (const item of collection.items) {
      totalInvoice += Number(item.invoice_total);
      totalOutstanding += Number(item.outstanding_before);
      totalCollected += Number(item.payment_amount);
      remainingOutstanding += Number(item.outstanding_after);
    }

    collection.summary = {
      total_invoice: totalInvoice,
      total_outstanding: totalOutstanding,
      total_collected: totalCollected,
      remaining_outstanding: remainingOutstanding
    };

    return collection;
  }
}

module.exports = new CollectionService();
