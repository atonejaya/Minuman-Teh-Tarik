'use strict';

const { ValidationError } = require('../../../../exceptions/api-error');
const { VisitStatus } = require('../constants/VisitStatus');

/**
 * SalesVisit entity
 * Rencana / realisasi kunjungan salesman ke satu outlet pada satu hari.
 * Invariant dasar dipegang di sini; invariant lifecycle dipegang oleh
 * VisitValidationService.
 */
class SalesVisit {
  constructor({ salesId, warungId, visitDate = new Date(), plannedSequence = null, openingNote = null }) {
    this.salesId = Number(salesId);
    this.warungId = Number(warungId);
    this.visitDate = visitDate ? new Date(visitDate) : new Date();
    this.plannedSequence = plannedSequence === null || plannedSequence === undefined ? null : Number(plannedSequence);
    this.openingNote = openingNote || null;
    this.status = VisitStatus.PLANNED;
    this.validate();
  }

  validate() {
    if (!this.salesId) throw new ValidationError('sales_id wajib diisi');
    if (!this.warungId) throw new ValidationError('warung_id wajib diisi');
    if (Number.isNaN(this.visitDate.getTime())) throw new ValidationError('visit_date tidak valid');
    if (this.plannedSequence !== null && (!Number.isInteger(this.plannedSequence) || this.plannedSequence < 0)) {
      throw new ValidationError('planned_sequence harus bilangan bulat >= 0');
    }
  }

  toPrisma() {
    const date = new Date(this.visitDate);
    date.setUTCHours(0, 0, 0, 0);
    return {
      sales_id: this.salesId,
      warung_id: this.warungId,
      visit_date: date,
      planned_sequence: this.plannedSequence,
      opening_note: this.openingNote
    };
  }
}

module.exports = SalesVisit;
