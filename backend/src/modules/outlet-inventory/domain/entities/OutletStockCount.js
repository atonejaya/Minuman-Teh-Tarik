const { ValidationError } = require('../../../../exceptions/api-error');

/**
 * OutletStockCount entity
 * Merupakan hasil observasi fisik stok di outlet (bukan movement).
 */
class OutletStockCount {
  constructor({ warungId, salesId, visitId = null, countedAt = new Date(), items = [] }) {
    this.warungId = Number(warungId);
    this.salesId = Number(salesId);
    this.visitId = visitId === null || visitId === undefined ? null : Number(visitId);
    this.countedAt = countedAt ? new Date(countedAt) : new Date();
    this.items = items;
    this.validate();
  }

  validate() {
    if (!this.warungId) throw new ValidationError('warung_id wajib diisi');
    if (!this.salesId) throw new ValidationError('sales_id wajib diisi');
    if (!Array.isArray(this.items) || this.items.length === 0) {
      throw new ValidationError('items wajib diisi minimal 1 produk');
    }

    const seen = new Set();
    for (const item of this.items) {
      const productId = Number(item.product_id);
      if (!productId) throw new ValidationError('product_id wajib diisi');
      if (seen.has(productId)) {
        throw new ValidationError(`product_id ${productId} terduplikasi dalam items`);
      }
      seen.add(productId);
      const qty = Number(item.physical_qty);
      if (!Number.isInteger(qty) || qty < 0) {
        throw new ValidationError(`physical_qty produk ${productId} harus bilangan bulat >= 0`);
      }
    }
  }
}

module.exports = OutletStockCount;
