const { ValidationError } = require('../../../../exceptions/api-error');

/**
 * SalesDay entity (SPRINT 11.2A)
 * Checkpoint harian stock sales: satu hari satu baris per sales
 * (unique sales_id + sales_date). Ringkasan dikunci saat CLOSED.
 */
class SalesDay {
  constructor({
    salesId,
    salesDate = new Date(),
    status = null,
    summary = null,
    closedBy = null
  }) {
    this.salesId = Number(salesId);
    this.salesDate = salesDate ? new Date(salesDate) : new Date();
    this.status = status;
    this.summary = summary;
    this.closedBy = closedBy === null || closedBy === undefined ? null : Number(closedBy);
    this.validate();
  }

  validate() {
    if (!this.salesId) throw new ValidationError('sales_id wajib diisi');
    if (!this.salesDate || Number.isNaN(this.salesDate.getTime())) {
      throw new ValidationError('sales_date tidak valid');
    }
  }
}

module.exports = SalesDay;
