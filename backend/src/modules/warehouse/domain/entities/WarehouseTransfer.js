const { ValidationError } = require('../../../../exceptions/api-error');
const { WarehouseTransferType } = require('../constants/WarehouseTransferType');

/**
 * WarehouseTransfer entity (SPRINT 11.2A)
 * Dokumen transfer stok antara Warehouse dan Sales. Identity idempotency
 * adalah pasangan (type, referenceType, referenceId) - memastikan satu
 * dokumen transfer hanya memutasi stok satu kali.
 *
 *  - type = ISSUE  : item adalah stock-out gudang (qty > 0)
 *  - type = RETURN : item adalah stock-in gudang (qty > 0)
 *
 * Items: [{ productId, qty, batchId? }]. batchId wajib untuk RETURN
 * (tujuan stok gudang per batch), bersifat opsional untuk ISSUE (stok
 * gudang ditarik FEFO).
 */
class WarehouseTransfer {
  constructor({
    type,
    warehouseId,
    salesId,
    transactionDate = new Date(),
    referenceType,
    referenceId,
    notes = null,
    performedBy = null,
    items = []
  }) {
    this.type = type ? String(type).trim().toUpperCase() : null;
    this.warehouseId = Number(warehouseId);
    this.salesId = Number(salesId);
    this.transactionDate = transactionDate ? new Date(transactionDate) : new Date();
    this.referenceType = referenceType ? String(referenceType).trim() : null;
    this.referenceId = referenceId === null || referenceId === undefined ? null : String(referenceId);
    this.notes = notes === null || notes === undefined ? null : String(notes);
    this.performedBy = performedBy === null || performedBy === undefined ? null : Number(performedBy);
    this.items = items;
    this.validate();
  }

  validate() {
    if (!Object.values(WarehouseTransferType).includes(this.type)) {
      throw new ValidationError('type wajib ISSUE atau RETURN');
    }
    if (!this.warehouseId) throw new ValidationError('warehouse_id wajib diisi');
    if (!this.salesId) throw new ValidationError('sales_id wajib diisi');
    if (!this.transactionDate || Number.isNaN(this.transactionDate.getTime())) {
      throw new ValidationError('transaction_date tidak valid');
    }
    if (!this.referenceType) throw new ValidationError('reference_type wajib diisi');
    if (this.referenceId === null || this.referenceId === undefined || this.referenceId === '') {
      throw new ValidationError('reference_id wajib diisi');
    }
    if (!Array.isArray(this.items) || this.items.length === 0) {
      throw new ValidationError('items wajib diisi minimal 1 produk');
    }

    const seen = new Set();
    for (const item of this.items) {
      const productId = Number(item.productId);
      if (!productId) throw new ValidationError('product_id wajib diisi');
      if (seen.has(productId)) {
        throw new ValidationError(`product_id ${productId} terduplikasi dalam items`);
      }
      seen.add(productId);
      const qty = Number(item.qty);
      if (!Number.isInteger(qty) || qty <= 0) {
        throw new ValidationError(`qty produk ${productId} harus bilangan bulat > 0`);
      }
      if (this.type === WarehouseTransferType.RETURN) {
        const batchId = item.batchId === null || item.batchId === undefined ? null : Number(item.batchId);
        if (!batchId) {
          throw new ValidationError(`batch_id wajib diisi untuk RETURN produk ${productId}`);
        }
      }
    }
  }

  toPrisma() {
    return {
      type: this.type,
      warehouse_id: this.warehouseId,
      sales_id: this.salesId,
      transaction_date: this.transactionDate,
      reference_type: this.referenceType,
      reference_id: this.referenceId,
      notes: this.notes,
      created_by: this.performedBy,
      items: this.items.map(item => ({
        product_id: Number(item.productId),
        qty: Number(item.qty),
        batch_id: item.batchId === null || item.batchId === undefined ? null : Number(item.batchId)
      }))
    };
  }
}

module.exports = WarehouseTransfer;
