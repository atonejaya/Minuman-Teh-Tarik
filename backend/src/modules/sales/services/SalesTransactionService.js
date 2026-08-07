const prisma = require('../../../config/database');
const ValidationPipeline = require('./ValidationPipeline');
const PricingEngine = require('./PricingEngine');
const InventoryService = require('./InventoryService');
const NumberSequenceService = require('./NumberSequenceService');

class SalesTransactionService {
  async createDraft(payload, userId) {
    return await prisma.$transaction(async (tx) => {
      // 1. Validation
      const { customer, salesUser } = await ValidationPipeline.validateDraftCreation(tx, payload, userId);
      
      // 2. Number Sequence
      const code = await NumberSequenceService.generateCode(tx, 'SALES_TRX');

      // 3. Persist (Injecting FULL expanded snapshot)
      const transaction = await tx.salesTransaction.create({
        data: {
          code,
          visit_id: payload.visit_id,
          sales_id: salesUser.id,
          warung_id: customer.id,
          customer_name: customer.name,
          customer_code: customer.code,
          customer_display_name: customer.display_name || customer.name,
          address: customer.address || '',
          salesman_name: salesUser.name,
          payment_term: customer.payment_term || 0,
          payment_method: payload.payment_method || 'CASH',
          payment_status: 'UNPAID',
          status: 'DRAFT',
          subtotal: 0,
          item_discount: 0,
          transaction_discount: payload.transaction_discount || 0,
          tax: 0,
          grand_total: 0,
          paid_amount: 0,
          outstanding_amount: 0,
          notes: payload.notes
        }
      });

      // 4. Domain Event
      await this._emitDomainEvent(tx, 'SalesDraftCreated', transaction.id, transaction);

      return transaction;
    });
  }

  async addItems(transactionId, items) {
    return await prisma.$transaction(async (tx) => {
      // 1. Validation
      const transaction = await ValidationPipeline.validateAddItems(tx, transactionId);

      // 2. Pricing Engine
      const processedItems = await PricingEngine.calculateItemPricesAndTaxes(tx, items);
      const totals = await PricingEngine.calculateTransactionTotals(transaction, processedItems);

      // 3. Persist Items (Expanded Snapshot)
      for (const item of processedItems) {
        await tx.salesTransactionItem.create({
          data: {
            sales_transaction_id: transactionId,
            product_id: item.product.id,
            batch_id: item.batch_id || null,
            qty: item.qty,
            unit: item.product.unit.name,
            category_name: item.product.category.name,
            selling_price: item.selling_price,
            discount: item.discount,
            line_discount_percent: item.line_discount_percent || 0,
            subtotal: item.subtotal,
            product_code: item.product.code,
            product_name: item.product.name,
            sku: item.product.sku || '',
            barcode: item.product.barcode || '',
            tax_rate: item.tax_rate,
            tax_name: item.tax_name || 'NONE',
            price_source: item.price_source || 'DEFAULT',
            batch_number: item.batch_number || null,
            expired_at: item.expired_at ? new Date(item.expired_at) : null,
          }
        });
      }

      // 4. Update Transaction
      const updatedTransaction = await tx.salesTransaction.update({
        where: { id: transactionId },
        data: {
          subtotal: totals.subtotal,
          item_discount: totals.item_discount,
          tax: totals.tax,
          grand_total: totals.grand_total,
          outstanding_amount: totals.outstanding_amount
        },
        include: { items: true }
      });

      return updatedTransaction;
    });
  }

  async confirmTransaction(transactionId) {
    return await prisma.$transaction(async (tx) => {
      // 1. Validation
      const transaction = await ValidationPipeline.validateConfirmation(tx, transactionId);

      // 2. Update Status
      const updatedTransaction = await tx.salesTransaction.update({
        where: { id: transactionId },
        data: { status: 'CONFIRMED' },
        include: { items: true }
      });

      // 3. Domain Event: SalesConfirmed
      await this._emitDomainEvent(tx, 'SalesConfirmed', transactionId, updatedTransaction);

      // 4. Inventory Service: Reserve Inventory
      const inventoryResult = await InventoryService.reserveInventory(tx, updatedTransaction);

      // 5. Domain Event: InventoryReserved
      await this._emitDomainEvent(tx, 'InventoryReserved', transactionId, inventoryResult);

      return updatedTransaction;
    });
  }

  async cancelTransaction(transactionId, reason) {
    return await prisma.$transaction(async (tx) => {
      // 1. Validation
      const transaction = await ValidationPipeline.validateCancellation(tx, transactionId);

      // 2. Update Status
      const updatedTransaction = await tx.salesTransaction.update({
        where: { id: transactionId },
        data: { status: 'CANCELLED', notes: reason ? `Cancelled: ${reason}` : undefined }
      });

      // 3. Inventory Service: Release/Cancel reservation if needed
      await InventoryService.releaseInventory(tx, updatedTransaction);

      // 4. Domain Event: SalesCancelled
      await this._emitDomainEvent(tx, 'SalesCancelled', transactionId, updatedTransaction);

      return updatedTransaction;
    });
  }

  async receivePayment(transactionId, paymentData, userId) {
    return await prisma.$transaction(async (tx) => {
      // 1. Validation
      const transaction = await ValidationPipeline.validatePayment(tx, transactionId, paymentData);

      // 2. Number Sequence
      const paymentCode = await NumberSequenceService.generateCode(tx, 'PAYMENT');

      // 3. Pricing Engine (Orchestrate payment calculation to avoid heavy business logic)
      const paymentMetrics = await PricingEngine.calculatePaymentStatus(transaction, paymentData.amount);

      // 4. Persist Payment
      const payment = await tx.payment.create({
        data: {
          code: paymentCode,
          transaction_id: transactionId,
          payment_date: new Date(),
          payment_method: paymentData.payment_method || transaction.payment_method,
          amount: paymentMetrics.amount_applied,
          notes: paymentData.notes,
          created_by: userId
        }
      });

      // 5. Update Transaction
      const updatedTransaction = await tx.salesTransaction.update({
        where: { id: transactionId },
        data: {
          paid_amount: paymentMetrics.new_paid_amount,
          outstanding_amount: paymentMetrics.outstanding_amount,
          payment_status: paymentMetrics.payment_status
        }
      });

      // 6. Domain Event: PaymentReceived
      await this._emitDomainEvent(tx, 'PaymentReceived', transactionId, { payment, transaction: updatedTransaction });

      return { payment, transaction: updatedTransaction };
    });
  }

  async _emitDomainEvent(tx, eventName, aggregateId, payload) {
    await tx.outboxEvent.create({
      data: {
        event_name: eventName,
        aggregate_id: aggregateId.toString(),
        aggregate_type: 'SalesTransaction',
        correlation_id: aggregateId.toString(),
        causation_id: aggregateId.toString(),
        payload: payload,
        occurred_at: new Date()
      }
    });
  }
}

module.exports = new SalesTransactionService();
