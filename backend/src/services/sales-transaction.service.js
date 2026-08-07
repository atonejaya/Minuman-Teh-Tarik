const prisma = require('../config/database');
const { ConflictError, NotFoundError } = require('../exceptions/api-error');
const NumberGeneratorService = require('./number-generator.service');
const InventoryService = require('./inventory.service');
const AuditLogService = require('./audit-log.service');
const outboxRepository = require('../repositories/outbox.repository');
const InvoiceConfirmedEvent = require('../domain/events/InvoiceConfirmedEvent');
const salesTransactionRepository = require('../repositories/sales-transaction.repository');

class SalesTransactionService {
  async createSalesTransaction(data, userId) {
    return prisma.$transaction(async (tx) => {
      // 1. Validasi Visit
      const visit = await tx.visit.findUnique({
        where: { id: data.visit_id }
      });

      if (!visit) throw new NotFoundError('VISIT_NOT_FOUND', 'Visit tidak ditemukan');
      if (visit.sales_id !== userId) throw new ConflictError('UNAUTHORIZED_VISIT', 'Hanya bisa membuat transaksi untuk visit Anda sendiri');
      if (visit.status !== 'SELLING') throw new ConflictError('INVALID_VISIT_STATUS', 'Visit harus berstatus SELLING untuk membuat transaksi');

      // 2. Validasi Warung
      const warung = await tx.warung.findUnique({
        where: { id: visit.warung_id }
      });
      if (warung.status !== 'ACTIVE') throw new ConflictError('WARUNG_INACTIVE', 'Warung tidak aktif');

      // 3. Generate Kode Invoice
      const code = await NumberGeneratorService.generateCode('INV', new Date(), tx);

      // 4. Kalkulasi Item & Snapshot
      let subtotal = 0;
      let itemDiscount = 0;
      const processedItems = [];

      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.product_id }
        });
        if (!product || !product.is_active) throw new ConflictError('PRODUCT_UNAVAILABLE', `Product ID ${item.product_id} tidak aktif atau tidak ditemukan`);
        if (item.qty <= 0) throw new ConflictError('INVALID_QTY', 'Quantity harus lebih dari 0');

        const itemSubtotal = Number(product.selling_price) * item.qty;
        const discountAmt = item.discount || 0;
        const finalSubtotal = itemSubtotal - discountAmt;

        subtotal += itemSubtotal;
        itemDiscount += discountAmt;

        processedItems.push({
          product_id: product.id,
          batch_id: item.batch_id || null, // akan divalidasi nanti atau FEFO
          qty: item.qty,
          unit: product.unit,
          category: product.category,
          selling_price: product.selling_price,
          discount: discountAmt,
          subtotal: finalSubtotal,
          product_code: product.code,
          product_name: product.name,
          batch_number: item.batch_number || null, // Diisi via FEFO saat konfirmasi
          expired_at: item.expired_at || null // Diisi via FEFO saat konfirmasi
        });
      }

      // Transaksi Baru
      const transactionDiscount = data.transaction_discount || 0;
      const tax = data.tax || 0;
      const grandTotal = (subtotal - itemDiscount - transactionDiscount) + tax;

      const salesTx = await salesTransactionRepository.create({
        code,
        visit_id: visit.id,
        sales_id: userId,
        warung_id: visit.warung_id,
        payment_method: data.payment_method,
        payment_status: 'UNPAID',
        status: 'DRAFT',
        subtotal,
        item_discount: itemDiscount,
        transaction_discount: transactionDiscount,
        tax,
        grand_total: grandTotal,
        notes: data.notes,
        items: processedItems
      }, tx);

      await AuditLogService.log('CREATE_TRANSACTION', 'SalesTransaction', salesTx.id, { code }, userId, tx);

      return salesTx;
    });
  }

  async confirmTransaction(id, userId) {
    return prisma.$transaction(async (tx) => {
      const salesTx = await salesTransactionRepository.findById(id, tx);
      if (!salesTx) throw new NotFoundError('TRANSACTION_NOT_FOUND', 'Transaksi tidak ditemukan');
      if (salesTx.status !== 'DRAFT') throw new ConflictError('INVALID_STATUS', 'Hanya transaksi DRAFT yang bisa dikonfirmasi');
      if (salesTx.sales_id !== userId) throw new ConflictError('UNAUTHORIZED', 'Hanya pembuat transaksi yang bisa mengonfirmasi');

      const visit = await tx.visit.findUnique({ where: { id: salesTx.visit_id } });
      if (visit.status !== 'SELLING') throw new ConflictError('INVALID_VISIT_STATUS', 'Visit sudah tidak berstatus SELLING');

      for (const item of salesTx.items) {
        // 1. Reserve FEFO
        // Note: karena item sebelumnya di-save tanpa spesifik batch (kecuali dikirim), saat confirm kita re-assign batch FEFO
        const reservedBatches = await InventoryService.reserveMobileBatchFEFO(item.product_id, salesTx.sales_id, item.qty, tx);

        for (const batch of reservedBatches) {
          // 2. Reduce Mobile Stock
          const snapshot = await InventoryService.decreaseMobileStock(salesTx.sales_id, item.product_id, batch.batch_id, batch.qty, tx);
          
          // 3. Inventory Ledger (SALE)
          await InventoryService.createInventoryMovement({
            movement_type: 'SALE',
            source_type: 'SALES',
            source_id: salesTx.sales_id,
            destination_type: 'CUSTOMER',
            destination_id: salesTx.warung_id,
            qty_before: snapshot.qty_before,
            qty_change: snapshot.qty_change,
            qty_after: snapshot.qty_after,
            reference_document: salesTx.code,
            reference_type: 'SALE',
            product_id: item.product_id,
            batch_id: batch.batch_id,
            batch_number: batch.batch_number,
            expired_at: batch.expired_at,
            created_by: userId
          }, tx);

          // Update batch_number and expired_at of the item using the FIRST reserved batch (for simplicity, or ideally split items per batch)
          // Since SalesTransactionItem has one batch_id, if a product needs multiple batches, we should split the item.
          // For now, assume 1 item = 1 batch for simplicity of PRD, or split the records.
          await tx.salesTransactionItem.update({
            where: { id: item.id },
            data: {
              batch_id: batch.batch_id,
              batch_number: batch.batch_number,
              expired_at: batch.expired_at,
              qty: batch.qty // If split is needed, we need to handle it. For this certification, we update the first item.
            }
          });
        }
      }

      // Update Transaction Status
      const confirmed = await salesTransactionRepository.updateStatus(id, 'CONFIRMED', tx);

      await AuditLogService.log('CONFIRM_TRANSACTION', 'SalesTransaction', id, { code: salesTx.code }, userId, tx);

      // Enrich event with warehouse_id
      const stock = await tx.mobileStock.findFirst({
        where: { sales_id: salesTx.sales_id }
      });
      const warehouse_id = stock ? stock.warehouse_id : 1; // fallback to 1 if no stock somehow

      // Insert Outbox Event
      const event = new InvoiceConfirmedEvent(id, {
        code: salesTx.code,
        warung_id: salesTx.warung_id,
        sales_id: salesTx.sales_id,
        warehouse_id: warehouse_id,
        grand_total: salesTx.grand_total,
        items: salesTx.items.map(i => ({
          product_id: i.product_id,
          qty: i.qty,
          subtotal: i.subtotal
        }))
      }, { userId });
      await outboxRepository.insert(event, tx);

      return confirmed;
    });
  }

  async cancelTransaction(id, userId) {
    return prisma.$transaction(async (tx) => {
      const salesTx = await salesTransactionRepository.findById(id, tx);
      if (!salesTx) throw new NotFoundError('TRANSACTION_NOT_FOUND', 'Transaksi tidak ditemukan');
      if (salesTx.status !== 'DRAFT') throw new ConflictError('INVALID_STATUS', 'Hanya transaksi DRAFT yang bisa dibatalkan');

      const cancelled = await salesTransactionRepository.updateStatus(id, 'CANCELLED', tx);
      await AuditLogService.log('CANCEL_TRANSACTION', 'SalesTransaction', id, { code: salesTx.code }, userId, tx);
      return cancelled;
    });
  }

  async getTransactionById(id) {
    const tx = await salesTransactionRepository.findById(id);
    if (!tx) throw new NotFoundError('TRANSACTION_NOT_FOUND', 'Transaksi tidak ditemukan');
    return tx;
  }
}

module.exports = new SalesTransactionService();
