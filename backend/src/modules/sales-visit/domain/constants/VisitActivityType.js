'use strict';

/**
 * Tipe aktivitas pada timeline SalesVisit (SPRINT 11.0E).
 * Mencerminkan enum "SalesVisitActivityType" pada database.
 * Semua aktivitas bersifat immutable (append-only).
 */
const VisitActivityType = {
  VISIT_CREATED: 'VISIT_CREATED',
  CHECK_IN: 'CHECK_IN',
  STOCK_COUNT: 'STOCK_COUNT',
  ORDER_CREATED: 'ORDER_CREATED',
  DELIVERED: 'DELIVERED',
  CHECK_OUT: 'CHECK_OUT',
  COMPLETED: 'COMPLETED',
  NOTE_ADDED: 'NOTE_ADDED',
  PHOTO_ADDED: 'PHOTO_ADDED',
  CANCELLED: 'CANCELLED'
};

module.exports = { VisitActivityType };
