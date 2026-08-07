const { ValidationError } = require('../../../../exceptions/api-error');

/**
 * OutletDelivery entity (SPRINT 11.1A)
 * Dokumen delivery barang ke outlet. Identity idempotency adalah
 * pasangan (referenceType, referenceId) - memastikan satu dokumen
 * delivery hanya memutasi stok outlet satu kali.
 *
 * Item delivery adalah stock-in ke outlet (movement ISSUE_TO_OUTLET),
 * sehingga quantity wajib bilangan bulat > 0.
 */
class OutletDelivery {
  constructor({
    warungId,
    deliveryDate = new Date(),
    referenceType,
    referenceId,
    performedBy = null,
    notes = null,
    items = []
  }) {
    this.warungId = Number(warungId);
    this.deliveryDate = deliveryDate ? new Date(deliveryDate) : new Date();
    this.referenceType = referenceType ? String(referenceType).trim() : null;
    this.referenceId = referenceId === null || referenceId === undefined ? null : String(referenceId);
    this.performedBy = performedBy === null || performedBy === undefined ? null : Number(performedBy);
    this.notes = notes === null || notes === undefined ? null : String(notes);
    this.items = items;
    this.validate();
  }

  validate() {
    if (!this.warungId) throw new ValidationError('warung_id wajib diisi');
    if (!this.deliveryDate || Number.isNaN(this.deliveryDate.getTime())) {
      throw new ValidationError('delivery_date tidak valid');
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
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        throw new ValidationError(`quantity produk ${productId} harus bilangan bulat > 0`);
      }
    }
  }

  toPrisma() {
    return {
      warung_id: this.warungId,
      delivery_date: this.deliveryDate,
      reference_type: this.referenceType,
      reference_id: this.referenceId,
      notes: this.notes,
      performed_by: this.performedBy,
      items: this.items.map(item => ({
        product_id: Number(item.productId),
        quantity: Number(item.quantity)
      }))
    };
  }
}

module.exports = OutletDelivery;
