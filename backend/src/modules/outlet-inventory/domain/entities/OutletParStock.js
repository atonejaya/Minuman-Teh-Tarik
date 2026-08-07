const { ValidationError } = require('../../../../exceptions/api-error');

/**
 * OutletParStock entity
 * Target titipan (par stock) satu produk di satu outlet.
 */
class OutletParStock {
  constructor({ warungId, productId, parQty, minQty = 0, maxQty = null, priority = 0, isActive = true }) {
    this.warungId = Number(warungId);
    this.productId = Number(productId);
    this.parQty = Number(parQty);
    this.minQty = Number(minQty);
    this.maxQty = maxQty === null || maxQty === undefined ? null : Number(maxQty);
    this.priority = Number(priority);
    this.isActive = isActive === undefined ? true : Boolean(isActive);
    this.validate();
  }

  validate() {
    if (!this.warungId || !this.productId) {
      throw new ValidationError('warung_id dan product_id wajib diisi');
    }
    if (!Number.isInteger(this.parQty) || this.parQty < 0) {
      throw new ValidationError('par_qty harus bilangan bulat >= 0');
    }
    if (!Number.isInteger(this.minQty) || this.minQty < 0) {
      throw new ValidationError('min_qty harus bilangan bulat >= 0');
    }
    if (this.maxQty !== null && (!Number.isInteger(this.maxQty) || this.maxQty < this.minQty)) {
      throw new ValidationError('max_qty harus bilangan bulat >= min_qty');
    }
    if (this.maxQty !== null && this.parQty > this.maxQty) {
      throw new ValidationError('par_qty tidak boleh melebihi max_qty');
    }
  }

  toPrisma() {
    return {
      warung_id: this.warungId,
      product_id: this.productId,
      par_qty: this.parQty,
      min_qty: this.minQty,
      max_qty: this.maxQty,
      priority: this.priority,
      is_active: this.isActive
    };
  }
}

module.exports = OutletParStock;
