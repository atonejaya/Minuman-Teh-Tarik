const prisma = require('../config/database');
const salesReturnRepository = require('../repositories/sales-return.repository');
const creditNoteService = require('./credit-note.service');
const inventoryService = require('./inventory.service');
const auditLogService = require('./audit-log.service');
const numberGeneratorService = require('./number-generator.service');
const { ConflictError, NotFoundError, BadRequestError } = require('../exceptions/api-error');
const outboxRepository = require('../repositories/outbox.repository');
const ReturnConfirmedEvent = require('../domain/events/ReturnConfirmedEvent');

class SalesReturnService {
  async getSettings(tx = prisma) {
    const setting = await tx.setting.findUnique({ where: { key: 'MAX_RETURN_DAYS' } });
    return setting ? parseInt(setting.value, 10) : 30;
  }

  async createReturn(data, userId) {
    const { transaction_id, visit_id, notes, return_date } = data;

    // Check transaction
    const transaction = await prisma.salesTransaction.findUnique({
      where: { id: transaction_id }
    });

    if (!transaction) throw new NotFoundError('NOT_FOUND', 'Transaction not found');
    if (transaction.status !== 'CONFIRMED') throw new ConflictError('CONFLICT', 'Only CONFIRMED transactions can be returned');
    
    // Check age
    const maxDays = await this.getSettings();
    const ageInMs = Date.now() - new Date(transaction.created_at).getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
    if (ageInDays > maxDays) throw new ConflictError(`Transaction is too old to be returned (Max ${maxDays} days)`);

    // Must not be a future date
    const returnDateObj = new Date(return_date);
    if (returnDateObj > new Date()) throw new ConflictError('CONFLICT', 'Return date cannot be in the future');

    const code = await numberGeneratorService.generateCode('RTN', returnDateObj);

    return prisma.$transaction(async (tx) => {
      const salesReturn = await salesReturnRepository.create({
        code,
        visit_id,
        sales_id: transaction.sales_id,
        warung_id: transaction.warung_id,
        transaction_id,
        status: 'DRAFT',
        return_date: returnDateObj,
        total_amount: 0,
        notes
      }, tx);

      await auditLogService.log(
        'CREATE_SALES_RETURN',
        'SalesReturn',
        salesReturn.id,
        { code, transaction_id },
        userId,
        tx
      );

      return salesReturn;
    });
  }

  async addReturnItem(salesReturnId, data, userId) {
    const { product_id, batch_id, qty, condition, reason, item_price } = data;

    if (qty <= 0) throw new BadRequestError('BAD_REQUEST', 'Qty must be greater than 0');

    return prisma.$transaction(async (tx) => {
      const salesReturn = await salesReturnRepository.findById(salesReturnId, tx);
      if (!salesReturn) throw new NotFoundError('NOT_FOUND', 'Sales Return not found');
      if (salesReturn.status !== 'DRAFT') throw new ConflictError('CONFLICT', 'Sales Return is not in DRAFT state');

      // Find transaction item
      const invoiceItem = await tx.salesTransactionItem.findFirst({
        where: {
          sales_transaction_id: salesReturn.transaction_id,
          product_id,
          batch_id
        }
      });

      if (!invoiceItem) throw new ConflictError('CONFLICT', 'Product/Batch not found in the original invoice');

      // Find accumulated returned qty for this batch in this invoice
      const previousReturns = await tx.salesReturnItem.aggregate({
        where: {
          product_id,
          batch_id,
          sales_return: {
            transaction_id: salesReturn.transaction_id,
            status: { not: 'CANCELLED' }
          }
        },
        _sum: { qty: true }
      });

      const totalReturned = (previousReturns._sum.qty || 0) + qty;
      if (totalReturned > invoiceItem.qty) {
        throw new ConflictError(`Return quantity exceeds invoice batch quantity. Max available to return: ${invoiceItem.qty - (previousReturns._sum.qty || 0)}`);
      }

      const subtotal = Number(item_price) * qty;

      const item = await salesReturnRepository.addItem({
        sales_return_id: salesReturnId,
        product_id,
        batch_id,
        qty,
        condition,
        reason,
        item_price,
        subtotal
      }, tx);

      const newTotal = Number(salesReturn.total_amount) + subtotal;
      await salesReturnRepository.update(salesReturnId, { total_amount: newTotal }, tx);

      await auditLogService.log(
        'ADD_SALES_RETURN_ITEM',
        'SalesReturn',
        salesReturnId,
        { item_id: item.id, product_id, batch_id, qty, condition },
        userId,
        tx
      );

      return item;
    });
  }

  async confirmReturn(salesReturnId, userId) {
    return prisma.$transaction(async (tx) => {
      const salesReturn = await salesReturnRepository.findById(salesReturnId, tx);
      if (!salesReturn) throw new NotFoundError('NOT_FOUND', 'Sales Return not found');
      if (salesReturn.status !== 'DRAFT') throw new ConflictError('CONFLICT', 'Only DRAFT returns can be confirmed');

      if (salesReturn.items.length === 0) throw new ConflictError('CONFLICT', 'Cannot confirm empty return');

      const totalReturn = Number(salesReturn.total_amount);

      // Re-validate transaction state
      const transaction = await tx.salesTransaction.findUnique({ where: { id: salesReturn.transaction_id } });
      let currentOutstanding = Number(transaction.outstanding_amount);

      let newOutstanding = currentOutstanding - totalReturn;
      let creditNoteAmount = 0;

      if (newOutstanding < 0) {
        creditNoteAmount = Math.abs(newOutstanding);
        newOutstanding = 0;
      }

      // Update invoice outstanding (and payment_status if it hits 0)
      const paymentStatus = newOutstanding === 0 ? 'PAID' : (newOutstanding < Number(transaction.grand_total) ? 'PARTIALLY_PAID' : 'UNPAID');
      await tx.salesTransaction.update({
        where: { id: transaction.id },
        data: { outstanding_amount: newOutstanding, payment_status: paymentStatus }
      });

      // Create Credit Note if applicable
      if (creditNoteAmount > 0) {
        await creditNoteService.createCreditNote(salesReturn.warung_id, salesReturn.id, creditNoteAmount, tx);
      }

      // Inventory Operations
      for (const item of salesReturn.items) {
        // Add to MobileStock
        const existingStock = await tx.mobileStock.findUnique({
          where: {
            sales_id_product_id_batch_id_condition: {
              sales_id: salesReturn.sales_id,
              product_id: item.product_id,
              batch_id: item.batch_id,
              condition: item.condition
            }
          }
        });

        const qtyBefore = existingStock ? existingStock.qty_available : 0;
        const qtyAfter = qtyBefore + item.qty;

        if (existingStock) {
          await tx.mobileStock.update({
            where: { id: existingStock.id },
            data: {
              qty_available: qtyAfter,
              version: { increment: 1 }
            }
          });
        } else {
          await tx.mobileStock.create({
            data: {
              sales_id: salesReturn.sales_id,
              product_id: item.product_id,
              batch_id: item.batch_id,
              qty_available: item.qty,
              condition: item.condition
            }
          });
        }

        // InventoryMovement
        const movementType = item.condition === 'GOOD' ? 'SALE_RETURN_GOOD' : 'SALE_RETURN_DAMAGED';
        const movementCode = await numberGeneratorService.generateCode('MOV', new Date(), tx);
        await tx.inventoryMovement.create({
          data: {
            movement_number: movementCode,
            movement_type: movementType,
            source_type: 'CUSTOMER',
            source_id: salesReturn.warung_id,
            destination_type: 'SALES',
            destination_id: salesReturn.sales_id,
            qty_before: qtyBefore,
            qty_change: item.qty,
            qty_after: qtyAfter,
            reference_document: salesReturn.code,
            reference_type: 'RETURN',
            product_id: item.product_id,
            batch_id: item.batch_id,
            batch_number: item.batch.batch_number,
            expired_at: item.batch.expired_at,
            created_by: userId
          }
        });
      }

      // Update status
      const updatedReturn = await salesReturnRepository.update(salesReturnId, { status: 'CONFIRMED' }, tx);

      await auditLogService.log(
        'CONFIRM_SALES_RETURN',
        'SalesReturn',
        salesReturnId,
        { 
          total_return: totalReturn, 
          outstanding_before: currentOutstanding, 
          outstanding_after: newOutstanding,
          credit_note_created: creditNoteAmount > 0 ? creditNoteAmount : 0
        },
        userId,
        tx
      );

      // Enrich event context
      const stock = await tx.mobileStock.findFirst({
        where: { sales_id: salesReturn.sales_id }
      });
      const warehouse_id = stock ? stock.warehouse_id : 1;

      // Insert Outbox Event
      const event = new ReturnConfirmedEvent(salesReturnId, {
        code: salesReturn.code,
        transaction_id: salesReturn.transaction_id,
        sales_id: salesReturn.sales_id,
        warung_id: salesReturn.warung_id,
        warehouse_id: warehouse_id,
        total_amount: totalReturn,
        items: salesReturn.items.map(i => ({
          product_id: i.product_id,
          qty: i.qty,
          subtotal: i.subtotal
        }))
      }, { userId });
      await outboxRepository.insert(event, tx);

      return updatedReturn;
    });
  }

  async getReturns(filters = {}) {
    return salesReturnRepository.findMany(filters);
  }

  async getReturnById(id) {
    const sr = await salesReturnRepository.findById(id);
    if (!sr) throw new NotFoundError('NOT_FOUND', 'Sales Return not found');
    return sr;
  }
}

module.exports = new SalesReturnService();
