'use strict';

const { VisitStatus, VisitTransitions } = require('../constants/VisitStatus');
const { ConflictError, ValidationError } = require('../../../../exceptions/api-error');

/**
 * VisitValidationService (SPRINT 11.0E)
 * Domain service murni (tanpa akses database) yang memegang seluruh
 * aturan transisi lifecycle SalesVisit:
 *   PLANNED -> CHECKED_IN -> STOCK_COUNTED (optional)
 *                         -> ORDER_CREATED (optional)
 *                         -> DELIVERED    (optional)
 *                         -> CHECKED_OUT -> COMPLETED
 * Tidak boleh melompati state yang tidak valid.
 */
class VisitValidationService {
  /**
   * @returns {string[]} status tujuan yang diizinkan dari status tertentu
   */
  allowedTargets(from) {
    return VisitTransitions[from] || [];
  }

  /**
   * Cek apakah transisi from -> to diizinkan (tanpa melempar).
   */
  isTransitionAllowed(from, to) {
    return this.allowedTargets(from).includes(to);
  }

  /**
   * Lempar ConflictError bila transisi from -> to tidak diizinkan.
   */
  assertTransition(from, to) {
    if (!this.isTransitionAllowed(from, to)) {
      throw new ConflictError(
        'INVALID_TRANSITION',
        `Transisi status tidak valid: ${from} -> ${to}`
      );
    }
  }

  /**
   * Validasi Check-In: hanya dari PLANNED dan GPS wajib diisi.
   */
  assertCanCheckIn(visit, { latitude, longitude }) {
    this.assertTransition(visit.status, VisitStatus.CHECKED_IN);
    if (latitude === null || latitude === undefined || Number.isNaN(Number(latitude))) {
      throw new ValidationError('latitude wajib diisi');
    }
    if (longitude === null || longitude === undefined || Number.isNaN(Number(longitude))) {
      throw new ValidationError('longitude wajib diisi');
    }
  }

  /**
   * Validasi Stock Count: hanya dari CHECKED_IN (satu kali per kunjungan).
   */
  assertCanRecordStockCount(visit) {
    this.assertTransition(visit.status, VisitStatus.STOCK_COUNTED);
  }

  /**
   * Validasi Order: hanya dari CHECKED_IN atau STOCK_COUNTED.
   */
  assertCanRecordOrder(visit) {
    if (!this.isTransitionAllowed(visit.status, VisitStatus.ORDER_CREATED)) {
      throw new ConflictError(
        'INVALID_TRANSITION',
        `Order hanya dapat dibuat dari status CHECKED_IN/STOCK_COUNTED (saat ini ${visit.status})`
      );
    }
  }

  /**
   * Validasi Delivery: hanya dari CHECKED_IN, STOCK_COUNTED, atau ORDER_CREATED.
   */
  assertCanRecordDelivery(visit) {
    if (!this.isTransitionAllowed(visit.status, VisitStatus.DELIVERED)) {
      throw new ConflictError(
        'INVALID_TRANSITION',
        `Delivery tidak valid dari status ${visit.status}`
      );
    }
  }

  /**
   * Validasi Check-Out: dari CHECKED_IN, STOCK_COUNTED, ORDER_CREATED, atau DELIVERED.
   */
  assertCanCheckOut(visit) {
    this.assertTransition(visit.status, VisitStatus.CHECKED_OUT);
  }

  /**
   * Validasi Complete: hanya dari CHECKED_OUT.
   */
  assertCanComplete(visit) {
    this.assertTransition(visit.status, VisitStatus.COMPLETED);
  }

  /**
   * Validasi Cancel: hanya dari PLANNED (belum ada aktivitas lapangan).
   */
  assertCanCancel(visit) {
    this.assertTransition(visit.status, VisitStatus.CANCELLED);
  }

  /**
   * Validasi operasi tambahan (note/photo): kunjungan belum terminal.
   */
  assertVisitActive(visit) {
    if (visit.status === VisitStatus.COMPLETED || visit.status === VisitStatus.CANCELLED) {
      throw new ConflictError('INVALID_STATUS', `Kunjungan sudah ${visit.status}`);
    }
  }
}

module.exports = new VisitValidationService();
